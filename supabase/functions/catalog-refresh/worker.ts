import { buildQuery } from "../lugares-osm/catalog.ts";
import { fetchOsmPayload } from "../lugares-osm/network.js";
import { runIngestion, sha256, type Lease, type Store, type Source } from "./ingestion.ts";
export type CatalogLease = Lease;
export type WorkerStore = Store & { reserve(hash: string): Promise<CatalogLease | null> };
export const jobTokenHash = sha256;
export function createRefreshHandler(store: WorkerStore, upstream: typeof fetch = fetch) {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  return async (req: Request) => {
    if (req.method !== "POST") return reply({ message: "Método inválido" }, 405);
    const token = req.headers.get("x-catalog-job-key");
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return reply({ message: "Acesso negado" }, 401);
    let lease: CatalogLease | null;
    try { lease = await store.reserve(await jobTokenHash(token)); }
    catch (cause) {
      return (cause as {code?: string})?.code === "42501"
        ? reply({message: "Acesso negado"}, 401) : reply({status: "reservation_unavailable"}, 503);
    }
    if (!lease) return reply({status: "idle"});
    const source: Source = {collect: async () => {
      const {payload, endpoint} = await fetchOsmPayload(buildQuery(lease.bounds), upstream);
      const content = JSON.stringify(payload);
      return {provider: "osm", license: "ODbL", attribution: "© OpenStreetMap contributors",
        collectedAt: new Date().toISOString(), origin: endpoint, content, sha256: await sha256(content)};
    }};
    const result = await runIngestion(source, lease, store, event => console.log(JSON.stringify(event)));
    return result.status === "committed"
      ? reply({status: "updated", received: result.counts.received})
      : reply({status: result.status, code: result.code}, 503);
  };
}
