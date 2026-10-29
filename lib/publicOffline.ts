import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Place } from "../constants/places";
export type OfflinePlace = Pick<
  Place,
  "id" | "name" | "address" | "latitude" | "longitude"
>;
export type PublicSnapshot = {
  version: 1;
  savedAt: string;
  rows: OfflinePlace[];
};
const ttl = 7 * 86400000;
export function createPublicOfflineStore(
  storage: typeof AsyncStorage,
  project: string,
) {
  const key = (owner: string) => `elas.public.v1:${project}:${owner}`;
  const tasks = new Map<string, Promise<unknown>>();
  return {
    async read(owner: string): Promise<PublicSnapshot | null> {
      const raw = await storage.getItem(key(owner));
      if (!raw) return null;
      try {
        const value = JSON.parse(raw),
          time = Date.parse(value.savedAt);
        if (
          value.version !== 1 ||
          !Number.isFinite(time) ||
          time > Date.now() ||
          Date.now() - time > ttl ||
          !Array.isArray(value.rows) ||
          value.rows.length > 500
        )
          throw Error();
        if (
          !value.rows.every(
            (p: OfflinePlace) =>
              typeof p.id === "string" &&
              typeof p.name === "string" &&
              typeof p.address === "string" &&
              Number.isFinite(p.latitude) &&
              Number.isFinite(p.longitude),
          )
        )
          throw Error();
        return {
          version: 1,
          savedAt: value.savedAt,
          rows: value.rows.map((p: OfflinePlace) => ({
            id: p.id,
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
          })),
        };
      } catch {
        await storage.removeItem(key(owner));
        return null;
      }
    },
    save(owner: string, places: Place[]) {
      const rows = places
        .slice(0, 500)
        .map(({ id, name, address, latitude, longitude }) => ({
          id,
          name,
          address,
          latitude,
          longitude,
        }));
      const snapshot = JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        rows,
      });
      const run = (tasks.get(owner) ?? Promise.resolve())
        .catch(() => {})
        .then(() => storage.setItem(key(owner), snapshot));
      tasks.set(owner, run);
      void run
        .finally(() => {
          if (tasks.get(owner) === run) tasks.delete(owner);
        })
        .catch(() => {});
      return run;
    },
    async clear(owner: string) {
      await tasks.get(owner)?.catch(() => {});
      await storage.removeItem(key(owner));
    },
  };
}
export const publicOfflineStore = createPublicOfflineStore(
  AsyncStorage,
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "demo",
);
