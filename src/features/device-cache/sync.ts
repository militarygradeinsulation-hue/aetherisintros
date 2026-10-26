import { cleanupOtherAccounts, DeviceStore } from './store';
import { SLICES, type CachedSlice, type Remote, type Slice } from './types';

export interface WarmStart { slices: Partial<Record<Slice, CachedSlice>>; pending: number }
export async function warmStart(store: DeviceStore): Promise<WarmStart> {
  const slices: Partial<Record<Slice, CachedSlice>> = {};
  for (const slice of Object.keys(SLICES) as Slice[]) {
    const cached = await store.getSlice(slice);
    if (cached) slices[slice] = cached;
  }
  return { slices, pending: await store.pendingCount() };
}
export interface FlushReport { sent: number; retrying: number; dead: number; skipped: number }
/** Preserve outbox order, including retry backoff and idempotent receipt handling. */
export async function flushOutbox(store: DeviceStore, remote: Remote, now: () => number = Date.now): Promise<FlushReport> {
  const report: FlushReport = { sent: 0, retrying: 0, dead: 0, skipped: 0 };
  const items = await store.outbox();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (item.dead) { report.dead++; continue; }
    if (Date.parse(item.nextAttemptAt) > now()) {
      report.skipped = items.slice(i).filter(x => !x.dead).length;
      break;
    }
    let result;
    try { result = await remote.send(item); }
    catch (e) { result = { ok: false as const, retryable: true, error: e instanceof Error ? e.message : String(e) }; }
    if (result.ok) { await store.ack(item.id); report.sent++; continue; }
    await store.fail(item.id, result.error, result.retryable);
    if (result.retryable) { report.retrying++; break; }
    report.dead++;
  }
  return report;
}
export interface PullReport { applied: number; removed: number; cursor: string }
/** Do not overwrite unsent offline edits with an older server snapshot. */
export async function pullChanges(store: DeviceStore, remote: Remote): Promise<PullReport> {
  const since = await store.getCursor();
  const { changes, serverTime } = await remote.changesSince(since);
  const unsent = new Set(
    (await store.outbox())
      .filter(item => !item.dead && item.kind === 'context_upsert')
      .map(item => (item.payload as { slice?: Slice }).slice)
      .filter((slice): slice is Slice => typeof slice === 'string'),
  );
  let applied = 0, removed = 0;
  for (const change of changes) {
    if (!(change.slice in SLICES) || unsent.has(change.slice)) continue;
    if (change.deleted) { await store.deleteSlice(change.slice); removed++; continue; }
    await store.putSlice(change.slice, change.payload, change.updatedAt);
    applied++;
  }
  await store.setCursor(serverTime);
  return { applied, removed, cursor: serverTime };
}
export interface SignInResult {
  store: DeviceStore;
  warm: WarmStart;
  synced: Promise<{ flush: FlushReport; pull: PullReport | null; error: string | null }>;
}
export async function onSignIn(userId: string, remote: Remote, now: () => number = Date.now): Promise<SignInResult> {
  await cleanupOtherAccounts(userId, now).catch(() => []);
  const store = await DeviceStore.open(userId, now);
  const warm = await warmStart(store);
  const synced = (async () => {
    const flush = await flushOutbox(store, remote, now);
    try {
      return { flush, pull: await pullChanges(store, remote), error: null };
    } catch (e) { return { flush, pull: null, error: e instanceof Error ? e.message : String(e) }; }
  })();
  return { store, warm, synced };
}
export async function onSignOut(store: DeviceStore) { await store.wipe(); }
