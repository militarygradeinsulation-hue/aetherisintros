import { MeetingShare, MeetingRecordEditor } from './meeting-sharing'
import { MeetingBackgroundPicker, useMeetingBackground } from './meeting-backgrounds'
import { MeetingChat } from './meeting-chat'
import { MeetingAudio, saveMeetingAudio } from './meeting-audio'
/**
 * Meetings: start a video meeting in one click (or schedule one) with up to three members,
 * check your camera before joining, invite people from inside the call, and press Record to
 * keep AI notes in your own account.
 *
 * Recording is visible to everyone and consent stays per person: whoever presses Record is
 * included, everyone else is asked and only transcribed after agreeing. Each consenting
 * browser records its own microphone in short clips that the server transcribes, so lines
 * are attributed to the right speaker. Each attendee generates their own notes afterwards.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BellRing, CalendarPlus, CheckSquare, CircleDot, Compass, FileText, ListChecks, Mic, MicOff, PhoneOff, Plus, Sparkles, SwitchCamera, UserPlus, Users, Video, VideoOff, X } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { getIceServers } from '@/lib/iceServers.functions'
import { generateMeetingNotes } from '@/lib/meetingNotes.functions'
import { transcribeMeetingAudio } from '@/lib/meetingTranscribe.functions'
import { useGraph } from './graph-store'
import { BusinessLobby } from './BusinessLobby'
import { loadBrief, type Brief } from './meeting-brief'
import { MeetingBriefPanel as AiMeetingBriefPanel } from './meeting-brief-ui'
import { downloadIcs, dueReminders, icsForMeeting, reminderText, type Reminder } from './meeting-reminders'
import { MeetingCall, type Caption, type RemotePeer } from './meeting-call'
import { blobToBase64, ClipRecorder, recordingSupported } from './meeting-recorder'
import { MAX_MEETING_PEOPLE, meetingStatus } from './meeting-notes-format'
import {
  addActionItemsToTasks, addTranscriptLine, agendaFromCapsule, createMeeting, endMeeting, inviteToMeeting, loadMeetings, loadMyNotes, loadReminderMeetings, loadRoomState, loadTranscript,
  markJoined, queueMeetingToOpen, saveDecisionsToLog, savePrivateNote, setMeetingRecording, setNotesConsent, startIntroMeeting, takeQueuedMeeting,
  type Meeting, type RoomState, type SavedNotes,
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
  const [starting, setStarting] = useState(false)
  const [recordView,setRecordView]=useState<'active'|'archived'|'trash'>('active')

  const refresh = useCallback(async () => {
    const r = await loadMeetings()
    setMeetings(r.data)
    setError(r.error)
    // A meeting started elsewhere ("Meet now" on an introduction) opens straight away.
    const queued = takeQueuedMeeting()
    if (queued && r.data.some(m => m.id === queued)) setRoomId(queued)
  }, [])
  useEffect(() => { if (graph.signedIn) void refresh() }, [graph.signedIn, refresh])

  /** One click: a meeting with just you, opened straight away; invite people from inside it. */
  const startNow = async () => {
    setStarting(true); setError('')
    const r = await createMeeting(`Meeting ${new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`, [], null)
    setStarting(false)
    if (r.error || !r.id) { setError(r.error || 'The meeting could not be started. Please try again.'); return }
    await refresh()
    setRoomId(r.id)
  }

  if (!graph.signedIn || !graph.userId) {
    return <section className="meetings"><Eyebrow>MEETINGS</Eyebrow><h1>Meet face to face, with notes that stay yours.</h1><p className="og-note">Sign in to start a video meeting with members of your network.</p></section>
  }

  const room = roomId ? meetings.find(m => m.id === roomId) : null
  if (room) {
    return <MeetingRoom meeting={room} userId={graph.userId} onBack={() => setRoomId(null)} onLeave={async () => { setRoomId(null); await refresh(); setNotesId(room.id) }} />
  }

  const visible=meetings.filter(m=>recordView==='trash'?!!m.deletedAt:recordView==='archived'?!!m.archivedAt&&!m.deletedAt:!m.archivedAt&&!m.deletedAt)
  const open = visible.filter(m => meetingStatus(m) !== 'ended')
  const past = visible.filter(m => meetingStatus(m) === 'ended')

  return <section className="meetings">
    <header className="meetings-head">
      <div>
        <Eyebrow>MEETINGS</Eyebrow>
        <h1>Meet face to face, with notes that stay yours.</h1>
        <p className="og-note">Video meetings for up to {MAX_MEETING_PEOPLE} people. The AI note taker only listens to people who turn it on, and everyone can see who has.</p>
      </div>
      <div className="og-inline">
        <Btn disabled={starting} onClick={() => void startNow()}><Video size={14} /> {starting ? 'Starting…' : 'Start now'}</Btn>
        <Btn kind="secondary" onClick={() => setCreating(c => !c)}>{creating ? <><X size={14} /> Close</> : <><Plus size={14} /> Schedule or invite</>}</Btn>
      </div>
    </header>
    {creating && <NewMeetingForm userId={graph.userId} onCreated={async (id, now) => { setCreating(false); await refresh(); if (now) setRoomId(id) }} />}
    {error && <p className="og-note" role="alert">{error}</p>}

    <BusinessLobby userId={graph.userId} onJoin={async meetingId => {
      await refresh()
      setRoomId(meetingId)
    }} />

    <div className="og-inline"><a href="/meet">Join by code</a>{(['active','archived','trash'] as const).map(v=><button type="button" key={v} aria-pressed={recordView===v} onClick={()=>setRecordView(v)}>{v}</button>)}</div>
    <h2 className="meetings-sub">Upcoming and live</h2>
    {open.length ? <div className="meetings-list">{open.map(m => <MeetingCard key={m.id} meeting={m} userId={graph.userId!} onSaved={refresh} onJoin={() => setRoomId(m.id)} onNotes={() => setNotesId(m.id)} onBrief={() => setBriefId(briefId === m.id ? null : m.id)} />)}</div>
      : <p className="og-note">No meetings yet. Start one and invite the people you want to talk to.</p>}

    {past.length > 0 && <>
      <h2 className="meetings-sub">Past meetings</h2>
      <div className="meetings-list">{past.map(m => <MeetingCard key={m.id} meeting={m} userId={graph.userId!} onSaved={refresh} onJoin={() => setRoomId(m.id)} onNotes={() => setNotesId(notesId === m.id ? null : m.id)} onBrief={() => setBriefId(briefId === m.id ? null : m.id)} />)}</div>
    </>}

    {briefId && meetings.some(m => m.id === briefId) && <section className="executive-section meeting-brief-panel">
      <header><div><Eyebrow><Compass size={12} /> BEFORE YOU MEET</Eyebrow><h2>{meetings.find(m => m.id === briefId)!.title}</h2></div><button type="button" className="text-link" onClick={() => setBriefId(null)}>Close</button></header>
      <MeetingBrief meeting={meetings.find(m => m.id === briefId)!} userId={graph.userId} />
    </section>}
    {notesId && <MeetingNotesPanel meeting={meetings.find(m => m.id === notesId) ?? null} userId={graph.userId} onClose={() => setNotesId(null)} onSaved={refresh} />}
  </section>
}

