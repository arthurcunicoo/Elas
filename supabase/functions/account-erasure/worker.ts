export type ErasureStore = {
  authenticate(jwt: string): Promise<{ id: string; email: string } | null>;
  verifyPassword(
    email: string,
    password: string,
    expected: string,
  ): Promise<boolean>;
  begin(id: string): Promise<string | null>;
  revoke(jwt: string): Promise<void>;
  removeAvatars(id: string): Promise<void>;
  erase(id: string): Promise<void>;
};
export function createErasureHandler(store: ErasureStore) {
  const reply = (status: number, message: string) =>
    new Response(JSON.stringify({ message }), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization,apikey,content-type,x-client-info,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
    });
  return async (req: Request) => {
    if (req.method === "OPTIONS") return reply(200, "");
    if (req.method !== "POST") return reply(405, "Método inválido.");
    const jwt = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!jwt) return reply(401, "Entre novamente para continuar.");
    const user = await store.authenticate(jwt).catch(() => null);
    if (!user) return reply(401, "Entre novamente para continuar.");
    if (Number(req.headers.get("content-length") ?? 0) > 4096)
      return reply(413, "Solicitação inválida.");
    const reader = req.body?.getReader();
    let body = "",
      bytes = 0;
    try {
      if (!reader) throw Error();
      const decoder = new TextDecoder();
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 4096) {
          await reader.cancel();
          return reply(413, "Solicitação inválida.");
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
      const input = JSON.parse(body);
      if (
        input.confirmation !== "EXCLUIR" ||
        typeof input.password !== "string" ||
        !input.password ||
        input.password.length > 1024
      )
        return reply(400, "Confirme a exclusão e informe sua senha atual.");
      if (!(await store.verifyPassword(user.email, input.password, user.id)))
        return reply(403, "Não foi possível confirmar sua senha atual.");
    } catch {
      return reply(400, "Não foi possível confirmar a solicitação.");
    } finally {
      reader?.releaseLock();
    }
    try {
      const lease = await store.begin(user.id);
      if (!lease)
        return reply(
          409,
          "A exclusão já está em processamento. Aguarde e tente novamente.",
        );
      await store.revoke(jwt);
      await store.removeAvatars(user.id);
      await store.erase(user.id);
      return reply(200, "Conta excluída.");
    } catch (error) {
      if ((error as {code?: string})?.code === "23514" &&
        (error as {message?: string})?.message === "Transfira a administração antes de remover o último administrador.")
        return reply(409, "Transfira a administração antes de remover o último administrador.");
      return reply(
        503,
        "A exclusão não foi concluída. Aguarde dois minutos e tente novamente. Sua conta fica restrita enquanto processamos.",
      );
    }
  };
}
