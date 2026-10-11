/**
 * Syndication Rooms: private group rooms where small groups of members co-invest,
 * co-sponsor, or co-refer opportunities together. Each room has a shared deal description,
 * member votes (In / Out / Need More Info), a discussion thread, and a decision summary
 * once all members have voted.
 *
 * Database access is enforced in 0063_syndication_rooms.sql; this file only renders
 * the state the database exposes to the current member.
 */
import { ArrowLeft, CheckCircle2, Circle, HelpCircle, MessageSquare, Plus, Send, ThumbsDown, ThumbsUp, Users, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  castVote,
  createSyndicationRoom,
  getRoomDetails,
  listSyndicationRooms,
  postSyndicationMessage,
  type RoomDetails,
  type RoomType,
  type SyndicationRoom,
  type Vote,
} from '@/lib/syndicationRooms.functions'
import { supabase } from '@/integrations/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROOM_TYPES: { value: RoomType; label: string; blurb: string }[] = [
  { value: 'co-invest', label: 'Co-Invest', blurb: 'Pool capital together on a deal' },
  { value: 'co-sponsor', label: 'Co-Sponsor', blurb: 'Jointly sponsor an event or vendor' },
  { value: 'co-refer', label: 'Co-Refer', blurb: 'Send a warm intro together' },
  { value: 'other', label: 'Other', blurb: 'Any group business decision' },
]

const VOTE_LABELS: Record<Vote, string> = { in: 'In', out: 'Out', need_more_info: 'Need More Info' }
const VOTE_ICONS: Record<Vote, React.ReactNode> = {
  in: <ThumbsUp size={13} />,
  out: <ThumbsDown size={13} />,
  need_more_info: <HelpCircle size={13} />,
}

function voteTally(members: RoomDetails['members']) {
  const inCount = members.filter(m => m.vote === 'in').length
  const outCount = members.filter(m => m.vote === 'out').length
  const needCount = members.filter(m => m.vote === 'need_more_info').length
  const pending = members.filter(m => m.vote === null).length
  return { inCount, outCount, needCount, pending, total: members.length }
}

function VoteTallyBar({ members }: { members: RoomDetails['members'] }) {
  const { inCount, outCount, needCount, pending, total } = voteTally(members)
  const pct = (n: number) => total ? `${Math.round((n / total) * 100)}%` : '0%'
  return (
    <div className="syn-tally">
      <div className="syn-tally-bar">
        <span style={{ width: pct(inCount), background: 'var(--cobalt)' }} title={`${inCount} In`} />
        <span style={{ width: pct(needCount), background: 'var(--amber)' }} title={`${needCount} Need More Info`} />
        <span style={{ width: pct(outCount), background: 'var(--danger)' }} title={`${outCount} Out`} />
        <span style={{ width: pct(pending), background: 'var(--line-dark)' }} title={`${pending} Pending`} />
      </div>
      <p className="syn-tally-label">
        {inCount > 0 && <span className="syn-vote-in"><ThumbsUp size={11} /> {inCount} In</span>}
        {outCount > 0 && <span className="syn-vote-out"><ThumbsDown size={11} /> {outCount} Out</span>}
        {needCount > 0 && <span className="syn-vote-need"><HelpCircle size={11} /> {needCount} Need More Info</span>}
        {pending > 0 && <span className="syn-vote-pending"><Circle size={11} /> {pending} Pending</span>}
      </p>
    </div>
  )
}

function RoomTypeChip({ type }: { type: RoomType }) {
  const t = ROOM_TYPES.find(rt => rt.value === type)
  return <span className={`syn-chip syn-chip--${type}`}>{t?.label ?? type}</span>
}

function StatusChip({ status }: { status: string }) {
  return <span className={`syn-chip syn-chip--status-${status}`}>{status}</span>
}

function MemberInitials({ name, initials }: { name: string | null; initials: string | null }) {
  return (
    <span className="syn-avatar" title={name ?? ''}>
      {initials ?? (name ? name.slice(0, 2).toUpperCase() : '?')}
    </span>
  )
}

/* ── Create Room Form ──────────────────────────────────────────────────────────────────── */

