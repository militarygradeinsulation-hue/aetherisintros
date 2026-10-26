/**
 * Live notification bell: the real unread count from `notifications` (written by database
 * triggers, see drizzle/migrations/0026) and a short list. Refreshes on an interval and when
 * the tab regains focus; opening an item marks it read.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { PushSettings } from './push-ui'
import { notificationPanelBounds, type NotificationPanelBounds } from './notification-placement'
import './notification-popover.css'

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
  if (n.kind === 'crm_opportunity') return 'people' // auto-created deal opportunity → CRM tab is on the people section
  return 'home' // e.g. onboarding_incomplete nudges
}

export function LiveNotificationsBell({ onOpen }: { onOpen: (destination: ReturnType<typeof destinationFor>) => void }) {
  const [items, setItems] = useState<LiveNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const popupId = useId()
  const [bounds, setBounds] = useState<NotificationPanelBounds | null>(null)
  const focusOnOpen = useRef(false)

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
    if (!open) { focusOnOpen.current = false; return }
    const reposition = () => {
      if (!buttonRef.current) return
      const viewport = window.visualViewport
      setBounds(notificationPanelBounds(buttonRef.current.getBoundingClientRect(), {
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
        offsetLeft: viewport?.offsetLeft,
        offsetTop: viewport?.offsetTop,
      }))
    }
    const closeOutside = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (!ref.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus() }
    }
    reposition()
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', esc)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    window.visualViewport?.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('scroll', reposition)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      window.visualViewport?.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('scroll', reposition)
    }
  }, [open])

  useEffect(() => {
    if (open && bounds && !focusOnOpen.current) {
      focusOnOpen.current = true
      panelRef.current?.focus({ preventScroll: true })
    }
  }, [open, bounds])

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
    <button type="button" ref={buttonRef} className="live-bell-btn"
      aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      aria-haspopup="dialog" aria-controls={open ? popupId : undefined} aria-expanded={open}
      onClick={() => { setBounds(null); setOpen(o => !o) }}>
      <Bell size={16} aria-hidden />
      {unread > 0 && <span className="live-bell-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && bounds && createPortal(
      <div id={popupId} ref={panelRef} className="live-bell-panel"
        style={{ left: bounds.left, top: bounds.top, width: bounds.width, maxHeight: bounds.maxHeight }}
        role="dialog" aria-label="Notifications" tabIndex={-1}>
        <header>
          <b>Notifications</b>
          <div className="live-bell-panel-actions">
            {unread > 0 && <button type="button" onClick={() => void markRead(null)}>Mark all read</button>}
            <button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); buttonRef.current?.focus() }}>
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>
        {items.length
          ? <ul>{items.map(n => <li key={n.id}><button type="button" className={n.read ? '' : 'unread'} onClick={() => choose(n)}>
            <span>{n.text}</span><small>{ageLabel(n.createdAt)}</small>
          </button></li>)}</ul>
          : <p>You're caught up. Introduction requests and acceptances will appear here.</p>}
        <footer className="live-bell-push"><PushSettings compact /></footer>
      </div>,
      document.body
    )}
  </div>
}
