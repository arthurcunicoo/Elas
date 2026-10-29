import { cursorPage } from "../../services/pagination";
import type { Cursor } from "../../lib/pagination";
import { requireBackend } from "../../lib/supabase";
export type RecordKind = "relato" | "melhoria" | "avaliacao" | "lugar";
export type OwnRecord = {
  id: string;
  titulo?: string;
  categoria?: string;
  local_texto?: string;
  descricao: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
  lugar_id?: string | null;
};
export type History = {
  id: string;
  anterior: string;
  novo: string;
  motivo: string;
  criado_em: string;
  responsavel: string;
};
export const statusLabels: Record<string, string> = {
  retirado: "Retirado pelo autor",
  pendente: "Em análise",
  verificado: "Verificado",
  resolvido: "Resolvido",
  solicitada: "Solicitada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};
export const ownRecords = (
  kind: "relato" | "melhoria",
  cursor: Cursor | null,
) => cursorPage<OwnRecord>("registros_" + kind, cursor);
export const history = (kind: RecordKind, id: string, cursor: Cursor | null) =>
  cursorPage<History>("historico", cursor, { tipo: kind, id });

export type RecordDetail = OwnRecord & {
  proprio: boolean;
  latitude?: number | null;
  longitude?: number | null;
  sentimento?: string;
};
export async function recordDetail(
  kind: "relato" | "melhoria" | "avaliacao",
  id: string,
) {
  const { data, error } = await requireBackend().rpc("detalhes_registro", {
    p_tipo: kind,
    p_id: id,
  });
  if (error) throw error;
  return data as unknown as RecordDetail | null;
}
export async function updateRecord(
  kind: "relato" | "melhoria",
  row: OwnRecord,
  payload: { titulo?: string; descricao: string },
  withdraw = false,
) {
  const { error } = await requireBackend().rpc("alterar_registro_proprio", {
    p_tipo: kind,
    p_id: row.id,
    p_anterior: row.atualizado_em,
    p_dados: payload,
    p_retirar: withdraw,
  });
  if (error) throw error;
}
