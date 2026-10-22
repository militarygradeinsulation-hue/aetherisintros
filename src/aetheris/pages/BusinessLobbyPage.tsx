import './executive-page-parity.css'
import { useCallback, useEffect, useState } from 'react'
import { BellRing, Clock3, DoorOpen, RefreshCw } from 'lucide-react'
import {
  answerBusinessLobby, knockBusinessLobby, knockIsOpen, loadBusinessLobby, setBusinessLobby,
  type LobbyContact, type LobbyKnock, type LobbySnapshot,
} from '../business-lobby'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Eyebrow } from '../ui'
import { SignInRequired, useSessionUser } from './useSessionUser'

const MINUTES = [0, 15, 30, 60, 120] as const
type Minutes = typeof MINUTES[number]
const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const isOpen = (until: string | null) => !!until && Date.parse(until) > Date.now()

export function BusinessLobbyPage() {
  const { userId, ready } = useSessionUser()
  if (!ready) return <section className="executive-section aetheris-parity"><p className="og-note parity-empty">Loading…</p></section>
  if (!userId) return <div className="aetheris-parity"><SignInRequired what="the Business Lobby" /></div>
  return <LobbyPanel userId={userId} />
}

function LobbyPanel({ userId }: { userId: string }) {
  const [snap, setSnap] = useState<LobbySnapshot | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [minutes, setMinutes] = useState<Minutes>(30)
  const [headline, setHeadline] = useState('')
  const [knockFor, setKnockFor] = useState<LobbyContact | null>(null)
  const [note, setNote] = useState('')

  const refresh = useCallback(async () => {
    try { setSnap(await loadBusinessLobby(userId)); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Business Lobby could not be loaded') }
  }, [userId])

  useEffect(() => { void refresh() }, [refresh])
  const windowOpen = isOpen(snap?.myWindowUntil ?? null)
  useEffect(() => {
    if (!windowOpen) return
    const id = window.setInterval(() => { if (!document.hidden) void refresh() }, 30000)
    return () => window.clearInterval(id)
  }, [windowOpen, refresh])

  const run = async (task: () => Promise<unknown>, ok: string) => {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await task(); setNotice(ok); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed') }
    finally { setBusy(false) }
  }

  const knocks = snap?.knocks ?? []
  const incoming = knocks.filter(k => k.recipientId === userId)
  const sent = knocks.filter(k => k.requesterId === userId)
  const pendingIn = incoming.filter(k => knockIsOpen(k))
  const decidedIn = incoming.filter(k => !knockIsOpen(k))

  return <section className="executive-section aetheris-parity" aria-label="Business Lobby">
    <header className="parity-head">
      <div>
        <Eyebrow><DoorOpen size={13} /> BUSINESS LOBBY</Eyebrow>
        <h2>Meet when there is a reason, not just an opening.</h2>
        <p className="og-note">Open a short drop-in window for people who accepted an introduction with you. A knock is a request — nothing starts until you accept.</p>
      </div>
      <Button className="btn secondary" variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}><RefreshCw size={14} /> Refresh</Button>
    </header>
    {error && <p role="alert" className="og-note">{error}</p>}
    {notice && <p role="status" className="og-note">{notice}</p>}

    <article className="module parity-texture">
      <Eyebrow>MY AVAILABILITY</Eyebrow>
      <h3>{windowOpen ? `Open until ${time(snap!.myWindowUntil!)}` : 'Closed'}</h3>
      <div className="parity-availability">
        <label className="og-note">Window
          <select className="w-full rounded-md border bg-transparent p-2" value={minutes} disabled={busy}
            onChange={e => setMinutes(Number(e.target.value) as Minutes)}>
            {MINUTES.map(m => <option key={m} value={m}>{m === 0 ? 'Close lobby' : `${m} minutes`}</option>)}
          </select>
        </label>
        <label className="og-note">Headline
          <Input maxLength={160} value={headline} disabled={busy} onChange={e => setHeadline(e.target.value)} placeholder="Open to partnership questions" />
        </label>
        <Button className="btn primary" disabled={busy} onClick={() => void run(() => setBusinessLobby(minutes, minutes === 0 ? '' : headline), minutes === 0 ? 'Lobby closed.' : 'Lobby open.')}>
          {minutes === 0 ? 'Close Lobby' : 'Open Lobby'}
        </Button>
      </div>
    </article>

    <article className="module parity-texture">
      <Eyebrow>AVAILABLE CONTACTS</Eyebrow>
      {!snap?.contacts.length && <p className="og-note parity-empty">None of your accepted connections have a window open right now.</p>}
      {(snap?.contacts ?? []).map(c => <div key={c.introId} className="parity-row">
        <div><strong>{c.name}</strong><br /><small>{c.headline || 'Open to a short conversation'}</small><br />
          <small><Clock3 size={12} /> until {time(c.until)}</small></div>
        <Button className="btn primary" size="sm" disabled={busy || sent.some(k => k.introId === c.introId && knockIsOpen(k))}
          onClick={() => { setKnockFor(c); setNote('') }}><BellRing size={13} /> Send knock</Button>
      </div>)}
    </article>

    <article className="module parity-texture">
      <Eyebrow signal={pendingIn.length > 0}>INBOX</Eyebrow>
      {!incoming.length && <p className="og-note parity-empty">No knocks in the last 24 hours.</p>}
      {pendingIn.map(k => <div key={k.id} className="parity-row">
        <div><strong>{k.counterpartName}</strong>{k.note && <p className="og-note">{k.note}</p>}<small>Expires {time(k.expiresAt)}</small></div>
        <div className="parity-actions">
          <Button className="btn primary" size="sm" disabled={busy} onClick={() => void run(() => answerBusinessLobby(k.id, true), 'Accepted. Your meeting room is ready in Meetings.')}>Accept</Button>
          <Button className="btn secondary" size="sm" variant="outline" disabled={busy} onClick={() => void run(() => answerBusinessLobby(k.id, false), 'Declined.')}>Decline</Button>
        </div>
      </div>)}
      {decidedIn.map(k => <KnockRow key={k.id} k={k} />)}
    </article>

    <article className="module parity-texture">
      <Eyebrow>SENT</Eyebrow>
      {!sent.length && <p className="og-note parity-empty">You have not sent any knocks recently.</p>}
      {sent.map(k => <KnockRow key={k.id} k={k} />)}
    </article>

    <Dialog open={!!knockFor} onOpenChange={o => { if (!o) setKnockFor(null) }}>
      <DialogContent className="aetheris-parity !border-[var(--line-dark)] !bg-[var(--raised)] !text-[var(--soft)] !rounded-xl">
        <DialogHeader>
          <DialogTitle>Knock on {knockFor?.name}</DialogTitle>
          <DialogDescription>They decide whether to meet. The request expires in 10 minutes.</DialogDescription>
        </DialogHeader>
        <Textarea maxLength={240} value={note} onChange={e => setNote(e.target.value)} placeholder="What would you like to discuss? (optional)" aria-label="Knock note" />
        <small className="og-note">{note.length}/240</small>
        <DialogFooter>
          <Button className="btn secondary" variant="outline" onClick={() => setKnockFor(null)}>Cancel</Button>
          <Button className="btn primary" disabled={busy} onClick={() => { const c = knockFor!; setKnockFor(null); void run(() => knockBusinessLobby(c.introId, note.trim()), 'Knock sent.') }}>Send knock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
}

function KnockRow({ k }: { k: LobbyKnock }) {
  const status = k.status === 'pending' && !knockIsOpen(k) ? 'expired' : k.status
  return <div className="parity-row">
    <span>{k.counterpartName} <small className="og-note">{new Date(k.createdAt).toLocaleString()}</small></span>
    <Badge className="parity-badge" variant={status === 'accepted' ? 'default' : 'outline'}>{status}</Badge>
  </div>
}
