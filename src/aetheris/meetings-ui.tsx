/**
 * Meetings: schedule or start a video meeting with up to three members, meet in the
 * browser, and keep AI notes in your own account.
 *
 * The note taker is opt-in per person. Your browser transcribes only your own voice, and
 * only after you turn notes on; everyone can see who has notes on. When the meeting ends,
 * each attendee generates their own notes (summary, decisions, action items) from what the
 * consenting speakers said.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleDot, FileText, Mic, MicOff, PhoneOff, Plus, Sparkles, Users, Video, VideoOff, X } from 'lucide-react'

import { generateMeetingNotes } from '@/lib/meetingNotes.functions'
import { useGraph } from './graph-store'
import { MeetingCall, type Caption, type RemotePeer } from './meeting-call'
import { MAX_MEETING_PEOPLE, meetingStatus } from './meeting-notes-format'
import {
  addTranscriptLine, createMeeting, endMeeting, loadMeetings, loadMyNotes, loadRoster, loadTranscript, markJoined, savePrivateNote, setNotesConsent,
  type Meeting, type SavedNotes,
} from './meetings'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'
import { dictationSupported, useDictation } from './voice'

const isLiveId = (id: string) => /^[0-9a-f-]{36}$/i.test(id)
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

export function MeetingsPage() {
  const graph = useGraph()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [notesId, setNotesId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const r = await loadMeetings()
    setMeetings(r.data)
    setError(r.error)
  }, [])
  useEffect(() => { if (graph.signedIn) void refresh() }, [graph.signedIn, refresh])

  if (!graph.signedIn || !graph.userId) {
    return <section className="meetings"><Eyebrow>MEETINGS</Eyebrow><h1>Meet face to face, with notes that stay yours.</h1><p className="og-note">Sign in to start a video meeting with members of your network.</p></section>
  }

  const room = roomId ? meetings.find(m => m.id === roomId) : null
  if (room) {
    return <MeetingRoom meeting={room} userId={graph.userId} onLeave={async () => { setRoomId(null); await refresh(); setNotesId(room.id) }} />
  }

  const open = meetings.filter(m => meetingStatus(m) !== 'ended')
  const past = meetings.filter(m => meetingStatus(m) === 'ended')

  return <section className="meetings">
    <header className="meetings-head">
      <div>
        <Eyebrow>MEETINGS</Eyebrow>
        <h1>Meet face to face, with notes that stay yours.</h1>
        <p className="og-note">Video meetings for up to {MAX_MEETING_PEOPLE} people. The AI note taker only listens to people who turn it on, and everyone can see who has.</p>
      </div>
      <Btn onClick={() => setCreating(c => !c)}>{creating ? <><X size={14} /> Close</> : <><Plus size={14} /> New meeting</>}</Btn>
    </header>
    {creating && <NewMeetingForm userId={graph.userId} onCreated={async (id, now) => { setCreating(false); await refresh(); if (now) setRoomId(id) }} />}
    {error && <p className="og-note">{error}</p>}

    <h2 className="meetings-sub">Upcoming and live</h2>
    {open.length ? <div className="meetings-list">{open.map(m => <MeetingCard key={m.id} meeting={m} userId={graph.userId!} onJoin={() => setRoomId(m.id)} onNotes={() => setNotesId(m.id)} />)}</div>
      : <p className="og-note">No meetings yet. Start one and invite the people you want to talk to.</p>}

    {past.length > 0 && <>
      <h2 className="meetings-sub">Past meetings</h2>
      <div className="meetings-list">{past.map(m => <MeetingCard key={m.id} meeting={m} userId={graph.userId!} onJoin={() => setRoomId(m.id)} onNotes={() => setNotesId(notesId === m.id ? null : m.id)} />)}</div>
    </>}

    {notesId && <MeetingNotesPanel meeting={meetings.find(m => m.id === notesId) ?? null} onClose={() => setNotesId(null)} onSaved={refresh} />}
  </section>
}

function MeetingCard({ meeting, userId, onJoin, onNotes }: { meeting: Meeting; userId: string; onJoin: () => void; onNotes: () => void }) {
  const status = meetingStatus(meeting)
  const others = meeting.participants.filter(p => p.userId !== userId)
  return <article className={`meetings-card meetings-${status}`}>
    <div>
      <span className={`meetings-status meetings-status-${status}`}>{status === 'live' ? <><CircleDot size={11} /> Live</> : status === 'ended' ? 'Ended' : meeting.scheduledFor ? when(meeting.scheduledFor) : 'Not started'}</span>
      <h3>{meeting.title}</h3>
      <p className="og-note"><Users size={12} /> {others.length ? `With ${others.map(p => p.name).join(', ')}` : 'Just you so far'}{meeting.hostId === userId ? ' · you host' : ''}</p>
    </div>
    <div className="og-inline">
      {status !== 'ended' && <Btn onClick={onJoin}><Video size={14} /> Join</Btn>}
      <Btn kind="quiet" onClick={onNotes}><FileText size={14} /> {meeting.hasNotes ? 'My notes' : 'Notes'}</Btn>
    </div>
  </article>
}

function NewMeetingForm({ userId, onCreated }: { userId: string; onCreated: (id: string, startNow: boolean) => void }) {
  const net = useNetwork()
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [at, setAt] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const candidates = useMemo(() => net.members
    .filter(m => isLiveId(m.id) && m.id !== userId)
    .filter(m => !query.trim() || `${m.name} ${m.company} ${m.title}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 12), [net.members, userId, query])

  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= MAX_MEETING_PEOPLE - 1 ? p : [...p, id])

  const submit = async (startNow: boolean) => {
    if (!title.trim()) { setMsg('Give the meeting a title.'); return }
    setBusy(true); setMsg('')
    const r = await createMeeting(title.trim(), picked, startNow || !at ? null : new Date(at).toISOString())
    setBusy(false)
    if (r.error || !r.id) { setMsg(r.error || 'The meeting could not be created.'); return }
    onCreated(r.id, startNow)
  }

  return <div className="oc-card meetings-new">
    <label>Title<input value={title} maxLength={140} onChange={e => setTitle(e.target.value)} placeholder="e.g. CFO search, first conversation" /></label>
    <label>Invite (up to {MAX_MEETING_PEOPLE - 1})<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search members" /></label>
    <div className="meetings-invitees">
      {candidates.map(m => <button type="button" key={m.id} className={picked.includes(m.id) ? 'on' : ''} aria-pressed={picked.includes(m.id)} onClick={() => toggle(m.id)}>
        {m.name}<small>{m.company}</small>
      </button>)}
      {!candidates.length && <p className="og-note">No members match.</p>}
    </div>
    <label>When (optional)<input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label>
    <div className="og-inline">
      <Btn disabled={busy} onClick={() => void submit(true)}><Video size={14} /> Start now</Btn>
      <Btn kind="quiet" disabled={busy || !at} onClick={() => void submit(false)}>Schedule</Btn>
    </div>
    {msg && <p className="og-note">{msg}</p>}
  </div>
}

function VideoTile({ stream, label, muted, mirrored, waiting }: { stream: MediaStream | null; label: string; muted?: boolean; mirrored?: boolean; waiting?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream }, [stream])
  return <figure className="meeting-tile">
    {stream ? <video ref={ref} autoPlay playsInline muted={muted} className={mirrored ? 'mirrored' : ''} /> : <div className="meeting-tile-wait">{waiting ?? 'Connecting…'}</div>}
    <figcaption>{label}</figcaption>
  </figure>
}

interface LiveLine { key: string; speakerId: string; text: string; at: string }

function MeetingRoom({ meeting, userId, onLeave }: { meeting: Meeting; userId: string; onLeave: () => void }) {
  const [local, setLocal] = useState<MediaStream | null>(null)
  const [peers, setPeers] = useState<RemotePeer[]>([])
  const [status, setStatus] = useState<'starting' | 'connecting' | 'joined' | 'full' | 'error'>('starting')
  const [problem, setProblem] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [consent, setConsent] = useState<Record<string, boolean>>(() => Object.fromEntries(meeting.participants.map(p => [p.userId, p.notesConsent])))
  const [lines, setLines] = useState<LiveLine[]>([])
  const [noteMsg, setNoteMsg] = useState('')
  const call = useRef<MeetingCall | null>(null)
  const names = useMemo(() => new Map(meeting.participants.map(p => [p.userId, p.name])), [meeting.participants])
  const nameOf = (id: string) => (id === userId ? 'You' : names.get(id) ?? 'A member')
  const myConsent = !!consent[userId]
  const isHost = meeting.hostId === userId

  const addLine = useCallback((line: LiveLine) => setLines(prev => (prev.some(l => l.key === line.key) ? prev : [...prev, line].slice(-400))), [])

  // Camera, microphone and the call itself.
  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } })
      } catch (e) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); setCamOn(false) } catch {
          setStatus('error')
          setProblem(e instanceof Error && e.name === 'NotAllowedError'
            ? 'Your browser blocked the camera and microphone. Allow them for this site and try again.'
            : 'No camera or microphone is available on this device.')
          return
        }
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      setLocal(stream)
      const c = new MeetingCall({
        meetingId: meeting.id, userId, localStream: stream,
        onPeers: setPeers,
        onCaption: (cap: Caption) => addLine({ key: `${cap.from}-${cap.at}`, speakerId: cap.from, text: cap.text, at: cap.at }),
        onStatus: (s, detail) => { setStatus(s); if (detail) setProblem(detail) },
      })
      call.current = c
      await c.join()
      await markJoined(meeting.id)
    })()
    return () => { cancelled = true; void call.current?.leave(); call.current = null }
  }, [meeting.id, userId, addLine])

  // Earlier transcript, and who has notes on (refreshed while the room is open).
  useEffect(() => {
    let stale = false
    void loadTranscript(meeting.id).then(rows => { if (!stale) rows.forEach(r => addLine({ key: `${r.speakerId}-${r.spokenAt}`, speakerId: r.speakerId, text: r.text, at: r.spokenAt })) })
    const poll = setInterval(() => { void loadRoster(meeting.id).then(r => { if (!stale) setConsent(Object.fromEntries(r.map(p => [p.userId, p.notesConsent]))) }) }, 8000)
    return () => { stale = true; clearInterval(poll) }
  }, [meeting.id, addLine])

  // Your own speech, only while your notes are on and your microphone is live.
  const dictation = useDictation({
    keepOpen: true,
    onFinal: text => {
      const at = new Date().toISOString()
      addLine({ key: `${userId}-${at}`, speakerId: userId, text, at })
      call.current?.sendCaption(text)
      void addTranscriptLine(meeting.id, text).then(err => { if (err) setNoteMsg(err) })
    },
  })
  const transcribing = myConsent && micOn && status === 'joined'
  useEffect(() => {
    if (transcribing && !dictation.listening) dictation.start()
    if (!transcribing && dictation.listening) dictation.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcribing])

  const toggleConsent = async () => {
    const next = !myConsent
    setNoteMsg('')
    const err = await setNotesConsent(meeting.id, next)
    if (err) { setNoteMsg(err); return }
    setConsent(c => ({ ...c, [userId]: next }))
  }

  const toggleMic = () => { const next = !micOn; setMicOn(next); call.current?.setTrackEnabled('audio', next) }
  const toggleCam = () => { const next = !camOn; setCamOn(next); call.current?.setTrackEnabled('video', next) }
  const leave = async () => { if (myConsent) await setNotesConsent(meeting.id, false); await call.current?.leave(); call.current = null; onLeave() }
  const endForAll = async () => { const err = await endMeeting(meeting.id); if (err) { setNoteMsg(err); return } await leave() }

  const notesOn = meeting.participants.filter(p => consent[p.userId])
  const tail = useRef<HTMLOListElement>(null)
  useEffect(() => { tail.current?.lastElementChild?.scrollIntoView({ block: 'nearest' }) }, [lines.length])

  return <section className="meeting-room">
    <header className="meeting-room-head">
      <div><Eyebrow>{status === 'joined' ? 'LIVE' : status === 'error' ? 'NOT CONNECTED' : 'CONNECTING'}</Eyebrow><h1>{meeting.title}</h1></div>
      {notesOn.length > 0 && <span className="meeting-notes-badge"><Sparkles size={13} /> Notes on for {notesOn.map(p => (p.userId === userId ? 'you' : p.name)).join(', ')}</span>}
    </header>
    {problem && <p className="og-note meeting-problem">{problem}</p>}
    {status === 'full' && <p className="og-note meeting-problem">This meeting is full ({MAX_MEETING_PEOPLE} people). You are connected to the first arrivals only.</p>}

    <div className="meeting-stage">
      <div className={`meeting-grid people-${Math.min(peers.length + 1, MAX_MEETING_PEOPLE)}`}>
        <VideoTile stream={camOn ? local : null} label={`You${micOn ? '' : ' (muted)'}`} muted mirrored waiting={local ? 'Camera off' : 'Starting camera…'} />
        {peers.map(p => <VideoTile key={p.userId} stream={p.stream} label={names.get(p.userId) ?? 'A member'} waiting={p.state === 'failed' ? 'Connection failed' : 'Connecting…'} />)}
        {!peers.length && status === 'joined' && <div className="meeting-tile meeting-tile-empty"><p>Waiting for {meeting.participants.filter(p => p.userId !== userId).map(p => p.name).join(', ') || 'others'} to join.</p></div>}
      </div>

      <aside className="meeting-notes">
        <div className={`meeting-consent ${myConsent ? 'on' : ''}`}>
          <b><Sparkles size={14} /> AI note taker</b>
          {!dictationSupported()
            ? <p>This browser cannot transcribe speech. Use Chrome, Edge or Safari to add your voice to the notes. You can still read the transcript and generate notes.</p>
            : myConsent
              ? <p>Your speech is being transcribed and shared with everyone in this meeting. {micOn ? '' : 'Paused while you are muted.'}</p>
              : <p>Off for you. Turn it on to have your own speech transcribed. Nobody is transcribed without turning it on themselves.</p>}
          {dictationSupported() && <Btn kind={myConsent ? 'quiet' : 'secondary'} onClick={() => void toggleConsent()}>{myConsent ? 'Turn my notes off' : 'Turn my notes on'}</Btn>}
          {dictation.interim && <p className="meeting-interim">{dictation.interim}</p>}
          {noteMsg && <p className="og-note">{noteMsg}</p>}
        </div>
        <ol className="meeting-transcript" ref={tail}>
          {lines.map(l => <li key={l.key}><b>{nameOf(l.speakerId)}</b> {l.text}</li>)}
          {!lines.length && <li className="og-note">The transcript appears here when someone with notes on speaks.</li>}
        </ol>
      </aside>
    </div>

    <footer className="meeting-controls">
      <button type="button" onClick={toggleMic} aria-pressed={!micOn} aria-label={micOn ? 'Mute' : 'Unmute'}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}</button>
      <button type="button" onClick={toggleCam} aria-pressed={!camOn} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}>{camOn ? <Video size={18} /> : <VideoOff size={18} />}</button>
      <button type="button" className="leave" onClick={() => void leave()}><PhoneOff size={18} /> Leave</button>
      {isHost && <button type="button" className="end" onClick={() => void endForAll()}>End for everyone</button>}
    </footer>
  </section>
}

function MeetingNotesPanel({ meeting, onClose, onSaved }: { meeting: Meeting | null; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState<SavedNotes | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!meeting) return
    let stale = false
    setLoading(true)
    void loadMyNotes(meeting.id).then(n => { if (stale) return; setNotes(n); setDraft(n?.privateNote ?? ''); setLoading(false) })
    return () => { stale = true }
  }, [meeting])

  if (!meeting) return null

  const generate = async () => {
    setBusy(true); setMsg('')
    try {
      const r = await generateMeetingNotes({ data: { meetingId: meeting.id } })
      if (r.error) setMsg(r.error)
      if (r.notes) setNotes(n => ({ ...r.notes!, privateNote: n?.privateNote ?? draft, generatedAt: new Date().toISOString() }))
      onSaved()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'The note taker could not answer just now.')
    }
    setBusy(false)
  }

  const saveNote = async () => {
    const err = await savePrivateNote(meeting.id, draft)
    setMsg(err || 'Saved to your notes.')
    if (!err) onSaved()
  }

  return <section className="executive-section meeting-notes-panel" aria-label={`Notes for ${meeting.title}`}>
    <header><div><Eyebrow><FileText size={12} /> MY NOTES</Eyebrow><h2>{meeting.title}</h2></div><button type="button" className="text-link" onClick={onClose}>Close</button></header>
    {loading ? <p className="og-note">Loading…</p> : <>
      {notes?.summary || notes?.decisions.length || notes?.actionItems.length ? <>
        {notes.summary && <p>{notes.summary}</p>}
        {notes.decisions.length > 0 && <><h3>Decisions</h3><ul>{notes.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></>}
        {notes.actionItems.length > 0 && <><h3>Action items</h3><ul>{notes.actionItems.map((a, i) => <li key={i}>{a.task}{a.owner ? <> · <b>{a.owner}</b></> : null}{a.due ? <> · {a.due}</> : null}</li>)}</ul></>}
        {notes.generatedAt && <p className="og-note">Generated {when(notes.generatedAt)} from what consenting attendees said.</p>}
      </> : <p className="og-note">No AI notes yet. They are written from the transcript of people who turned notes on.</p>}
      <div className="og-inline"><Btn disabled={busy} onClick={() => void generate()}><Sparkles size={14} /> {busy ? 'Writing notes…' : notes?.generatedAt ? 'Regenerate my notes' : 'Generate my notes'}</Btn></div>
      <label className="meeting-private-note">Your private note (only you can see this)
        <textarea value={draft} maxLength={4000} rows={3} onChange={e => setDraft(e.target.value)} placeholder="Anything you want to remember about this meeting" />
      </label>
      <Btn kind="quiet" onClick={() => void saveNote()}>Save note</Btn>
      {msg && <p className="og-note">{msg}</p>}
    </>}
  </section>
}
