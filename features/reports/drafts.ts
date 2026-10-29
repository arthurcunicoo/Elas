import { protectedStorage as AsyncStorage } from "../../lib/storage/protectedStorage";
import { useEffect, useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import { useSession } from "../auth/SessionProvider";
import { AppState } from "react-native";
import { draftPrefix, serializeDraft, scheduleDraft, flushDraft, cancelDraftSave } from "./draftStorage";
export { clearAccountDrafts } from "./draftStorage";
export function useDraft<T extends object>(scope: string, initial: T) {
  const { session } = useSession(),
    key = `${draftPrefix}${session?.user.id ?? "demo"}:${scope}`;
  const initialRef = useRef(initial),
    identity = useRef(key),
    loadedKey = useRef<string | null>(null);
  identity.current = key;
  const [value, setValue] = useState<T>(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const attempt = useRef<{ id: string; fingerprint: string } | null>(null),
    restored = useRef(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    setError("");
    setValue(initialRef.current);
    attempt.current = null;
    restored.current = false;
    loadedKey.current = null;
    void serializeDraft(key, () => AsyncStorage.getItem(key))
      .then(async (raw) => {
        if (!active) return;
        if (raw) {
          let saved;
          try { saved = JSON.parse(raw); }
          catch { await serializeDraft(key, () => AsyncStorage.removeItem(key)); return; }
          if (
            saved && typeof saved === "object" && saved.version === 1 &&
            Number.isFinite(saved.time) && saved.time <= Date.now() &&
            Date.now() - saved.time < 86400000 &&
            typeof saved.value === "object" &&
            saved.value && !Array.isArray(saved.value)
          ) {
            const fields = initialRef.current as Record<string, unknown>;
            if (
              Object.entries(fields).every(([name, sample]) =>
                Array.isArray(sample)
                  ? Array.isArray(saved.value[name]) &&
                    saved.value[name].every(
                      (v: unknown) => typeof v === "string",
                    )
                  : typeof saved.value[name] === typeof sample,
              )
            ) {
              setValue(Object.fromEntries(Object.keys(fields).map(name => [name, saved.value[name]])) as T);
              attempt.current =
                typeof saved.attempt?.id === "string" &&
                typeof saved.attempt?.fingerprint === "string"
                  ? saved.attempt
                  : null;
              restored.current = true;
              return;
            }
          }
          await serializeDraft(key, () => AsyncStorage.removeItem(key));
        }
      })
      .catch(() => {
        if (active) setError("Não foi possível recuperar o rascunho local.");
      })
      .finally(() => {
        if (active) {
          loadedKey.current = key;
          setReady(true);
        }
      });
    return () => {
      active = false;
      if (loadedKey.current === key) loadedKey.current = null;
      void flushDraft(key).catch(() => {});
    };
  }, [key]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state !== "active") void flushDraft(key).catch(() => {});
    });
    return () => subscription.remove();
  }, [key]);
  useEffect(() => {
    if (!ready || loadedKey.current !== key || value === initialRef.current) return;
    const snapshot = JSON.stringify({ version: 1, time: Date.now(), value, attempt: attempt.current });
    scheduleDraft(key, snapshot, () => {
      if (identity.current === key && loadedKey.current === key) setError("Rascunho não salvo neste aparelho. Mantenha a tela aberta até enviar.");
    });
  }, [key, ready, value]);
  async function flush() {
    if (!ready || loadedKey.current !== key || identity.current !== key) throw new Error("Aguarde a recuperação do rascunho.");
    cancelDraftSave(key);
    const snapshot = JSON.stringify({ version: 1, time: Date.now(), value, attempt: attempt.current });
    try {
      await serializeDraft(key, () => AsyncStorage.setItem(key, snapshot));
      if (identity.current === key && loadedKey.current === key) setError("");
    } catch (cause) {
      if (identity.current === key && loadedKey.current === key) setError("Não foi possível salvar o rascunho neste aparelho.");
      throw cause;
    }
  }
  async function prepare(payload: object) {
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { id: randomUUID(), fingerprint };
    const id = attempt.current.id;
    await flush();
    return id;
  }
  async function clear() {
    if (identity.current !== key || loadedKey.current !== key) return;
    cancelDraftSave(key);
    attempt.current = null;
    restored.current = false;
    setValue(initialRef.current);
    await serializeDraft(key, () => AsyncStorage.removeItem(key)).catch(() =>
      setError(
        "O envio foi salvo, mas não foi possível limpar o rascunho deste aparelho.",
      ),
    );
  }
  return {
    value,
    setValue,
    ready: ready && loadedKey.current === key,
    error,
    prepare,
    flush,
    clear,
    restored: restored.current,
  };
}
