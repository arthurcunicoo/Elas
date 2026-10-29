import { cursorPage } from "../../services/pagination";
import type { Cursor } from "../../lib/pagination";
import type { Database } from "../../lib/database.types";
import { requireBackend } from "../../lib/supabase";
export type Poll = {
  demonstracao?: boolean;
  id: string;
  pergunta: string;
  encerra_em: string;
  minha_opcao: string | null;
  encerrada: boolean;
  resultados_visiveis: boolean;
  opcoes: { id: string; texto: string; ordem: number; votos: number | null }[];
};
export type EventRow = Pick<
  Database["public"]["Tables"]["eventos"]["Row"],
  "id" | "titulo" | "descricao" | "local_texto" | "inicia_em" | "cancelado"
> & { inscrito: boolean };
export const listEvents = (cursor: Cursor | null, past = false) =>
  cursorPage<EventRow>("eventos", cursor, { passados: past });
export async function registerEvent(id: string, join: boolean) {
  if (id.startsWith("demo:"))
    throw new Error("Eventos de demonstração não recebem inscrições reais.");
  const { error } = await requireBackend().rpc("inscrever", {
    p_evento: id,
    p_participar: join,
  });
  if (error) throw error;
}
export const listPolls = (cursor: Cursor | null, closed?: boolean) =>
  cursorPage<Poll>(
    "enquetes",
    cursor,
    closed === undefined ? {} : { encerradas: closed },
  );
export async function vote(poll: string, option: string) {
  if (poll.startsWith("demo:") || option.startsWith("demo:"))
    throw new Error("Votos de demonstração não entram nas enquetes reais.");
  const { error } = await requireBackend().rpc("votar", {
    p_enquete: poll,
    p_opcao: option,
  });
  if (error) throw error;
}
export type Participation = {
  avaliacoes: number;
  relatos: number;
  melhorias: number;
  inscricoes: number;
};
export async function participation() {
  const { data, error } = await requireBackend().rpc("minha_participacao");
  if (error) throw error;
  return data as unknown as Participation;
}
export async function publishEvent(
  title: string,
  description: string,
  place: string,
  start: string,
) {
  const { error } = await requireBackend().rpc("publicar_evento", {
    p_titulo: title,
    p_descricao: description,
    p_local: place,
    p_inicio: start,
  });
  if (error) throw error;
}
export async function publishPoll(
  question: string,
  options: string[],
  end: string,
) {
  const { error } = await requireBackend().rpc("publicar_enquete", {
    p_pergunta: question,
    p_opcoes: options,
    p_fim: end,
  });
  if (error) throw error;
}

export async function ownVoteCount(userId: string) {
  const { count, error } = await requireBackend()
    .from("votos")
    .select("enquete_id", { count: "exact", head: true })
    .eq("usuario_id", userId);
  if (error) throw error;
  return count ?? 0;
}