function MeetingCard({ meeting, userId, onJoin, onNotes, onBrief, onSaved }: { meeting: Meeting; userId: string; onSaved:()=>void; onJoin: () => void; onNotes: () => void; onBrief: () => void }) {
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
      {status !== 'ended' && !meeting.archivedAt && !meeting.deletedAt && <Btn onClick={onJoin}><Video size={14} /> Join</Btn>}
      {status !== 'ended' && others.length > 0 && <Btn kind="quiet" onClick={onBrief}><Compass size={14} /> Brief</Btn>}
      {status === 'scheduled' && meeting.scheduledFor && <Btn kind="quiet" onClick={() => downloadIcs(`${meeting.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'meeting'}.ics`,
        icsForMeeting({ id: meeting.id, title: meeting.title, startsAt: meeting.scheduledFor!, agenda: meeting.agenda, url: `${location.origin}/app/meetings` }))}><CalendarPlus size={14} /> Add to calendar</Btn>}
      <Btn kind="quiet" onClick={onNotes}><FileText size={14} /> {meeting.hasNotes ? 'My notes' : 'Notes'}</Btn>
    </div>
    {meeting.hostId===userId&&<><MeetingRecordEditor meeting={meeting} onSaved={onSaved}/>{!meeting.endedAt&&!meeting.archivedAt&&!meeting.deletedAt&&<MeetingShare meetingId={meeting.id}/>}</>}
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

/** Pages shown inside another site's frame (such as an editor preview) usually cannot use the camera. */
const inFrame = () => { try { return window.self !== window.top } catch { return true } }
type CameraFacing = 'user' | 'environment'
const videoConstraints = (facing: CameraFacing): MediaTrackConstraints => ({ facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } })

