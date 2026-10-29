import { demoMode } from "./appMode";
import "react-native-url-polyfill/auto";
import { protectedStorage } from "./storage/protectedStorage";
import { createClient, processLock } from "@supabase/supabase-js";
import { monitoredFetch } from "./monitoring";
import { deadlineFetch } from "./request";
import { Database } from "./database.types";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const configError =
  !demoMode &&
  (!url ||
    !key ||
    !/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url) ||
    !key.startsWith("sb_publishable_"))
    ? "Preencha a URL HTTPS do projeto e a chave publicável (sb_publishable_) no .env. Consulte BACKEND.md e reinicie o Expo."
    : "";
export const backendConfigured =
  !demoMode && Boolean(url && key && !configError);
export const backendFetch = deadlineFetch(monitoredFetch(fetch), 20000);
export const supabase = backendConfigured
  ? createClient<Database>(url!, key!, {
      global: {
        fetch: backendFetch,
      },
      auth: {
        storage: protectedStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;
export function requireBackend() {
  if (!supabase)
    throw new Error("Configure o Supabase seguindo o arquivo BACKEND.md.");
  return supabase;
}
export { friendlyError } from "./errors";
