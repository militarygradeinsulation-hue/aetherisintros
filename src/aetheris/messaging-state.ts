/**
 * Pure helpers for unread counts and read receipts (no network, unit-tested).
 * Rows come from the `my_unread_counts()` RPC (0052).
 */

export interface UnreadRow {
  thread_id: string
  unread: number
  peer_read_at: string | null
  seen_message_id: string | null
}

export interface ThreadReadState {
  unread: number
  /** When the other person last read the thread; null when either of you hides receipts. */
  peerReadAt: string | null
  /** The latest of your messages the other person has read; null when hidden or none. */
  seenMessageId: string | null
}

export interface UnreadSnapshot {
  loaded: boolean
  total: number
  threads: Record<string, ThreadReadState>
}

export const EMPTY_UNREAD: UnreadSnapshot = { loaded: false, total: 0, threads: {} }

export function toSnapshot(rows: readonly UnreadRow[] | null | undefined): UnreadSnapshot {
  const threads: Record<string, ThreadReadState> = {}
  let total = 0
  for (const row of rows ?? []) {
    const unread = Math.max(0, Math.floor(Number(row.unread) || 0))
    total += unread
    threads[row.thread_id] = { unread, peerReadAt: row.peer_read_at ?? null, seenMessageId: row.seen_message_id ?? null }
  }
  return { loaded: true, total, threads }
}

/** Short badge text: '' for none, the number up to 99, then '99+'. */
export function badgeLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return ''
  return count > 99 ? '99+' : String(Math.floor(count))
}

/** Locally zero a thread after marking it read, so the badge drops before the refetch. */
export function withThreadRead(snapshot: UnreadSnapshot, threadId: string): UnreadSnapshot {
  const current = snapshot.threads[threadId]
  if (!current || current.unread === 0) return snapshot
  return {
    ...snapshot,
    total: Math.max(0, snapshot.total - current.unread),
    threads: { ...snapshot.threads, [threadId]: { ...current, unread: 0 } },
  }
}

/**
 * Which message should carry "Seen": your most recent message, and only when it is the one
 * the other person has read up to (like iMessage, nothing shows under older messages).
 */
export function seenUnderMessageId(
  messages: ReadonlyArray<{ id: string; from: 'me' | 'them' }>,
  seenMessageId: string | null | undefined,
): string | null {
  if (!seenMessageId) return null
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message?.from === 'me') return message.id === seenMessageId ? seenMessageId : null
  }
  return null
}

/** Mark a thread read only while it is on screen and has something unread. */
export function shouldMarkRead(input: { threadId: string | null | undefined; pageVisible: boolean; unread: number; fallbackUnread?: boolean }): boolean {
  if (!input.threadId || !input.pageVisible) return false
  return input.unread > 0 || Boolean(input.fallbackUnread)
}