type Phase = 'lobby' | 'room'

export function MeetingRoom({ meeting, userId, onLeave, onBack }: { meeting: Meeting; userId: string; onLeave: () => void; onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [captureConsent,setCaptureConsent]=useState(true)
  const [joining,setJoining]=useState(false)
  const [joinError,setJoinError]=useState('')
  const enter=async()=>{setJoining(true);setJoinError('');try{const error=captureConsent?await setMeetingRecording(meeting.id,true):await setNotesConsent(meeting.id,false);if(error){setJoinError(error);return}setPhase('room')}catch{setJoinError('Could not start recording. Please retry.')}finally{setJoining(false)}}
  const [attempt, setAttempt] = useState(0)
  const [local, setLocal] = useState<MediaStream | null>(null)
  const [deviceProblem, setDeviceProblem] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [facing, setFacing] = useState<CameraFacing>('user')
  const [switchingCamera, setSwitchingCamera] = useState(false)

  // Camera and microphone first, in the lobby, so problems show before joining.
  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setDeviceProblem(inFrame()
          ? 'Video calls cannot run inside this preview frame. Open Ask Intros in its own browser tab to join.'
          : 'This browser cannot use a camera or microphone. Use a current version of Chrome, Edge, Safari or Firefox.')
        return
      }
      try {
        // Mobile meetings should feel like FaceTime: start with the front/selfie camera.
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(facing), audio: { echoCancellation: true, noiseSuppression: true } })
      } catch (e) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); setCamOn(false) } catch {
          const denied = e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
          setDeviceProblem(denied && inFrame()
            ? 'The camera is blocked inside this preview frame. Open Ask Intros in its own browser tab to join.'
            : denied
              ? 'Your browser blocked the camera and microphone. Click the camera icon in the address bar, allow both for this site, then try again.'
              : 'No camera or microphone was found. Connect one, then try again.')
          return
        }
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      setLocal(stream)
    })()
    // Leaving (from the lobby or the call) releases the camera and microphone.
    return () => { cancelled = true; stream?.getTracks().forEach(t => t.stop()) }
  }, [attempt])

  const retry = () => { setDeviceProblem(''); setLocal(null); setAttempt(n => n + 1) }
  const switchCamera = async () => { if (!local || !navigator.mediaDevices?.getUserMedia || switchingCamera) return; const next: CameraFacing = facing === 'user' ? 'environment' : 'user'; setSwitchingCamera(true); try { const replacement = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(next), audio: false }); const track = replacement.getVideoTracks()[0]; if (!track) { replacement.getTracks().forEach(item => item.stop()); return }; const previous = local.getVideoTracks(); previous.forEach(item => local.removeTrack(item)); local.addTrack(track); previous.forEach(item => item.stop()); setFacing(next) } catch { setDeviceProblem('Could not switch cameras. Your current camera is still on.') } finally { setSwitchingCamera(false) } }

  if (phase === 'lobby' || !local) {
    return <section className="meeting-room meeting-lobby">
      <header className="meeting-room-head"><div><Eyebrow>READY TO JOIN</Eyebrow><h1>{meeting.title}</h1></div></header>
      <div className="meeting-lobby-body">
        <VideoTile stream={camOn ? local : null} label={local ? 'Your camera' : 'Camera'} muted mirrored waiting={deviceProblem ? 'Not available' : local ? 'Camera off' : 'Starting camera…'} />
        <div className="meeting-lobby-side">
          {deviceProblem
            ? <><p className="og-note meeting-problem">{deviceProblem}</p>
              <div className="og-inline">
                {inFrame() && <a className="btn primary" href={window.location.href} target="_blank" rel="noopener noreferrer">Open in a new tab</a>}
                <Btn kind="secondary" onClick={retry}>Try again</Btn>
                <Btn kind="quiet" onClick={onBack}>Back</Btn>
              </div></>
            : <>
              <p>{meeting.participants.filter(p => p.userId !== userId).length
                ? `With ${meeting.participants.filter(p => p.userId !== userId).map(p => p.name).join(', ')}.`
                : 'Nobody else is invited yet. Join, then invite people from inside the meeting.'}</p>
              <div className="og-inline">
                <button type="button" className="meeting-pill" aria-pressed={!micOn} onClick={() => { const next = !micOn; setMicOn(next); local?.getAudioTracks().forEach(t => { t.enabled = next }) }}>{micOn ? <><Mic size={15} /> Mic on</> : <><MicOff size={15} /> Mic off</>}</button>
                <button type="button" className="meeting-pill" aria-pressed={!camOn} disabled={!local?.getVideoTracks().length} onClick={() => { const next = !camOn; setCamOn(next); local?.getVideoTracks().forEach(t => { t.enabled = next }) }}>{camOn ? <><Video size={15} /> Camera on</> : <><VideoOff size={15} /> Camera off</>}</button>
              </div>
              <div className="og-inline">
                <label><input type="checkbox" checked={captureConsent} onChange={e=>setCaptureConsent(e.target.checked)}/> Save my microphone audio, transcribe it, and let Butler analyze it. All meeting participants can access the saved audio and transcript.</label>{joinError&&<p role="alert">{joinError}</p>}
                <Btn disabled={!local||joining} onClick={() => void enter()}><Video size={14} /> {local ? 'Join meeting' : 'Waiting for camera…'}</Btn>
                <Btn kind="quiet" onClick={onBack}>Back</Btn>
              </div>
            </>}
        </div>
      </div>
    </section>
  }

  return <LiveRoom meeting={meeting} userId={userId} local={local} initialMic={micOn} initialCam={camOn} initialFacing={facing} onLeave={onLeave} />
}

