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
import { BellRing, CalendarPlus, CheckSquare, CircleDot, Compass, FileText, ListChecks, Mic, MicOff, PhoneOff, Plus, Sparkles, Users, Video, VideoOff, X } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { generateMeetingNotes } from '@/lib/meetingNotes.functions'
import { useGraph } from './graph-store'
import { loadBrief, type Brief } from './meeting-brief'
import { downloadIcs, dueReminders, icsForMeeting, reminderText, type Reminder } from './meeting-reminders'
import { MeetingCall, type Caption, type RemotePeer } from './meeting-call'
import { MAX_MEETING_PEOPLE, meetingStatus } from './meeting-notes-format'
import {
  addActionItemsToTasks, addTranscriptLine, agendaFromCapsule, createMeeting, endMeeting, loadMeetings, loadMyNotes, loadReminderMeetings, loadRoster, loadTranscript,
  markJoined, queueMeetingToOpen, saveDecisionsToLog, savePrivateNote, setNotesConsent, startIntroMeeting, takeQueuedMeeting,
  type Meeting, type SavedNotes,
} from './meetings'
import { useNav } from './nav'
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
  const [briefId, setBriefId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const r = await loadMeetings()
    setMeetings(r.data)
    setError(r.error)
    // A meeting started elsewhere ("Meet now" on an introduction) opens straight away.
    const queued = takeQueuedMeeting()
    if (queued && r.data.some(m => m.id === queued)) setRoomId(queued)
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
    {open.length ? <div className="meetings-list">{open.map(m => <MeetingCard key={m.id} meeting={m} userId={graph.userId!} onJoin={() => setRoomId(m.id)} onNotes={() => setNotesId(m.id)} onBrief={() => setBriefId(briefId === m.id ? null : m.id)} />)}</div>
      : <p className="og-note">No meetings yet. Start one and invite the people you want to talk to.</p>}

    {past.length > 0 && <>
      <h2 className="meetings-sub">Past meetings</h2>
      <div className="meetings-list">{past.map(m => <MeetingCard key={m.id} meeting={m} userId={graph.userId!} onJoin={() => setRoomId(m.id)} onNotes={() => setNotesId(notesId === m.id ? null : m.id)} onBrief={() => setBriefId(briefId === m.id ? null : m.id)} />)}</div>
    </>}

    {briefId && meetings.some(m => m.id === briefId) && <section className="executive-section meeting-brief-panel">
      <header><div><Eyebrow><Compass size={12} /> BEFORE YOU MEET</Eyebrow><h2>{meetings.find(m => m.id === briefId)!.title}</h2></div><button type="button" className="text-link" onClick={() => setBriefId(null)}>Close</button></header>
      <MeetingBrief meeting={meetings.find(m => m.id === briefId)!} userId={graph.userId} />
    </section>}
    {notesId && <MeetingNotesPanel meeting={meetings.find(m => m.id === notesId) ?? null} userId={graph.userId} onClose={() => setNotesId(null)} onSaved={refresh} />}
  </section>
}

