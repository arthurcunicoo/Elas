import { cursorPage } from "./pagination";
import { emptyPage, type Cursor } from "../lib/pagination";
import type { Database } from "../lib/database.types";
import { requireBackend } from "../lib/supabase";
export type ReviewFactor = { id: string; nome: string };
export async function listReviewFactors(): Promise<ReviewFactor[]> {
  const { data, error } = await requireBackend()
    .from("fatores")
    .select("id,nome")
    .order("ordem");
  if (error) throw error;
  return data;
}
export async function readOwnReview(placeId: string, userId: string) {
  const { data, error } = await requireBackend()
    .from("avaliacoes")
    .select("sentimento,comentario,avaliacao_fatores(fator_id)")
    .eq("lugar_id", placeId)
    .eq("usuario_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function saveReview(
  placeId: string,
  mood: string,
  comment: string,
  factors: string[],
) {
  const { error } = await requireBackend().rpc("salvar_avaliacao", {
    p_lugar: placeId,
    p_sentimento: mood,
    p_comentario: comment.trim(),
    p_fatores: factors,
  });
  if (error) throw error;
}
type OwnReviewRow = Pick<
  Database["public"]["Tables"]["avaliacoes"]["Row"],
  "id" | "lugar_id" | "sentimento" | "comentario" | "atualizado_em" | "status"
> & { lugares: { nome: string } | null };
export async function listOwnReviews(userId: string, cursor: Cursor | null) {
  if (!userId) return emptyPage<OwnReviewRow>();
  return cursorPage<OwnReviewRow>("avaliacoes", cursor);
}
export async function removeOwnReview(id: string, userId: string) {
  const { data, error } = await requireBackend()
    .from("avaliacoes")
    .delete()
    .eq("id", id)
    .eq("usuario_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Avaliação indisponível.");
}
