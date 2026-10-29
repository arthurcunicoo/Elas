import { requireBackend, backendConfigured } from "../lib/supabase";
import { initialMapRegion, type MapRegion } from "../constants/places";
export type ServiceArea = {
  id: string;
  nome: string;
  estado: string;
  timezone: string;
  bounds: { south: number; west: number; north: number; east: number };
  region: MapRegion;
};
// A demo start point is presentation data; live bounds and centres always come from the database.
export const demoArea: ServiceArea = {
  id: "demo",
  nome: "Demonstração",
  estado: "SC",
  timezone: "America/Sao_Paulo",
  bounds: { south: -28.85, north: -28.55, west: -49.55, east: -49.2 },
  region: initialMapRegion,
};
export async function listServiceAreas(): Promise<ServiceArea[]> {
  if (!backendConfigured) return [demoArea];
  const { data, error } = await requireBackend()
    .from("service_areas")
    .select(
      "id,nome,estado,timezone,south,west,north,east,latitude,longitude,latitude_delta,longitude_delta",
    )
    .eq("ativa", true)
    .order("prioridade", { ascending: false })
    .order("id");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    nome: row.nome,
    estado: row.estado,
    timezone: row.timezone,
    bounds: {
      south: row.south,
      west: row.west,
      north: row.north,
      east: row.east,
    },
    region: {
      latitude: row.latitude,
      longitude: row.longitude,
      latitudeDelta: row.latitude_delta,
      longitudeDelta: row.longitude_delta,
    },
  }));
}

export function areaContains(
  area: ServiceArea,
  point: { latitude: number; longitude: number },
) {
  return (
    !!area.bounds &&
    point.latitude >= area.bounds.south &&
    point.latitude <= area.bounds.north &&
    point.longitude >= area.bounds.west &&
    point.longitude <= area.bounds.east
  );
}
