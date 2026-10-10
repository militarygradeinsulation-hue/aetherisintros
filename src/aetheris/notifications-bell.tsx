/**
 * Live notification bell: the real unread count from `notifications` (written by database
 * triggers, see drizzle/migrations/0026) and a short list. Refreshes on an interval and when
 * the tab regains focus; opening an item marks it read.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { PushSettings } from './push-ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface LiveNotification { id: string; kind: string; text: string; link: string; read: boolean; createdAt: string }

/** "3m", "2h", "5d" — compact age for the list. */
export function ageLabel(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

/** Where a notification should take the member. */
export function destinationFor(n: Pick<LiveNotification, 'kind'>): 'intros' | 'messages' | 'people' | 'meetings' | 'peergroups' | 'events' | 'deals' | 'home' {
  if (n.kind.startsWith('meeting')) return 'meetings'
  if (n.kind.startsWith('peer_group')) return 'peergroups'
  if (n.kind.startsWith('deal_')) return 'deals' // deal_invite, deal_update
  if (n.kind.startsWith('event_')) return 'events' // event_invite, event_promoted, event_cancelled, event_reminder
  if (n.kind === 'message') return 'messages'
  if (n.kind === 'connection' || n.kind === 'follow') return 'people'
  if (n.kind.startsWith('intro')) return 'intros' // intro_request, intro_accepted, intro_declined, intro_connected
  return 'home' // e.g. onboarding_incomplete nudges
}

export function LiveNotificationsBell({ onOpen }: { onOpen: (destination: ReturnType<typeof destinationFor>) => void }) {
  const [items, setItems] = useState<LiveNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const [list, count] = await Promise.all([
      db.from('notifications').select('id, kind, text, link, read, created_at').order('created_at', { ascending: false }).limit(12),
      db.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    ])
    setItems((list.data ?? []).map((n: any) => ({ id: n.id, kind: n.kind, text: n.text, link: n.link, read: n.read, createdAt: n.created_at })))
    setUnread(count.count ?? 0)
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 60000)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [load])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const markRead = async (ids: string[] | null) => {
    await db.rpc('mark_notifications_read', { p_ids: ids })
    await load()
  }

  const choose = (n: LiveNotification) => {
    setOpen(false)
    if (!n.read) void markRead([n.id])
    onOpen(destinationFor(n))
  }

  return <div className="live-bell" ref={ref}>
    <button type="button" className="live-bell-btn" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} onClick={() => setOpen(o => !o)}>
      <Bell size={16} aria-hidden />
      {unread > 0 && <span className="live-bell-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <div className="live-bell-panel" role="dialog" aria-label="Notifications">
      <header><b>Notifications</b>{unread > 0 && <button type="button" onClick={() => void markRead(null)}>Mark all read</button>}</header>
      {items.length
        ? <ul>{items.map(n => <li key={n.id}><button type="button" className={n.read ? '' : 'unread'} onClick={() => choose(n)}>
          <span>{n.text}</span><small>{ageLabel(n.createdAt)}</small>
        </button></li>)}</ul>
        : <p>You're caught up. Introduction requests and acceptances will appear here.</p>}
      <footer className="live-bell-push"><PushSettings compact /></footer>
    </div>}
  </div>
}
