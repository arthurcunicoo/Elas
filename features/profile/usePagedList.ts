import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { friendlyError } from "../../lib/supabase";
import type { Cursor, Page } from "../../lib/pagination";
import { useSession } from "../auth/SessionProvider";
export function usePagedList<T extends { id: string }>(
  loader: (cursor: Cursor | null) => Promise<Page<T>>,
  scope = "",
) {
  const { session } = useSession(),
    key = `${session?.user.id}:${scope}`;
  const identity = useRef(key);
  identity.current = key;
  const generation = useRef(0),
    locked = useRef(false),
    refreshing = useRef(false),
    next = useRef<Cursor | null>(null),
    cursorOwner = useRef(key);
  const [state, setState] = useState<{
    key: string;
    rows: T[];
    loading: boolean;
    error: string;
    hasMore: boolean;
  }>({ key, rows: [], loading: false, error: "", hasMore: false });
  const load = useCallback(
    async (reset = false) => {
      if (locked.current && (!reset || refreshing.current)) return;
      if (cursorOwner.current !== key) { next.current = null; cursorOwner.current = key; }
      refreshing.current = reset;
      locked.current = true;
      const version = reset ? ++generation.current : generation.current;
      const cursor = reset ? null : next.current;
      // Keep the last valid cursor if revalidation fails.
      setState((s) => ({
        ...s,
        key,
        loading: true,
        error: "",
        rows: s.key === key ? s.rows : [],
        hasMore: s.key === key && s.hasMore,
      }));
      try {
        const page = await loader(cursor);
        if (version === generation.current && identity.current === key) {
          next.current = page.nextCursor;
          setState((s) => ({
            key,
            rows: reset
              ? page.rows
              : [
                  ...new Map(
                    [...s.rows, ...page.rows].map((row) => [row.id, row]),
                  ).values(),
                ],
            loading: false,
            error: "",
            hasMore: page.nextCursor !== null,
          }));
        }
      } catch (error) {
        if (version === generation.current && identity.current === key)
          setState((s) => ({
            ...s,
            loading: false,
            error: friendlyError(error),
          }));
      } finally {
        if (version === generation.current) { locked.current = false; refreshing.current = false; }
      }
    },
    [loader, key],
  );
  useFocusEffect(
    useCallback(() => {
      void load(true);
      return () => {
        ++generation.current;
        locked.current = false;
        refreshing.current = false;
      };
    }, [load]),
  );
  return {
    ...state,
    error: state.key === key ? state.error : "",
    loading: state.key !== key || state.loading,
    rows: state.key === key ? state.rows : [],
    hasMore: state.key === key && state.hasMore,
    refresh: () => void load(true),
    more: () => {
      if (
        identity.current === key &&
        state.key === key &&
        next.current &&
        !locked.current
      )
        void load();
    },
  };
}