interface CreateFormProps {
  onCreated: (room: SyndicationRoom) => void
  onCancel: () => void
}

function CreateRoomForm({ onCreated, onCancel }: CreateFormProps) {
  const [title, setTitle] = useState('')
  const [roomType, setRoomType] = useState<RoomType>('co-invest')
  const [description, setDescription] = useState('')
  const [opportunitySize, setOpportunitySize] = useState('')
  const [deadline, setDeadline] = useState('')
  const [inviteEmails, setInviteEmails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      // Resolve invite emails to user IDs via profiles lookup
      const emailList = inviteEmails
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean)

      let inviteUserIds: string[] = []
      if (emailList.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, email')
          .in('email', emailList)
        inviteUserIds = (profiles ?? []).map((p: { id: string }) => p.id)
      }

      const room = await createSyndicationRoom({
        title,
        roomType,
        description: description || undefined,
        opportunitySize: opportunitySize || undefined,
        deadline: deadline || undefined,
        inviteUserIds,
      })
      onCreated(room)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="syn-form" onSubmit={e => void submit(e)}>
      <header className="syn-form-header">
        <span className="eyebrow">NEW SYNDICATION ROOM</span>
        <button type="button" className="btn quiet" onClick={onCancel}>Cancel</button>
      </header>

      <label className="syn-field">
        <span>Title</span>
        <input
          className="syn-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Series B co-invest — FinTech SaaS"
          required
          maxLength={200}
        />
      </label>

      <label className="syn-field">
        <span>Room type</span>
        <div className="syn-type-grid">
          {ROOM_TYPES.map(rt => (
            <button
              key={rt.value}
              type="button"
              className={`syn-type-btn${roomType === rt.value ? ' active' : ''}`}
              onClick={() => setRoomType(rt.value)}
            >
              <strong>{rt.label}</strong>
              <small>{rt.blurb}</small>
            </button>
          ))}
        </div>
      </label>

      <label className="syn-field">
        <span>Opportunity description</span>
        <textarea
          className="syn-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this opportunity? Key details the group needs to decide."
          rows={4}
          maxLength={2000}
        />
      </label>

      <div className="syn-row">
        <label className="syn-field grow">
          <span>Opportunity size / commitment</span>
          <input
            className="syn-input"
            value={opportunitySize}
            onChange={e => setOpportunitySize(e.target.value)}
            placeholder="e.g. $500k each, 3-year co-sponsor"
          />
        </label>
        <label className="syn-field">
          <span>Decision deadline</span>
          <input
            className="syn-input"
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />
        </label>
      </div>

      <label className="syn-field">
        <span>Invite members (emails, comma-separated)</span>
        <textarea
          className="syn-input"
          value={inviteEmails}
          onChange={e => setInviteEmails(e.target.value)}
          placeholder="alice@example.com, bob@example.com"
          rows={2}
        />
      </label>

      {error && <p className="syn-error">{error}</p>}

      <button type="submit" className="btn primary" disabled={busy || !title.trim()}>
        <Plus size={14} />
        {busy ? 'Creating…' : 'Create Room'}
      </button>
    </form>
  )
}

/* ── Room Detail View ───────────────────────────────────────────────────────────────────── */

interface RoomDetailProps {
  roomId: string
  myUserId: string
  onBack: () => void
}

