import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { friendlyError, backendConfigured } from "../../lib/supabase";
import { loadProfile, type UserRole } from "../../services/profile";
import { useSession } from "../auth/SessionProvider";
export type { UserRole } from "../../services/profile";
type Profile = { nome: string; avatar_url: string | null };
const Context = createContext<{
  profile: Profile | null;
  role: UserRole;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
}>({ profile: null, role: "usuario", ready: false, error: "", refresh: async () => {} });
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useSession(),
    id = session?.user.id;
  const owner = useRef(id);
  owner.current = id;
  const [state, setState] = useState<{
    id?: string;
    profile: Profile | null;
    role: UserRole;
    ready: boolean;
    error: string;
  }>({ profile: null, role: "usuario", ready: false, error: "" });
  const sequence = useRef(0);
  const initialName =
    String(session?.user.user_metadata?.nome || "Meu perfil")
      .trim()
      .slice(0, 100) || "Meu perfil";
  const invalidate = useCallback(() => {
    ++sequence.current;
  }, []);
  const refresh = useCallback(async () => {
    if (!id || !backendConfigured) return;
    const request = ++sequence.current;
    try {
      const result = await loadProfile(id, initialName);
      if (owner.current === id && sequence.current === request)
        setState({ id, ...result, ready: true });
    } catch (e) {
      if (owner.current === id && sequence.current === request)
        setState((previous) => ({
          id,
          profile: previous.id === id ? previous.profile : null,
          role: "usuario",
          ready: true,
          error: friendlyError(e),
        }));
    }
  }, [id, initialName]);
  useEffect(() => {
    ++sequence.current;
    setState({ id, profile: null, role: "usuario", ready: false, error: "" });
    void refresh();
    return invalidate;
  }, [id, refresh, invalidate]);
  useEffect(() => {
    let previous = AppState.currentState;
    const listener = AppState.addEventListener("change", (next) => {
      if (next === "active" && previous !== "active") void refresh();
      previous = next;
    });
    return () => listener.remove();
  }, [refresh]);
  const value = useMemo(
    () => ({
      profile: state.id === id ? state.profile : null,
      role: state.id === id ? state.role : ("usuario" as UserRole),
      ready: !id || !backendConfigured || (state.id === id && state.ready),
      error: state.id === id ? state.error : "",
      refresh,
    }),
    [id, state, refresh],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useProfile = () => useContext(Context);
