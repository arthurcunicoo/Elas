// Active pipeline: one immutable batch, service-only atomic commit and bounded replay.
import {parseOsmPlaces, reconcilePlaces, validateBounds, type Bounds, type CatalogPlace} from "../lugares-osm/catalog.ts";

export type Lease = {lease: string; bounds: Bounds; area: {id: string; nome: string; estado: string}};
export type Snapshot = {provider: "osm"; license: "ODbL"; attribution: string; collectedAt: string; origin: string; content: string; sha256: string};
export type Source = {collect(lease: Lease): Promise<Snapshot>};
export type Batch = {version: 1; provider: "osm"; license: "ODbL"; attribution: string; collectedAt: string; snapshotSha256: string; sourceOrigin: string; received: number; rejected: number; discarded: number; rows: CatalogPlace[]};
export type CommitResult = {created: number; updated: number; unchanged: number; manualPreserved: number; received: number; rejected: number; discarded: number};
export type Store = {
  candidates(rows: CatalogPlace[]): Promise<Parameters<typeof reconcilePlaces>[1]>;
  commit(lease: string, batch: Batch): Promise<CommitResult>;
  fail(lease: string, received: number, code: string): Promise<unknown>;
};
export async function sha256(content: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function prepareBatch(snapshot: Snapshot, lease: Lease, store: Pick<Store, "candidates">, now = Date.now()): Promise<Batch> {
  const bounds = validateBounds(lease.bounds);
  if (typeof snapshot?.content !== "string") throw Error("snapshot_policy_invalid");
  const bytes = new TextEncoder().encode(snapshot.content).byteLength;
  if (bytes > 8 * 1024 * 1024 || snapshot.provider !== "osm" || snapshot.license !== "ODbL" || snapshot.attribution !== "© OpenStreetMap contributors") throw Error("snapshot_policy_invalid");
  const time = Date.parse(snapshot.collectedAt);
  if (!Number.isFinite(time) || !/(Z|[+-]\d{2}:\d{2})$/.test(snapshot.collectedAt) || time < 0 || time > now + 5 * 60000 || !/^[a-f0-9]{64}$/.test(snapshot.sha256) || await sha256(snapshot.content) !== snapshot.sha256) throw Error("snapshot_integrity_invalid");
  const allowed = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", `snapshot:sha256:${snapshot.sha256}`];
  if (!allowed.includes(snapshot.origin)) throw Error("snapshot_origin_invalid");
  const raw = JSON.parse(snapshot.content);
  if (!Array.isArray(raw?.elements) || raw.remark || raw.elements.length > 400) throw Error("snapshot_batch_invalid");
  const unique = new Map<string, CatalogPlace>();
  let rejected = 0;
  for (const element of raw.elements) {
    const rows = typeof element?.tags?.name === "string" ? parseOsmPlaces({elements: [element]}, bounds, snapshot.collectedAt, lease.area) : [];
    if (!rows.length) rejected++;
    else unique.set(rows[0].referencia_externa, rows[0]);
  }
  const normalized = [...unique.values()];
  const known = normalized.length ? await store.candidates(normalized) : [];
  const rows = reconcilePlaces(normalized, known).sort((a, b) => a.referencia_externa.localeCompare(b.referencia_externa));
  return {version: 1, provider: "osm", license: "ODbL", attribution: snapshot.attribution, collectedAt: new Date(time).toISOString(), snapshotSha256: snapshot.sha256, sourceOrigin: snapshot.origin, received: raw.elements.length, rejected, discarded: raw.elements.length - rejected - rows.length, rows};
}

/** The caller chooses a reviewed source. No automatic quota-evading fallback. */
export async function runIngestion(source: Source, lease: Lease, store: Store, emit: (event: object) => void = () => {}) {
  let phase: "collect" | "prepare" | "commit" = "collect";
  const event = (value: object) => {try {emit(value);} catch { /* monitoring cannot break a commit */ }};
  try {
    const snapshot = await source.collect(lease);
    phase = "prepare";
    const batch = await prepareBatch(snapshot, lease, store);
    phase = "commit";
    let counts: CommitResult;
    try { counts = await store.commit(lease.lease, batch); }
    catch (error) {
      const code = (error as {code?: string})?.code;
      if (typeof code === "string" && (/^[0-9A-Z]{5}$/.test(code) || code === "PGRST202")) throw error;
      // One bounded replay of the identical immutable batch recovers a lost ACK.
      counts = await store.commit(lease.lease, batch);
    }
    event({operation: "catalog_ingestion", area: lease.area.id, phase, status: "committed", ...counts});
    return {status: "committed" as const, counts};
  } catch (error) {
    const status = (error as {status?: number})?.status;
    const dbCode = (error as {code?: string})?.code;
    const rejected = phase === "commit" && typeof dbCode === "string" && (/^[0-9A-Z]{5}$/.test(dbCode) || dbCode === "PGRST202");
    const code = rejected ? "commit_rejected" : phase === "collect" && Number.isInteger(status) && status! >= 400 && status! <= 599 ? `source_http_${status}` : `${phase}_failed`;
    event({operation: "catalog_ingestion", area: lease.area.id, phase, status: rejected ? "rejected" : "failed", code});
    // A transport error here might mean the database committed but the ACK was lost.
    // Retry the same immutable batch/lease, or let the queue recover; never mark it failed blindly.
    if (phase === "commit" && !rejected) return {status: "commit_uncertain" as const, code};
    try {await store.fail(lease.lease, 0, code);} catch {return {status: "retry_after_lease" as const, code};}
    return {status: rejected ? "commit_rejected" as const : "retry_scheduled" as const, code};
  }
}
