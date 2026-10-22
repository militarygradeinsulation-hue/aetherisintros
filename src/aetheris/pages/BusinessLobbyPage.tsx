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
  if (!ready) return <p className="og-note">Loading…</p>
  if (!userId) return <SignInRequired what="the Business Lobby" />
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

  return <section className="executive-section" aria-label="Business Lobby">
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div>
        <Eyebrow><DoorOpen size={13} /> BUSINESS LOBBY</Eyebrow>
        <h2>Meet when there is a reason, not just an opening.</h2>
        <p className="og-note">Open a short drop-in window for people who accepted an introduction with you. A knock is a request — nothing starts until you accept.</p>
      </div>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}><RefreshCw size={14} /> Refresh</Button>
    </header>
    {error && <p role="alert" className="og-note">{error}</p>}
    {notice && <p role="status" className="og-note">{notice}</p>}

    <article className="module">
      <Eyebrow>MY AVAILABILITY</Eyebrow>
      <h3>{windowOpen ? `Open until ${time(snap!.myWindowUntil!)}` : 'Closed'}</h3>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(120px,160px) 1fr auto', alignItems: 'end' }}>
        <label className="og-note">Window
          <select className="w-full rounded-md border bg-transparent p-2" value={minutes} disabled={busy}
            onChange={e => setMinutes(Number(e.target.value) as Minutes)}>
            {MINUTES.map(m => <option key={m} value={m}>{m === 0 ? 'Close lobby' : `${m} minutes`}</option>)}
          </select>
        </label>
        <label className="og-note">Headline
          <Input maxLength={160} value={headline} disabled={busy} onChange={e => setHeadline(e.target.value)} placeholder="Open to partnership questions" />
        </label>
        <Button disabled={busy} onClick={() => void run(() => setBusinessLobby(minutes, minutes === 0 ? '' : headline), minutes === 0 ? 'Lobby closed.' : 'Lobby open.')}>
          {minutes === 0 ? 'Close Lobby' : 'Open Lobby'}
        </Button>
      </div>
    </article>

    <article className="module">
      <Eyebrow>AVAILABLE CONTACTS</Eyebrow>
      {!snap?.contacts.length && <p className="og-note">None of your accepted connections have a window open right now.</p>}
      {(snap?.contacts ?? []).map(c => <div key={c.introId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div><strong>{c.name}</strong><br /><small>{c.headline || 'Open to a short conversation'}</small><br />
          <small><Clock3 size={12} /> until {time(c.until)}</small></div>
        <Button size="sm" disabled={busy || sent.some(k => k.introId === c.introId && knockIsOpen(k))}
          onClick={() => { setKnockFor(c); setNote('') }}><BellRing size={13} /> Send knock</Button>
      </div>)}
    </article>

    <article className="module">
      <Eyebrow signal={pendingIn.length > 0}>INBOX</Eyebrow>
      {!incoming.length && <p className="og-note">No knocks in the last 24 hours.</p>}
      {pendingIn.map(k => <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0' }}>
        <div><strong>{k.counterpartName}</strong>{k.note && <p className="og-note">{k.note}</p>}<small>Expires {time(k.expiresAt)}</small></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" disabled={busy} onClick={() => void run(() => answerBusinessLobby(k.id, true), 'Accepted. Your meeting room is ready in Meetings.')}>Accept</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => answerBusinessLobby(k.id, false), 'Declined.')}>Decline</Button>
        </div>
      </div>)}
      {decidedIn.map(k => <KnockRow key={k.id} k={k} />)}
    </article>

    <article className="module">
      <Eyebrow>SENT</Eyebrow>
      {!sent.length && <p className="og-note">You have not sent any knocks recently.</p>}
      {sent.map(k => <KnockRow key={k.id} k={k} />)}
    </article>

    <Dialog open={!!knockFor} onOpenChange={o => { if (!o) setKnockFor(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Knock on {knockFor?.name}</DialogTitle>
          <DialogDescription>They decide whether to meet. The request expires in 10 minutes.</DialogDescription>
        </DialogHeader>
        <Textarea maxLength={240} value={note} onChange={e => setNote(e.target.value)} placeholder="What would you like to discuss? (optional)" aria-label="Knock note" />
        <small className="og-note">{note.length}/240</small>
        <DialogFooter>
          <Button variant="outline" onClick={() => setKnockFor(null)}>Cancel</Button>
          <Button disabled={busy} onClick={() => { const c = knockFor!; setKnockFor(null); void run(() => knockBusinessLobby(c.introId, note.trim()), 'Knock sent.') }}>Send knock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
}

function KnockRow({ k }: { k: LobbyKnock }) {
  const status = k.status === 'pending' && !knockIsOpen(k) ? 'expired' : k.status
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}>
    <span>{k.counterpartName} <small className="og-note">{new Date(k.createdAt).toLocaleString()}</small></span>
    <Badge variant={status === 'accepted' ? 'default' : 'outline'}>{status}</Badge>
  </div>
}
