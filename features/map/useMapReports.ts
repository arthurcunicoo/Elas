import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { MapRegion } from "../../constants/places";
import { mapReports, findReport, type Report, type ReportMap } from "../../services/reports";
import { friendlyError, backendConfigured } from "../../lib/supabase";
import { queryRegion, regionKey, reportZoom } from "./region";
import { RegionRequestCache } from "./cache";
import { useSession } from "../auth/SessionProvider";
export function useMapReports(region: MapRegion, reportId?: string) {
  const { session } = useSession(),
    user = session?.user.id ?? "";
  const area = queryRegion(region),
    zoom = reportZoom(region),
    key = `${regionKey(area)}:${zoom}`;
  const latest = useRef({ area, zoom });
  latest.current = { area, zoom };
  const cache = useRef(new RegionRequestCache<ReportMap>(8, 20000)).current;
  const account = useRef(user);
  if (account.current !== user) {
    cache.clear();
    account.current = user;
  }
  const [state, setState] = useState<{
    user: string;
    map: ReportMap;
    linked: Report | null;
    error: string;
  }>({ user, map: { nodes: [], total: 0 }, linked: null, error: "" });
  const [version, setVersion] = useState(0),
    lastVersion = useRef(0);
  useFocusEffect(
    useCallback(() => {
      void key;
      let active = true;
      const controller = new AbortController();
      const force = version !== lastVersion.current;
      lastVersion.current = version;
      if (!backendConfigured || !user) return;
      const timer = setTimeout(() => {
        void (async () => {
          try {
            const { area, zoom } = latest.current;
            const result = await cache.run(
              `${user}:${key}`,
              (signal) => mapReports(area, zoom, signal),
              force,
              Date.now(),
              controller.signal,
            );
            const linked =
              reportId &&
              !result.nodes.some((node) => node.report?.id === reportId)
                ? await findReport(reportId, controller.signal)
                : null;
            if (active) setState({ user, map: result, linked, error: "" });
          } catch (e) {
            if (active)
              setState({
                user,
                map: { nodes: [], total: 0 },
                linked: null,
                error: friendlyError(e),
              });
          }
        })();
      }, 350);
      return () => {
        active = false;
        controller.abort();
        clearTimeout(timer);
      };
    }, [key, user, reportId, version, cache]),
  );
  const map = state.user === user ? state.map : { nodes: [], total: 0 };
  const rows = map.nodes.flatMap((node) => (node.report ? [node.report] : []));
  if (state.user === user && state.linked) rows.push(state.linked);
  return {
    rows,
    nodes: map.nodes,
    total: map.total,
    error: state.user === user ? state.error : "",
    retry: () => setVersion((n) => n + 1),
  };
}
