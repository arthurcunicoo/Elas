import { protectedStorage as AsyncStorage } from "../../lib/storage/protectedStorage";
export const draftPrefix = "elas:draft:v1:";
const writes = new Map<string, Promise<unknown>>();
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; payload: string; onError: () => void }>();
export function serializeDraft<T>(key: string, job: () => Promise<T>): Promise<T> {
  const run = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(job);
  writes.set(key, run);
  void run.finally(() => { if (writes.get(key) === run) writes.delete(key); }).catch(() => {});
  return run;
}
export function cancelDraftSave(key: string) {
  const job = pending.get(key);
  if (job) clearTimeout(job.timer);
  pending.delete(key);
}
export function flushDraft(key: string): Promise<unknown> {
  const job = pending.get(key);
  if (!job) return writes.get(key) ?? Promise.resolve();
  cancelDraftSave(key);
  const run = serializeDraft(key, () => AsyncStorage.setItem(key, job.payload));
  void run.catch(job.onError);
  return run;
}
export function scheduleDraft(key: string, payload: string, onError: () => void) {
  cancelDraftSave(key);
  const timer = setTimeout(() => { void flushDraft(key).catch(() => {}); }, 450);
  pending.set(key, { timer, payload, onError });
}
export async function clearAccountDrafts(userId: string) {
  const accountPrefix = `${draftPrefix}${userId}:`;
  // Cancel timers before awaiting storage, so a logout cannot leave a delayed write behind.
  const queued = [...pending.keys(), ...writes.keys()].filter(key => key.startsWith(accountPrefix));
  queued.forEach(cancelDraftSave);
  const keys = [...new Set([...(await AsyncStorage.getAllKeys()), ...queued, ...pending.keys(), ...writes.keys()])].filter(key => key.startsWith(accountPrefix));
  keys.forEach(cancelDraftSave);
  await Promise.all(keys.map(key => serializeDraft(key, () => AsyncStorage.removeItem(key))));
}
