import {requireBackend} from "../lib/supabase";
import {parsePage, type Cursor} from "../lib/pagination";
import type {Json} from "../lib/database.types";
import type {UserRole} from "../features/auth/authorization";
export type RoleRecord = {id: string; nome: string; papel?: UserRole; anterior?: UserRole; novo?: UserRole; motivo?: string; criado_em?: string; responsavel?: string};
export async function rolePage(search: string, history: boolean, cursor: Cursor | null) {
  const {data,error} = await requireBackend().rpc("pagina_papeis", {p_busca: search, p_historico: history, p_cursor: cursor as unknown as Json});
  if (error) throw error;
  return parsePage<RoleRecord>(data);
}
export async function changeRole(row: RoleRecord, role: UserRole, reason: string) {
  if (!row.papel || reason.trim().length < 5) throw new Error("Informe o motivo e atualize a conta antes de continuar.");
  const {error} = await requireBackend().rpc("alterar_papel", {p_usuario: row.id, p_papel: role, p_anterior: row.papel, p_motivo: reason.trim()});
  if (error) throw error;
}
