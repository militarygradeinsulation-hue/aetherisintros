/**
 * Live unread counts and read receipts for direct messages (0052). One shared subscription
 * feeds every badge and conversation view on the page.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { EMPTY_UNREAD, toSnapshot, withThreadRead, type UnreadRow, type UnreadSnapshot } from './messaging-state'
import { reportClientError } from '@/lib/error-report'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

let snapshot: UnreadSnapshot = EMPTY_UNREAD
const listeners = new Set<() => void>()
let subscribers = 0
let channel: ReturnType<typeof supabase.channel> | null = null
let timer: ReturnType<typeof setTimeout> | null = null

const emit = (next: UnreadSnapshot) => { snapshot = next; listeners.forEach(fn => fn()) }

export async function refreshUnread(): Promise<void> {
  const { data, error } = await db.rpc('my_unread_counts')
  if (error) {
    reportClientError(error, 'unread-counts')
    // Keep last known unread state rather than falsely reporting everything read.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('aetheris:unread-unavailable'))
    return
  }
  emit(toSnapshot(data as UnreadRow[]))
}

const scheduleRefresh = () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { timer = null; void refreshUnread() }, 250)
}

function start() {
  void refreshUnread()
  if (channel) return
  channel = supabase
    .channel(`dm-unread-${Math.random().toString(36).slice(2, 10)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, scheduleRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_thread_reads' }, scheduleRefresh)
    .subscribe()
}

function stop() {
  if (channel) void supabase.removeChannel(channel)
  channel = null
  if (timer) clearTimeout(timer)
  timer = null
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Unread totals and per-thread receipt state for the signed-in member. */
export function useUnreadCounts(enabled = true): UnreadSnapshot {
  useEffect(() => {
    if (!enabled) return
    subscribers += 1
    if (subscribers === 1) start()
    else void refreshUnread()
    return () => {
      subscribers -= 1
      if (subscribers === 0) stop()
    }
  }, [enabled])
  const value = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY_UNREAD)
  return enabled ? value : EMPTY_UNREAD
}

/** Record that you have read a conversation up to now. */
export async function markThreadRead(threadId: string): Promise<void> {
  const { error } = await db.rpc('mark_thread_read', { p_thread_id: threadId })
  if (error) {
    reportClientError(error, 'mark-thread-read')
    throw new Error('Could not mark the conversation as read. Retry when connected.')
  }
  emit(withThreadRead(snapshot, threadId))
  scheduleRefresh()
}

/** Your read-receipt setting (on unless you turned it off). */
export async function loadReadReceiptsSetting(): Promise<boolean> {
  const { data } = await db.from('messaging_settings').select('show_read_receipts').maybeSingle()
  return data?.show_read_receipts ?? true
}

export async function saveReadReceiptsSetting(on: boolean): Promise<boolean> {
  const { error } = await db.rpc('set_read_receipts', { p_on: on })
  if (error) throw new Error(error.message)
  scheduleRefresh()
  return on
}
