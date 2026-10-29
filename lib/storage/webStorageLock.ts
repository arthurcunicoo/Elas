/** Serialize the entire key/ciphertext operation across tabs, not only this JS realm. */
export async function webStorageExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
  // During server rendering AsyncStorage has no browser data to read or migrate.
  if (typeof window === "undefined") return task();
  if (!navigator.locks?.request)
    return Promise.reject(new Error("O armazenamento protegido requer um navegador atualizado com conexão segura."));
  return await navigator.locks.request(`elas.protected.v1:${key}`, task);
}
