import { requireBackend } from "../lib/supabase";
import { parsePage, type Cursor, type Page } from "../lib/pagination";
import type { Json } from "../lib/database.types";
export async function cursorPage<T extends { id: string }>(
  list: string,
  cursor: Cursor | null,
  filters: Record<string, Json> = {},
  signal?: AbortSignal,
): Promise<Page<T>> {
  const request = requireBackend().rpc("pagina_app", {
    p_lista: list,
    p_cursor: cursor as unknown as Json,
    p_filtros: filters,
  });
  const { data, error } = await (signal
    ? request.abortSignal(signal)
    : request);
  if (error) throw error;
  const page = parsePage<T>(data);
  if (
    cursor &&
    page.nextCursor &&
    JSON.stringify(cursor) === JSON.stringify(page.nextCursor)
  )
    throw new Error("O cursor não avançou. Atualize a lista.");
  return page;
}
