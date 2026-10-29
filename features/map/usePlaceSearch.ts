import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "../auth/SessionProvider";
import { searchImportedPlaces } from "../../services/places";
import { friendlyError } from "../../lib/supabase";
import type { Cursor } from "../../lib/pagination";
import type { CategoryId } from "../../constants/placeCategories";
import type { Place } from "../../constants/places";
export function usePlaceSearch(
  query: string,
  category: CategoryId,
  enabled: boolean,
) {
  const { session } = useSession(),
    id = session?.user.id,
    key = `${id}:${query}:${category}:${enabled}`;
  const current = useRef(key);
  current.current = key;
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0),
    locked = useRef(false),
    next = useRef<Cursor | null>(null);
  const [state, setState] = useState<{
    key: string;
    rows: Place[];
    loading: boolean;
    error: string;
    hasMore: boolean;
    resolved: boolean;
  }>({
    key,
    rows: [],
    loading: false,
    error: "",
    hasMore: false,
    resolved: false,
  });
  const load = useCallback(
    async (reset: boolean) => {
      if (!enabled || !id || (locked.current && !reset)) return;
      controller.current?.abort();
      const requestController = new AbortController();
      controller.current = requestController;
      locked.current = true;
      const request = ++sequence.current,
        cursor = reset ? null : next.current;
      if (reset) next.current = null;
      setState((s) => ({
        ...s,
        key,
        loading: true,
        error: "",
        ...(reset ? { rows: [], hasMore: false, resolved: false } : {}),
      }));
      try {
        const page = await searchImportedPlaces(
          query,
          category,
          cursor,
          requestController.signal,
        );
        if (request === sequence.current && current.current === key) {
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
            resolved: true,
          }));
        }
      } catch (error) {
        if (request === sequence.current && current.current === key)
          setState((s) => ({
            ...s,
            loading: false,
            error: friendlyError(error),
          }));
      } finally {
        if (request === sequence.current) locked.current = false;
      }
    },
    [enabled, id, key, query, category],
  );
  const invalidate = useCallback(() => {
    controller.current?.abort();
    ++sequence.current;
    locked.current = false;
  }, []);
  useEffect(() => {
    next.current = null;
    setState({
      key,
      rows: [],
      loading: enabled && !!id,
      error: "",
      hasMore: false,
      resolved: false,
    });
    const timer = setTimeout(() => void load(true), 350);
    return () => {
      clearTimeout(timer);
      invalidate();
    };
  }, [key, id, enabled, load, invalidate]);
  const matches = state.key === key;
  return {
    rows: matches ? state.rows : [],
    loading: enabled && (!matches || state.loading),
    error: matches ? state.error : "",
    hasMore: matches && state.hasMore,
    resolved: matches && state.resolved,
    retry: () => void load(!matches || !state.resolved),
    more: () => {
      if (matches && next.current && !locked.current) void load(false);
    },
  };
}
