/**
 * Peer groups: small confidential groups that meet monthly. Members see the groups they are in;
 * inside, a confidentiality agreement comes first, then sessions, a private board and issue
 * processing. Admins create groups, manage membership and handle requests to join.
 * Access is enforced in the database (0044_peer_groups.sql + 0045_peer_group_feed.sql).
 *
 * Feed components (PeerGroupCard, PeerGroupFeed, PostComposer, PeerPost, CreatePeerGroupModal)
 * are at the bottom of this file and back the async board-of-advisors view.
 */
import { ArrowLeft, CalendarDays, Check, LifeBuoy, Lock, MessageSquare, Plus, ShieldCheck, Trash2, UserMinus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import type { PeerGroupSummary, PeerFeedPost } from '@/lib/peerGroups.functions'
import { listMyPeerGroups, createPeerGroup, getPeerGroupFeed, postToPeerGroup } from '@/lib/peerGroups.functions'
import {
  AGREEMENT_POINTS, MAX_GROUP_SIZE, cleanMeetingUrl, localInputToIso, seatsLeft, splitSessions, threadPosts, validateIssue,
  type PeerPost, type PeerSession,
} from './peer-groups'
import { Btn, Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

interface Group { id: string; name: string; description: string; cadence: string; facilitator_id: string | null; max_size: number; created_at: string }
interface Membership { group_id: string; user_id: string; agreement_accepted_at: string | null; joined_at: string }
interface Issue { id: string; owner_id: string; title: string; context: string; help_needed: string; status: 'open' | 'resolved'; outcome: string | null; resolved_at: string | null; created_at: string }
interface Perspective { id: string; issue_id: string; author_id: string; body: string; created_at: string }
interface Request { id: string; user_id: string; note: string; status: string; created_at: string }
type Names = Record<string, string>

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

async function loadNames(ids: string[]): Promise<Names> {
  const unique = [...new Set(ids)].filter(Boolean)
  if (!unique.length) return {}
  const r = await db.from('profiles').select('id, name').in('id', unique)
  return Object.fromEntries((r.data ?? []).map((p: any) => [p.id, (p.name ?? '').trim() || 'A member']))
}

async function myId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/* ── Member page ──────────────────────────────────────────────────────────────────────── */

export function PeerGroupsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [mine, setMine] = useState<Membership[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const uid = await myId()
    setUserId(uid)
    if (!uid) { setLoaded(true); return }
    const m = await db.from('peer_group_members').select('group_id, user_id, agreement_accepted_at, joined_at').eq('user_id', uid)
    const rows: Membership[] = m.data ?? []
    setMine(rows)
    const ids = rows.map(r => r.group_id)
    if (ids.length) {
      const [g, all] = await Promise.all([
        db.from('peer_groups').select('id, name, description, cadence, facilitator_id, max_size, created_at').in('id', ids).order('name'),
        db.from('peer_group_members').select('group_id').in('group_id', ids),
      ])
      setGroups(g.data ?? [])
      const c: Record<string, number> = {}
      for (const r of all.data ?? []) c[r.group_id] = (c[r.group_id] ?? 0) + 1
      setCounts(c)
    } else setGroups([])
    setLoaded(true)
  }, [])
  useEffect(() => { void load() }, [load])

  const open = openId ? groups.find(g => g.id === openId) : null
  if (open && userId) {
    const membership = mine.find(m => m.group_id === open.id)
    return <GroupRoom group={open} userId={userId} accepted={!!membership?.agreement_accepted_at}
      onBack={() => setOpenId(null)} onChanged={load} onLeft={async () => { setOpenId(null); await load() }} />
  }

  return <section className="meetings peer-groups">
    <header className="meetings-head">
      <div>
        <Eyebrow><Users size={12} /> PEER GROUPS</Eyebrow>
        <h1>A small group of peers, every month.</h1>
        <p className="og-note">Six to twelve owners and CEOs who meet monthly and keep what is said in the room. Only members of a group can see it, its sessions, its board and its issues.</p>
      </div>
    </header>
    {!loaded ? <p className="og-note">Loading your groups…</p>
      : !userId ? <p className="og-note">Sign in to see your peer groups.</p>
        : <>
          {groups.length
            ? <div className="meetings-list">{groups.map(g => {
              const accepted = !!mine.find(m => m.group_id === g.id)?.agreement_accepted_at
              return <article key={g.id} className="meetings-card">
                <div>
                  <span className="meetings-status">{accepted ? <><Lock size={11} /> Confidential</> : <><ShieldCheck size={11} /> Agreement needed</>}</span>
                  <h3>{g.name}</h3>
                  {g.cadence && <p className="og-note"><CalendarDays size={12} /> {g.cadence}</p>}
                  <p className="og-note"><Users size={12} /> {counts[g.id] ?? 1} of {g.max_size} members{g.facilitator_id === userId ? ' · you facilitate' : ''}</p>
                </div>
                <div className="og-inline"><Btn onClick={() => setOpenId(g.id)}>{accepted ? 'Open group' : 'Read and accept'}</Btn></div>
              </article>
            })}</div>
            : <p className="og-note">You are not in a peer group yet. Ask to join below and the team will place you with peers at a similar stage.</p>}
          <JoinRequest userId={userId} />
        </>}
  </section>
}

