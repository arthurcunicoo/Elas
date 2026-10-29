export type Cursor = {
  v: 1;
  scope: string;
  at: string;
  key: string;
  id: string;
};
export type Page<T> = { rows: T[]; nextCursor: Cursor | null };
export function emptyPage<T>(): Page<T> {
  return { rows: [], nextCursor: null };
}
export function localPage<T>(rows: T[]): Page<T> {
  return { rows: rows.slice(0, 20), nextCursor: null };
}
export function isCursor(value: unknown): value is Cursor {
  if (!value || typeof value !== "object") return false;
  const c = value as Cursor;
  return (
    c.v === 1 &&
    /^[a-f0-9]{32}$/.test(c.scope) &&
    typeof c.at === "string" &&
    c.at.length <= 64 &&
    /^\d{4}-\d\d-\d\dT/.test(c.at) &&
    typeof c.key === "string" &&
    c.key.length > 0 &&
    c.key.length <= 512 &&
    typeof c.id === "string" &&
    c.id.length > 0 &&
    c.id.length <= 200
  );
}
export function parsePage<T extends { id: string }>(value: unknown): Page<T> {
  if (!value || typeof value !== "object") throw new Error("Página inválida.");
  const page = value as Page<T>;
  if (
    !Array.isArray(page.rows) ||
    page.rows.length > 20 ||
    page.rows.some((row) => !row || typeof row.id !== "string") ||
    new Set(page.rows.map((row) => row.id)).size !== page.rows.length ||
    !(page.nextCursor === null || isCursor(page.nextCursor)) ||
    (!page.rows.length && page.nextCursor !== null)
  )
    throw new Error("Página inválida.");
  return page;
}
export async function mapPage<T, U>(
  page: Page<T>,
  transform: (rows: T[]) => U[] | Promise<U[]>,
): Promise<Page<U>> {
  return { rows: await transform(page.rows), nextCursor: page.nextCursor };
}
