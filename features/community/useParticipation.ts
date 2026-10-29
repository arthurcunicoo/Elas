import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { participation, ownVoteCount, Participation } from "./community";
import { useSession } from "../auth/SessionProvider";
import { backendConfigured, friendlyError } from "../../lib/supabase";
export function useParticipation() {
  const { session } = useSession(),
    userId = session?.user.id;
  const [data, setData] = useState<(Participation & { votos: number }) | null>(
      null,
    ),
    [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setData(null);
      setError("");
      if (userId && backendConfigured)
        void (async () => {
          try {
            const [counts, votes] = await Promise.all([
              participation(),
              ownVoteCount(userId),
            ]);
            if (active) {
              setData({ ...counts, votos: votes });
              setError("");
            }
          } catch (e) {
            if (active) setError(friendlyError(e));
          }
        })();
      return () => {
        active = false;
      };
    }, [userId]),
  );
  return { data, error };
}
