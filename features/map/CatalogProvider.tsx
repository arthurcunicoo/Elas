import { publicOfflineStore } from "../../lib/publicOffline";
import { listReviewFactors } from "../../services/reviews";
import { hydrateCommunity, unavailableCommunity } from "../../services/communityReviews";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MapRegion, Place, places as demoPlaces } from "../../constants/places";
import { friendlyError, backendConfigured } from "../../lib/supabase";
import { nearbyPlaces, resolvePlace } from "../../services/places";
import { useSession } from "../auth/SessionProvider";
import { PlaceCache, RegionRequestCache, RequestEpoch } from "./cache";
import { catalogRequestKey, queryRegion } from "./region";
import type { CategoryId } from "../../constants/placeCategories";
export type Factor = { id: string; nome: string };
const demoFactors = [
  "Iluminação",
  "Movimento de pessoas",
  "Acessibilidade",
  "Assédio ou Importunação",
  "Limpeza/Conservação",
  "Outro",
].map((nome) => ({ id: nome, nome }));
type Catalog = {
  places: Place[];
  factors: Factor[];
  loading: boolean;
  error: string;
  ensureFactors: (force?: boolean) => Promise<void>;
  reload: () => Promise<void>;
  ensurePlace: (id: string, signal?: AbortSignal) => Promise<Place | null>;
  loadNearby: (
    region: MapRegion,
    force?: boolean,
    category?: CategoryId,
    signal?: AbortSignal,
  ) => Promise<{
    count: number;
    warning: string;
    updatedAt?: string;
    refreshing?: boolean;
  }>;
};
const Context = createContext<Catalog | null>(null);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { session } = useSession(),
    id = session?.user.id;
  const epoch = useRef(new RequestEpoch()).current;
  const ticket = epoch.switch(id);
  const cache = useRef(new PlaceCache()).current,
    areas = useRef(
      new RegionRequestCache<Awaited<ReturnType<typeof nearbyPlaces>>>(),
    ).current,
    sequence = useRef(0),
    pin = useRef<string | undefined>(undefined);
  const factorReady = useRef<number | null>(null);
  const factorRequest = useRef<{
    ticket: number;
    promise: Promise<void>;
  } | null>(null);
  const [data, setData] = useState<{
    ticket: number;
    places: Place[];
    factors: Factor[];
    loading: boolean;
    error: string;
  }>({
    ticket,
    places: backendConfigured ? [] : demoPlaces,
    factors: backendConfigured ? [] : demoFactors,
    loading: false,
    error: "",
  });
  const loadNearby = useCallback(
    async (
      region: MapRegion,
      force = false,
      category: CategoryId = "all",
      signal?: AbortSignal,
    ) => {
      if (!backendConfigured || !id) return { count: 0, warning: "" };
      const stamp = epoch.ticket(),
        request = ++sequence.current;
      const result = await areas.run(
        `${stamp}:${catalogRequestKey(region)}:${category}`,
        async (requestSignal) => {
          const fetched = await nearbyPlaces(queryRegion(region), category, requestSignal);
          if (epoch.accepts(stamp) && !requestSignal.aborted && request === sequence.current) void publicOfflineStore.save(id, fetched.places).catch(() => {});
          return fetched;
        },
        force,
        Date.now(),
        signal,
      );
      let hydrated: Place[];
      let reviewWarning = "";
      try {
        hydrated = await hydrateCommunity(result.places, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        hydrated = unavailableCommunity(result.places);
        reviewWarning =
          "Não foi possível atualizar as percepções da comunidade. Tente novamente nos detalhes do lugar.";
      }
      if (epoch.accepts(stamp) && request === sequence.current)
        setData((current) => ({
          ...current,
          ticket: stamp,
          places: cache.merge(hydrated, Date.now(), pin.current),
        }));
      return {
        count: result.places.length,
        warning: [result.warning, reviewWarning].filter(Boolean).join(" "),
        updatedAt: result.updatedAt,
        refreshing: result.refreshing,
      };
    },
    [id, epoch, cache, areas],
  );
  const ensurePlace = useCallback(
    async (placeId: string, signal?: AbortSignal) => {
      pin.current = placeId;
      if (!backendConfigured)
        return demoPlaces.find((item) => item.id === placeId) ?? null;
      if (!id) return null;
      const stamp = epoch.ticket();
      const place = await resolvePlace(placeId, signal);
      if (!epoch.accepts(stamp) || !place) return null;
      pin.current = place.id;
      setData((current) => ({
        ...current,
        ticket: stamp,
        places: cache.merge([place], Date.now(), place.id),
      }));
      return place;
    },
    [id, epoch, cache],
  );
  const ensureFactors = useCallback(
    (force = false): Promise<void> => {
      if (!id || !backendConfigured) return Promise.resolve();
      const stamp = epoch.ticket();
      if (factorRequest.current?.ticket === stamp)
        return factorRequest.current.promise;
      if (!force && factorReady.current === stamp) return Promise.resolve();
      setData((current) => ({ ...current, loading: true, error: "" }));
      const request = { ticket: stamp, promise: Promise.resolve() };
      request.promise = (async () => {
        try {
          const factors = await listReviewFactors();
          if (epoch.accepts(stamp)) {
            factorReady.current = stamp;
            setData((current) => ({
              ...current,
              ticket: stamp,
              factors,
              error: "",
            }));
          }
        } catch (error) {
          if (epoch.accepts(stamp))
            setData((current) => ({ ...current, error: friendlyError(error) }));
        } finally {
          if (epoch.accepts(stamp))
            setData((current) => ({ ...current, loading: false }));
          if (factorRequest.current === request) factorRequest.current = null;
        }
      })();
      factorRequest.current = request;
      return request.promise;
    },
    [id, epoch],
  );
  const reload = useCallback(() => ensureFactors(true), [ensureFactors]);
  useEffect(() => {
    cache.clear();
    areas.clear();
    pin.current = undefined;
    ++sequence.current;
    setData({
      ticket,
      places: backendConfigured ? [] : demoPlaces,
      factors: backendConfigured ? [] : demoFactors,
      loading: factorRequest.current?.ticket === ticket,
      error: "",
    });
  }, [id, ticket, epoch, cache, areas]);
  useEffect(() => () => areas.clear(), [areas]);
  const value = useMemo(
    () => ({
      ...data,
      loading: data.ticket === ticket ? data.loading : false,
      error: data.ticket === ticket ? data.error : "",
      places: data.ticket === ticket ? data.places : [],
      factors: data.ticket === ticket ? data.factors : [],
      reload,
      ensureFactors,
      ensurePlace,
      loadNearby,
    }),
    [data, ticket, reload, ensureFactors, ensurePlace, loadNearby],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCatalog() {
  const value = useContext(Context);
  if (!value) throw new Error("Catálogo ausente");
  return value;
}
