import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "../auth/SessionProvider";
import { emptyImpacts, listImprovements, type ImpactPanel } from "../../services/improvements";
import type { ShowcaseRow } from "../../services/showcase";
import { friendlyError } from "../../lib/supabase";
type State = ImpactPanel & {
  key: string;
  examples: ShowcaseRow[];
  loading: boolean;
  error: string;
};
export function useImpacts() {
  const { session } = useSession(),
    key = session?.user.id ?? "";
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<State>(() => ({
    ...emptyImpacts(),
    key,
    examples: [],
    loading: true,
    error: "",
  }));
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useFocusEffect(
    useCallback(() => {
      void revision; // Explicit refresh invalidates the current request.
      let active = true;
      setState({
        ...emptyImpacts(),
        key,
        examples: [],
        loading: !!key,
        error: "",
      });
      if (key)
        void listImprovements()
          .then((result) => {
            if (active) setState({ ...result, key, loading: false, error: "" });
          })
          .catch((error) => {
            if (active)
              setState({
                ...emptyImpacts(),
                key,
                examples: [],
                loading: false,
                error: friendlyError(error),
              });
          });
      return () => {
        active = false;
      };
    }, [key, revision]),
  );
  return {
    ...(state.key === key
      ? state
      : { ...emptyImpacts(), examples: [], loading: !!key, error: "" }),
    refresh,
  };
}
