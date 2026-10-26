import { accountTag, createKey, open as unseal, seal, type Sealed } from './crypto';
import { DB_PREFIX, deleteDb, done, openDb, req, STORES } from './idb';
import { SLICES, type CachedSlice, type OutboxItem, type OutboxKind, type Slice, type VaultNote } from './types';

export const OUTBOX_RULES = { baseDelayMs: 5_000, maxDelayMs: 30 * 60_000, maxAttempts: 8 } as const;
interface StoredSlice { sealed: Sealed; schema: number; serverUpdatedAt: string; storedAt: number }
interface StoredOutbox {
  id: string; kind: OutboxKind; sealed: Sealed; createdAt: string;
  attempts: number; nextAttemptAt: string; lastError: string | null; dead: boolean;
}
type Clock = () => number;

export class DeviceStore {
  private constructor(
    private readonly db: IDBDatabase,
    private readonly key: CryptoKey,
    readonly dbName: string,
    private readonly now: Clock,
  ) {}
  static async open(userId: string, now: Clock = Date.now): Promise<DeviceStore> {
    if (!userId) throw new Error('Sign in before opening your device cache');
    const dbName = DB_PREFIX + await accountTag(userId);
    const db = await openDb(dbName);
    let key = await req(db.transaction(STORES.keys).objectStore(STORES.keys).get('k')) as CryptoKey | undefined;
    if (!key) {
      key = await createKey();
      const tx = db.transaction(STORES.keys, 'readwrite');
      const committed = done(tx);
      tx.objectStore(STORES.keys).put(key, 'k');
      await committed;
    }
    return new DeviceStore(db, key, dbName, now);
  }
  close(): void { this.db.close(); }

