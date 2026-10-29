import AsyncStorage from "@react-native-async-storage/async-storage";
import { createProtectedStore } from "./protectedStore";
import { webStorageExclusive } from "./webStorageLock";
// Non-extractable origin-bound keys; protects raw localStorage copies, not same-origin XSS.
function keys<T>(
  mode: IDBTransactionMode,
  job: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("elas-protected-keys-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("keys");
    open.onerror = () => reject(open.error);
    open.onblocked = () =>
      reject(
        new Error("Feche outras abas para abrir o armazenamento protegido."),
      );
    open.onsuccess = () => {
      const db = open.result,
        tx = db.transaction("keys", mode),
        request = job(tx.objectStore("keys"));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error("Armazenamento protegido indisponível."));
      };
    };
  });
}
const encode = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (x) => String.fromCharCode(x)).join(""));
const decode = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
export const protectedStorage = createProtectedStore<CryptoKey>(AsyncStorage, {
  readKey: async (key) =>
    (await keys("readonly", (store) => store.get(key))) ?? null,
  saveKey: async (key, value) => {
    await keys("readwrite", (store) => store.put(value, key));
  },
  removeKey: async (key) => {
    await keys("readwrite", (store) => store.delete(key));
  },
  createKey: () =>
    crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]),
  seal: async (key, value, context) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(context),
      },
      key,
      new TextEncoder().encode(value),
    );
    return JSON.stringify({
      iv: encode(iv),
      data: encode(new Uint8Array(data)),
    });
  },
  open: async (key, value, context) => {
    const sealed = JSON.parse(value);
    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: decode(sealed.iv),
          additionalData: new TextEncoder().encode(context),
        },
        key,
        decode(sealed.data),
      ),
    );
  },
}, { exclusive: webStorageExclusive });
