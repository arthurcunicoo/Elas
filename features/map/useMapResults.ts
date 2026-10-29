import { useMemo } from "react";
import { normalizePlaceQuery, type MapRegion, type Place } from "../../constants/places";
import { categoryForPlace, type CategoryId } from "../../constants/placeCategories";
export function useMapResults(
  places: Place[],
  region: MapRegion,
  filter: CategoryId,
  query: string,
  importedRows: Place[],
  remote: boolean,
) {
  const areaPlaces = useMemo(() => {
    const maxLat = region.latitudeDelta * 0.55,
      maxLon = region.longitudeDelta * 0.55;
    return places.filter(
      (p) =>
        Math.abs(p.latitude - region.latitude) <= maxLat &&
        Math.abs(p.longitude - region.longitude) <= maxLon,
    );
  }, [places, region]);
  const available = useMemo(
    () =>
      filter === "all"
        ? areaPlaces
        : areaPlaces.filter((p) => categoryForPlace(p).id === filter),
    [areaPlaces, filter],
  );
  const localResults = useMemo(() => {
    if (remote) return [];
    const normalizedQuery = normalizePlaceQuery(query);
    if (!normalizedQuery) return available;
    return available.filter((p) =>
      normalizePlaceQuery(`${p.name} ${p.address}`).includes(normalizedQuery),
    );
  }, [available, query, remote]);
  const results = remote ? importedRows : localResults;
  const counts = useMemo(() => {
    const value: Partial<Record<CategoryId, number>> = {
      all: areaPlaces.length,
    };
    for (let i = 0; i < areaPlaces.length; i++) {
      const id = categoryForPlace(areaPlaces[i]).id;
      value[id] = (value[id] ?? 0) + 1;
    }
    return value;
  }, [areaPlaces]);
  return { available, results, counts };
}