function MeetingCard({ meeting, userId, onJoin, onNotes, onBrief }: { meeting: Meeting; userId: string; onJoin: () => void; onNotes: () => void; onBrief: () => void }) {
  const status = meetingStatus(meeting)
  const others = meeting.participants.filter(p => p.userId !== userId)
  return <article className={`meetings-card meetings-${status}`}>
    <div>
      <span className={`meetings-status meetings-status-${status}`}>{status === 'live' ? <><CircleDot size={11} /> Live</> : status === 'ended' ? 'Ended' : meeting.scheduledFor ? when(meeting.scheduledFor) : 'Not started'}</span>
      <h3>{meeting.title}</h3>
      <p className="og-note"><Users size={12} /> {others.length ? `With ${others.map(p => p.name).join(', ')}` : 'Just you so far'}{meeting.hostId === userId ? ' · you host' : ''}</p>
      {meeting.agenda && <p className="meetings-agenda">{meeting.agenda.split('\n')[0]}</p>}
    </div>
    <div className="og-inline">
      {status !== 'ended' && <Btn onClick={onJoin}><Video size={14} /> Join</Btn>}
      {status !== 'ended' && others.length > 0 && <Btn kind="quiet" onClick={onBrief}><Compass size={14} /> Brief</Btn>}
      {status === 'scheduled' && meeting.scheduledFor && <Btn kind="quiet" onClick={() => downloadIcs(`${meeting.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'meeting'}.ics`,
        icsForMeeting({ id: meeting.id, title: meeting.title, startsAt: meeting.scheduledFor!, agenda: meeting.agenda, url: `${location.origin}/app/meetings` }))}><CalendarPlus size={14} /> Add to calendar</Btn>}
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
        {(meeting.agenda || meeting.participants.length > 1) && <details className="meeting-brief-inline">
          <summary><Compass size={14} /> Brief{meeting.agenda ? ' and agenda' : ''}</summary>
          {meeting.agenda && <p className="meeting-agenda-text">{meeting.agenda}</p>}
          <MeetingBrief meeting={meeting} userId={userId} compact />
        </details>}
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

function MeetingNotesPanel({ meeting, userId, onClose, onSaved }: { meeting: Meeting | null; userId: string; onClose: () => void; onSaved: () => void }) {
  const net = useNetwork()
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

  const toTasks = async (items: SavedNotes['actionItems']) => {
    const r = await addActionItemsToTasks(items, meeting.title, userId, net.profile.name ?? '')
    setMsg(r.error || `Added ${r.added} to your tasks. Yours are tasks; other people's are commitments you are waiting on.`)
  }
  const toDecisions = async () => {
    const r = await saveDecisionsToLog(notes?.decisions ?? [], meeting.title)
    setMsg(r.error || `Saved ${r.added} decision${r.added === 1 ? '' : 's'} to your decision log.`)
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
        {notes.decisions.length > 0 && <><h3>Decisions</h3><ul>{notes.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
          <Btn kind="quiet" onClick={() => void toDecisions()}><CheckSquare size={14} /> Save to my decision log</Btn></>}
        {notes.actionItems.length > 0 && <><h3>Action items</h3><ul className="meeting-actions">{notes.actionItems.map((a, i) => <li key={i}>
          <span>{a.task}{a.owner ? <> · <b>{a.owner}</b></> : null}{a.due ? <> · {a.due}</> : null}</span>
          <button type="button" className="text-link" onClick={() => void toTasks([a])}>Add to tasks</button>
        </li>)}</ul>
          <Btn kind="quiet" onClick={() => void toTasks(notes.actionItems)}><ListChecks size={14} /> Add all to my tasks</Btn></>}
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

/** The pre-meeting brief for everyone else in the meeting. */
function MeetingBrief({ meeting, userId, compact = false }: { meeting: Meeting; userId: string; compact?: boolean }) {
  const [brief, setBrief] = useState<Brief | null>(null)
  useEffect(() => {
    let stale = false
    void loadBrief(meeting, userId).then(b => { if (!stale) setBrief(b) })
    return () => { stale = true }
  }, [meeting, userId])
  if (!brief) return <p className="og-note">Preparing your brief…</p>
  return <div className={`meeting-brief ${compact ? 'compact' : ''}`}>
    <p className="meeting-brief-goal"><b>Goal for this call:</b> {brief.goal}</p>
    {brief.introContext && !compact && <dl className="intro-inbox-why">
      {brief.introContext.why && <div><dt>WHY THIS INTRODUCTION</dt><dd>{brief.introContext.why}</dd></div>}
      {brief.introContext.whyNow && <div><dt>WHY NOW</dt><dd>{brief.introContext.whyNow}</dd></div>}
    </dl>}
    {brief.people.map(p => <article key={p.userId} className="meeting-brief-person">
      <h3>{p.name}{p.role && <small> · {p.role}</small>}</h3>
      {p.whyTheyMatter && <p><b>Why they matter:</b> {p.whyTheyMatter}</p>}
      {p.common && <p><b>In common:</b> {p.common}</p>}
      {p.lookingFor && <p><b>Looking for:</b> {p.lookingFor}</p>}
      {p.canHelpWith && <p><b>Can help with:</b> {p.canHelpWith}</p>}
      {p.theirAsks.length > 0 && <p><b>Open asks:</b> {p.theirAsks.join(' · ')}</p>}
      {p.lastMeetingSummary && <p><b>Last time you met:</b> {p.lastMeetingSummary}</p>}
      {p.lastConversation.length > 0 && <div className="meeting-brief-thread"><b>Where you left off</b>
        {p.lastConversation.map((m, i) => <p key={i}><span>{m.fromMe ? 'You' : p.name.split(' ')[0]}:</span> {m.text}</p>)}</div>}
      {p.yourNotes.length > 0 && <div className="meeting-brief-thread"><b>Your private notes</b>{p.yourNotes.map((n, i) => <p key={i}>{n}</p>)}</div>}
      {!p.whyTheyMatter && !p.lookingFor && !p.lastConversation.length && !p.theirAsks.length && <p className="og-note">Little is on record yet. Ask what they are working on and what would help most.</p>}
    </article>)}
  </div>
}

/** "Meet now" for an accepted introduction: creates the meeting with the capsule as its agenda and opens it. */
export function MeetNowButton({ introId, title, capsule }: { introId: string; title: string; capsule?: { why_exists?: string | null; why_now?: string | null; first_goal?: string | null } | null }) {
  const nav = useNav()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const start = async () => {
    setBusy(true); setMsg('')
    const agenda = capsule ? agendaFromCapsule({ whyExists: capsule.why_exists ?? '', whyNow: capsule.why_now ?? '', firstGoal: capsule.first_goal ?? '' }) : ''
    const r = await startIntroMeeting(introId, title, agenda)
    setBusy(false)
    if (r.error || !r.id) { setMsg(r.error || 'The meeting could not be started.'); return }
    queueMeetingToOpen(r.id)
    nav.setPage('meetings')
  }
  return <>
    <Btn kind="secondary" disabled={busy} onClick={() => void start()}><Video size={14} /> {busy ? 'Starting…' : 'Meet now'}</Btn>
    {msg && <small className="og-note">{msg}</small>}
  </>
}

const DISMISSED = 'aetheris:dismissed-meeting-reminders'

/**
 * Banner for a meeting about to start (scheduled, within 10 minutes) or already started by
 * someone else without you. Checks once a minute; dismissing hides it for this session.
 */
export function MeetingReminderBanner({ onJoin }: { onJoin: () => void }) {
  // Mounted in the outer shell, outside the graph provider, so it reads the session itself.
  const [myId, setMyId] = useState<string | null>(null)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user.id ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setMyId(session?.user.id ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const dismissed = useRef<Set<string>>(new Set((() => { try { return JSON.parse(sessionStorage.getItem(DISMISSED) ?? '[]') as string[] } catch { return [] } })()))

  useEffect(() => {
    if (!myId) return
    let stale = false
    const check = async () => {
      const meetings = await loadReminderMeetings(myId)
      if (!stale) setReminders(dueReminders(meetings, myId, Date.now(), dismissed.current))
    }
    void check()
    const t = setInterval(() => void check(), 60000)
    return () => { stale = true; clearInterval(t) }
  }, [myId])

  const r = reminders[0]
  if (!r) return null
  const dismiss = () => {
    dismissed.current.add(r.meetingId)
    try { sessionStorage.setItem(DISMISSED, JSON.stringify([...dismissed.current])) } catch { /* storage blocked */ }
    setReminders(list => list.filter(x => x.meetingId !== r.meetingId))
  }
  return <div className="meeting-reminder" role="status">
    <BellRing size={16} aria-hidden />
    <span>{reminderText(r)}</span>
    <button type="button" className="join" onClick={() => { queueMeetingToOpen(r.meetingId); dismiss(); onJoin() }}><Video size={14} /> Join</button>
    <button type="button" aria-label="Dismiss" onClick={dismiss}><X size={14} /></button>
  </div>
}