function JoinRequest({ userId }: { userId: string }) {
  const [req, setReq] = useState<Request | null>(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const r = await db.from('peer_group_requests').select('id, user_id, note, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
    setReq(r.data?.[0] ?? null)
  }, [userId])
  useEffect(() => { void load() }, [load])

  const send = async () => {
    if (note.trim().length < 10) { setMsg('Tell the team a little about you and what you want from a group (10+ characters).'); return }
    setBusy(true)
    const r = await db.from('peer_group_requests').insert({ note: note.trim() })
    setBusy(false)
    if (r.error) { setMsg(r.error.message); return }
    setNote(''); setMsg(''); void load()
  }
  const withdraw = async () => { if (req) { await db.from('peer_group_requests').delete().eq('id', req.id); void load() } }

  return <section className="executive-section peer-request">
    <Eyebrow>REQUEST TO JOIN A PEER GROUP</Eyebrow>
    {req?.status === 'pending'
      ? <><p>Your request is with the team. Sent {day(req.created_at)}.</p><p className="og-note">“{req.note}”</p>
        <Btn kind="quiet" onClick={() => void withdraw()}>Withdraw request</Btn></>
      : <>
        {req?.status === 'declined' && <p className="og-note">Your last request did not find a place. You can ask again.</p>}
        <textarea rows={3} maxLength={600} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Your company, its size and stage, and what you want from a group of peers" />
        <p className="og-note">Only the Ask Intros team sees this.</p>
        <Btn disabled={busy} onClick={() => void send()}>{busy ? 'Sending…' : 'Ask to join'}</Btn>
      </>}
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

/* ── Inside a group ───────────────────────────────────────────────────────────────────── */

type Tab = 'sessions' | 'board' | 'issues' | 'members'

function GroupRoom({ group, userId, accepted, onBack, onChanged, onLeft }: {
  group: Group; userId: string; accepted: boolean; onBack: () => void; onChanged: () => Promise<void> | void; onLeft: () => void
}) {
  const [tab, setTab] = useState<Tab>('sessions')
  const [roster, setRoster] = useState<Membership[]>([])
  const [names, setNames] = useState<Names>({})
  const [msg, setMsg] = useState('')
  const facilitator = group.facilitator_id === userId

  const loadRoster = useCallback(async () => {
    const r = await db.from('peer_group_members').select('group_id, user_id, agreement_accepted_at, joined_at').eq('group_id', group.id).order('joined_at')
    const rows: Membership[] = r.data ?? []
    setRoster(rows)
    setNames(await loadNames(rows.map(x => x.user_id)))
  }, [group.id])
  useEffect(() => { void loadRoster() }, [loadRoster])

  const accept = async () => {
    const r = await db.rpc('accept_peer_group_agreement', { p_group: group.id })
    if (r.error) { setMsg(r.error.message); return }
    await onChanged()
  }
  const leave = async () => {
    if (!confirm(`Leave ${group.name}? You will lose access to everything in it.`)) return
    const r = await db.from('peer_group_members').delete().eq('group_id', group.id).eq('user_id', userId)
    if (r.error) { setMsg(r.error.message); return }
    onLeft()
  }

  return <section className="meetings peer-groups">
    <header className="meetings-head">
      <div>
        <button type="button" className="text-link" onClick={onBack}><ArrowLeft size={12} /> All peer groups</button>
        <Eyebrow><Lock size={12} /> PEER GROUP · CONFIDENTIAL</Eyebrow>
        <h1>{group.name}</h1>
        {group.description && <p className="og-note">{group.description}</p>}
        <p className="og-note">{group.cadence || 'Meets monthly'} · {roster.length} of {group.max_size} members{group.facilitator_id ? ` · facilitated by ${group.facilitator_id === userId ? 'you' : names[group.facilitator_id] ?? 'a member'}` : ''}</p>
      </div>
    </header>

    {!accepted
      ? <section className="executive-section peer-agreement">
        <Eyebrow><ShieldCheck size={12} /> CONFIDENTIALITY AGREEMENT</Eyebrow>
        <h2>Before you see anything the group shares</h2>
        <ol>{AGREEMENT_POINTS.map(p => <li key={p}>{p}</li>)}</ol>
        <p className="og-note">You accept once for this group. The other members can see that you have.</p>
        <div className="og-inline"><Btn onClick={() => void accept()}><Check size={14} /> I agree</Btn><Btn kind="quiet" onClick={onBack}>Not now</Btn></div>
      </section>
      : <>
        <nav className="peer-tabs" role="tablist">
          {([['sessions', 'Sessions'], ['board', 'Discussion'], ['issues', 'Issues'], ['members', 'Members']] as const).map(([id, label]) =>
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        {tab === 'sessions' && <Sessions groupId={group.id} canSchedule={facilitator} />}
        {tab === 'board' && <Board groupId={group.id} userId={userId} names={names} />}
        {tab === 'issues' && <Issues groupId={group.id} userId={userId} names={names} />}
        {tab === 'members' && <ul className="admin-list peer-roster">{roster.map(m => <li key={m.user_id}>
          <span><b>{m.user_id === userId ? 'You' : names[m.user_id] ?? 'A member'}</b>{group.facilitator_id === m.user_id ? ' · facilitator' : ''}</span>
          <small>{m.agreement_accepted_at ? `Agreed ${day(m.agreement_accepted_at)}` : 'Has not accepted the agreement yet'}</small>
          <span />
        </li>)}</ul>}
      </>}
    <div className="og-inline"><Btn kind="quiet" onClick={() => void leave()}><UserMinus size={14} /> Leave group</Btn></div>
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

function Sessions({ groupId, canSchedule }: { groupId: string; canSchedule: boolean }) {
  const [rows, setRows] = useState<PeerSession[]>([])
  const [adding, setAdding] = useState(false)
  const load = useCallback(async () => {
    const r = await db.from('peer_group_sessions').select('id, starts_at, agenda, meeting_url').eq('group_id', groupId).order('starts_at')
    setRows(r.data ?? [])
  }, [groupId])
  useEffect(() => { void load() }, [load])
  const { upcoming, past } = splitSessions(rows)
  const cancel = async (id: string) => { if (confirm('Cancel this session?')) { await db.from('peer_group_sessions').delete().eq('id', id); void load() } }

  return <div className="peer-pane">
    {canSchedule && (adding
      ? <SessionForm groupId={groupId} onDone={() => { setAdding(false); void load() }} onCancel={() => setAdding(false)} />
      : <Btn kind="secondary" onClick={() => setAdding(true)}><Plus size={14} /> Schedule a session</Btn>)}
    <h2 className="meetings-sub">Upcoming</h2>
    {upcoming.length ? <ul className="peer-sessions">{upcoming.map(s => <SessionRow key={s.id} s={s} onCancel={canSchedule ? () => void cancel(s.id) : undefined} />)}</ul>
      : <p className="og-note">{canSchedule ? 'No session scheduled. Schedule the next one so everyone can plan around it.' : 'No session scheduled yet. Your facilitator will add the next one.'}</p>}
    {past.length > 0 && <><h2 className="meetings-sub">Past</h2><ul className="peer-sessions">{past.map(s => <SessionRow key={s.id} s={s} />)}</ul></>}
  </div>
}

function SessionRow({ s, onCancel }: { s: PeerSession; onCancel?: (() => void) | undefined }) {
  return <li>
    <b><CalendarDays size={13} /> {when(s.starts_at)}</b>
    {s.agenda && <p className="meetings-agenda">{s.agenda}</p>}
    <span className="og-inline">
      {s.meeting_url && <a className="text-link" href={s.meeting_url} target={s.meeting_url.startsWith('/') ? undefined : '_blank'} rel="noreferrer">Join meeting</a>}
      {onCancel && <button type="button" className="text-link" onClick={onCancel}>Cancel</button>}
    </span>
  </li>
}

export function SessionForm({ groupId, onDone, onCancel }: { groupId: string; onDone: () => void; onCancel: () => void }) {
  const [at, setAt] = useState('')
  const [agenda, setAgenda] = useState('')
  const [link, setLink] = useState('')
  const [msg, setMsg] = useState('')
  const save = async () => {
    const startsAt = localInputToIso(at)
    if (!startsAt) { setMsg('Pick a date and time.'); return }
    const url = cleanMeetingUrl(link)
    if (url.error) { setMsg(url.error); return }
    const r = await db.from('peer_group_sessions').insert({ group_id: groupId, starts_at: startsAt, agenda: agenda.trim(), meeting_url: url.url })
    if (r.error) { setMsg(r.error.message); return }
    onDone()
  }
  return <div className="concierge-form peer-form">
    <label>Date and time<input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label>
    <label>Agenda<textarea rows={3} maxLength={2000} value={agenda} onChange={e => setAgenda(e.target.value)} placeholder="Updates, one issue to process, commitments for next month" /></label>
    <label>Meeting link (optional)<input value={link} onChange={e => setLink(e.target.value)} placeholder="Paste a link from Meetings, or any https:// link" /></label>
    <p className="og-note">Every member of the group is notified.</p>
    <div className="og-inline"><Btn onClick={() => void save()}>Schedule</Btn><Btn kind="quiet" onClick={onCancel}>Cancel</Btn></div>
    {msg && <p className="og-note">{msg}</p>}
  </div>
}

function Board({ groupId, userId, names }: { groupId: string; userId: string; names: Names }) {
  const [posts, setPosts] = useState<PeerPost[]>([])
  const [draft, setDraft] = useState('')
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const r = await db.from('peer_group_posts').select('id, parent_id, author_id, body, created_at, updated_at').eq('group_id', groupId).order('created_at')
    setPosts(r.data ?? [])
  }, [groupId])
  useEffect(() => { void load() }, [load])
  const threads = useMemo(() => threadPosts(posts), [posts])

  const post = async (body: string, parentId: string | null) => {
    if (!body.trim()) return false
    const r = await db.from('peer_group_posts').insert({ group_id: groupId, parent_id: parentId, body: body.trim() })
    if (r.error) { setMsg(r.error.message); return false }
    setMsg(''); void load(); return true
  }

  return <div className="peer-pane">
    <div className="concierge-form peer-form">
      <textarea rows={3} maxLength={4000} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Share something with the group" />
      <div className="og-inline"><Btn onClick={() => void post(draft, null).then(ok => { if (ok) setDraft('') })}><MessageSquare size={14} /> Post</Btn><span className="og-note">Only members of this group can read it.</span></div>
    </div>
    {msg && <p className="og-note">{msg}</p>}
    {threads.length ? <ul className="peer-board">{threads.map(t => <li key={t.post.id}>
      <PostItem p={t.post} userId={userId} names={names} onChanged={load} />
      {t.replies.length > 0 && <ul className="peer-replies">{t.replies.map(r => <li key={r.id}><PostItem p={r} userId={userId} names={names} onChanged={load} /></li>)}</ul>}
      <ReplyBox onSend={body => post(body, t.post.id)} />
    </li>)}</ul>
      : <p className="og-note">Nothing posted yet. Start with what is on your mind this month.</p>}
  </div>
}

function PostItem({ p, userId, names, onChanged }: { p: PeerPost; userId: string; names: Names; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(p.body)
  const mine = p.author_id === userId
  const save = async () => { if (!body.trim()) return; await db.from('peer_group_posts').update({ body: body.trim() }).eq('id', p.id); setEditing(false); onChanged() }
  const remove = async () => { if (confirm('Delete this post?')) { await db.from('peer_group_posts').delete().eq('id', p.id); onChanged() } }
  return <article className="peer-post">
    <header><b>{mine ? 'You' : names[p.author_id] ?? 'A member'}</b><small>{when(p.created_at)}{p.updated_at > p.created_at ? ' · edited' : ''}</small></header>
    {editing
      ? <div className="concierge-form peer-form"><textarea rows={3} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} />
        <div className="og-inline"><Btn onClick={() => void save()}>Save</Btn><Btn kind="quiet" onClick={() => { setBody(p.body); setEditing(false) }}>Cancel</Btn></div></div>
      : <p>{p.body}</p>}
    {mine && !editing && <span className="og-inline"><button type="button" className="text-link" onClick={() => setEditing(true)}>Edit</button><button type="button" className="text-link" onClick={() => void remove()}>Delete</button></span>}
  </article>
}

function ReplyBox({ onSend }: { onSend: (body: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  if (!open) return <button type="button" className="text-link" onClick={() => setOpen(true)}>Reply</button>
  return <div className="concierge-form peer-form">
    <textarea rows={2} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} placeholder="Reply" />
    <div className="og-inline"><Btn onClick={() => void onSend(body).then(ok => { if (ok) { setBody(''); setOpen(false) } })}>Reply</Btn><Btn kind="quiet" onClick={() => setOpen(false)}>Cancel</Btn></div>
  </div>
}

function Issues({ groupId, userId, names }: { groupId: string; userId: string; names: Names }) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [perspectives, setPerspectives] = useState<Perspective[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', context: '', help: '' })
  const [msg, setMsg] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const load = useCallback(async () => {
    const [i, p] = await Promise.all([
      db.from('peer_group_issues').select('id, owner_id, title, context, help_needed, status, outcome, resolved_at, created_at').eq('group_id', groupId).order('created_at', { ascending: false }),
      db.from('peer_group_perspectives').select('id, issue_id, author_id, body, created_at').eq('group_id', groupId).order('created_at'),
    ])
    setIssues(i.data ?? []); setPerspectives(p.data ?? [])
  }, [groupId])
  useEffect(() => { void load() }, [load])

  const bring = async () => {
    const problem = validateIssue(form)
    if (problem) { setMsg(problem); return }
    const r = await db.from('peer_group_issues').insert({ group_id: groupId, title: form.title.trim(), context: form.context.trim(), help_needed: form.help.trim() })
    if (r.error) { setMsg(r.error.message); return }
    setForm({ title: '', context: '', help: '' }); setAdding(false); setMsg(''); void load()
  }

  return <div className="peer-pane">
    {adding
      ? <div className="concierge-form peer-form">
        <label>The issue<input maxLength={160} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. My co-founder wants out" /></label>
        <label>Context<textarea rows={4} maxLength={4000} value={form.context} onChange={e => setForm({ ...form, context: e.target.value })} placeholder="What the group needs to know" /></label>
        <label>What help you need<textarea rows={2} maxLength={1000} value={form.help} onChange={e => setForm({ ...form, help: e.target.value })} placeholder="A decision, options, someone who has been through it…" /></label>
        <p className="og-note">The group is told you brought an issue. The notification does not include what it is.</p>
        <div className="og-inline"><Btn onClick={() => void bring()}>Bring to the group</Btn><Btn kind="quiet" onClick={() => setAdding(false)}>Cancel</Btn></div>
      </div>
      : <Btn kind="secondary" onClick={() => setAdding(true)}><LifeBuoy size={14} /> Bring an issue</Btn>}
    {msg && <p className="og-note">{msg}</p>}
    {issues.length ? <ul className="peer-issues">{issues.map(i => <IssueItem key={i.id} issue={i} userId={userId} names={names}
      perspectives={perspectives.filter(p => p.issue_id === i.id)} open={openId === i.id}
      onToggle={() => setOpenId(openId === i.id ? null : i.id)} onChanged={load} />)}</ul>
      : <p className="og-note">No issues yet. Bring one: a decision you are stuck on, a hard conversation, a problem you would rather not solve alone.</p>}
  </div>
}

function IssueItem({ issue, userId, names, perspectives, open, onToggle, onChanged }: {
  issue: Issue; userId: string; names: Names; perspectives: Perspective[]; open: boolean; onToggle: () => void; onChanged: () => void
}) {
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState('')
  const [resolving, setResolving] = useState(false)
  const [msg, setMsg] = useState('')
  const mine = issue.owner_id === userId
  const who = (id: string) => (id === userId ? 'You' : names[id] ?? 'A member')

  const add = async () => {
    if (!body.trim()) return
    const r = await db.from('peer_group_perspectives').insert({ issue_id: issue.id, body: body.trim() })
    if (r.error) { setMsg(r.error.message); return }
    setBody(''); setMsg(''); onChanged()
  }
  const resolve = async () => {
    if (outcome.trim().length < 3) { setMsg('Add a short note on how it turned out.'); return }
    const r = await db.from('peer_group_issues').update({ status: 'resolved', outcome: outcome.trim() }).eq('id', issue.id)
    if (r.error) { setMsg(r.error.message); return }
    setResolving(false); setMsg(''); onChanged()
  }
  const remove = async () => { if (confirm('Delete this issue and its perspectives?')) { await db.from('peer_group_issues').delete().eq('id', issue.id); onChanged() } }
  const removePerspective = async (id: string) => { await db.from('peer_group_perspectives').delete().eq('id', id); onChanged() }

  return <li className={`peer-issue ${issue.status}`}>
    <button type="button" className="peer-issue-head" onClick={onToggle} aria-expanded={open}>
      <span className="meetings-status">{issue.status === 'resolved' ? 'Resolved' : 'Open'} · {who(issue.owner_id)} · {day(issue.created_at)}</span>
      <b>{issue.title}</b>
      <small>{perspectives.length} perspective{perspectives.length === 1 ? '' : 's'}</small>
    </button>
    {open && <div className="peer-issue-body">
      {issue.context && <p>{issue.context}</p>}
      {issue.help_needed && <p><b>Help needed:</b> {issue.help_needed}</p>}
      {issue.status === 'resolved' && <p className="peer-outcome"><b>Outcome:</b> {issue.outcome}</p>}
      <ul className="peer-replies">{perspectives.map(p => <li key={p.id}><article className="peer-post">
        <header><b>{who(p.author_id)}</b><small>{when(p.created_at)}</small></header><p>{p.body}</p>
        {p.author_id === userId && <button type="button" className="text-link" onClick={() => void removePerspective(p.id)}>Delete</button>}
      </article></li>)}</ul>
      {issue.status === 'open' && <div className="concierge-form peer-form">
        <textarea rows={2} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} placeholder={mine ? 'Add more context' : 'Your perspective, from your own experience'} />
        <div className="og-inline"><Btn kind="secondary" onClick={() => void add()}>Add</Btn></div>
      </div>}
      {mine && <div className="og-inline">
        {issue.status === 'open' && (resolving
          ? <><input className="peer-outcome-input" maxLength={1000} value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="What you decided or what happened" />
            <Btn onClick={() => void resolve()}>Mark resolved</Btn><Btn kind="quiet" onClick={() => setResolving(false)}>Cancel</Btn></>
          : <Btn kind="secondary" onClick={() => setResolving(true)}><Check size={14} /> Mark resolved</Btn>)}
        <Btn kind="quiet" onClick={() => void remove()}><Trash2 size={14} /> Delete</Btn>
      </div>}
      {msg && <p className="og-note">{msg}</p>}
    </div>}
  </li>
}

/* ── Admin: groups, membership and requests ───────────────────────────────────────────── */

interface Person { id: string; name: string; company: string | null }

export function AdminPeerGroupsPanel() {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const [g, m, p, r] = await Promise.all([
      db.from('peer_groups').select('id, name, description, cadence, facilitator_id, max_size, created_at').order('name'),
      db.from('peer_group_members').select('group_id, user_id, agreement_accepted_at, joined_at'),
      db.from('profiles').select('id, name, company').order('name').limit(1000),
      db.from('peer_group_requests').select('id, user_id, note, status, created_at').eq('status', 'pending').order('created_at'),
    ])
    if (g.error) { setGroups(null); return }
    setGroups(g.data ?? []); setMembers(m.data ?? []); setRequests(r.data ?? [])
    setPeople((p.data ?? []).filter((x: any) => (x.name ?? '').trim()))
  }, [])
  useEffect(() => { void load() }, [load])

  const nameOf = (id: string) => people.find(p => p.id === id)?.name ?? 'A member'
  if (!groups) return null

  const decide = async (id: string, accept: boolean, groupId: string | null) => {
    if (accept && !groupId) { setMsg('Pick a group first.'); return }
    const r = await db.rpc('admin_decide_peer_group_request', { p_request: id, p_accept: accept, p_group: groupId })
    setMsg(r.error ? r.error.message : accept ? 'Added to the group. They have been notified.' : 'Declined. They have been told.')
    void load()
  }

  return <section className="executive-section admin-health">
    <Eyebrow><Users size={12} /> PEER GROUPS</Eyebrow>
    <h2>{groups.length} group{groups.length === 1 ? '' : 's'} · {requests.length} request{requests.length === 1 ? '' : 's'} to join</h2>
    <p className="og-note">You manage groups, members and sessions. Discussion and issues are visible only to members who accepted the group's agreement, admins included.</p>

    {requests.length > 0 && <>
      <h3>Requests to join</h3>
      <ul className="admin-list peer-admin-requests">{requests.map(r => <RequestRow key={r.id} r={r} name={nameOf(r.user_id)}
        groups={groups.map(g => ({ ...g, count: members.filter(m => m.group_id === g.id).length }))}
        onDecide={(accept, groupId) => void decide(r.id, accept, groupId)} />)}</ul>
    </>}

    <h3>Groups</h3>
    {creating
      ? <GroupEditor people={people} onSaved={() => { setCreating(false); void load() }} onCancel={() => setCreating(false)} />
      : <Btn kind="secondary" onClick={() => setCreating(true)}><Plus size={14} /> New group</Btn>}
    {groups.length
      ? <ul className="admin-list peer-admin-groups">{groups.map(g => {
        const roster = members.filter(m => m.group_id === g.id)
        return <li key={g.id}>
          <span><b>{g.name}</b>{g.cadence ? ` · ${g.cadence}` : ''}</span>
          <small>{roster.length}/{g.max_size} · {seatsLeft(roster.length, g.max_size)} open</small>
          <button type="button" className="text-link" onClick={() => setOpenId(openId === g.id ? null : g.id)}>{openId === g.id ? 'Close' : 'Manage'}</button>
          {openId === g.id && <GroupAdmin group={g} roster={roster} people={people} nameOf={nameOf} onChanged={load} />}
        </li>
      })}</ul>
      : <p className="og-note">No peer groups yet. Create the first one, then add six to twelve members.</p>}
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

function RequestRow({ r, name, groups, onDecide }: { r: Request; name: string; groups: Array<Group & { count: number }>; onDecide: (accept: boolean, groupId: string | null) => void }) {
  const [pick, setPick] = useState('')
  return <li>
    <span><b>{name}</b> · {r.note}</span>
    <small>{day(r.created_at)}</small>
    <span className="admin-actions">
      <select value={pick} onChange={e => setPick(e.target.value)} aria-label="Group">
        <option value="">Choose a group</option>
        {groups.map(g => <option key={g.id} value={g.id} disabled={g.count >= g.max_size}>{g.name} ({g.count}/{g.max_size})</option>)}
      </select>
      <Btn onClick={() => onDecide(true, pick || null)}>Add</Btn>
      <Btn kind="quiet" onClick={() => onDecide(false, null)}>Decline</Btn>
    </span>
  </li>
}

function GroupEditor({ group, people, onSaved, onCancel }: { group?: Group; people: Person[]; onSaved: () => void; onCancel: () => void }) {
  const [d, setD] = useState({
    name: group?.name ?? '', description: group?.description ?? '', cadence: group?.cadence ?? 'Monthly',
    facilitator_id: group?.facilitator_id ?? '', max_size: group?.max_size ?? 12,
  })
  const [msg, setMsg] = useState('')
  const save = async () => {
    if (d.name.trim().length < 2) { setMsg('Give the group a name.'); return }
    const row = { name: d.name.trim(), description: d.description.trim(), cadence: d.cadence.trim(), facilitator_id: d.facilitator_id || null, max_size: d.max_size }
    const r = group ? await db.from('peer_groups').update(row).eq('id', group.id) : await db.from('peer_groups').insert(row)
    if (r.error) { setMsg(r.error.message); return }
    onSaved()
  }
  return <div className="admin-plan peer-group-editor">
    <label>Name<input maxLength={80} value={d.name} onChange={e => setD({ ...d, name: e.target.value })} placeholder="e.g. Forum One" /></label>
    <label>Meets<input maxLength={160} value={d.cadence} onChange={e => setD({ ...d, cadence: e.target.value })} placeholder="First Tuesday of the month, 8am" /></label>
    <label>Max size<input type="number" min={2} max={MAX_GROUP_SIZE} value={d.max_size} onChange={e => setD({ ...d, max_size: Math.max(2, Math.min(MAX_GROUP_SIZE, Number(e.target.value) || 2)) })} /></label>
    <label className="wide">Description<textarea rows={2} maxLength={1000} value={d.description} onChange={e => setD({ ...d, description: e.target.value })} placeholder="Who the group is for" /></label>
    <label className="wide">Facilitator (optional, added as a member)<select value={d.facilitator_id} onChange={e => setD({ ...d, facilitator_id: e.target.value })}>
      <option value="">No facilitator</option>
      {people.map(p => <option key={p.id} value={p.id}>{p.name}{p.company ? ` · ${p.company}` : ''}</option>)}
    </select></label>
    <span className="og-inline"><Btn onClick={() => void save()}>{group ? 'Save group' : 'Create group'}</Btn><Btn kind="quiet" onClick={onCancel}>Cancel</Btn></span>
    {msg && <p className="og-note wide">{msg}</p>}
  </div>
}

function GroupAdmin({ group, roster, people, nameOf, onChanged }: { group: Group; roster: Membership[]; people: Person[]; nameOf: (id: string) => string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [query, setQuery] = useState('')
  const [msg, setMsg] = useState('')
  const inGroup = new Set(roster.map(m => m.user_id))
  const candidates = people.filter(p => !inGroup.has(p.id) && (!query.trim() || `${p.name} ${p.company ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 8)
  const full = roster.length >= group.max_size

  const add = async (userId: string) => {
    const r = await db.from('peer_group_members').insert({ group_id: group.id, user_id: userId })
    setMsg(r.error ? r.error.message : `${nameOf(userId)} added and notified.`); onChanged()
  }
  const remove = async (userId: string) => {
    if (!confirm(`Remove ${nameOf(userId)} from ${group.name}?`)) return
    const r = await db.from('peer_group_members').delete().eq('group_id', group.id).eq('user_id', userId)
    setMsg(r.error ? r.error.message : 'Removed.'); onChanged()
  }
  const del = async () => {
    if (!confirm(`Delete ${group.name}? Its sessions, discussion and issues are deleted too.`)) return
    const r = await db.from('peer_groups').delete().eq('id', group.id)
    if (r.error) setMsg(r.error.message); else onChanged()
  }

  return <div className="peer-admin-group">
    {editing ? <GroupEditor group={group} people={people} onSaved={() => { setEditing(false); onChanged() }} onCancel={() => setEditing(false)} />
      : <div className="og-inline"><Btn kind="secondary" onClick={() => setEditing(true)}>Edit details</Btn><Btn kind="secondary" onClick={() => setScheduling(s => !s)}><CalendarDays size={14} /> Schedule a session</Btn><Btn kind="quiet" onClick={() => void del()}><Trash2 size={14} /> Delete group</Btn></div>}
    {scheduling && <SessionForm groupId={group.id} onDone={() => { setScheduling(false); setMsg('Session scheduled. Members were notified.') }} onCancel={() => setScheduling(false)} />}
    <ul className="peer-admin-roster">{roster.map(m => <li key={m.user_id}>
      <span>{nameOf(m.user_id)}{group.facilitator_id === m.user_id ? ' · facilitator' : ''}{m.agreement_accepted_at ? '' : ' · agreement pending'}</span>
      <button type="button" className="text-link" onClick={() => void remove(m.user_id)}>Remove</button>
    </li>)}{!roster.length && <li><span>No members yet.</span></li>}</ul>
    {full ? <p className="og-note">This group is full. Raise its size (up to {MAX_GROUP_SIZE}) to add someone.</p>
      : <div className="concierge-form">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search members to add" />
        <div className="meetings-invitees">{candidates.map(p => <button type="button" key={p.id} onClick={() => void add(p.id)}>{p.name}<small>{p.company ?? ''}</small></button>)}</div>
      </div>}
    {msg && <p className="og-note">{msg}</p>}
  </div>
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed components — async board-of-advisors view (0045_peer_group_feed.sql)
// ─────────────────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  update: 'Update', ask: 'Ask', win: 'Win', block: 'Block', insight: 'Insight',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Clickable card summarising a single peer group. */
export function PeerGroupCard({
  id, name, description, stageLabel, memberCount, role, onClick,
}: {
  id: string; name: string; description?: string | null; stageLabel?: string | null
  memberCount: number; role: string; onClick: (id: string) => void
}) {
  return (
    <div className="peer-group-card" onClick={() => onClick(id)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(id)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
        <strong style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</strong>
        {stageLabel && <span className="badge badge-secondary" style={{ fontSize: '.65rem' }}>{stageLabel}</span>}
        <span className="badge" style={{ fontSize: '.65rem' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        <span className="badge badge-secondary" style={{ fontSize: '.65rem', textTransform: 'capitalize' }}>{role}</span>
      </div>
      {description && <p style={{ marginTop: '.4rem', fontSize: '.85rem', opacity: .7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{description}</p>}
    </div>
  )
}

/** A single feed post card with kind badge and author initials. */
export function PeerPost({
  kind, body, authorName, authorInitials, createdAt,
}: {
  kind: string; body: string; authorName: string; authorInitials: string; createdAt: string
}) {
  return (
    <div className="peer-post">
      <span className={`peer-post-kind ${kind}`}>{KIND_LABELS[kind] ?? kind}</span>
      <p style={{ margin: '0 0 .75rem', lineHeight: 1.55 }}>{body}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '.7rem', fontWeight: 700, flexShrink: 0,
        }}>{authorInitials}</span>
        <span style={{ fontSize: '.8rem', opacity: .75 }}>{authorName}</span>
        <span style={{ fontSize: '.75rem', opacity: .5, marginLeft: 'auto' }}>{timeAgo(createdAt)}</span>
      </div>
    </div>
  )
}

/** Compose box: kind radio strip + textarea + Post button. */
export function PostComposer({
  groupId, onPost,
}: {
  groupId: string; onPost: () => void
}) {
  const [kind, setKind] = useState<'update'|'ask'|'win'|'block'|'insight'>('update')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!body.trim()) return
    setBusy(true); setErr('')
    try {
      await postToPeerGroup({ data: { groupId, kind, body: body.trim() } })
      setBody(''); onPost()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Post failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="peer-post" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginBottom: '.625rem' }}>
        {(['update','ask','win','block','insight'] as const).map(k => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', cursor: 'pointer', userSelect: 'none' }}>
            <input type="radio" name={`kind-${groupId}`} checked={kind === k} onChange={() => setKind(k)} />
            <span className={`peer-post-kind ${k}`} style={{ marginBottom: 0 }}>{KIND_LABELS[k]}</span>
          </label>
        ))}
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={`Share a ${kind} with the group…`}
        rows={3}
        style={{ width: '100%', resize: 'vertical', marginBottom: '.5rem' }}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit() }}
      />
      {err && <p style={{ color: 'var(--error, #ef4444)', fontSize: '.8rem', margin: '0 0 .5rem' }}>{err}</p>}
      <Btn kind="primary" onClick={() => void submit()} disabled={busy || !body.trim()}>
        {busy ? 'Posting…' : 'Post'}
      </Btn>
    </div>
  )
}

/** Feed view for one group: composer on top, posts below. */
export function PeerGroupFeed({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const [posts, setPosts] = useState<PeerFeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true); setErr('')
    try {
      const data = await getPeerGroupFeed({ data: { groupId } })
      setPosts(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [groupId])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h3 style={{ margin: 0 }}>Group feed</h3>
      </div>
      <PostComposer groupId={groupId} onPost={() => void load()} />
      {loading && <p style={{ opacity: .5 }}>Loading…</p>}
      {err && <p style={{ color: 'var(--error, #ef4444)' }}>{err}</p>}
      {!loading && !err && posts.length === 0 && (
        <p style={{ opacity: .5, textAlign: 'center', padding: '2rem 0' }}>
          No posts yet. Share a win, ask, or update to get things started.
        </p>
      )}
      {posts.map(p => (
        <PeerPost
          key={p.id}
          kind={p.kind}
          body={p.body}
          authorName={p.author_name}
          authorInitials={p.author_initials}
          createdAt={p.created_at}
        />
      ))}
    </div>
  )
}

/** Modal to create a new peer group. */
export function CreatePeerGroupModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stageLabel, setStageLabel] = useState('')
  const [industryFocus, setIndustryFocus] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name is required'); return }
    setBusy(true); setErr('')
    try {
      await createPeerGroup({ data: { name: name.trim(), description, stageLabel, industryFocus } })
      onCreated()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not create group')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Create a peer group</h3>
        <form onSubmit={e => void submit(e)}>
          <label className="form-label">
            Name *
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SaaS Founders Pod" required />
          </label>
          <label className="form-label" style={{ marginTop: '.75rem' }}>
            Description
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this group is for…" style={{ resize: 'vertical' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginTop: '.75rem' }}>
            <label className="form-label">
              Stage
              <input value={stageLabel} onChange={e => setStageLabel(e.target.value)} placeholder="e.g. Series A" />
            </label>
            <label className="form-label">
              Industry
              <input value={industryFocus} onChange={e => setIndustryFocus(e.target.value)} placeholder="e.g. B2B SaaS" />
            </label>
          </div>
          {err && <p style={{ color: 'var(--error, #ef4444)', fontSize: '.85rem', margin: '.5rem 0 0' }}>{err}</p>}
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <Btn kind="secondary" onClick={onClose} disabled={busy}>Cancel</Btn>
            <Btn kind="primary" disabled={busy}>{busy ? 'Creating…' : 'Create group'}</Btn>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Main peer groups page — list view with Create button, drills into feed. */
export function PeerGroupsFeedPage() {
  const [groups, setGroups] = useState<PeerGroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [creating, setCreating] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  async function load() {
    setLoading(true); setErr('')
    try {
      const data = await listMyPeerGroups()
      setGroups(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (activeGroupId) {
    return <PeerGroupFeed groupId={activeGroupId} onBack={() => setActiveGroupId(null)} />
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Peer Groups</h2>
        <Btn kind="primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> New group
        </Btn>
      </div>
      {loading && <p style={{ opacity: .5 }}>Loading…</p>}
      {err && <p style={{ color: 'var(--error, #ef4444)' }}>{err}</p>}
      {!loading && !err && groups.length === 0 && (
        <p style={{ opacity: .5, textAlign: 'center', padding: '3rem 0' }}>
          You are not in any peer groups yet. Create one to invite trusted operators.
        </p>
      )}
      {groups.map(g => (
        <PeerGroupCard
          key={g.id}
          id={g.id}
          name={g.name}
          description={g.description}
          stageLabel={g.stage_label}
          memberCount={g.member_count}
          role={g.role}
          onClick={setActiveGroupId}
        />
      ))}
      {creating && (
        <CreatePeerGroupModal
          onCreated={() => { setCreating(false); void load() }}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  )
}
