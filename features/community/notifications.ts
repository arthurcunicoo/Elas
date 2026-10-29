import { cursorPage } from "../../services/pagination";
import type { Cursor } from "../../lib/pagination";
import type { Database } from "../../lib/database.types";
import { requireBackend } from "../../lib/supabase";
type NotificationRow = Pick<
  Database["public"]["Tables"]["notificacoes"]["Row"],
  "id" | "titulo" | "mensagem" | "tipo" | "registro_id" | "lida" | "criado_em"
>;
export const listNotifications = (cursor: Cursor | null) =>
  cursorPage<NotificationRow>("notificacoes", cursor);
export async function markRead(id: string) {
  const { data, error } = await requireBackend()
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Notificação indisponível. Atualize a lista.");
}

export async function markAllRead() {
  const { error } = await requireBackend()
    .from("notificacoes")
    .update({ lida: true })
    .eq("lida", false);
  if (error) throw error;
}
export async function unreadCount() {
  const { count, error } = await requireBackend()
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("lida", false);
  if (error) throw error;
  return count ?? 0;
}
