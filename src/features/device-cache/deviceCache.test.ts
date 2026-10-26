import { describe, expect, it } from 'vitest';
import { supabaseRemote } from './supabaseRemote';
import { flushOutbox, pullChanges } from './sync';
import type { OutboxItem, Remote, ServerChange } from './types';
import type { DeviceStore } from './store';

function item(id: string, payload: unknown = {}): OutboxItem {
  return { id, kind: 'context_upsert', payload, createdAt: '2026-10-26T10:00:00Z',
    nextAttemptAt: '2026-10-26T10:00:00Z', attempts: 0, lastError: null, dead: false };
}
describe('account-owned device sync', () => {
  it('sends exact idempotency keys and refuses unsupported offline actions', async () => {
    const seen: Array<{ name: string; args: Record<string, unknown> }> = [];
    const client = { rpc(name: string, args: Record<string, unknown>) {
      seen.push({ name, args });
      return Promise.resolve({ data: null, error: null });
    } };
    const remote = supabaseRemote(client);
    expect(await remote.send(item('mut-id', { slice: 'drafts', payload: { text: 'hello' } }))).toEqual({ ok: true });
    expect(seen[0]).toEqual({ name: 'ask_context_upsert', args: {
      p_slice: 'drafts', p_payload: { text: 'hello' }, p_mutation_id: 'mut-id',
    } });
    expect(await remote.send({ ...item('unsupported'), kind: 'intro_response' })).toMatchObject({
      ok: false, retryable: false,
    });
  });
  it('handles the cursor sentinel even when the database returns it last', async () => {
    const client = { rpc() { return Promise.resolve({ data: [
      { slice: 'drafts', payload: { text: 'x' }, deleted: false,
        updated_at: '2026-10-26T10:00:00Z', server_time: '2026-10-26T10:10:00Z' },
      { slice: null, payload: null, deleted: null, updated_at: null, server_time: '2026-10-26T10:10:00Z' },
    ], error: null }); } };
    expect(await supabaseRemote(client).changesSince(null)).toMatchObject({
      serverTime: '2026-10-26T10:10:00Z',
      changes: [{ slice: 'drafts', payload: { text: 'x' } }],
    });
  });
  it('never overwrites a local edit waiting in the outbox', async () => {
    const calls: string[] = [];
    const store = {
      getCursor: async () => null,
      outbox: async () => [item('a', { slice: 'drafts', payload: { text: 'local' } })],
      putSlice: async (slice: string) => { calls.push('put:' + slice); },
      deleteSlice: async (slice: string) => { calls.push('delete:' + slice); },
      setCursor: async (cursor: string) => { calls.push('cursor:' + cursor); },
    } as unknown as DeviceStore;
    const changes: ServerChange[] = [
      { slice: 'drafts', payload: { text: 'remote' }, updatedAt: 'remote', deleted: false },
      { slice: 'preferences', payload: {}, updatedAt: 'remote', deleted: false },
    ];
    const remote: Remote = {
      send: async () => ({ ok: true }),
      changesSince: async () => ({ changes, serverTime: 'trusted-cursor' }),
    };
    expect((await pullChanges(store, remote)).applied).toBe(1);
    expect(calls).toEqual(['put:preferences', 'cursor:trusted-cursor']);
  });
  it('stops the queue after a temporary network failure', async () => {
    const events: string[] = [];
    const one = item('first'), two = item('second');
    const store = {
      outbox: async () => [one,two],
      ack: async (id: string) => { events.push('ack:'+id); },
      fail: async (id: string) => { events.push('fail:'+id); },
    } as unknown as DeviceStore;
    const remote: Remote = {
      send: async item => { events.push('send:'+item.id); return { ok: false, retryable: true, error: 'offline' }; },
      changesSince: async () => ({ changes: [], serverTime: '' }),
    };
    expect(await flushOutbox(store,remote,() => Date.parse('2026-10-26T11:00:00Z')))
      .toMatchObject({ sent: 0, retrying: 1 });
    expect(events).toEqual(['send:first','fail:first']);
  });
});
