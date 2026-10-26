/** Minimal IndexedDB adapter; no third-party storage dependency. */
export const DB_PREFIX = 'askintros-cache-';
export const DB_VERSION = 1;
export const STORES = { keys: 'keys', slices: 'slices', outbox: 'outbox', meta: 'meta', vault: 'vault' } as const;
export function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'));
  });
}
export function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.addEventListener('complete', () => resolve(), { once: true });
    tx.addEventListener('error', () => reject(tx.error ?? new Error('IndexedDB transaction failed')), { once: true });
    tx.addEventListener('abort', () => reject(tx.error ?? new Error('IndexedDB transaction aborted')), { once: true });
  });
}
export function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(name, DB_VERSION);
    r.onupgradeneeded = () => {
      for (const name of Object.values(STORES)) if (!r.result.objectStoreNames.contains(name)) r.result.createObjectStore(name);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('Cannot open private device cache'));
    r.onblocked = () => reject(new Error('A different tab is holding an older cache open'));
  });
}
export function deleteDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.deleteDatabase(name);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error ?? new Error('Could not clear private device cache'));
    // Never claim a successful privacy wipe when another tab blocks deletion.
    r.onblocked = () => reject(new Error('Close other Ask Intros tabs to clear this device'));
  });
}
