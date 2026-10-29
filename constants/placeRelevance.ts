// Shared by the map and the catalog function. Prominence is a display heuristic,
// never a popularity measurement, review score or safety classification.
export type RelevantPlace = {
  id: string;
  name: string;
  prominence?: number;
  latitude: number;
  longitude: number;
  category?: string;
  appCategory?: string;
  photoUrl?: string;
  verifiedAt?: string;
};
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};
const normCache = new Map<string, string>();
const normalize = (s: string) => {
  const cached = normCache.get(s);
  if (cached !== undefined) return cached;
  const result = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (normCache.size >= 2500) {
    const firstKey = normCache.keys().next().value;
    if (firstKey !== undefined) normCache.delete(firstKey);
  }
  normCache.set(s, result);
  return result;
};
const landmarks = new Set([
  "praca nereu ramos",
  "praca do congresso",
  "parque das nacoes",
  "parque municipal morro do ceu",
  "shopping della",
  "criciuma shopping",
  "hospital sao jose",
  "hospital sao joao batista",
  "hospital santa catarina",
  "hospital da unimed criciuma",
  "hospital unimed criciuma",
]);
const weights: Record<string, number> = {
  mall: 64,
  shopping_mall: 64,
  stadium: 60,
  university: 52,
  college: 40,
  park: 48,
  nature_reserve: 48,
  hospital: 46,
  supermarket: 38,
  theatre: 36,
  library: 32,
  sports_centre: 30,
  school: 26,
  police: 28,
  marketplace: 36,
  bank: 22,
  pharmacy: 22,
  restaurant: 18,
  cafe: 16,
  fuel: 22,
};
const appWeights: Record<string, number> = {
  parks: 44,
  markets: 28,
  education: 24,
  health: 18,
};
export function placeProminence(place: RelevantPlace) {
  if (Number.isFinite(place.prominence)) return place.prominence!;
  const name = normalize(place.name);
  if (landmarks.has(name)) return 100;
  // Avoid promoting road medians, car parks and generic OSM labels as landmarks.
  if (
    /^(canteiro|rotula|rotatoria|estacionamento)\b/.test(name) ||
    /^(galeria|lojas em geral|parque dos predios|parque hotel zata|parque igreja universal|casario parque)$/.test(
      name,
    )
  )
    return 4;
  let score =
    weights[place.category ?? ""] ??
    appWeights[place.appCategory ?? ""] ??
    10;
  // Some Overture medical offices are tagged hospital. A category alone is insufficient.
  if (place.category === "hospital" && !/^hospital\b/.test(name)) score = 20;
  if (place.category === "university" && /medic|clinica/.test(name)) score = 20;
  return score + (place.verifiedAt ? 4 : 0) + (place.photoUrl ? 2 : 0);
}
export function rankPlaces<T extends RelevantPlace>(places: T[]): T[] {
  return places
    .map((place) => ({ place, score: placeProminence(place) }))
    .sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id))
    .map((item) => item.place);
}
// A bounded transport page keeps major destinations and fills remaining slots
// across geographic cells, rather than returning an alphabetic prefix.
export function catalogShortlist<T extends RelevantPlace>(
  places: T[],
  limit = 500,
): T[] {
  const scored = places
    .map((place) => ({ place, score: placeProminence(place) }))
    .sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id));
  if (scored.length <= limit) return scored.map((item) => item.place);
  let highCount = 0;
  for (let i = 0; i < scored.length; i++) {
    if (scored[i].score >= 38) highCount++;
    else break;
  }
  const topSlice = Math.min(Math.floor(limit * 0.4), highCount);
  const chosen: T[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < topSlice; i++) {
    chosen.push(scored[i].place);
    ids.add(scored[i].place.id);
  }
  const cells = new Map<string, T[]>();
  for (let i = 0; i < scored.length; i++) {
    const p = scored[i].place;
    if (ids.has(p.id)) continue;
    const key = `${Math.floor(p.latitude / 0.002)}:${Math.floor(p.longitude / 0.002)}`;
    const cell = cells.get(key);
    if (cell) cell.push(p);
    else cells.set(key, [p]);
  }
  const queues = [...cells.values()];
  for (let index = 0; chosen.length < limit; index++) {
    let added = false;
    for (let c = 0; c < queues.length; c++) {
      const candidate = queues[c][index];
      if (!candidate) continue;
      chosen.push(candidate);
      added = true;
      if (chosen.length === limit) break;
    }
    if (!added) break;
  }
  return rankPlaces(chosen);
}
// Greedy screen-space collision suppression: the stronger place keeps its own
// coordinate. At street zoom the existing grouping handles overlapping doors.
export function visibleMapPlaces<T extends RelevantPlace>(
  places: T[],
  region: Region,
  size: { width: number; height: number },
  selectedId?: string,
  filtered = false,
): T[] {
  if (
    !size.width ||
    !size.height ||
    region.latitudeDelta <= 0 ||
    region.longitudeDelta <= 0
  )
    return [];
  const zoom = Math.log2((360 * 390) / (256 * region.longitudeDelta));
  const maxLatDiff = region.latitudeDelta * 0.55,
    maxLonDiff = region.longitudeDelta * 0.55;
  const inBounds: { place: T; score: number }[] = [];
  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    if (
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude) &&
      Math.abs(p.latitude - region.latitude) <= maxLatDiff &&
      Math.abs(p.longitude - region.longitude) <= maxLonDiff
    ) {
      inBounds.push({ place: p, score: placeProminence(p) });
    }
  }
  inBounds.sort(
    (a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id),
  );
  // Complete detail starts 1.5 zoom levels later (about 2.8x closer).
  // At that distance the existing grouping keeps overlapping doors accessible.
  if (zoom >= 18.5) return inBounds.map((item) => item.place);
  const minimum = filtered
    ? 0
    : zoom < 15
      ? 46
      : zoom < 16
        ? 38
        : zoom < 17
          ? 24
          : zoom < 18
            ? 14
            : 0;
  const spacing =
    zoom < 15 ? 128 : zoom < 16 ? 116 : zoom < 17 ? 104 : zoom < 18 ? 92 : 84;
  const spacingSq = spacing * spacing;
  const budget = Math.max(
    3,
    Math.floor((size.width * size.height) / (spacingSq * 4)),
  );
  const result: T[] = [],
    pixels: { x: number; y: number }[] = [];
  const selectedIdx = selectedId
    ? inBounds.findIndex((item) => item.place.id === selectedId)
    : -1;
  const ordered =
    selectedIdx > 0
      ? [
          inBounds[selectedIdx],
          ...inBounds.slice(0, selectedIdx),
          ...inBounds.slice(selectedIdx + 1),
        ]
      : inBounds;
  const scaleX = size.width / region.longitudeDelta,
    scaleY = size.height / region.latitudeDelta;
  for (let i = 0; i < ordered.length; i++) {
    const { place: p, score } = ordered[i];
    if (p.id !== selectedId && score < minimum) continue;
    const px = (p.longitude - region.longitude) * scaleX,
      py = (p.latitude - region.latitude) * scaleY;
    let collides = false;
    for (let j = 0; j < pixels.length; j++) {
      const dx = pixels[j].x - px,
        dy = pixels[j].y - py;
      if (dx * dx + dy * dy < spacingSq) {
        collides = true;
        break;
      }
    }
    if (collides) continue;
    result.push(p);
    pixels.push({ x: px, y: py });
    if (result.length >= budget) break;
  }
  return result;
}
