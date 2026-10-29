import { parsePage } from "../../lib/pagination";
import type { Json } from "../../lib/database.types";
import type { Cursor } from "../../lib/pagination";
import { requireBackend } from "../../lib/supabase";
import type { RecordKind } from "../reports/records";
export type AdminKind = RecordKind | "perfil";
export type AdminRow = {
  id: string;
  titulo?: string;
  categoria?: string;
  local_texto?: string;
  descricao?: string;
  status?: string;
  sentimento?: string;
  categoria_app?: string | null;
  lugar_id?: string | null;
  criado_em: string;
  moderacao_revisao?: number;
  atualizado_em?: string;
};
export async function adminList(
  kind: AdminKind,
  query: string,
  status: string,
  cursor: Cursor | null,
) {
  const { data, error } = await requireBackend().rpc("fila_moderacao", {
    p_tipo: kind,
    p_cursor: cursor as unknown as Json,
    p_filtros: { busca: query, status },
  });
  if (error) throw error;
  return parsePage<AdminRow>(data);
}
export async function adminSummary() {
  const { data, error } = await requireBackend().rpc("admin_resumo");
  if (error) throw error;
  return data as Record<string, number>;
}
export async function moderate(
  kind: RecordKind,
  row: AdminRow,
  status: string,
  reason: string,
) {
  if (row.moderacao_revisao == null)
    throw new Error("Atualize a lista antes de decidir.");
  const { error } = await requireBackend().rpc("moderar_revisao", {
    p_tipo: kind,
    p_id: row.id,
    p_status: status,
    p_motivo: reason,
    p_anterior: row.status ?? "",
    p_revisao: row.moderacao_revisao,
  });
  if (error) throw error;
}
export async function classify(
  row: AdminRow,
  category: string,
  reason: string,
) {
  if (!row.atualizado_em) throw new Error("Atualize a lista antes de decidir.");
  const { error } = await requireBackend().rpc("classificar_lugar_revisao", {
    p_id: row.id,
    p_categoria: category,
    p_motivo: reason,
    p_anterior: row.categoria_app ?? "",
    p_revisao: row.atualizado_em,
  });
  if (error) throw error;
}
