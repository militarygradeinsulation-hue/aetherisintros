import { useCallback, useEffect, useState } from 'react'
import { BellRing, Clock3, DoorOpen, ShieldCheck, Video, X } from 'lucide-react'
import {
  answerBusinessLobby, knockBusinessLobby, knockIsOpen, loadBusinessLobby, setBusinessLobby,
  type LobbySnapshot,
} from './business-lobby'
import { Btn, Eyebrow } from './ui'

const WINDOWS = [15, 30, 60, 120] as const
const remaining = (until: string | null) => {
  if (!until || Date.parse(until) <= Date.now()) return 'Closed'
  return `Available until ${new Date(until).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

/** Roam-inspired entry point built around existing consented introductions.
 * No passive presence, public knock button, or automatic camera activation.
 */
export function BusinessLobby({ userId, onJoin }: { userId: string; onJoin: (meetingId: string) => Promise<void> }) {
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [minutes, setMinutes] = useState<15 | 30 | 60 | 120>(30)
  const [headline, setHeadline] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})

  const refresh = useCallback(async () => {
    try {
      const result = await loadBusinessLobby(userId)
      setSnapshot(result)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Business Lobby could not be loaded')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setSnapshot(null)
    setLoading(true)
    void refresh()
    // Poll for incoming knocks; backgrounded devices do not keep an open mic,
    // socket, or share activity as presence.
    const interval = window.setInterval(() => { if (!document.hidden) void refresh() }, 12000)
    const onVisible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const perform = async (task: () => Promise<void>, message: string) => {
    if (busy) return
    setBusy(true)
    setNotice('')
    setError('')
    try {
      await task()
      setNotice(message)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete this action')
    } finally {
      setBusy(false)
    }
  }

  const open = !!snapshot?.myWindowUntil && Date.parse(snapshot.myWindowUntil) > Date.now()
  const incoming = (snapshot?.knocks ?? []).filter(k => k.recipientId === userId && knockIsOpen(k))
  const outgoing = (snapshot?.knocks ?? []).filter(k => k.requesterId === userId && knockIsOpen(k))
  const ready = (snapshot?.knocks ?? []).filter(k => k.status === 'accepted' && k.meetingId)

  return <section className="executive-section business-lobby" aria-label="Business Lobby">
    <header className="business-lobby-head">
      <div>
        <Eyebrow><DoorOpen size={13} /> BUSINESS LOBBY</Eyebrow>
        <h2>Meet when there is a reason, not just an opening.</h2>
        <p className="og-note">Open a private drop-in window for members who have already accepted an introduction with you. A knock is a request, never an automatic call.</p>
      </div>
      <span className="scope-tag"><ShieldCheck size={13} /> Mutually accepted connections only</span>
    </header>

    {error && <p role="alert" className="og-note business-lobby-error">{error}</p>}
    {notice && <p role="status" className="og-note">{notice}</p>}
    {loading && <p className="og-note">Checking your private lobby…</p>}
    <div className="business-lobby-grid">
      <article className="module business-lobby-card">
        <Eyebrow>YOUR AVAILABILITY</Eyebrow>
        <h3>{open ? remaining(snapshot?.myWindowUntil ?? null) : 'Your lobby is closed'}</h3>
        <p className="og-note">Availability is off by default, expires automatically, and is never visible beyond your accepted connections.</p>
        <label>Conversation window
          <select value={minutes} disabled={busy} onChange={e => setMinutes(Number(e.target.value) as typeof minutes)}>
            {WINDOWS.map(value => <option key={value} value={value}>{value} minutes</option>)}
          </select>
        </label>
        <label>What are you open to? (optional)
          <input maxLength={160} value={headline} disabled={busy} onChange={e => setHeadline(e.target.value)} placeholder="Partnership introductions or a quick question" />
        </label>
        <div className="og-inline">
          <Btn disabled={busy} onClick={() => void perform(() => setBusinessLobby(minutes, headline), 'Your availability window is open.')}>{open ? 'Update window' : 'Open my lobby'}</Btn>
          {open && <Btn kind="secondary" disabled={busy} onClick={() => void perform(() => setBusinessLobby(0, ''), 'Your lobby is closed.')}><X size={13} /> Close now</Btn>}
        </div>
      </article>

      <article className="module business-lobby-card">
        <Eyebrow>AVAILABLE CONNECTIONS</Eyebrow>
        <h3>People you can knock on</h3>
        {!snapshot?.contacts.length && <p className="og-note">No accepted connections currently have a drop-in window open. Nothing about their private availability is disclosed.</p>}
        <div className="business-lobby-list">
          {(snapshot?.contacts ?? []).map(c => <div className="business-lobby-person" key={c.introId}>
            <div><strong>{c.name}</strong>
              <small>{c.headline || 'Open to a short business conversation'}</small>
              <small><Clock3 size={12} /> {remaining(c.until)}</small>
            </div>
            <label className="business-lobby-note">Context for your knock (optional)
              <input maxLength={240} disabled={busy} value={notes[c.introId] ?? ''} onChange={e => setNotes(current => ({ ...current, [c.introId]: e.target.value }))} placeholder="What would you like to discuss?" />
            </label>
            <Btn disabled={busy || outgoing.some(k => k.introId === c.introId)} onClick={() => void perform(() => knockBusinessLobby(c.introId, notes[c.introId] ?? ''), 'Your request was sent. A meeting starts only if they accept.')}><BellRing size={13} /> Knock</Btn>
          </div>)}
        </div>
      </article>
    </div>

    {!!incoming.length && <section className="module business-lobby-requests">
      <Eyebrow><BellRing size={13} /> INCOMING REQUESTS</Eyebrow>
      {incoming.map(k => <div key={k.id} className="business-lobby-request">
        <div><strong>{k.counterpartName} is asking to meet</strong>
          {k.note && <p>{k.note}</p>}
          <small>Expires ${new Date(k.expiresAt).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' })}</small>
        </div>
        <div className="og-inline">
          <Btn disabled={busy} onClick={() => void perform(async () => {
            const meetingId = await answerBusinessLobby(k.id, true)
            if (meetingId) await onJoin(meetingId)
          }, 'Drop-in accepted. Your video meeting is ready.')}>Accept & meet</Btn>
          <Btn kind="secondary" disabled={busy} onClick={() => void perform(async () => { await answerBusinessLobby(k.id, false) }, 'Request declined.')}>Not now</Btn>
        </div>
      </div>)}
    </section>}
    {!!outgoing.length && <section className="module business-lobby-requests">
      <Eyebrow><Clock3 size={13} /> WAITING FOR AN ANSWER</Eyebrow>
      {outgoing.map(k => <p key={k.id} className="og-note">Your request to {k.counterpartName} is awaiting their approval. You are not connected to a call yet.</p>)}
    </section>}
    {!!ready.length && <section className="module business-lobby-requests">
      <Eyebrow><Video size={13} /> ACCEPTED MEETINGS</Eyebrow>
      {ready.map(k => <div key={k.id} className="business-lobby-request">
        <div><strong>{k.counterpartName}</strong><p className="og-note">This request was accepted. Both people may join the authorized video room.</p></div>
        <Btn disabled={busy} onClick={() => void perform(() => onJoin(k.meetingId!), 'Opening your meeting.')}><Video size={13} /> Join room</Btn>
      </div>)}
    </section>}
  </section>
}
