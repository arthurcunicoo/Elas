import { publicOfflineStore } from "../lib/publicOffline";
import { requireBackend } from "../lib/supabase";
import { createRecoveryClient } from "../lib/account";
import { disablePush } from "./push";
export async function signIn(email: string, password: string) {
  const { error } = await requireBackend().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await requireBackend().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { nome: name.trim() } },
  });
  if (error) throw error;
  return data;
}
export async function resendConfirmation(email: string) {
  const { error } = await requireBackend().auth.resend({
    type: "signup",
    email,
  });
  if (error) throw error;
}
export async function signOut() {
  const {data}=await requireBackend().auth.getSession();
  await disablePush();
  const { error } = await requireBackend().auth.signOut({ scope: "local" });
  if (error) throw error;
  if(data.session?.user.id) await publicOfflineStore.clear(data.session.user.id).catch(()=>{});
}
export async function changeEmail(email: string) {
  const { error } = await requireBackend().auth.updateUser({ email });
  if (error) throw error;
}
export async function changePassword(
  userId: string,
  email: string,
  current: string,
  password: string,
) {
  const checker = createRecoveryClient();
  if (!checker) throw new Error("Projeto não configurado");
  try {
    const { data, error } = await checker.auth.signInWithPassword({
      email,
      password: current,
    });
    if (error) throw error;
    if (data.user?.id !== userId) throw new Error("Conta diferente");
    const { error: updateError } = await requireBackend().auth.updateUser({
      password,
      current_password: current,
    });
    if (updateError) throw updateError;
  } finally {
    await checker.auth.signOut({ scope: "local" });
  }
}
export async function requestPasswordRecovery(email: string) {
  const { error } = await requireBackend().auth.resetPasswordForEmail(
    email.trim(),
  );
  if (error) throw error;
}
export function createPasswordRecovery() {
  const client = createRecoveryClient();
  return {
    async verify(email: string, code: string) {
      if (!client) throw new Error("Projeto não configurado");
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery",
      });
      if (error || !data.session) throw error || new Error("Código inválido");
    },
    async change(password: string) {
      if (!client) throw new Error("Projeto não configurado");
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
    async close() {
      if (client) await client.auth.signOut({ scope: "local" });
    },
  };
}
