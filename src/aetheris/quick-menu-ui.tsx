/**
 * Quick Menu: right-click anywhere in the app for the actions you use most, plus a few that fit
 * what you clicked (a member, a link, selected text). Members choose and order their own items
 * ("Customize…"); the choice is saved to their account (drizzle/migrations/0056).
 * Shift + right-click, and right-clicks in typing fields, keep the browser's own menu.
 */
import {
  ArrowDown, ArrowUp, Bot, Briefcase, CalendarDays, Copy, ExternalLink, HandHelping, Home, Lightbulb,
  Link2, MessageSquareText, Newspaper, Route, Search, Settings2, Sparkles, UserRound, UsersRound, Video, X,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { supabase } from '@/integrations/supabase/client'
import {
  DEFAULT_QUICK_ITEMS, MAX_QUICK_ITEMS, QUICK_ACTIONS, cleanItems, moveItem, placeMenu, quickAction, toggleItem, wantsNativeMenu,
  type QuickTarget,
} from './quick-menu'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

/** The Ask Intros assistant's mark, sized like the menu's other icons. */
function AssistantGlyph({ size = 14 }: { size?: number }) {
  return <span className="aetheris-glyph qm-glyph" style={{ width: size, height: size }} aria-hidden="true"><i /><b /></span>
}

/** Opens the Ask Intros assistant (AskIntrosDock), optionally with a question typed in. */
export function openAssistant(question?: string) {
  window.dispatchEvent(new CustomEvent('aetheris:open-assistant', question ? { detail: question } : undefined))
}

const short = (text: string, n = 28) => (text.length > n ? `${text.slice(0, n - 1)}…` : text)
const CACHE_KEY = 'aetheris.quickmenu.v1'

const ICONS: Record<string, typeof Home> = {
  'new-ask': Lightbulb, people: Search, intros: Sparkles, messages: MessageSquareText, meetings: Video,
  warmpaths: Route, events: CalendarDays, peergroups: UsersRound, providers: HandHelping, calendar: CalendarDays,
  crm: Briefcase, agentinbox: Bot, home: Home, news: Newspaper, insights: Lightbulb, profile: UserRound, settings: Settings2,
}

function readCache(): string[] | null {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? cleanItems(JSON.parse(raw)) : null } catch { return null }
}
function writeCache(items: string[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)) } catch { /* unavailable */ }
}

