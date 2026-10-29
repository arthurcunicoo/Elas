import { selectedServiceArea, subscribeServiceSelection, selectServiceArea } from "./serviceSelection";
import { useCallback, useState, useEffect, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "../auth/SessionProvider";
import { listServiceAreas, type ServiceArea } from "../../services/serviceAreas";
import { friendlyError } from "../../lib/supabase";
export function useServiceAreas() {
  const { session } = useSession(),
    user = session?.user.id ?? "demo";
  const [state, setState] = useState<{
    user: string;
    rows: ServiceArea[];
    error: string;
    loading: boolean;
  }>({ user, rows: [], error: "", loading: true });
  const selected = useSyncExternalStore(
    subscribeServiceSelection,
    () => selectedServiceArea(user)?.id ?? "",
    () => "",
  );
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      void revision;
      setState((previous) => ({
        ...previous,
        user,
        rows: previous.user === user ? previous.rows : [],
        loading: true,
        error: "",
      }));
      let active = true;
      void listServiceAreas()
        .then((rows) => {
          if (active)
            setState({
              user,
              rows,
              error: rows.length ? "" : "Nenhuma cidade disponível no momento.",
              loading: false,
            });
        })
        .catch((error) => {
          if (active)
            setState((previous) => ({
              user,
              rows: previous.user === user ? previous.rows : [],
              error: friendlyError(error),
              loading: false,
            }));
        });
      return () => {
        active = false;
      };
    }, [user, revision]),
  );
  const rows = state.user === user ? state.rows : [];
  const area = rows.find((row) => row.id === selected) ?? rows[0];
  useEffect(() => {
    if (area) selectServiceArea(user, area);
  }, [user, area]);
  return {
    rows,
    area,
    choose: (id: string) => {
      const area = rows.find((row) => row.id === id);
      if (area) selectServiceArea(user, area);
    },
    loading: state.user !== user || state.loading,
    error: state.user === user ? state.error : "",
    retry: () => setRevision((n) => n + 1),
  };
}
