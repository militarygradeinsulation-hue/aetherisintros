/** Only member-owned slices; never cache other members' private records. */
export const SLICES = {
  profile: { ttlMs: 7 * 86400000, schema: 1 },
  preferences: { ttlMs: 30 * 86400000, schema: 1 },
  matches: { ttlMs: 86400000, schema: 1 },
  open_intros: { ttlMs: 86400000, schema: 1 },
  butler_tail: { ttlMs: 7 * 86400000, schema: 1 },
  drafts: { ttlMs: 30 * 86400000, schema: 1 },
} as const;
export type Slice = keyof typeof SLICES;
export interface CachedSlice<T = unknown> {
  slice: Slice; payload: T; serverUpdatedAt: string; stale: boolean;
}
export type OutboxKind = 'context_upsert' | 'intro_response' | 'outcome_check' | 'capacity_post' | 'task_session' | (string & {});
export interface OutboxItem<T = unknown> {
  id: string; kind: OutboxKind; payload: T; createdAt: string;
  attempts: number; nextAttemptAt: string; lastError: string | null; dead: boolean;
}
export type SendResult = { ok: true } | { ok: false; retryable: boolean; error: string };
export interface ServerChange { slice: Slice; payload: unknown; updatedAt: string; deleted: boolean }
export interface Remote {
  send(item: OutboxItem): Promise<SendResult>;
  changesSince(since: string | null): Promise<{ changes: ServerChange[]; serverTime: string }>;
}
export interface VaultNote { id: string; text: string; createdAt: string }
