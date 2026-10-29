import { publicOfflineStore } from "../lib/publicOffline";
import { requireBackend } from "../lib/supabase";
import { clearAccountDrafts } from "../features/reports/draftStorage";
export const accountErasureEnabled =
  process.env.EXPO_PUBLIC_ACCOUNT_ERASURE_ENABLED === "true";
export async function eraseAccount(
  owner: string,
  password: string,
  confirmation: string,
) {
  if (!accountErasureEnabled || confirmation !== "EXCLUIR")
    throw new Error("Exclusão indisponível ou não confirmada.");
  const db = requireBackend();
  const { data } = await db.auth.getSession();
  if (data.session?.user.id !== owner)
    throw new Error("A conta mudou. Entre novamente.");
  const result = await db.functions.invoke("account-erasure", {
    body: { password, confirmation },
  });
  if (result.error) {
    const context = (result.error as {context?: Response}).context;
    if (context?.status === 409) {
      const body = await context.clone().json().catch(() => null);
      if (body?.message === "Transfira a administração antes de remover o último administrador.")
        throw new Error(body.message);
    }
    throw new Error(
      "Não foi possível concluir a exclusão. Confira sua senha e conexão; se já iniciou, aguarde dois minutos e tente novamente.",
    );
  }
  const cleanup = await Promise.allSettled([
    clearAccountDrafts(owner),
    publicOfflineStore.clear(owner),
  ]);
  // A different account may have signed in while the server processed deletion.
  let cleanupFailed = cleanup.some((result) => result.status === "rejected");
  try {
    const current = await db.auth.getSession();
    if (current.data.session?.user.id === owner) {
      const local = await db.auth.signOut({ scope: "local" });
      cleanupFailed ||= !!local.error;
    }
  } catch {
    cleanupFailed = true;
  }
  return cleanupFailed
    ? "Conta excluída no servidor. Não foi possível concluir a limpeza local deste aparelho."
    : "Conta excluída.";
}
