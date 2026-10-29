import type { Place } from "../../constants/places.ts";
// An insertion/access ordered cache. Selected places can be pinned during pruning.
export class PlaceCache {
  private entries = new Map<string, { place: Place; expires: number }>();
  private limit: number;
  private ttl: number;
  constructor(limit = 600, ttl = 300000) {
    this.limit = limit;
    this.ttl = ttl;
  }
  merge(places: Place[], now = Date.now(), pin?: string) {
    for (const [id, item] of this.entries)
      if (item.expires <= now && id !== pin) this.entries.delete(id);
    for (const place of places) {
      const previous = this.entries.get(place.id)?.place;
      // Keep unchanged marker objects stable across overlapping area responses.
      const value =
        previous &&
        Object.keys(place).every((key) =>
          key === "reviewSummary"
            ? JSON.stringify(previous.reviewSummary) ===
              JSON.stringify(place.reviewSummary)
            : previous[key as keyof Place] === place[key as keyof Place],
        ) &&
        Object.keys(previous).length === Object.keys(place).length
          ? previous
          : place;
      this.entries.delete(place.id);
      this.entries.set(place.id, { place: value, expires: now + this.ttl });
    }
    for (const id of this.entries.keys()) {
      if (this.entries.size <= this.limit) break;
      if (id !== pin) this.entries.delete(id);
    }
    return this.values(now, pin);
  }
  values(now = Date.now(), pin?: string) {
    return [...this.entries.values()]
      .filter((item) => item.expires > now || item.place.id === pin)
      .map((item) => item.place);
  }
  clear() {
    this.entries.clear();
  }
}

// Each consumer owns its cancellation; a shared fetch stops only after the last leaves.
type RegionEntry<T> = {
  pending: boolean;
  expires: number;
  result: Promise<T>;
  controller: AbortController;
  consumers: Set<symbol>;
  retained: boolean;
};
export class RegionRequestCache<T> {
  private entries = new Map<string, RegionEntry<T>>();
  private pending = new Set<RegionEntry<T>>();
  private limit: number;
  private ttl: number;
  constructor(limit = 8, ttl = 60000) { this.limit = limit; this.ttl = ttl; }
  run(
    key: string,
    loader: (signal: AbortSignal) => Promise<T>,
    force = false,
    now = Date.now(),
    signal?: AbortSignal,
  ): Promise<T> {
    if (signal?.aborted) return Promise.reject(this.abortError());
    let entry = this.entries.get(key);
    if (!entry || (!entry.pending && (force || entry.expires <= now))) {
      const controller = new AbortController();
      const created: RegionEntry<T> = {
        pending: true,
        expires: 0,
        controller,
        consumers: new Set(),
        retained: false,
        result: Promise.resolve().then(() => loader(controller.signal)),
      };
      this.pending.add(created);
      created.result = created.result.then(
        (result) => {
          created.pending = false;
          created.expires = Date.now() + this.ttl;
          this.pending.delete(created);
          return result;
        },
        (error) => {
          created.pending = false;
          this.pending.delete(created);
          if (this.entries.get(key) === created) this.entries.delete(key);
          throw error;
        },
      );
      entry = created;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.limit)
      this.entries.delete(this.entries.keys().next().value!);
    if (!signal) {
      entry.retained = true;
      return entry.result;
    }
    const current = entry,
      consumer = Symbol();
    current.consumers.add(consumer);
    return new Promise<T>((resolve, reject) => {
      const release = () => {
        signal.removeEventListener("abort", cancel);
        current.consumers.delete(consumer);
      };
      const cancel = () => {
        release();
        if (current.pending && !current.retained && !current.consumers.size) {
          current.controller.abort();
          if (this.entries.get(key) === current) this.entries.delete(key);
        }
        reject(this.abortError());
      };
      signal.addEventListener("abort", cancel, { once: true });
      current.result.then(
        (value) => {
          release();
          resolve(value);
        },
        (error) => {
          release();
          reject(error);
        },
      );
    });
  }
  private abortError() {
    const error = new Error("Consulta cancelada.");
    error.name = "AbortError";
    return error;
  }
  clear() {
    for (const entry of this.pending) entry.controller.abort();
    this.pending.clear();
    this.entries.clear();
  }
}
export class RequestEpoch {
  private identity: string | undefined;
  private version = 0;
  switch(identity: string | undefined) {
    if (identity !== this.identity) {
      this.identity = identity;
      this.version++;
    }
    return this.version;
  }
  ticket() {
    return this.version;
  }
  accepts(ticket: number) {
    return ticket === this.version;
  }
}
