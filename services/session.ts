import { type Session } from "@supabase/supabase-js";
import { requireBackend } from "../lib/supabase";
export function subscribeSession(onChange: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = requireBackend().auth.onAuthStateChange((_event, session) =>
    onChange(session),
  );
  return () => subscription.unsubscribe();
}
export const readSession = () => requireBackend().auth.getSession();
export const startSessionRefresh = () =>
  requireBackend().auth.startAutoRefresh();
export const stopSessionRefresh = () => requireBackend().auth.stopAutoRefresh();
