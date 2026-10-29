import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { backendConfigured, friendlyError } from "../../lib/supabase";
import type { CategoryId } from "../../constants/placeCategories";
import type { MapRegion } from "../../constants/places";
import { useCatalog } from "./CatalogProvider";
import { catalogRequestKey } from "./region";
export function useCatalogRegion(
  region: MapRegion,
  category: CategoryId = "all",
) {
  const { loadNearby } = useCatalog();
  const latest = useRef(region);
  latest.current = region;
  const key = `${catalogRequestKey(region)}:${category}`;
  const requested = useRef(false),
    lastVersion = useRef(0);
  const [busy, setBusy] = useState(backendConfigured),
    [settled, setSettled] = useState(!backendConfigured),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [version, setVersion] = useState(0);
  useFocusEffect(
    useCallback(() => {
      void key;
      if (!backendConfigured) return;
      let active = true;
      const controller = new AbortController();
      const force = lastVersion.current !== version;
      lastVersion.current = version;
      setBusy(true);
      setError("");
      const delay = requested.current ? 350 : 0;
      requested.current = true;
      async function load(refresh: boolean) {
        try {
          const result = await loadNearby(
            latest.current,
            refresh,
            category,
            controller.signal,
          );
          if (!active) return;
          setMessage(
            result.warning ||
              (!result.count ? "Nenhum lugar cadastrado nesta área." : ""),
          );
        } catch (e) {
          if (active)
            setError(e instanceof Error ? e.message : friendlyError(e));
        } finally {
          if (active) {
            setBusy(false);
            setSettled(true);
          }
        }
      }
      const timer = setTimeout(() => void load(force), delay);
      return () => {
        active = false;
        controller.abort();
        clearTimeout(timer);
      };
    }, [key, version, loadNearby, category]),
  );
  return {
    busy,
    settled,
    error,
    message,
    retry: () => setVersion((n) => n + 1),
  };
}
