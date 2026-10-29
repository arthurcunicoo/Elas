import { requireBackend } from "../lib/supabase";
// Core screens remain compatible with v11 while optional administration RPCs roll out.
export const requiredBackendVersion = 11;
export type BackendState =
  | "available"
  | "connection"
  | "timeout"
  | "unavailable"
  | "incompatible"
  | "session"
  | "permission";
export function classifyBackend(data: unknown, error?: unknown): BackendState {
  if (!error)
    return Number.isInteger(data)
      ? Number(data) >= requiredBackendVersion
        ? "available"
        : "incompatible"
      : "unavailable";
  const detail = error as {
    status?: number;
    code?: string;
    name?: string;
    message?: string;
  };
  if (detail.status === 403 || detail.code === "42501") return "permission";
  if (detail.code === "PGRST202") return "incompatible";
  if (
    detail.status === 401 ||
    detail.code === "PGRST301"
  )
    return "session";
  if (
    detail.name === "AbortError" ||
    /timeout|timed out|demorou|abort/i.test(detail.message ?? "")
  )
    return "timeout";
  if (detail.status && detail.status >= 500) return "unavailable";
  if (/fetch|network|conexão|connection/i.test(detail.message ?? ""))
    return "connection";
  return "unavailable";
}
export async function checkBackendSchema(): Promise<BackendState> {
  try {
    const { data, error } = await requireBackend().rpc("versao_app");
    return classifyBackend(data, error);
  } catch (error) {
    return classifyBackend(null, error);
  }
}
export const backendMessages: Record<
  Exclude<BackendState, "available">,
  { title: string; message: string }
> = {
  permission: { title: "Acesso não autorizado", message: "Sua conta não tem permissão para esta operação. Verifique o acesso com a equipe responsável." },
  connection: {
    title: "Não foi possível conectar",
    message:
      "Confira sua conexão e tente novamente. Não foi possível verificar o serviço agora.",
  },
  timeout: {
    title: "A conexão demorou",
    message: "O serviço não respondeu a tempo. Tente novamente em instantes.",
  },
  unavailable: {
    title: "Serviço temporariamente indisponível",
    message:
      "Não foi possível verificar o serviço agora. Aguarde um pouco e tente novamente.",
  },
  incompatible: {
    title: "Serviço em atualização",
    message:
      "O serviço ainda precisa receber a atualização exigida por esta versão do app. Tente novamente após a atualização.",
  },
  session: {
    title: "Confirme sua sessão",
    message: "Entre novamente na sua conta para continuar.",
  },
};
