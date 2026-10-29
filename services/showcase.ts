import { showcaseEnabled } from "../lib/appMode";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
export type ShowcaseRow =
  Database["public"]["Tables"]["conteudos_demonstracao"]["Row"];
export async function listDemonstrations(
  type: "evento" | "impacto" | "avaliacao" | "enquete" | "relato",
  placeId?: string,
) {
  if (!supabase || !showcaseEnabled) return [] as ShowcaseRow[];
  let query = supabase
    .from("conteudos_demonstracao")
    .select("*")
    .eq("tipo", type)
    .eq("ativo", true)
    .eq("ficticio", true);
  if (placeId) query = query.eq("lugar_id", placeId);
  const { data, error } = await query.order("ordem").order("id").limit(30);
  if (error) throw error;
  return data;
}
