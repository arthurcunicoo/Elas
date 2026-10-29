import { readSession, subscribeSession, startSessionRefresh, stopSessionRefresh } from "../../services/session";
import type { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { acceptsInitialSession } from "./initialSession";
import { friendlyError, backendConfigured } from "../../lib/supabase";
type AuthState = { session: Session | null; ready: boolean; error: string };
const Context = createContext<AuthState>({
  session: null,
  ready: !backendConfigured,
  error: "",
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    ready: !backendConfigured,
    error: "",
  });
  useEffect(() => {
    if (!backendConfigured) return;
    let active = true,
      changed = false;
    const unsubscribe = subscribeSession((session) => {
      changed = true;
      if (active) setState({ session, ready: true, error: "" });
    });
    void readSession()
      .then(({ data, error }) => {
        if (acceptsInitialSession(active, changed))
          setState({
            session: data.session,
            ready: true,
            error: error ? friendlyError(error) : "",
          });
      })
      .catch((e) => {
        if (acceptsInitialSession(active, changed))
          setState({ session: null, ready: true, error: friendlyError(e) });
      });
    const listener = AppState.addEventListener("change", (value) => {
      if (value === "active") startSessionRefresh();
      else stopSessionRefresh();
    });
    if (AppState.currentState === "active") startSessionRefresh();
    return () => {
      active = false;
      unsubscribe();
      listener.remove();
      stopSessionRefresh();
    };
  }, []);
  const value = useMemo(() => state, [state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
