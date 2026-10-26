import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceStore, wipeAccount } from './store';
import { flushOutbox, onSignIn, onSignOut, pullChanges, warmStart, type WarmStart } from './sync';
import { supabaseRemote, type KindHandler } from './supabaseRemote';
import type { OutboxKind, Remote, Slice } from './types';

interface AuthClient {
  auth: {
    getSession(): PromiseLike<{ data: { session: { user: { id: string } } | null } }>;
    onAuthStateChange(cb: (event: string, session: { user: { id: string } } | null) => void): {
      data: { subscription: { unsubscribe(): void } };
    };
  };
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{
    data: unknown; error: { message: string; code?: string } | null;
  }>;
}

export const BACKGROUND_SYNC_MS = 60_000;
export interface DeviceSession {
  ready: boolean;
  warm: WarmStart | null;
  pending: number;
  lastSyncError: string | null;
  save: <T>(slice: Slice, payload: T) => Promise<void>;
  queue: <T>(kind: OutboxKind, payload: T) => Promise<void>;
  syncNow: () => Promise<void>;
  pendingBeforeSignOut: () => Promise<number>;
  wipe: () => Promise<void>;
}

/** Single mounted account session; never registers during the public demo. */
export function useDeviceSession(
  client: AuthClient, handlers: Record<string, KindHandler> = {}, enabled = true,
): DeviceSession {
  const storeRef = useRef<DeviceStore | null>(null);
  const userRef = useRef<string | null>(null);
  const generation = useRef(0);
  const syncing = useRef<Promise<void> | null>(null);
  const remote = useRef<Remote>(supabaseRemote(client, handlers));
  const [warm, setWarm] = useState<WarmStart | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    if (storeRef.current) setPending(await storeRef.current.pendingCount());
  }, []);

  const syncNow = useCallback(async () => {
    const store = storeRef.current, epoch = generation.current;
    if (!store) return;
    if (syncing.current) return syncing.current;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const job = (async () => {
      try {
        const flush = await flushOutbox(store, remote.current);
        if (flush.retrying || flush.dead) {
          setLastSyncError('Some device changes still need attention. Check your connection or retry.');
        }
        await pullChanges(store, remote.current);
        if (generation.current !== epoch) return;
        if (!flush.retrying && !flush.dead) setLastSyncError(null);
        setWarm(await warmStart(store));
      } catch (error) {
        if (generation.current === epoch) setLastSyncError(error instanceof Error ? error.message : 'Device sync unavailable');
      } finally {
        if (generation.current === epoch) {
          try { await refreshPending(); } catch { /* store may be closing */ }
        }
      }
    })();
    syncing.current = job;
    try { await job; } finally { if (syncing.current === job) syncing.current = null; }
  }, [refreshPending]);

  const stop = useCallback(async () => {
    generation.current++;
    const store = storeRef.current, uid = userRef.current;
    storeRef.current = null;
    userRef.current = null;
    setWarm(null); setPending(0); setReady(false); setLastSyncError(null);
    if (syncing.current) {
      try { await syncing.current; } catch { /* another session is closing */ }
    }
    if (store) await onSignOut(store);
    else if (uid) await wipeAccount(uid);
  }, []);

  const start = useCallback(async (userId: string) => {
    if (userRef.current === userId) return;
    const epoch = ++generation.current;
    const old = storeRef.current;
    storeRef.current = null;
    if (old) old.close();
    userRef.current = userId;
    setReady(false);
    try {
      // Start on the device copy; do not wait for the network to paint.
      const { store, warm: initial, synced } = await onSignIn(userId, remote.current);
      if (generation.current !== epoch) {
        try { await onSignOut(store); } catch { /* stale account cleanup */ }
        return;
      }
      storeRef.current = store;
      setWarm(initial); setPending(initial.pending); setReady(true);
      const result = await synced;
      if (generation.current !== epoch) return;
      setLastSyncError(result.error);
      if (!result.error) setWarm(await warmStart(store));
      await refreshPending();
    } catch (error) {
      if (generation.current === epoch) setLastSyncError(error instanceof Error ? error.message : 'Device cache unavailable');
    }
  }, [refreshPending]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void client.auth.getSession().then(({ data }) => {
      if (alive && data.session?.user?.id) void start(data.session.user.id);
    });
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') void stop();
      else if (session?.user?.id) void start(session.user.id);
    });
    const onOnline = () => { void syncNow(); };
    const onVisible = () => { if (document.visibilityState === 'visible') void syncNow(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => void syncNow(), BACKGROUND_SYNC_MS);
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
      // Unmount closes resources. Authenticated state remains available for
      // the next mounted shell; explicit sign-out calls wipe() separately.
      storeRef.current?.close();
      storeRef.current = null;
      generation.current++;
    };
  }, [client, enabled, start, stop, syncNow]);

  const save = useCallback(async <T,>(slice: Slice, payload: T) => {
    const store = storeRef.current;
    if (!store) throw new Error('Sign in to save private device context');
    await store.putSlice(slice, payload, new Date().toISOString());
    await store.enqueue('context_upsert', { slice, payload });
    await refreshPending();
    void syncNow();
  }, [refreshPending, syncNow]);

  const queue = useCallback(async <T,>(kind: OutboxKind, payload: T) => {
    if (kind !== 'context_upsert' && !handlers[kind])
      throw new Error('This action has no verified offline handler. Use its normal online workflow.');
    const store = storeRef.current;
    if (!store) throw new Error('Sign in to queue an offline action');
    await store.enqueue(kind, payload);
    await refreshPending();
    void syncNow();
  }, [handlers, refreshPending, syncNow]);

  const pendingBeforeSignOut = useCallback(async () => {
    await syncNow();
    return storeRef.current ? storeRef.current.pendingCount() : 0;
  }, [syncNow]);

  return { ready, warm, pending, lastSyncError, save, queue, syncNow, pendingBeforeSignOut, wipe: stop };
}
