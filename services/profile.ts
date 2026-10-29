import { requireBackend } from "../lib/supabase";
import { avatarDisplay } from "../features/profile/avatar";
import { normalizeRole } from "../features/auth/authorization";
export type { UserRole } from "../features/auth/authorization";
export async function loadProfile(userId: string, initialName: string) {
  const db = requireBackend();
  const { error } = await db
    .from("perfis")
    .upsert(
      { id: userId, nome: initialName },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw error;
  const [profile, role] = await Promise.all([
    db.from("perfis").select("nome,avatar_url").eq("id", userId).single(),
    db.rpc("meu_papel"),
  ]);
  if (profile.error) throw profile.error;
  return {
    profile: {
      ...profile.data,
      avatar_url: await avatarDisplay(profile.data.avatar_url),
    },
    role: role.error ? ("usuario" as const) : normalizeRole(role.data),
    error: role.error || !["usuario", "moderador", "admin"].includes(role.data ?? "")
      ? "Não foi possível carregar as permissões. Atualize o perfil."
      : "",
  };
}
export async function readProfileName(userId: string) {
  const { data, error } = await requireBackend()
    .from("perfis")
    .select("nome")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.nome ?? "";
}
export async function saveProfileName(userId: string, name: string) {
  const { error } = await requireBackend()
    .from("perfis")
    .upsert({ id: userId, nome: name.trim() }, { onConflict: "id" })
    .select("nome")
    .single();
  if (error) throw error;
}