/** The member's chosen items: cached on the device for instant menus, saved to the account when signed in. */
function useQuickItems(live: boolean) {
  const [items, setItems] = useState<string[]>(() => readCache() ?? [...DEFAULT_QUICK_ITEMS])
  useEffect(() => {
    if (!live) return
    let off = false
    void db.from('member_quick_menu').select('items').maybeSingle().then((r: { data: { items: string[] } | null }) => {
      if (off || !r.data) return
      const next = cleanItems(r.data.items)
      setItems(next); writeCache(next)
    })
    return () => { off = true }
  }, [live])
  const save = useCallback(async (next: string[]) => {
    const clean = cleanItems(next)
    setItems(clean); writeCache(clean)
    if (!live) return
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) return
    const { error } = await db.from('member_quick_menu').upsert({ user_id: u.user.id, items: clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw new Error('Could not save your menu.')
  }, [live])
  const reset = useCallback(async () => {
    setItems([...DEFAULT_QUICK_ITEMS]); writeCache([...DEFAULT_QUICK_ITEMS])
    if (!live) return
    const { data: u } = await supabase.auth.getUser()
    if (u.user) await db.from('member_quick_menu').delete().eq('user_id', u.user.id)
  }, [live])
  return { items, save, reset }
}

export interface QuickMemberRef { id: string; name: string }

interface MenuEntry { key: string; label: string; hint?: string; icon: typeof Home; run: () => void }

interface Props {
  live: boolean
  /** Go to a page or workspace tool. */
  onGo: (target: QuickTarget) => void
  /** Look up a member by the id on a clicked portrait; null when it is not a member. */
  findMember?: (id: string) => QuickMemberRef | null
  onOpenMember?: (id: string) => void
  onRequestIntro?: (id: string) => void
  onSearch?: (text: string) => void
}

export function QuickMenuHost(props: Props) {
  const { live, onGo } = props
  const { items, save, reset } = useQuickItems(live)
  // Latest callbacks without re-binding the window listener on every render.
  const cb = useRef(props)
  cb.current = props
  const [menu, setMenu] = useState<{ x: number; y: number; context: MenuEntry[] } | null>(null)
  const [editing, setEditing] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => { setMenu(null); setPos(null) }, [])

  useEffect(() => {
    // A fine pointer only: long-press on phones keeps its usual text-selection behaviour.
    const fine = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine)').matches : true
    if (!fine) return
    const onContext = (e: MouseEvent) => {
      const { findMember, onOpenMember, onRequestIntro, onSearch } = cb.current
      if (e.defaultPrevented) return
      const el = e.target instanceof Element ? e.target : null
      if (wantsNativeMenu(el, e.shiftKey)) return
      e.preventDefault()
      const context: MenuEntry[] = []
      const selected = String(window.getSelection?.() ?? '').trim()
      const portrait = el?.closest('[data-person-portrait]')?.getAttribute('data-person-portrait')
      const member = portrait && portrait !== 'me' && findMember ? findMember(portrait) : null
      // The Ask Intros assistant is always first, primed with what was clicked when that helps.
      const question = selected
        ? `What should I know about “${selected.slice(0, 300)}”, and who in my network can help?`
        : member ? `What should I know about ${member.name}, and how can we help each other?` : ''
      context.push({
        key: 'assistant',
        label: selected ? `Ask Intros about “${short(selected, 24)}”` : member ? `Ask Intros about ${member.name}` : 'Ask Intros…',
        icon: AssistantGlyph as unknown as typeof Home,
        run: () => openAssistant(question || undefined),
      })
      if (selected) {
        context.push({ key: 'copy', label: 'Copy', icon: Copy, run: () => void navigator.clipboard?.writeText(selected) })
        if (onSearch) context.push({ key: 'search', label: `Search members for “${short(selected)}”`, icon: Search, run: () => onSearch(selected) })
      }
      if (member) {
        if (onOpenMember) context.push({ key: 'open-member', label: `Open ${member.name}`, icon: UserRound, run: () => onOpenMember(member.id) })
        if (onRequestIntro) context.push({ key: 'intro-member', label: `Request intro to ${member.name}`, icon: Sparkles, run: () => onRequestIntro(member.id) })
      }
      const link = el?.closest('a[href]') as HTMLAnchorElement | null
      if (link && /^https?:/i.test(link.href)) {
        context.push({ key: 'open-link', label: 'Open link in new tab', icon: ExternalLink, run: () => void window.open(link.href, '_blank', 'noopener,noreferrer') })
        context.push({ key: 'copy-link', label: 'Copy link', icon: Link2, run: () => void navigator.clipboard?.writeText(link.href) })
      }
      setMenu({ x: e.clientX, y: e.clientY, context })
    }
    window.addEventListener('contextmenu', onContext)
    return () => window.removeEventListener('contextmenu', onContext)
  }, [])

  useEffect(() => {
    if (!menu) return
    const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('mousedown', outside)
    window.addEventListener('keydown', key)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('mousedown', outside)
      window.removeEventListener('keydown', key)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('blur', close)
    }
  }, [menu, close])

  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos(placeMenu(menu.x, menu.y, r.width, r.height, window.innerWidth, window.innerHeight))
  }, [menu])

  // Focus the first item once the menu is placed and visible, for keyboard use.
  useEffect(() => {
    if (pos) ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [pos])

  const run = (fn: () => void) => { close(); fn() }

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const list = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const i = list.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length
    list[next]?.focus()
  }

  const chosen = items.map(quickAction).filter((a): a is NonNullable<typeof a> => !!a)

  return <>
    {menu && <div ref={ref} className="qm" role="menu" aria-label="Quick menu" onKeyDown={onMenuKey}
      style={pos ? { left: pos.left, top: pos.top } : { left: menu.x, top: menu.y, visibility: 'hidden' }}
      onContextMenu={e => e.preventDefault()}>
      {menu.context.length > 0 && <>
        {menu.context.map(c => <MenuItem key={c.key} icon={c.icon} label={c.label} onClick={() => run(c.run)} />)}
        <hr />
      </>}
      {chosen.length
        ? chosen.map(a => <MenuItem key={a.id} icon={ICONS[a.id] ?? Sparkles} label={a.label} onClick={() => run(() => onGo(a.target))} />)
        : <p className="qm-empty">Your menu is empty.</p>}
      <hr />
      <MenuItem icon={Settings2} label="Customize this menu…" onClick={() => run(() => setEditing(true))} />
      <p className="qm-hint">Shift + right-click for the browser menu</p>
    </div>}
    {editing && <QuickMenuEditor items={items} onClose={() => setEditing(false)} onSave={save} onReset={reset} />}
  </>
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Home; label: string; onClick: () => void }) {
  return <button type="button" role="menuitem" className="qm-item" onClick={onClick}><Icon size={14} aria-hidden /><span>{label}</span></button>
}