  async putSlice<T>(slice: Slice, payload: T, serverUpdatedAt: string): Promise<void> {
    if (!(slice in SLICES)) throw new Error('Unknown device cache slice');
    const record: StoredSlice = { sealed: await seal(this.key, payload), schema: SLICES[slice].schema, serverUpdatedAt, storedAt: this.now() };
    const tx = this.db.transaction(STORES.slices, 'readwrite'), committed = done(tx);
    tx.objectStore(STORES.slices).put(record, slice);
    await committed;
  }
  async getSlice<T>(slice: Slice): Promise<CachedSlice<T> | null> {
    const rec = await req(this.db.transaction(STORES.slices).objectStore(STORES.slices).get(slice)) as StoredSlice | undefined;
    if (!rec) return null;
    if (rec.schema !== SLICES[slice].schema) { await this.deleteSlice(slice); return null; }
    try {
      const payload = await unseal<T>(this.key, rec.sealed);
      return { slice, payload, serverUpdatedAt: rec.serverUpdatedAt, stale: this.now() - rec.storedAt > SLICES[slice].ttlMs };
    } catch { await this.deleteSlice(slice); return null; }
  }
  async deleteSlice(slice: Slice): Promise<void> {
    const tx = this.db.transaction(STORES.slices, 'readwrite'), committed = done(tx);
    tx.objectStore(STORES.slices).delete(slice);
    await committed;
  }
  async getCursor(): Promise<string | null> {
    return await req(this.db.transaction(STORES.meta).objectStore(STORES.meta).get('cursor')) as string | undefined ?? null;
  }
  async setCursor(cursor: string): Promise<void> {
    const tx = this.db.transaction(STORES.meta, 'readwrite'), committed = done(tx);
    tx.objectStore(STORES.meta).put(cursor, 'cursor');
    await committed;
  }
  async enqueue<T>(kind: OutboxKind, payload: T, id: string = crypto.randomUUID()): Promise<string> {
    const at = new Date(this.now()).toISOString();
    const record: StoredOutbox = {
      id, kind, sealed: await seal(this.key, payload), createdAt: at,
      attempts: 0, nextAttemptAt: at, lastError: null, dead: false,
    };
    const tx = this.db.transaction(STORES.outbox, 'readwrite'), committed = done(tx);
    tx.objectStore(STORES.outbox).put(record, id);
    await committed;
    return id;
  }
  async outbox(): Promise<OutboxItem[]> {
    const rows = await req(this.db.transaction(STORES.outbox).objectStore(STORES.outbox).getAll()) as StoredOutbox[];
    const result: OutboxItem[] = [];
    for (const r of rows) result.push({
      id: r.id, kind: r.kind, payload: await unseal(this.key, r.sealed),
      createdAt: r.createdAt, attempts: r.attempts, nextAttemptAt: r.nextAttemptAt,
      lastError: r.lastError, dead: r.dead,
    });
    return result.sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }
  async pendingCount(): Promise<number> {
    const rows = await req(this.db.transaction(STORES.outbox).objectStore(STORES.outbox).getAll()) as StoredOutbox[];
    return rows.filter(r => !r.dead).length;
  }
  async ack(id: string): Promise<void> {
    const tx = this.db.transaction(STORES.outbox, 'readwrite'), committed = done(tx);
    tx.objectStore(STORES.outbox).delete(id);
    await committed;
  }
  async fail(id: string, error: string, retryable: boolean): Promise<void> {
    const tx = this.db.transaction(STORES.outbox, 'readwrite'), committed = done(tx);
    const os = tx.objectStore(STORES.outbox);
    const rec = await req(os.get(id)) as StoredOutbox | undefined;
    if (rec) {
      rec.attempts++;
      rec.lastError = error.slice(0, 300);
      rec.dead = !retryable || rec.attempts >= OUTBOX_RULES.maxAttempts;
      const delay = Math.min(OUTBOX_RULES.maxDelayMs, OUTBOX_RULES.baseDelayMs * 2 ** (rec.attempts - 1));
      rec.nextAttemptAt = new Date(this.now() + delay).toISOString();
      os.put(rec, id);
    }
    await committed;
  }
  async retryDead(id: string): Promise<void> {
    const tx = this.db.transaction(STORES.outbox, 'readwrite'), committed = done(tx);
    const os = tx.objectStore(STORES.outbox);
    const rec = await req(os.get(id)) as StoredOutbox | undefined;
    if (rec) {
      rec.dead = false; rec.attempts = 0;
      rec.nextAttemptAt = new Date(this.now()).toISOString();
      os.put(rec, id);
    }
    await committed;
  }
  async addNote(text: string): Promise<VaultNote> {
    const note = { id: crypto.randomUUID(), text, createdAt: new Date(this.now()).toISOString() };
    const sealed = await seal(this.key, note);
    const tx = this.db.transaction(STORES.vault, 'readwrite'), committed = done(tx);
    tx.objectStore(STORES.vault).put(sealed, note.id);
    await committed;
    return note;
  }
  async notes(): Promise<VaultNote[]> {
    const rows = await req(this.db.transaction(STORES.vault).objectStore(STORES.vault).getAll()) as Sealed[];
    const notes: VaultNote[] = [];
    for (const r of rows) notes.push(await unseal<VaultNote>(this.key, r));
    return notes.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  async deleteNote(id: string): Promise<void> {
    const tx = this.db.transaction(STORES.vault, 'readwrite'), committed = done(tx);
    tx.objectStore(STORES.vault).delete(id);
    await committed;
  }
  async wipe(): Promise<void> { this.db.close(); await deleteDb(this.dbName); }
}
export async function wipeAccount(userId: string): Promise<void> {
  await deleteDb(DB_PREFIX + await accountTag(userId));
}

const GRACE_MS = 7 * 86400000;
/** Erase stale other-account local caches; never read their encrypted data. */
export async function cleanupOtherAccounts(memberId: string, now: Clock = Date.now): Promise<string[]> {
  if (typeof indexedDB.databases !== 'function') return [];
  const mine = DB_PREFIX + await accountTag(memberId);
  const removed: string[] = [];
  for (const info of await indexedDB.databases()) {
    if (!info.name || !info.name.startsWith(DB_PREFIX) || info.name === mine) continue;
    const db = await openDb(info.name);
    const pending = await req(db.transaction(STORES.outbox).objectStore(STORES.outbox).getAll()) as StoredOutbox[];
    db.close();
    const live = pending.filter(r => !r.dead);
    const newest = live.reduce((value,r) => Math.max(value, Date.parse(r.createdAt)),0);
    if (!live.length || now() - newest > GRACE_MS) {
      await deleteDb(info.name);
      removed.push(info.name);
    }
  }
  return removed;
}
