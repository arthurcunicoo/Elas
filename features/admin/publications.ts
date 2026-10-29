import { cursorPage } from "../../services/pagination";
import type { Cursor } from "../../lib/pagination";
import { requireBackend } from "../../lib/supabase";
export type Publication = {
  id: string;
  titulo?: string;
  descricao?: string;
  local_texto?: string;
  inicia_em?: string;
  pergunta?: string;
  encerra_em?: string;
  cancelado?: boolean;
  publicado: boolean;
  atualizado_em: string;
};
export const publications = (
  kind: "evento" | "enquete",
  cursor: Cursor | null,
) => cursorPage<Publication>("publicacoes_" + kind, cursor);
export async function manage(
  kind: "evento" | "enquete",
  row: Publication,
  action: string,
  payload: Record<string, string> = {},
) {
  const { error } = await requireBackend().rpc("gerenciar_publicacao", {
    p_tipo: kind,
    p_id: row.id,
    p_anterior: row.atualizado_em,
    p_acao: action,
    p_dados: payload,
  });
  if (error) throw error;
}