function QuickMenuEditor({ items, onClose, onSave, onReset }: { items: string[]; onClose: () => void; onSave: (items: string[]) => Promise<void>; onReset: () => Promise<void> }) {
  const [draft, setDraft] = useState<string[]>(items)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  const done = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg('')
    try { await fn(); onClose() } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save your menu.') }
    setBusy(false)
  }
  const unchosen = QUICK_ACTIONS.filter(a => !draft.includes(a.id))

  return <div className="qm-editor-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="qm-editor" role="dialog" aria-modal="true" aria-label="Customize your quick menu">
      <header>
        <div><b>Your quick menu</b><small>Right-click anywhere in Ask Intros to open it. Choose up to {MAX_QUICK_ITEMS}.</small></div>
        <button type="button" className="qm-close" aria-label="Close" onClick={onClose}><X size={16} /></button>
      </header>
      <section>
        <h4>In your menu ({draft.length}/{MAX_QUICK_ITEMS})</h4>
        {draft.length === 0 && <p className="qm-empty">Nothing yet. Add items below.</p>}
        <ol className="qm-list">
          {draft.map((id, i) => {
            const a = quickAction(id)!
            const Icon = ICONS[id] ?? Sparkles
            return <li key={id}>
              <Icon size={14} aria-hidden /><span><b>{a.label}</b><small>{a.hint}</small></span>
              <button type="button" aria-label={`Move ${a.label} up`} disabled={i === 0} onClick={() => setDraft(d => moveItem(d, id, -1))}><ArrowUp size={13} /></button>
              <button type="button" aria-label={`Move ${a.label} down`} disabled={i === draft.length - 1} onClick={() => setDraft(d => moveItem(d, id, 1))}><ArrowDown size={13} /></button>
              <button type="button" aria-label={`Remove ${a.label}`} onClick={() => setDraft(d => toggleItem(d, id))}><X size={13} /></button>
            </li>
          })}
        </ol>
      </section>
      <section>
        <h4>Add</h4>
        <div className="qm-add">
          {unchosen.map(a => {
            const Icon = ICONS[a.id] ?? Sparkles
            return <button key={a.id} type="button" disabled={draft.length >= MAX_QUICK_ITEMS} onClick={() => setDraft(d => toggleItem(d, a.id))} title={a.hint}>
              <Icon size={13} aria-hidden /> {a.label}
            </button>
          })}
        </div>
      </section>
      {msg && <p className="qm-msg">{msg}</p>}
      <footer>
        <button type="button" className="qm-secondary" disabled={busy} onClick={() => void done(onReset)}>Reset to default</button>
        <span />
        <button type="button" className="qm-secondary" disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className="qm-primary" disabled={busy} onClick={() => void done(() => onSave(draft))}>{busy ? 'Saving…' : 'Save'}</button>
      </footer>
    </div>
  </div>
}

/** Small "Quick menu" row for Settings → Preferences, so members can find the editor without right-clicking. */
export function QuickMenuSettings({ live }: { live: boolean }): ReactNode {
  const { items, save, reset } = useQuickItems(live)
  const [open, setOpen] = useState(false)
  return <div className="push-settings">
    <p><Settings2 size={14} aria-hidden /> Quick menu: right-click anywhere in Ask Intros for your {items.length} favourite actions. Shift + right-click keeps the browser menu.</p>
    <div className="push-actions"><button type="button" className="push-btn" onClick={() => setOpen(true)}>Customize quick menu</button></div>
    {open && <QuickMenuEditor items={items} onClose={() => setOpen(false)} onSave={save} onReset={reset} />}
  </div>
}
