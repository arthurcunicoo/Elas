export type RawStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
  getAllKeys(): Promise<readonly string[]>;
};
export type Protection<K> = {
  readKey(key: string): Promise<K | null>;
  saveKey(key: string, value: K): Promise<void>;
  removeKey(key: string): Promise<void>;
  createKey(): Promise<K>;
  seal(key: K, value: string, context: string): Promise<string>;
  open(key: K, value: string, context: string): Promise<string>;
};
const marker = "elas.enc.v1:";
export type StorageOptions = {
  exclusive?: <T>(key: string, task: () => Promise<T>) => Promise<T>;
};
/** Per-key serialization makes plaintext migration/read/write/delete linearizable. */
export function createProtectedStore<K>(
  raw: RawStorage,
  protection: Protection<K>,
  options: StorageOptions = {},
) {
  const writes = new Map<string, Promise<unknown>>();
  function serial<T>(key: string, task: () => Promise<T>): Promise<T> {
    const next = (writes.get(key) ?? Promise.resolve())
      .catch(() => {})
      .then(() => options.exclusive ? options.exclusive(key, task) : task());
    writes.set(key, next);
    void next
      .finally(() => {
        if (writes.get(key) === next) writes.delete(key);
      })
      .catch(() => {});
    return next;
  }
  async function write(key: string, value: string) {
    let secret = await protection.readKey(key);
    if (!secret) {
      if ((await raw.getItem(key))?.startsWith(marker))
        throw new Error(
          "Não foi possível abrir o armazenamento protegido deste aparelho.",
        );
      secret = await protection.createKey();
      await protection.saveKey(key, secret);
    }
    const encrypted = marker + (await protection.seal(secret, value, key));
    await raw.setItem(key, encrypted);
  }
  return {
    getItem: (key: string) =>
      serial(key, async () => {
        const value = await raw.getItem(key);
        if (value === null) return null;
        if (!value.startsWith(marker)) {
          await write(key, value);
          return value;
        }
        const secret = await protection.readKey(key);
        if (!secret)
          throw new Error(
            "Não foi possível abrir o armazenamento protegido deste aparelho.",
          );
        return protection.open(secret, value.slice(marker.length), key);
      }),
    setItem: (key: string, value: string) =>
      serial(key, () => write(key, value)),
    removeItem: (key: string) =>
      serial(key, async () => {
        await raw.removeItem(key);
        await protection.removeKey(key);
      }),
    getAllKeys: () => raw.getAllKeys(),
  };
}
