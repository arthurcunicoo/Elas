import { cursorPage } from "./pagination";
import { mapPage, type Cursor } from "../lib/pagination";
import { hydrateCommunity, unavailableCommunity } from "./communityReviews";
import { MapRegion, Place } from "../constants/places";
import { requireBackend } from "../lib/supabase";
export type PlaceRow = {
  id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  foto_url?: string | null;
  origem?: string;
  referencia_externa?: string | null;
  categoria?: string | null;
  categoria_app?: string | null;
  atualizado_em?: string;
  foto_autor?: string | null;
  foto_licenca?: string | null;
  foto_fonte?: string | null;
  foto_data?: string | null;
  fonte_dados?: string | null;
  dados_verificados_em?: string | null;
  relevancia?: number | null;
};
export const placeColumns =
  "id,nome,endereco,latitude,longitude,foto_url,origem,referencia_externa,categoria,categoria_app,atualizado_em,foto_autor,foto_licenca,foto_fonte,foto_data,fonte_dados,dados_verificados_em,relevancia";
export function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.nome,
    prominence: row.relevancia ?? undefined,
    address: row.endereco,
    latitude: row.latitude,
    longitude: row.longitude,
    photoUrl: row.foto_url ?? undefined,
    status: "unknown",
    source:
      row.origem === "osm"
        ? "osm"
        : row.origem === "overture"
          ? "overture"
          : "manual",
    externalRef: row.referencia_externa ?? undefined,
    category: row.categoria ?? undefined,
    appCategory: row.categoria_app ?? undefined,
    updatedAt: row.atualizado_em,
    photoAuthor: row.foto_autor ?? undefined,
    photoLicense: row.foto_licenca ?? undefined,
    photoSource: row.foto_fonte ?? undefined,
    photoDate: row.foto_data ?? undefined,
    dataSource: row.fonte_dados ?? undefined,
    verifiedAt: row.dados_verificados_em ?? undefined,
  };
}
export async function nearbyPlaces(
  region: MapRegion,
  category = "all",
  signal?: AbortSignal,
) {
  const request = requireBackend().rpc("mapa_lugares", {
    p_sul: Math.max(-85, region.latitude - region.latitudeDelta / 2),
    p_norte: Math.min(85, region.latitude + region.latitudeDelta / 2),
    p_oeste: Math.max(-180, region.longitude - region.longitudeDelta / 2),
    p_leste: Math.min(180, region.longitude + region.longitudeDelta / 2),
    p_categoria: category,
  });
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw error;
  const response = data as unknown as {
    places: PlaceRow[];
    warning: string;
    updatedAt?: string;
    refreshing: boolean;
  };
  if (
    !response ||
    !Array.isArray(response.places) ||
    response.places.length > 500
  )
    throw new Error("O catálogo retornou uma resposta inválida.");
  return {
    places: response.places.map(toPlace),
    warning: typeof response.warning === "string" ? response.warning : "",
    updatedAt:
      typeof response.updatedAt === "string" ? response.updatedAt : undefined,
    refreshing: response.refreshing === true,
  };
}

export async function searchImportedPlaces(
  query: string,
  category: import("../constants/placeCategories").CategoryId,
  cursor: Cursor | null,
  signal?: AbortSignal,
) {
  const { categoryTags } = await import("../constants/placeCategories");
  const page = await cursorPage<PlaceRow>(
    "lugares",
    cursor,
    {
      busca: query.trim(),
      categoria: category,
      tags: category === "all" ? [] : [...categoryTags[category]],
      conhecidas: Object.values(categoryTags).flat(),
    },
    signal,
  );
  return mapPage(page, (rows) => {
    const places = rows.map(toPlace);
    return hydrateCommunity(places, signal).catch((error) => {
      if (signal?.aborted) throw error;
      return unavailableCommunity(places);
    });
  });
}

export async function resolvePlace(placeId: string, signal?: AbortSignal) {
  const request = requireBackend().rpc("resolver_lugar", {
    p_id: placeId,
  });
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw error;
  if (!data?.[0]) return null;
  const places = [toPlace(data[0])];
  return (
    await hydrateCommunity(places, signal).catch((error) => {
      if (signal?.aborted) throw error;
      return unavailableCommunity(places);
    })
  )[0];
}