function RoomDetailView({ roomId, myUserId, onBack }: RoomDetailProps) {
  const [details, setDetails] = useState<RoomDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [voting, setVoting] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const d = await getRoomDetails({ roomId })
      setDetails(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (details && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [details?.messages.length])

  const handleVote = async (vote: Vote) => {
    setVoting(true)
    try {
      await castVote({ roomId, vote })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cast vote.')
    } finally {
      setVoting(false)
    }
  }

  const handleMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setPosting(true)
    try {
      await postSyndicationMessage({ roomId, body: message.trim() })
      setMessage('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post message.')
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <div className="syn-loading">Loading…</div>
  if (!details) return <div className="syn-error">{error || 'Room not found.'}</div>

  const { room, members, messages } = details
  const myMembership = members.find(m => m.user_id === myUserId)
  const myVote = myMembership?.vote ?? null
  const tally = voteTally(members)
  const allVoted = tally.pending === 0

  return (
    <div className="syn-detail">
      <button className="syn-back btn quiet" onClick={onBack}>
        <ArrowLeft size={14} /> All Rooms
      </button>

      <header className="syn-detail-header">
        <div>
          <RoomTypeChip type={room.room_type} />
          <StatusChip status={room.status} />
        </div>
        <h2 className="syn-detail-title">{room.title}</h2>
        {room.opportunity_size && <p className="syn-detail-size">{room.opportunity_size}</p>}
        {room.deadline && <p className="syn-detail-deadline">Decision deadline: {new Date(`${room.deadline}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
      </header>

      {room.description && (
        <section className="syn-section">
          <span className="eyebrow">OPPORTUNITY</span>
          <p className="syn-description">{room.description}</p>
        </section>
      )}

      {/* Decision banner */}
      {room.status === 'decided' && (
        <div className="syn-decision-banner">
          <CheckCircle2 size={16} />
          <div>
            <strong>Decision reached</strong>
            <p>{room.decision}</p>
          </div>
        </div>
      )}

      {/* Vote tally */}
      <section className="syn-section">
        <span className="eyebrow"><Users size={11} /> {members.length} MEMBERS</span>
        <VoteTallyBar members={members} />
        <div className="syn-members-list">
          {members.map(m => (
            <div key={m.id} className="syn-member-row">
              <MemberInitials name={m.name} initials={m.initials} />
              <span className="syn-member-name">{m.name ?? m.user_id.slice(0, 8)}</span>
              {m.vote ? (
                <span className={`syn-member-vote syn-vote-${m.vote}`}>
                  {VOTE_ICONS[m.vote]} {VOTE_LABELS[m.vote]}
                  {m.vote_note && <span className="syn-vote-note"> — {m.vote_note}</span>}
                </span>
              ) : (
                <span className="syn-member-vote syn-vote-pending">
                  <Circle size={11} /> Pending
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Your vote */}
      {myMembership && room.status === 'open' && (
        <section className="syn-section syn-vote-section">
          <span className="eyebrow">YOUR VOTE</span>
          <p className="syn-vote-prompt">
            {myVote ? `You voted: ${VOTE_LABELS[myVote]}. Change your vote:` : 'How do you want to proceed?'}
          </p>
          <div className="syn-vote-actions">
            {(['in', 'out', 'need_more_info'] as Vote[]).map(v => (
              <button
                key={v}
                className={`btn syn-vote-btn${myVote === v ? ' active' : ''}`}
                onClick={() => void handleVote(v)}
                disabled={voting}
              >
                {VOTE_ICONS[v]} {VOTE_LABELS[v]}
              </button>
            ))}
          </div>
          {allVoted && <p className="syn-all-voted"><CheckCircle2 size={13} /> All members have voted.</p>}
        </section>
      )}

      {/* Discussion thread */}
      <section className="syn-section syn-thread-section">
        <span className="eyebrow"><MessageSquare size={11} /> DISCUSSION</span>
        <div className="syn-thread" ref={threadRef}>
          {messages.length === 0 && <p className="syn-empty">No messages yet. Start the conversation.</p>}
          {messages.map(msg => (
            <div key={msg.id} className={`syn-message${msg.user_id === myUserId ? ' syn-message--mine' : ''}`}>
              <div className="syn-message-meta">
                <MemberInitials name={msg.name} initials={msg.initials} />
                <span className="syn-message-author">{msg.name ?? msg.user_id.slice(0, 8)}</span>
                <time className="syn-message-time">
                  {new Date(msg.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </time>
              </div>
              <p className="syn-message-body">{msg.body}</p>
            </div>
          ))}
        </div>

        {room.status !== 'closed' && (
          <form className="syn-compose" onSubmit={e => void handleMessage(e)}>
            <textarea
              className="syn-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add to the discussion…"
              rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
            />
            <button type="submit" className="btn primary syn-send-btn" disabled={posting || !message.trim()}>
              <Send size={13} /> {posting ? 'Posting…' : 'Post'}
            </button>
          </form>
        )}
      </section>

      {error && <p className="syn-error">{error}</p>}
    </div>
  )
}

/* ── Rooms List ─────────────────────────────────────────────────────────────────────────── */

function RoomCard({ room, onClick }: { room: SyndicationRoom; onClick: () => void }) {
  return (
    <button className="syn-room-card" onClick={onClick}>
      <div className="syn-room-card-top">
        <RoomTypeChip type={room.room_type} />
        <StatusChip status={room.status} />
      </div>
      <h3 className="syn-room-title">{room.title}</h3>
      {room.description && <p className="syn-room-blurb">{room.description.slice(0, 100)}{room.description.length > 100 ? '…' : ''}</p>}
      {room.status === 'decided' && room.decision && (
        <div className="syn-room-decision">
          <CheckCircle2 size={12} /> {room.decision}
        </div>
      )}
      {room.deadline && room.status === 'open' && (
        <p className="syn-room-deadline">Deadline {new Date(`${room.deadline}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
      )}
    </button>
  )
}

/* ── Main Panel ─────────────────────────────────────────────────────────────────────────── */

export function SyndicationRoomsPanel() {
  const [rooms, setRooms] = useState<SyndicationRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list')
  const [openRoomId, setOpenRoomId] = useState<string | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  useEffect(() => {
    void (supabase as any).auth.getUser().then(({ data }: any) => setMyUserId(data?.user?.id ?? null))
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listSyndicationRooms()
      setRooms(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreated = (room: SyndicationRoom) => {
    setRooms(prev => [room, ...prev])
    setOpenRoomId(room.id)
    setView('detail')
  }

  const openRooms = rooms.filter(r => r.status === 'open')
  const decidedRooms = rooms.filter(r => r.status !== 'open')

  if (view === 'create') {
    return (
      <div className="syn-panel">
        <CreateRoomForm onCreated={handleCreated} onCancel={() => setView('list')} />
      </div>
    )
  }

  if (view === 'detail' && openRoomId && myUserId) {
    return (
      <div className="syn-panel">
        <RoomDetailView
          roomId={openRoomId}
          myUserId={myUserId}
          onBack={() => { setView('list'); void load() }}
        />
      </div>
    )
  }

  return (
    <div className="syn-panel">
      <header className="syn-panel-header">
        <div>
          <span className="eyebrow">SYNDICATION ROOMS</span>
          <h2 className="syn-panel-title">Group Decisions</h2>
          <p className="syn-panel-sub">Co-invest, co-sponsor, or co-refer with a small group of trusted members.</p>
        </div>
        <button className="btn primary" onClick={() => setView('create')}>
          <Plus size={14} /> New Room
        </button>
      </header>

      {loading && <div className="syn-loading">Loading…</div>}
      {error && <p className="syn-error">{error}</p>}

      {!loading && rooms.length === 0 && (
        <div className="syn-empty-state">
          <Users size={32} />
          <p>No syndication rooms yet.</p>
          <p>Create a room to invite trusted members to co-invest, co-sponsor, or co-refer an opportunity together.</p>
          <button className="btn primary" onClick={() => setView('create')}><Plus size={14} /> Create your first room</button>
        </div>
      )}

      {openRooms.length > 0 && (
        <section className="syn-list-section">
          <span className="eyebrow">OPEN · {openRooms.length}</span>
          <div className="syn-rooms-grid">
            {openRooms.map(room => (
              <RoomCard key={room.id} room={room} onClick={() => { setOpenRoomId(room.id); setView('detail') }} />
            ))}
          </div>
        </section>
      )}

      {decidedRooms.length > 0 && (
        <section className="syn-list-section">
          <span className="eyebrow">DECIDED / CLOSED · {decidedRooms.length}</span>
          <div className="syn-rooms-grid">
            {decidedRooms.map(room => (
              <RoomCard key={room.id} room={room} onClick={() => { setOpenRoomId(room.id); setView('detail') }} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ── Styles ─────────────────────────────────────────────────────────────────────────────── */

const synStyles = `
.syn-panel{display:flex;flex-direction:column;gap:24px;padding:24px;max-width:820px;margin:0 auto;min-height:100%}
.syn-panel-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.syn-panel-title{font:500 28px var(--serif);margin:4px 0 6px}
.syn-panel-sub{font:400 13px/1.6 var(--sans);color:var(--muted);margin:0;max-width:440px}
.syn-loading{color:var(--muted);font:400 13px var(--sans);padding:20px 0}
.syn-error{color:var(--danger);font:400 12px var(--sans);margin:0}
.syn-list-section{display:flex;flex-direction:column;gap:12px}
.syn-rooms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.syn-room-card{background:var(--raised);border:1px solid var(--line-dark);border-radius:8px;padding:16px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:border-color .15s}
.syn-room-card:hover{border-color:var(--cobalt)}
.syn-room-card-top{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.syn-room-title{font:500 15px var(--sans);margin:0;color:var(--soft)}
.syn-room-blurb{font:400 12px/1.5 var(--sans);color:var(--muted);margin:0}
.syn-room-decision{font:400 11px var(--sans);color:var(--cobalt-bright);display:flex;align-items:center;gap:5px}
.syn-room-deadline{font:400 11px var(--sans);color:var(--amber);margin:0}
.syn-chip{display:inline-flex;align-items:center;border-radius:4px;padding:2px 7px;font:700 9px var(--sans);letter-spacing:.06em}
.syn-chip--co-invest{background:color-mix(in oklab,var(--cobalt) 18%,transparent);color:var(--cobalt-bright)}
.syn-chip--co-sponsor{background:color-mix(in oklab,var(--amber) 15%,transparent);color:var(--amber)}
.syn-chip--co-refer{background:color-mix(in oklab,#4CAF50 18%,transparent);color:#81C784}
.syn-chip--other{background:color-mix(in oklab,var(--muted) 15%,transparent);color:var(--muted)}
.syn-chip--status-open{background:color-mix(in oklab,#4CAF50 15%,transparent);color:#81C784}
.syn-chip--status-decided{background:color-mix(in oklab,var(--cobalt) 15%,transparent);color:var(--cobalt-bright)}
.syn-chip--status-closed{background:color-mix(in oklab,var(--muted) 12%,transparent);color:var(--muted)}
.syn-tally{display:flex;flex-direction:column;gap:6px;margin:8px 0}
.syn-tally-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;background:var(--raised);gap:1px}
.syn-tally-bar span{transition:width .3s ease;border-radius:2px}
.syn-tally-label{display:flex;gap:10px;flex-wrap:wrap;font:600 10px var(--sans)}
.syn-vote-in{color:var(--cobalt-bright);display:inline-flex;align-items:center;gap:3px}
.syn-vote-out{color:var(--danger);display:inline-flex;align-items:center;gap:3px}
.syn-vote-need{color:var(--amber);display:inline-flex;align-items:center;gap:3px}
.syn-vote-pending{color:var(--muted);display:inline-flex;align-items:center;gap:3px}
.syn-avatar{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--graphite);border:1px solid var(--line-dark);font:700 9px var(--sans);color:var(--muted);flex:none}
.syn-members-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.syn-member-row{display:flex;align-items:center;gap:10px}
.syn-member-name{font:400 13px var(--sans);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.syn-member-vote{display:inline-flex;align-items:center;gap:4px;font:600 10px var(--sans)}
.syn-vote-note{font-weight:400;color:var(--muted)}
.syn-form{display:flex;flex-direction:column;gap:16px}
.syn-form-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.syn-field{display:flex;flex-direction:column;gap:6px;font:600 10px var(--sans);letter-spacing:.04em;color:var(--muted)}
.syn-input{background:var(--graphite);border:1px solid var(--line-dark);border-radius:6px;padding:9px 12px;color:var(--soft);font:400 13px var(--sans);resize:vertical;transition:border-color .15s}
.syn-input:focus{outline:none;border-color:var(--cobalt)}
.syn-row{display:flex;gap:12px;flex-wrap:wrap}
.syn-row .syn-field{flex:1;min-width:160px}
.syn-type-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.syn-type-btn{background:var(--graphite);border:1px solid var(--line-dark);border-radius:6px;padding:10px 12px;text-align:left;cursor:pointer;transition:border-color .15s;color:var(--muted);display:flex;flex-direction:column;gap:3px}
.syn-type-btn strong{font:600 12px var(--sans);color:var(--soft)}
.syn-type-btn small{font:400 10px var(--sans)}
.syn-type-btn.active{border-color:var(--cobalt);color:var(--cobalt-bright)}
.syn-type-btn.active strong{color:var(--cobalt-bright)}
.syn-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:8px;padding-left:0}
.syn-detail{display:flex;flex-direction:column;gap:20px}
.syn-detail-header{display:flex;flex-direction:column;gap:8px}
.syn-detail-header>div{display:flex;gap:6px}
.syn-detail-title{font:500 24px var(--serif);margin:0}
.syn-detail-size{font:500 13px var(--sans);color:var(--cobalt-bright);margin:0}
.syn-detail-deadline{font:400 11px var(--sans);color:var(--amber);margin:0}
.syn-description{font:400 14px/1.7 var(--sans);color:var(--soft);margin:8px 0 0;white-space:pre-line}
.syn-decision-banner{display:flex;gap:12px;background:color-mix(in oklab,var(--cobalt) 12%,var(--raised));border:1px solid var(--cobalt);border-radius:8px;padding:14px 16px;align-items:flex-start}
.syn-decision-banner svg{color:var(--cobalt-bright);flex:none;margin-top:2px}
.syn-decision-banner strong{font:600 12px var(--sans)}
.syn-decision-banner p{font:400 13px/1.5 var(--sans);color:var(--muted);margin:4px 0 0}
.syn-section{display:flex;flex-direction:column;gap:8px}
.syn-vote-section{background:var(--raised);border:1px solid var(--line-dark);border-radius:8px;padding:16px}
.syn-vote-prompt{font:400 13px var(--sans);color:var(--muted);margin:0}
.syn-vote-actions{display:flex;gap:8px;flex-wrap:wrap}
.syn-vote-btn{min-width:120px}
.syn-vote-btn.active.syn-vote-btn:nth-child(1){background:var(--cobalt);border-color:var(--cobalt);color:var(--soft)}
.syn-vote-btn.active:nth-child(2){background:var(--danger);border-color:var(--danger);color:var(--soft)}
.syn-vote-btn.active:nth-child(3){background:color-mix(in oklab,var(--amber) 25%,var(--graphite));border-color:var(--amber);color:var(--amber)}
.syn-all-voted{font:400 11px var(--sans);color:var(--cobalt-bright);display:flex;align-items:center;gap:5px;margin:4px 0 0}
.syn-thread-section{flex:1}
.syn-thread{display:flex;flex-direction:column;gap:12px;max-height:360px;overflow-y:auto;padding:4px 0;scrollbar-width:thin}
.syn-empty{font:400 12px var(--sans);color:var(--muted);margin:0}
.syn-message{display:flex;flex-direction:column;gap:4px}
.syn-message--mine .syn-message-meta{flex-direction:row-reverse}
.syn-message--mine .syn-message-body{text-align:right}
.syn-message-meta{display:flex;align-items:center;gap:6px}
.syn-message-author{font:600 11px var(--sans);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.syn-message-time{font:400 10px var(--sans);color:var(--muted);white-space:nowrap}
.syn-message-body{font:400 13px/1.6 var(--sans);color:var(--soft);margin:0;word-break:break-word}
.syn-compose{display:flex;gap:8px;align-items:flex-end;margin-top:8px}
.syn-compose .syn-input{flex:1}
.syn-send-btn{flex:none;align-self:flex-end}
.syn-empty-state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px 24px;text-align:center;color:var(--muted)}
.syn-empty-state svg{opacity:.4}
.syn-empty-state p{font:400 14px/1.6 var(--sans);margin:0;max-width:380px}
`

if (typeof document !== 'undefined') {
  const existing = document.getElementById('syn-styles')
  if (!existing) {
    const style = document.createElement('style')
    style.id = 'syn-styles'
    style.textContent = synStyles
    document.head.appendChild(style)
  }
}
