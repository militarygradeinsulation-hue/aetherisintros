import type { OutboxItem, Remote, SendResult, ServerChange, Slice } from './types';
interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;
}
export type KindHandler = (item: OutboxItem) => Promise<SendResult>;
const TRANSIENT = new Set(['PGRST301','57014','08006','08001','53300']);
/** Unknown offline action kinds are deliberately not sent. */
export function supabaseRemote(client: RpcClient, handlers: Record<string, KindHandler> = {}): Remote {
  return {
    async send(item) {
      const handler = handlers[item.kind];
      if (handler) return handler(item);
      if (item.kind !== 'context_upsert') return { ok: false, retryable: false, error: 'No verified handler for '+item.kind };
      const p = item.payload as { slice: Slice; payload: unknown };
      const { error } = await client.rpc('ask_context_upsert', {
        p_slice: p.slice, p_payload: p.payload, p_mutation_id: item.id,
      });
      if (!error) return { ok: true };
      // Missing RPC is not a network failure: keep pending work instead of
      // pretending it synced or retrying indefinitely after backend drift.
      const unavailable = error.code === 'PGRST202' || /function .* does not exist/i.test(error.message);
      return { ok: false, retryable: unavailable || !error.code || TRANSIENT.has(error.code), error: error.message };
    },
    async changesSince(since) {
      const { data, error } = await client.rpc('ask_context_since', { p_since: since });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as {
        slice: Slice | null; payload: unknown; deleted: boolean | null;
        updated_at: string | null; server_time: string;
      }[];
      const marker = rows.find(row => row.slice === null);
      if (!marker?.server_time) throw new Error('Device sync response did not include a trusted server cursor');
      const changes: ServerChange[] = rows.filter((row): row is typeof row & { slice: Slice; updated_at: string; deleted: boolean } => !!row.slice && !!row.updated_at)
        .map(row => ({ slice: row.slice, payload: row.payload, deleted: row.deleted, updatedAt: row.updated_at }));
      return { changes, serverTime: marker.server_time };
    },
  };
}