function LiveRoom({ meeting, userId, local, initialMic, initialCam, initialFacing, onLeave }: { meeting: Meeting; userId: string; local: MediaStream; initialMic: boolean; initialCam: boolean; initialFacing: CameraFacing; onLeave: () => void }) {
  const net = useNetwork()
  const [peers, setPeers] = useState<RemotePeer[]>([])
  const [status, setStatus] = useState<'starting' | 'connecting' | 'joined' | 'full' | 'error'>('starting')
  const [problem, setProblem] = useState('')
  const [micOn, setMicOn] = useState(initialMic)
  const [camOn, setCamOn] = useState(initialCam)
  const [facing, setFacing] = useState<CameraFacing>(initialFacing)
  const [switchingCamera, setSwitchingCamera] = useState(false)
  const [room, setRoom] = useState<RoomState>(() => ({
    roster: meeting.participants.map(p => ({ userId: p.userId, name: p.name, notesConsent: p.notesConsent })),
    recordingSince: null, recordingBy: null, endedAt: meeting.endedAt,
  }))
  const [lines, setLines] = useState<LiveLine[]>([])
  const [noteMsg, setNoteMsg] = useState('')
  const [inviting, setInviting] = useState(false)
  const [askDismissed, setAskDismissed] = useState(false)
  const [sttMode, setSttMode] = useState<'server' | 'browser' | 'none'>(() => (recordingSupported() ? 'server' : dictationSupported() ? 'browser' : 'none'))
  const call = useRef<MeetingCall | null>(null)
  const flushCapture=useRef<()=>Promise<void>>(async()=>{})
  const names = useMemo(() => new Map(room.roster.map(p => [p.userId, p.name])), [room.roster])
  const nameOf = (id: string) => (id === userId ? 'You' : names.get(id) ?? 'A member')
  const consent = useMemo(() => Object.fromEntries(room.roster.map(p => [p.userId, p.notesConsent])), [room.roster])
  const myConsent = !!consent[userId]
  const isHost = meeting.hostId === userId
  const recording = !!room.recordingSince
  const canStopRecording = recording && (isHost || room.recordingBy === userId)

  const addLine = useCallback((line: LiveLine) => setLines(prev => (prev.some(l => l.key === line.key) ? prev : [...prev, line].slice(-400))), [])
  const reloadRoom = useCallback(async () => { const r = await loadRoomState(meeting.id); if (r) setRoom(r) }, [meeting.id])
  const announce = () => call.current?.announceRoomChange()
  const switchCamera = async () => { if (!navigator.mediaDevices?.getUserMedia || switchingCamera) return; const next: CameraFacing = facing === 'user' ? 'environment' : 'user'; setSwitchingCamera(true); try { const replacement = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(next), audio: false }); const track = replacement.getVideoTracks()[0]; if (!track) { replacement.getTracks().forEach(item => item.stop()); return }; await call.current?.replaceVideoTrack(track); const previous = local.getVideoTracks(); previous.forEach(item => local.removeTrack(item)); local.addTrack(track); previous.forEach(item => item.stop()); track.enabled = camOn; setFacing(next) } catch { setProblem('Could not switch cameras. Your current camera is still on.') } finally { setSwitchingCamera(false) } }

  // The call itself.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      // A relay server when configured, so calls also work behind strict company firewalls.
      const ice = await getIceServers().catch(() => null)
      if (cancelled) return
      const c = new MeetingCall({
        meetingId: meeting.id, userId, localStream: local, iceServers: ice?.iceServers,
        onPeers: setPeers,
        onCaption: (cap: Caption) => addLine({ key: `${cap.from}-${cap.at}`, speakerId: cap.from, text: cap.text, at: cap.at }),
        onRoomChange: () => void reloadRoom(),
        onStatus: (st, detail) => { setStatus(st); if (detail) setProblem(detail) },
      })
      call.current = c
      await c.join()
      await markJoined(meeting.id)
    })()
    return () => { cancelled = true; void call.current?.leave(); call.current = null }
  }, [meeting.id, userId, local, addLine, reloadRoom])

  // Earlier transcript, and the room's state (refreshed while the room is open).
  useEffect(() => {
    let stale = false
    void loadTranscript(meeting.id).then(rows => { if (!stale) rows.forEach(r => addLine({ key: `${r.speakerId}-${r.spokenAt}`, speakerId: r.speakerId, text: r.text, at: r.spokenAt })) })
    void reloadRoom()
    const poll = setInterval(() => { if (!stale) void reloadRoom() }, 6000)
    return () => { stale = true; clearInterval(poll) }
  }, [meeting.id, addLine, reloadRoom])

  // Lines other people's recordings produced reach the transcript through their captions;
  // a periodic reload also catches lines from anyone whose caption was missed.
  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => { void loadTranscript(meeting.id).then(rows => rows.forEach(r => addLine({ key: `${r.speakerId}-${r.spokenAt}`, speakerId: r.speakerId, text: r.text, at: r.spokenAt }))) }, 20000)
    return () => clearInterval(t)
  }, [recording, meeting.id, addLine])

  const publish = useCallback((text: string) => {
    const at = new Date().toISOString()
    addLine({ key: `${userId}-${at}`, speakerId: userId, text, at })
    call.current?.sendCaption(text)
  }, [addLine, userId])

  // Your own speech: recorded in short clips and transcribed on the server, while your notes are on.
  const transcribing = recording && myConsent && micOn && !room.endedAt && status === 'joined'
  const rosterNames = room.roster.map(p => p.name)
  useEffect(() => {
    if (!transcribing || !recordingSupported()) return
    let queue = Promise.resolve()
    const recorder = new ClipRecorder(local, clip => {
      queue = queue.then(async () => {
        try {
          try { await saveMeetingAudio(meeting.id,userId,clip.blob,clip.mimeType) } catch(error) { setNoteMsg(error instanceof Error?error.message:'Audio save failed.') }
          if(sttMode!=='server')return
          const r = await transcribeMeetingAudio({ data: { meetingId: meeting.id, audio: await blobToBase64(clip.blob), mimeType: clip.mimeType, names: rosterNames } })
          if (r.text) publish(r.text)
          if (r.error === 'not_configured') setSttMode(dictationSupported() ? 'browser' : 'none')
          else if (r.error === 'failed') setNoteMsg('A moment of the recording could not be transcribed. Recording continues.')
          else if (r.error && r.error !== 'not_recording') setNoteMsg(r.error)
        } catch { setNoteMsg('A moment of the recording could not be transcribed. Recording continues.') }
      })
    })
    flushCapture.current=async()=>{await recorder.stop();await queue}
    try { recorder.start() } catch { setNoteMsg('Microphone recording could not start. Your audio is not being saved.'); setSttMode('none') }
    return () => { void recorder.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcribing, sttMode, local, meeting.id, publish])

  // Fallback when server transcription is not set up: the browser's own speech recognition.
  const dictation = useDictation({
    keepOpen: true,
    onFinal: text => { publish(text); void addTranscriptLine(meeting.id, text).then(err => { if (err) setNoteMsg(err) }) },
  })
  useEffect(() => {
    const want = transcribing && sttMode === 'browser'
    if (want && !dictation.listening) dictation.start()
    if (!want && dictation.listening) dictation.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcribing, sttMode])

  const setMyConsent = async (next: boolean) => {
    setNoteMsg('')
    const err = await setNotesConsent(meeting.id, next)
    if (err) { setNoteMsg(err); return }
    await reloadRoom(); announce()
  }

  const toggleRecording = async () => {
    setNoteMsg('')
    const err = await setMeetingRecording(meeting.id, !recording)
    if (err) { setNoteMsg(err); return }
    await reloadRoom(); announce()
  }

  const invite = async (memberId: string) => {
    const err = await inviteToMeeting(meeting.id, memberId)
    if (err) { setNoteMsg(err); return }
    setNoteMsg(`${net.members.find(m => m.id === memberId)?.name ?? 'They'} has been invited and notified.`)
    setInviting(false)
    await reloadRoom(); announce()
  }

  const toggleMic = () => { const next = !micOn; setMicOn(next); call.current?.setTrackEnabled('audio', next) }
  const toggleCam = () => { const next = !camOn; setCamOn(next); call.current?.setTrackEnabled('video', next) }
  const leave = async () => {
    await flushCapture.current()
    if (myConsent) await setNotesConsent(meeting.id, false)
    announce()
    await call.current?.leave(); call.current = null; onLeave()
  }
  const endForAll = async () => { await flushCapture.current(); const err = await endMeeting(meeting.id); if (err) { setNoteMsg(err); return } announce(); await leave() }

  const [butlerNotes,setButlerNotes]=useState<SavedNotes|null>(null)
  const [butlerError,setButlerError]=useState('')
  const lineCount=useRef(0), lastReviewed=useRef(0), reviewing=useRef(false)
  lineCount.current=lines.length
  useEffect(()=>{
    if(!recording||!myConsent)return
    let stale=false
    const review=async()=>{
      if(reviewing.current||lineCount.current<=lastReviewed.current)return
      reviewing.current=true
      const count=lineCount.current
      try{const r=await generateMeetingNotes({data:{meetingId:meeting.id}})
        if(!stale){if(r.error)setButlerError(r.error);else if(r.notes){setButlerNotes({...r.notes,privateNote:'',generatedAt:new Date().toISOString()});lastReviewed.current=count;setButlerError('')}}
      }catch{if(!stale)setButlerError('Butler notes are temporarily unavailable. Your transcript is separate.')}
      finally{reviewing.current=false}
    }
    const timer=setInterval(()=>void review(),60000)
    return()=>{stale=true;clearInterval(timer)}
  },[meeting.id,recording,myConsent])
  useEffect(()=>{if(room.endedAt){void call.current?.leave();call.current=null;setStatus('error');setProblem('The host ended this meeting. Your saved transcript and audio remain available in notes.')}},[room.endedAt])

  const notesOn = room.roster.filter(p => p.notesConsent)
  const startedBy = room.recordingBy ? nameOf(room.recordingBy) : 'Someone'
  const tail = useRef<HTMLOListElement>(null)
  useEffect(() => { const el = tail.current; if (el) el.scrollTop = el.scrollHeight }, [lines.length])
  const inviteable = net.members.filter(m => isLiveId(m.id) && !room.roster.some(p => p.userId === m.id)).slice(0, 30)

  const bg = useMeetingBackground(userId)
  return <section className={`meeting-room${bg.activeUrl ? ' has-bg' : ''}`} style={bg.activeUrl ? { backgroundImage: `linear-gradient(rgba(8,10,14,.55),rgba(8,10,14,.75)),url("${bg.activeUrl}")` } : undefined}>
    <header className="meeting-room-head">
      <div><Eyebrow>{status === 'joined' ? 'LIVE' : status === 'error' ? 'NOT CONNECTED' : 'CONNECTING'}</Eyebrow><h1>{meeting.title}</h1></div>
      {recording && <span className="meeting-recording-badge" role="status"><span className="dot" aria-hidden /> Recording · notes for {notesOn.map(p => (p.userId === userId ? 'you' : p.name)).join(', ') || 'nobody yet'}</span>}
    </header>
    <div className="meeting-tools">{isHost&&<MeetingShare meetingId={meeting.id}/>}<MeetingBackgroundPicker userId={userId} bg={bg} /></div>
    {problem && <p className="og-note meeting-problem">{problem}</p>}
    {status === 'full' && <p className="og-note meeting-problem">This meeting is full ({MAX_MEETING_PEOPLE} people). You are connected to the first arrivals only.</p>}

    {recording && !myConsent && !askDismissed && <div className="meeting-consent-ask" role="alertdialog" aria-label="Recording consent">
      <p><b>{startedBy} started recording for notes.</b> Your voice is only transcribed if you agree.</p>
      <div className="og-inline">
        <Btn onClick={() => void setMyConsent(true)}>Include my voice</Btn>
        <Btn kind="quiet" onClick={() => setAskDismissed(true)}>Not now</Btn>
      </div>
    </div>}

    <div className="meeting-stage">
      <div className={`meeting-grid people-${Math.min(peers.length + 1, MAX_MEETING_PEOPLE)}`}>
        <VideoTile stream={camOn ? local : null} label={`You${micOn ? '' : ' (muted)'}`} muted mirrored waiting="Camera off" />
        {peers.map(p => <VideoTile key={p.userId} stream={p.stream} label={names.get(p.userId) ?? 'A member'} waiting={p.state === 'failed' ? 'Connection failed. Their network may block direct calls.' : 'Connecting…'} />)}
        {!peers.length && status === 'joined' && <div className="meeting-tile meeting-tile-empty"><p>{room.roster.length > 1
          ? `Waiting for ${room.roster.filter(p => p.userId !== userId).map(p => p.name).join(', ')} to join. They have been notified.`
          : isHost ? 'You are the only one here. Invite someone below.' : 'Waiting for others to join.'}</p></div>}
      </div>

      <aside className="meeting-notes">
        <MeetingChat meetingId={meeting.id} userId={userId} />
        {(meeting.agenda || room.roster.length > 1) && <details className="meeting-brief-inline">
          <summary><Compass size={14} /> Brief{meeting.agenda ? ' and agenda' : ''}</summary>
          {meeting.agenda && <p className="meeting-agenda-text">{meeting.agenda}</p>}
          <MeetingBrief meeting={meeting} userId={userId} compact />
        </details>}
        <div className={`meeting-consent ${myConsent ? 'on' : ''}`}>
          <b><Sparkles size={14} /> Butler listening</b>
          {sttMode === 'none'
            ? <p>This browser cannot record for notes. Use a current Chrome, Edge, Safari or Firefox to add your voice. You can still read the transcript and generate notes.</p>
            : recording
              ? myConsent
                ? <p>Your microphone audio is saved in short clips and transcribed every few seconds for everyone here. {micOn ? '' : 'Paused while you are muted.'}</p>
                : <p>Recording is on, but your voice is not included.</p>
              : <p>Press <b>Record</b> to transcribe this meeting for notes. Everyone is asked before their voice is included.</p>}
          {recording && sttMode !== 'none' && <Btn kind={myConsent ? 'quiet' : 'secondary'} onClick={() => void setMyConsent(!myConsent)}>{myConsent ? 'Stop including my voice' : 'Include my voice'}</Btn>}
          {dictation.interim && <p className="meeting-interim">{dictation.interim}</p>}
          {noteMsg && <p className="og-note">{noteMsg}</p>}
        </div>
        {isHost && <div className="meeting-invite">
          {inviting
            ? <><b><UserPlus size={14} /> Invite to this meeting</b>
              <div className="meetings-invitees">{inviteable.map(m => <button type="button" key={m.id} onClick={() => void invite(m.id)}>{m.name}<small>{m.company}</small></button>)}
                {!inviteable.length && <p className="og-note">Everyone you can invite is already here.</p>}</div>
              <Btn kind="quiet" onClick={() => setInviting(false)}>Close</Btn></>
            : <Btn kind="secondary" disabled={room.roster.length >= MAX_MEETING_PEOPLE} onClick={() => setInviting(true)}><UserPlus size={14} /> {room.roster.length >= MAX_MEETING_PEOPLE ? 'Meeting is full' : 'Invite people'}</Btn>}
        </div>}
        <div className="meeting-butler"><b>Butler live notes</b><p>{butlerNotes?.summary||'Butler reviews new transcript once a minute after you consent.'}</p>{butlerNotes?.actionItems.map((a,i)=><p key={i}>{a.task}{a.owner?' · '+a.owner:''}</p>)}{butlerError&&<p role="alert">{butlerError}</p>}</div>
        <ol className="meeting-transcript" ref={tail}>
          {lines.map(l => <li key={l.key}><b>{nameOf(l.speakerId)}</b> {l.text}</li>)}
          {!lines.length && <li className="og-note">{recording ? 'The transcript appears here as people speak.' : 'Nothing recorded yet.'}</li>}
        </ol>
      </aside>
    </div>

    <footer className="meeting-controls">
      <button type="button" onClick={toggleMic} aria-pressed={!micOn} aria-label={micOn ? 'Mute' : 'Unmute'}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}</button>
      <button type="button" onClick={toggleCam} aria-pressed={!camOn} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'} disabled={!local.getVideoTracks().length}>{camOn ? <Video size={18} /> : <VideoOff size={18} />}</button>
      <button type="button" onClick={() => void switchCamera()} aria-label="Flip camera" title="Flip camera" disabled={!local.getVideoTracks().length || switchingCamera}><SwitchCamera size={18} /></button>
      <button type="button" className={`record${recording ? ' on' : ''}`} aria-pressed={recording}
        disabled={sttMode === 'none' || (recording && !canStopRecording)}
        title={recording && !canStopRecording ? `${startedBy} or the host can stop recording` : undefined}
        onClick={() => void toggleRecording()}>
        <span className="dot" aria-hidden /> {recording ? (canStopRecording ? 'Stop recording' : 'Recording') : 'Record'}
      </button>
      <button type="button" className="leave" onClick={() => void leave()}><PhoneOff size={18} /> Leave</button>
      {isHost && <button type="button" className="end" onClick={() => void endForAll()}>End for everyone</button>}
    </footer>
  </section>
}

export function MeetingNotesPanel({ meeting, userId, onClose, onSaved }: { meeting: Meeting | null; userId: string; onClose: () => void; onSaved: () => void }) {
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
    <MeetingAudio meeting={meeting}/>
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
      {!compact && isLiveId(p.userId) && <div className="meeting-brief-ai"><AiMeetingBriefPanel otherUserId={p.userId} otherName={p.name} /></div>}
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
