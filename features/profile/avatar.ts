import { decode } from "base64-arraybuffer";
import { randomUUID } from "expo-crypto";
import { requireBackend } from "../../lib/supabase";
export type AvatarInput = {
  uri: string;
  base64?: string | null;
  mimeType?: string;
  fileSize?: number;
};
export async function avatarDisplay(raw: string | null) {
  if (!raw?.startsWith("avatar://")) return raw;
  const { data, error } = await requireBackend()
    .storage.from("avatars")
    .createSignedUrl(raw.slice(9), 3600);
  if (error) throw error;
  return data.signedUrl;
}
export async function saveAvatar(userId: string, asset: AvatarInput | null) {
  const db = requireBackend();
  const { data: session } = await db.auth.getSession();
  if (session.session?.user.id !== userId)
    throw new Error("A conta mudou. Entre novamente.");
  const { data: previous, error: readError } = await db
    .from("perfis")
    .select("avatar_url")
    .eq("id", userId)
    .single();
  if (readError) throw readError;
  let path: string | null = null;
  if (asset) {
    const type = asset.mimeType ?? "image/jpeg";
    const ext = (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      } as Record<string, string>
    )[type];
    if (!ext) throw new Error("Escolha uma foto JPEG, PNG ou WebP.");
    const body = asset.base64
      ? decode(asset.base64)
      : await (await fetch(asset.uri)).arrayBuffer();
    if (!body.byteLength || body.byteLength > 5 * 1024 * 1024)
      throw new Error("Escolha uma foto de até 5 MB.");
    path = `${userId}/${randomUUID()}.${ext}`;
    const { error } = await db.storage
      .from("avatars")
      .upload(path, body, { contentType: type, upsert: false });
    if (error) throw error;
  }
  const { data, error } = await db
    .from("perfis")
    .update({ avatar_url: path ? `avatar://${path}` : null })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (path) await db.storage.from("avatars").remove([path]);
    throw error ?? new Error("Perfil indisponível.");
  }
  // Commit the profile first: cleanup failure must not undo a saved avatar.
  const old = previous.avatar_url?.startsWith("avatar://")
    ? previous.avatar_url.slice(9)
    : null;
  if (old) {
    const removed = await db.storage.from("avatars").remove([old]);
    return removed.error
      ? "Foto salva; a foto anterior não pôde ser removida. Tente limpar fotos antigas."
      : "";
  }
  return "";
}
export async function cleanAvatars(userId: string) {
  const db = requireBackend(),
    { data: profile, error } = await db
      .from("perfis")
      .select("avatar_url")
      .eq("id", userId)
      .single();
  if (error) throw error;
  const current = profile.avatar_url?.slice(9);
  const { data: files, error: listError } = await db.storage
    .from("avatars")
    .list(userId, { limit: 100 });
  if (listError) throw listError;
  const paths = files
    .map((f) => `${userId}/${f.name}`)
    .filter((path) => path !== current);
  if (paths.length) {
    const { error } = await db.storage.from("avatars").remove(paths);
    if (error) throw error;
  }
}
