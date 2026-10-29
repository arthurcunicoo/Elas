import { cursorPage } from "./pagination";
import { emptyPage, type Cursor } from "../lib/pagination";
import { MapRegion } from "../constants/places";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/database.types";

export type Report = Pick<
  Database["public"]["Tables"]["relatos"]["Row"],
  | "id"
  | "lugar_id"
  | "categoria"
  | "descricao"
  | "local_texto"
  | "latitude"
  | "longitude"
  | "status"
  | "criado_em"
> & {demonstracao?: boolean};
export const categories = [
  "Iluminação",
  "Movimento de pessoas",
  "Acessibilidade",
  "Assédio ou Importunação",
  "Limpeza/Conservação",
  "Outro",
] as const;

export const listReports = (cursor: Cursor | null, recent = false) =>
  supabase
    ? cursorPage<Report>("relatos", cursor, {
        recentes: recent,
        publicas: true,
      })
    : Promise.resolve(emptyPage<Report>());
export type ReportBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};
export type ReportMapNode = {
  id: string;
  count: number;
  latitude: number;
  longitude: number;
  bounds: ReportBounds;
  report: Report | null;
};
export type ReportMap = { total: number; nodes: ReportMapNode[] };
export async function mapReports(
  region: MapRegion,
  zoom: number,
  signal?: AbortSignal,
): Promise<ReportMap> {
  if (!supabase) return { total: 0, nodes: [] };
  const request = supabase.rpc("mapa_relatos", {
    p_sul: Math.max(-85, region.latitude - region.latitudeDelta / 2),
    p_norte: Math.min(85, region.latitude + region.latitudeDelta / 2),
    p_oeste: Math.max(-180, region.longitude - region.longitudeDelta / 2),
    p_leste: Math.min(180, region.longitude + region.longitudeDelta / 2),
    p_zoom: zoom,
  });
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw error;
  const result = data as unknown as ReportMap;
  if (
    !result ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0 ||
    !Array.isArray(result.nodes) ||
    result.nodes.length > 64 ||
    result.nodes.some(
      (node) =>
        typeof node.id !== "string" ||
        !node.bounds ||
        ![
          node.bounds.south,
          node.bounds.west,
          node.bounds.north,
          node.bounds.east,
        ].every(Number.isFinite) ||
        node.bounds.south > node.bounds.north ||
        node.bounds.west > node.bounds.east ||
        !Number.isSafeInteger(node.count) ||
        node.count < 1 ||
        !Number.isFinite(node.latitude) ||
        !Number.isFinite(node.longitude) ||
        (node.count === 1 ? !node.report : node.report !== null),
    ) ||
    result.nodes.reduce((sum, node) => sum + node.count, 0) !== result.total
  )
    throw new Error("O mapa de relatos retornou uma resposta inválida.");
  return result;
}
export const reportsInBounds = (cursor: Cursor | null, area: ReportBounds) =>
  cursorPage<Report>("relatos_area", cursor, {
    area: [area.south, area.west, area.north, area.east],
  });

export async function createReport(
  requestId: string,
  payload: {
    categoria: string;
    local_texto: string;
    descricao: string;
    latitude?: number;
    longitude?: number;
    lugar_id?: string;
  },
) {
  if (!supabase) throw new Error("Conexão com o banco indisponível.");
  const { data, error } = await supabase.rpc("enviar_registro", {
    p_tipo: "relato",
    p_chave: requestId,
    p_dados: payload,
  });
  if (error) throw error;
  return data;
}

export async function findReport(id: string, signal?: AbortSignal) {
  if (!supabase) return null;
  const query = supabase
    .from("relatos")
    .select("id,lugar_id,categoria,descricao,local_texto,latitude,longitude,status,criado_em")
    .eq("id", id);
  const { data, error } = await (signal ? query.abortSignal(signal) : query).maybeSingle();
  if (error) throw error;
  return data;
}
