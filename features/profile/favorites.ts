import { cursorPage } from "../../services/pagination";
import { mapPage, type Cursor } from "../../lib/pagination";
import { requireBackend } from "../../lib/supabase";
import { toPlace, type PlaceRow } from "../../services/places";
export async function isFavorite(id: string) {
  const { data, error } = await requireBackend()
    .from("favoritos")
    .select("lugar_id")
    .eq("lugar_id", id)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
export async function setFavorite(userId: string, id: string, value: boolean) {
  const client = requireBackend();
  const result = value
    ? await client
        .from("favoritos")
        .upsert(
          { usuario_id: userId, lugar_id: id },
          { ignoreDuplicates: true },
        )
    : await client
        .from("favoritos")
        .delete()
        .eq("usuario_id", userId)
        .eq("lugar_id", id);
  if (result.error) throw result.error;
}
export async function listFavorites(cursor: Cursor | null) {
  return mapPage(await cursorPage<PlaceRow>("favoritos", cursor), (rows) =>
    rows.map(toPlace),
  );
}
