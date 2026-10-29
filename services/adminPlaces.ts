import { requireBackend } from "../lib/supabase";
export async function readEditablePlace(id: string) {
  const { data, error } = await requireBackend()
    .from("lugares")
    .select("nome,endereco,foto_url,atualizado_em")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
export async function correctPlace(
  id: string,
  previous: string,
  name: string,
  address: string,
  photo: string,
  reason: string,
) {
  const { error } = await requireBackend().rpc("corrigir_lugar", {
    p_id: id,
    p_anterior: previous,
    p_nome: name.trim(),
    p_endereco: address.trim(),
    p_foto: photo.trim(),
    p_motivo: reason.trim(),
  });
  if (error) throw error;
  const { data, error: readError } = await requireBackend()
    .from("lugares")
    .select("atualizado_em")
    .eq("id", id)
    .single();
  if (readError) throw readError;
  return data.atualizado_em;
}
