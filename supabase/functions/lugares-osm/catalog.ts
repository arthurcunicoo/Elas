export type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};
export type CatalogPlace = {
  id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  origem: "osm";
  referencia_externa: string;
  categoria: string;
  atualizado_em: string;
};
// Geometry validation is city-independent. Active coverage is enforced by the database.
export function validateBounds(input: unknown): Bounds {
  const b = input as Bounds;
  if (
    !b ||
    ![b.south, b.west, b.north, b.east].every(
      (x) => typeof x === "number" && Number.isFinite(x),
    ) ||
    b.south < -85 ||
    b.north > 85 ||
    b.west < -180 ||
    b.east > 180 ||
    b.south >= b.north ||
    b.west >= b.east ||
    b.north - b.south > 5 ||
    b.east - b.west > 5
  )
    throw new Error("Área inválida.");
  return { south: b.south, west: b.west, north: b.north, east: b.east };
}
export type CatalogResult = {
  places: CatalogRow[];
  warning?: string;
  updatedAt?: string;
  refreshing?: boolean;
  total?: number;
  displayLimited?: boolean;
};
export type CatalogRow = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  [key: string]: unknown;
};
export type CatalogStore = {
  authenticate: (authorization: string) => Promise<boolean>;
  list: (
    bounds: Bounds,
    category: string,
    authorization: string,
  ) => Promise<CatalogResult>;
};
export const boundsKey = (b: Bounds) =>
  [b.south, b.west, b.north, b.east].join(",");
export function buildQuery(b: Bounds) {
  const box = boundsKey(b);
  return `[out:json][timeout:15][maxsize:67108864];(nwr["name"]["shop"](${box});nwr["name"]["amenity"~"^(restaurant|cafe|bar|pub|fast_food|pharmacy|bank|hospital|clinic|doctors|dentist|school|university|college|police|fuel|marketplace|library|theatre|community_centre)$"](${box});nwr["name"]["leisure"~"^(park|fitness_centre|sports_centre)$"](${box}););out center tags 400;`;
}
export function parseOsmPlaces(
  payload: unknown,
  bounds: Bounds,
  now = new Date().toISOString(),
  area?: { nome: string; estado: string },
): CatalogPlace[] {
  const raw = payload as { elements?: unknown[]; remark?: string };
  if (!raw || !Array.isArray(raw.elements) || raw.remark)
    throw new Error("Resposta incompleta do catálogo.");
  const rows = new Map<string, CatalogPlace>();
  for (const item of raw.elements.slice(0, 400)) {
    const e = item as {
      type?: string;
      id?: number;
      lat?: number;
      lon?: number;
      center?: { lat?: number; lon?: number };
      tags?: Record<string, string>;
    };
    if (
      !["node", "way", "relation"].includes(e.type ?? "") ||
      !Number.isSafeInteger(e.id) ||
      e.id! <= 0
    )
      continue;
    const t = e.tags ?? {},
      name = String(t.name ?? "")
        .trim()
        .slice(0, 150);
    if (t.leisure === "park" && /^canteiro(?: avenida)?$/i.test(name)) continue;
    const latitude = e.lat ?? e.center?.lat,
      longitude = e.lon ?? e.center?.lon;
    if (
      !name ||
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < bounds.south ||
      latitude > bounds.north ||
      longitude < bounds.west ||
      longitude > bounds.east
    )
      continue;
    const ref = `${e.type}/${e.id}`;
    const street = [t["addr:street"], t["addr:housenumber"]]
      .filter(Boolean)
      .join(", ");
    const address = [
      street,
      t["addr:suburb"],
      t["addr:city"] || area?.nome,
      t["addr:state"] || area?.estado,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 300);
    rows.set(ref, {
      id: `osm:${e.type}:${e.id}`,
      nome: name,
      endereco: address,
      latitude,
      longitude,
      origem: "osm",
      referencia_externa: ref,
      categoria: String(t.shop || t.amenity || t.leisure || "local").slice(
        0,
        80,
      ),
      atualizado_em: now,
    });
  }
  return [...rows.values()];
}
type KnownPlace = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  referencia_externa?: string | null;
  duplicado_de?: string | null;
};
export function reconcilePlaces(places: CatalogPlace[], known: KnownPlace[]) {
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const byReference = new Map(
    known
      .filter((p) => p.referencia_externa)
      .map((p) => [p.referencia_externa, p]),
  );
  const seeds = known.filter(
    (p) => !p.id.startsWith("osm:") && !p.duplicado_de,
  );
  const rows = new Map<string, CatalogPlace>();
  for (const p of places) {
    const prior = byReference.get(p.referencia_externa);
    if (prior?.duplicado_de) continue;
    const seed = seeds.find(
      (m) =>
        normalize(m.nome) === normalize(p.nome) &&
        Math.hypot(m.latitude - p.latitude, m.longitude - p.longitude) < 0.001,
    );
    if (
      !prior &&
      seed?.referencia_externa &&
      seed.referencia_externa !== p.referencia_externa
    )
      continue;
    const row = { ...p, id: prior?.id ?? seed?.id ?? p.id };
    if (!rows.has(row.id)) rows.set(row.id, row);
  }
  return [...rows.values()];
}
export function createCatalogHandler(store: CatalogStore) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST")
      return reply({ message: "Método inválido." }, 405);
    const authorization = req.headers.get("authorization") ?? "";
    if (
      !authorization.startsWith("Bearer ") ||
      !(await store.authenticate(authorization).catch(() => false))
    )
      return reply(
        { message: "Entre na sua conta para carregar lugares." },
        401,
      );
    let bounds: Bounds, category: string;
    try {
      const text = await req.text();
      if (text.length > 2048) throw Error("Área inválida.");
      const body = JSON.parse(text);
      bounds = validateBounds(body.bounds);
      category = body.category ?? "all";
      if (
        ![
          "all",
          "parks",
          "restaurants",
          "cafes",
          "markets",
          "shops",
          "health",
          "education",
          "sports",
          "services",
          "other",
        ].includes(category)
      )
        throw Error("Categoria inválida.");
    } catch (e) {
      return reply(
        { message: e instanceof Error ? e.message : "Área inválida." },
        422,
      );
    }
    try {
      const result = await store.list(bounds, category, authorization);
      if (!Array.isArray(result.places) || result.places.length > 500)
        throw Error("Contrato de catálogo inválido");
      return reply({
        ...result,
        refreshing: false,
        source: "OpenStreetMap + Overture Maps",
        selection: "relevance",
        sources: [
          {
            name: "OpenStreetMap",
            license: "ODbL",
            attribution: "© OpenStreetMap contributors",
          },
          {
            name: "Overture Maps Places",
            license: "CDLA-Permissive-2.0 / Apache-2.0",
            attribution: "Overture Maps Foundation and source contributors",
          },
        ],
      });
    } catch {
      return reply(
        {
          message:
            "Não foi possível carregar os lugares desta área. Confira as cidades disponíveis e tente novamente.",
        },
        503,
      );
    }
  };
}
