/**
 * Deals: private rooms where the business that follows an introduction, an answered ask, a
 * conversation or an opportunity actually happens. The list groups my rooms by stage and
 * shows invitations to answer; a room carries the original need, the working terms,
 * proposals, milestones, participants and an append-only timeline.
 * Access is enforced in the database (0058_deal_rooms.sql); this file only renders it and
 * offers the moves the database will accept. /demo shows a local example room instead.
 */
import { ArrowLeft, Check, CircleDot, FileText, Flag, Handshake, Link2, Lock, Plus, Send, UserPlus, Users, X } from 'lucide-react'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import {
  canPropose, cleanDraft, cleanLink, describeEvent, formatBudget, formatMoney, groupByStage, isOpen, milestoneLabel, milestoneReviewBlock,
  milestoneSubmitBlock, nextActions, outcomeLabel, parseAmount, proposalBlock, proposalLabel, queueDealDraft, queueDealRoom, roleLabel, sideOf,
  sourceLabel, stageLabel, stepperState, takeDealDraft, takeDealRoom, validateDetails,
  type DealDraft, type DealRole, type DealSide, type DealStage,
} from './deals-core'
import { createShowcaseDeals, liveDeals, SHOWCASE_THEM, SHOWCASE_YOU, type DealsApi, type RoomBundle, type ShowcaseDeals } from './deals'
import type { DealMemberRow, DealRoomRow } from './deals-engine'
import { NavCtx } from './nav'
import { PostDealReferralPrompt } from './referrals-ui'
import { isShowcase } from './showcase'
import { Btn, Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

let showcaseApi: ShowcaseDeals | null = null
/** The showcase keeps one local example for the whole visit; live rooms always come from the database. */
function useDealsApi(): DealsApi {
  return useMemo(() => {
    if (!isShowcase()) return liveDeals
    showcaseApi ??= createShowcaseDeals()
    return showcaseApi
  }, [])
}

const day = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/* ── Opening a room from anywhere ─────────────────────────────────────────────────────── */

/** Takes the member to Deals: the shell handles the event; inside the classic app, its own navigation. */
function goToDeals(setPage?: (p: 'deals') => void) {
  const ev = new CustomEvent('aetheris:open-deals', { cancelable: true })
  window.dispatchEvent(ev)
  if (!ev.defaultPrevented && setPage) setPage('deals')
}

/**
 * "Open deal room" on an intro, an ask reply, a conversation or an opportunity. Opens the room
 * you already share for that source, otherwise the create form prefilled from it — nothing is
 * created until the member confirms there.
 */
export function OpenDealRoomButton({ draft, label = 'Open deal room', kind = 'secondary' }: { draft: DealDraft; label?: string; kind?: 'primary' | 'secondary' | 'quiet' }) {
  const nav = useContext(NavCtx)
  const [busy, setBusy] = useState(false)
  const open = async () => {
    setBusy(true)
    const clean = cleanDraft(draft)
    const existing = !isShowcase() && clean.sourceKind !== 'manual' && clean.sourceId ? await liveDeals.findForSource(clean.sourceKind, clean.sourceId) : null
    setBusy(false)
    if (existing) queueDealRoom(existing)
    else queueDealDraft(clean)
    goToDeals(nav?.setPage as ((p: 'deals') => void) | undefined)
  }
  return <Btn kind={kind} disabled={busy} onClick={() => void open()}><Handshake size={14} /> {busy ? 'Opening…' : label}</Btn>
}

/* ── Page ─────────────────────────────────────────────────────────────────────────────── */

export function DealsPage() {
  const api = useDealsApi()
  const [me, setMe] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [rooms, setRooms] = useState<DealRoomRow[]>([])
  const [members, setMembers] = useState<DealMemberRow[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DealDraft | null>(null)
  const [flash, setFlash] = useState('')
  const [, setActing] = useState(SHOWCASE_YOU)

  const load = useCallback(async () => {
    const uid = await api.me()
    setMe(uid)
    if (!uid) { setLoaded(true); return }
    const r = await api.listMine()
    setError(r.error)
    const list = r.data?.rooms ?? []
    const mem = r.data?.members ?? []
    setRooms(list); setMembers(mem)
    setNames(await api.names([...mem.map(m => m.user_id), ...list.map(x => x.created_by ?? '')]))
    setLoaded(true)
  }, [api])

  useEffect(() => {
    // An entry point elsewhere queued a room to open or a draft to confirm.
    const pickUp = () => {
      const room = takeDealRoom()
      if (room) { setDraft(null); setOpenId(room) }
      const d = takeDealDraft()
      if (d) { setOpenId(null); setDraft(d) }
    }
    pickUp()
    void load()
    // Already on Deals when another "Open deal room" fires: pick it up, unless this page is gone by then.
    let alive = true
    const again = () => { window.setTimeout(() => { if (alive) pickUp() }, 60) }
    window.addEventListener('aetheris:open-deals', again)
    return () => { alive = false; window.removeEventListener('aetheris:open-deals', again) }
  }, [load])

  const showcase = api.mode === 'showcase'
  const switchSide = (user: string) => { (api as ShowcaseDeals).as(user); setActing(user); setFlash(''); void load() }

  const banner = showcase && <div className="deals-showcase" role="note">
    <Lock size={13} /><span><b>Showcase.</b> An example room you can click through. Nothing here is saved or sent to anyone.</span>
    <span className="deals-acting">Acting as
      <button className={(api as ShowcaseDeals).acting() === SHOWCASE_YOU ? 'on' : ''} onClick={() => switchSide(SHOWCASE_YOU)}>Jordan (buyer)</button>
      <button className={(api as ShowcaseDeals).acting() === SHOWCASE_THEM ? 'on' : ''} onClick={() => switchSide(SHOWCASE_THEM)}>Marcus (provider)</button>
    </span>
  </div>

  if (draft && me) {
    return <section className="deals">{banner}
      <CreateDealForm api={api} draft={draft} onCancel={() => setDraft(null)}
        onCreated={(id, note) => { setDraft(null); setOpenId(id); setFlash(note); void load() }} /></section>
  }
  if (openId && me) {
    return <section className="deals">{banner}
      <DealRoomView key={`${openId}-${me}`} api={api} id={openId} me={me} initialFlash={flash}
        onBack={() => { setOpenId(null); setFlash(''); void load() }} /></section>
  }

  const invites = members.filter(m => m.user_id === me && !m.accepted_at)
  const inviteRooms = new Set(invites.map(m => m.room_id))
  const mine = rooms.filter(r => !inviteRooms.has(r.id))
  const others = (roomId: string) => members.filter(m => m.room_id === roomId && m.user_id !== me).map(m => names[m.user_id] ?? 'A member')

  const respond = async (room: string, accept: boolean) => {
    const r = await api.respond(room, accept)
    if (r.error) { setError(r.error); return }
    setFlash(accept ? 'You joined the room.' : 'Invitation declined. They can see you declined.')
    if (accept) setOpenId(room)
    void load()
  }

  return <section className="deals">
    {banner}
    <header className="deals-head">
      <div>
        <Eyebrow><Handshake size={12} /> DEALS</Eyebrow>
        <h1>Where the business after an introduction happens.</h1>
        <p className="deals-sub">A private room per engagement: the original need, terms, proposals, milestones and a record of what happened. Only the people in a room can see it.</p>
      </div>
      {me && <Btn onClick={() => setDraft({ sourceKind: 'manual', sourceId: null, title: '', need: '', counterpartId: null })}><Plus size={14} /> New deal room</Btn>}
    </header>
    {flash && <p className="deals-flash" role="status">{flash}</p>}
    {error && <p className="deals-error" role="alert">{error}</p>}
    {!loaded ? <p className="deals-muted">Loading your deal rooms…</p>
      : !me ? <p className="deals-muted">Sign in to see your deal rooms.</p>
        : <>
          {invites.length > 0 && <section className="deals-block deals-invites" aria-label="Invitations">
            <Eyebrow signal>INVITATIONS TO ANSWER</Eyebrow>
            {invites.map(inv => {
              const r = rooms.find(x => x.id === inv.room_id)
              if (!r) return null
              return <article key={inv.room_id} className="deals-card">
                <div>
                  <h3>{r.title}</h3>
                  <p className="deals-muted">{names[inv.invited_by ?? ''] ?? 'A member'} invited you as {roleLabel[inv.role].toLowerCase()} · {sourceLabel[r.source_kind]}</p>
                  {r.need && <p className="deals-need-snippet">{r.need}</p>}
                </div>
                <div className="deals-row">
                  <Btn onClick={() => void respond(r.id, true)}><Check size={14} /> Accept</Btn>
                  <Btn kind="quiet" onClick={() => void respond(r.id, false)}><X size={14} /> Decline</Btn>
                </div>
              </article>
            })}
          </section>}
          {mine.length ? groupByStage(mine).map(g => <section key={g.stage} className="deals-block" aria-label={stageLabel[g.stage]}>
            <Eyebrow>{stageLabel[g.stage].toUpperCase()} · {g.rooms.length}</Eyebrow>
            <div className="deals-grid">{g.rooms.map(r => <button key={r.id} className="deals-card deals-card-btn" onClick={() => { setFlash(''); setOpenId(r.id) }}>
              <span className={`deals-stage s-${r.stage}`}>{stageLabel[r.stage]}{r.outcome ? ` · ${outcomeLabel[r.outcome]}` : ''}</span>
              <h3>{r.title}</h3>
              <span className="deals-muted">{others(r.id).join(', ') || 'Just you so far'} · {sourceLabel[r.source_kind]}</span>
              <span className="deals-muted">{formatBudget(r.budget_low, r.budget_high, r.currency)} · updated {day(r.updated_at)}</span>
            </button>)}</div>
          </section>)
            : !invites.length && <p className="deals-empty">No deal rooms yet. Open one from an accepted introduction, a reply to your ask, a conversation or a CRM opportunity — or start one here.</p>}
        </>}
  </section>
}

/* ── Create ───────────────────────────────────────────────────────────────────────────── */

function CreateDealForm({ api, draft, onCreated, onCancel }: { api: DealsApi; draft: DealDraft; onCreated: (id: string, note: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(draft.title)
  const [need, setNeed] = useState(draft.need)
  const [side, setSide] = useState<DealSide>(draft.side ?? 'buyer')
  const [invite, setInvite] = useState(!!draft.counterpartId)
  const [pick, setPick] = useState('')
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fixed = draft.sourceKind === 'intro' || draft.sourceKind === 'ask' || draft.sourceKind === 'thread'
  useEffect(() => {
    if (fixed) return
    let stale = false
    void Promise.all([api.people(), api.me()]).then(([list, me]) => { if (!stale) setPeople(list.filter(p => p.id !== me)) })
    return () => { stale = true }
  }, [api, fixed])

  const counterpart = fixed ? (invite ? draft.counterpartId : null) : (pick || null)
  const counterpartName = fixed ? draft.counterpartName : people.find(p => p.id === pick)?.name

  const create = async () => {
    if (title.trim().length < 2) { setError('Give the room a title.'); return }
    setBusy(true); setError('')
    const r = await api.create({ ...draft, title, need, side, counterpartId: counterpart, invite: !!counterpart })
    setBusy(false)
    if (r.error || !r.data) { setError(r.error || 'The room could not be created.'); return }
    onCreated(r.data, counterpart ? `Room created. Invite sent to ${counterpartName ?? 'them'} — they need to accept before they can see it.` : 'Room created. Only you can see it until you invite someone.')
  }

  return <article className="deals-panel" aria-label="New deal room">
    <button className="deals-back" onClick={onCancel}><ArrowLeft size={14} /> Back to deals</button>
    <Eyebrow>NEW DEAL ROOM · {sourceLabel[draft.sourceKind].toUpperCase()}</Eyebrow>
    <h2>Open a private deal room</h2>
    <p className="deals-muted">Check the details. Nothing is created until you press Create.</p>
    <div className="deals-form">
      <label>Title<input value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="What is the engagement?" /></label>
      <label>The need and context<textarea rows={4} maxLength={4000} value={need} onChange={e => setNeed(e.target.value)}
        placeholder={fixed ? 'Leave empty to keep the context from the original source' : 'What was asked for, and why this person'} /></label>
      <fieldset className="deals-side"><legend>Your side</legend>
        <label><input type="radio" name="deal-side" checked={side === 'buyer'} onChange={() => setSide('buyer')} /> I am buying</label>
        <label><input type="radio" name="deal-side" checked={side === 'provider'} onChange={() => setSide('provider')} /> I am providing</label>
      </fieldset>
      {fixed
        ? draft.counterpartId
          ? <label className="deals-check"><input type="checkbox" checked={invite} onChange={e => setInvite(e.target.checked)} /> Invite {draft.counterpartName ?? 'the other person'} as {side === 'buyer' ? 'provider' : 'buyer'} (they must accept)</label>
          : <p className="deals-muted">The other person is not a member we can invite yet. You can invite people once the room exists.</p>
        : <label>Invite someone (optional)<select value={pick} onChange={e => setPick(e.target.value)}>
          <option value="">Nobody yet</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>}
      <p className="deals-muted"><Lock size={12} /> Private: only people who accept an invitation can see this room.</p>
      {error && <p className="deals-error" role="alert">{error}</p>}
      <div className="deals-row">
        <Btn disabled={busy} onClick={() => void create()}><Check size={14} /> {busy ? 'Creating…' : 'Create deal room'}</Btn>
        <Btn kind="quiet" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  </article>
}

/* ── Room ─────────────────────────────────────────────────────────────────────────────── */

function DealRoomView({ api, id, me, onBack, initialFlash }: { api: DealsApi; id: string; me: string; onBack: () => void; initialFlash: string }) {
  const [bundle, setBundle] = useState<RoomBundle | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [names, setNames] = useState<Record<string, string>>({})
  const [flash, setFlash] = useState(initialFlash)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showReferralPrompt, setShowReferralPrompt] = useState(false)

  const load = useCallback(async () => {
    const r = await api.loadRoom(id)
    if (r.error) setError(r.error)
    setBundle(r.data ?? null)
    const b = r.data
    if (b) setNames(await api.names([...b.members.map(m => m.user_id), ...b.events.map(e => e.actor ?? ''), ...b.proposals.map(p => p.author ?? ''), b.room.created_by ?? '',
      ...b.events.map(e => (typeof e.detail['user_id'] === 'string' ? e.detail['user_id'] : ''))]))
    setLoaded(true)
    return b ?? null
  }, [api, id])
  useEffect(() => { void load() }, [load])

  /** Runs one change and reports only what actually happened. */
  const act = async (fn: () => Promise<{ error: string }>, done: string | ((fresh: RoomBundle | null) => string)) => {
    setBusy(true); setError(''); setFlash('')
    const r = await fn()
    setBusy(false)
    if (r.error) { setError(r.error); return false }
    const fresh = await load()
    setFlash(typeof done === 'function' ? done(fresh) : done)
    return true
  }

  if (!loaded) return <p className="deals-muted">Loading the room…</p>
  if (!bundle) return <article className="deals-panel"><button className="deals-back" onClick={onBack}><ArrowLeft size={14} /> Back to deals</button>
    <p className="deals-muted">This room is not available to you. It may be private, or you may have been removed.</p>{error && <p className="deals-error">{error}</p>}</article>

  const { room, members, proposals, milestones, events } = bundle
  const mine = members.find(m => m.user_id === me)
  const nameOf = (uid: string | null) => (uid === me ? 'You' : (uid && names[uid]) || 'A member')

  if (mine && !mine.accepted_at) {
    return <article className="deals-panel">
      <button className="deals-back" onClick={onBack}><ArrowLeft size={14} /> Back to deals</button>
      <Eyebrow signal>INVITATION</Eyebrow>
      <h2>{room.title}</h2>
      <p className="deals-muted">{nameOf(mine.invited_by)} invited you as {roleLabel[mine.role].toLowerCase()}. Accept to see the proposals, milestones and timeline.</p>
      {room.need && <p className="deals-need">{room.need}</p>}
      {error && <p className="deals-error" role="alert">{error}</p>}
      <div className="deals-row">
        <Btn disabled={busy} onClick={() => void act(() => api.respond(room.id, true), 'You joined the room.')}><Check size={14} /> Accept</Btn>
        <Btn kind="quiet" disabled={busy} onClick={() => void act(() => api.respond(room.id, false), 'Invitation declined.').then(ok => { if (ok) onBack() })}><X size={14} /> Decline</Btn>
      </div>
    </article>
  }

  const role = (mine?.accepted_at ? mine.role : null) as DealRole | null
  const mySide = sideOf(role, room.owner_side)
  const sidesPresent = [...new Set(members.filter(m => m.accepted_at).map(m => sideOf(m.role, room.owner_side)).filter((s): s is DealSide => !!s))]
  const ctx = { stage: room.stage, role, ownerSide: room.owner_side, sidesPresent }
  const actions = nextActions(ctx)
  const reached = events.filter(e => e.kind === 'stage_changed').map(e => e.detail['to'] as DealStage)
  const canEdit = !!role && role !== 'guest' && isOpen(room.stage)
  const isOwner = role === 'owner'
  const sideOfUser = (uid: string | null) => sideOf(members.find(m => m.user_id === uid && m.accepted_at)?.role, room.owner_side)

  return <article className="deals-room" aria-label={`Deal room ${room.title}`}>
    <button className="deals-back" onClick={onBack}><ArrowLeft size={14} /> Back to deals</button>
    <header className="deals-room-head">
      <div>
        <Eyebrow>{sourceLabel[room.source_kind].toUpperCase()} · {role ? `YOU ARE ${roleLabel[role].toUpperCase()}${mySide && role === 'owner' ? ` (${mySide.toUpperCase()})` : ''}` : 'VIEWING'}</Eyebrow>
        <h1>{room.title}</h1>
        <p className="deals-muted"><Lock size={12} /> Private to the {members.filter(m => m.accepted_at).length} people in this room.</p>
      </div>
      <span className={`deals-stage s-${room.stage}`} data-testid="deal-stage">{stageLabel[room.stage]}{room.outcome ? ` · ${outcomeLabel[room.outcome]}` : ''}</span>
    </header>

    <ol className="deals-stepper" aria-label="Deal stage">
      {stepperState(room.stage, reached).map(s => <li key={s.stage} className={s.state} aria-current={s.state === 'current' ? 'step' : undefined}>
        {s.state === 'done' ? <Check size={12} /> : <CircleDot size={12} />}<span>{stageLabel[s.stage]}</span></li>)}
    </ol>
    {(room.stage === 'disputed' || room.stage === 'cancelled') && <p className="deals-muted"><Flag size={12} /> {room.stage === 'disputed' ? 'This deal is disputed. Resolve it to resume, or close or cancel it.' : 'This deal was cancelled.'}</p>}

    {flash && <p className="deals-flash" role="status">{flash}</p>}
    {error && <p className="deals-error" role="alert">{error}</p>}

    {actions.length > 0 && <StageActions actions={actions} busy={busy}
      onMove={(to, note, outcome) => void act(() => api.advance(room.id, to, note, outcome),
        fresh => {
          if (to !== 'closed' && to !== 'cancelled') return `Moved to ${stageLabel[to]}.`
          // Say the outcome was recorded only when the database actually recorded it just now.
          const recorded = !!fresh?.events.some(e => e.kind === 'intro_outcome_recorded' && e.actor === me && !events.some(old => old.id === e.id))
          const head = to === 'closed' ? `Deal closed — ${outcome === 'won' ? 'won' : 'lost'}.` : 'Deal cancelled.'
          if (to === 'closed') setShowReferralPrompt(true)
          return recorded ? `${head} Your outcome is recorded on the introduction, privately.` : head
        })} />}
    {room.stage === 'proposal' && !actions.some(a => a.to === 'agreed') && <p className="deals-muted">Terms are agreed when the other side accepts a proposal.</p>}
    {showReferralPrompt && <PostDealReferralPrompt dealTitle={room.title} dealRoomId={room.id} onClose={() => setShowReferralPrompt(false)} />}

    <div className="deals-sections">
      <section className="deals-block" aria-label="Need and context">
        <Eyebrow>THE NEED</Eyebrow>
        {room.need ? <p className="deals-need">{room.need}</p> : <p className="deals-muted">No context was captured when the room opened.</p>}
        <small className="deals-muted">Captured when the room opened, from the {sourceLabel[room.source_kind].toLowerCase()}.</small>
      </section>

      <TermsSection api={api} room={room} canEdit={canEdit} busy={busy} act={act} />

      <section className="deals-block" aria-label="Proposals">
        <Eyebrow>PROPOSALS</Eyebrow>
        {proposals.length ? <ul className="deals-list">{[...proposals].reverse().map(p => {
          const acceptBlock = proposalBlock(p, me, room.stage, mySide, sideOfUser(p.author), true)
          const declineBlock = proposalBlock(p, me, room.stage, mySide, sideOfUser(p.author), false)
          return <li key={p.id} className={`deals-proposal p-${p.status}`}>
            <div><b>v{p.version}{p.amount !== null ? ` · ${formatMoney(p.amount, room.currency)}` : ''}</b> <span className="deals-muted">from {nameOf(p.author)} · {proposalLabel[p.status]}</span></div>
            <p>{p.summary}</p>
            {p.status === 'submitted' && (!acceptBlock || !declineBlock) && <div className="deals-row">
              {!acceptBlock && <Btn disabled={busy} onClick={() => void act(() => api.decide(p.id, true), `Proposal v${p.version} accepted. Terms are agreed.`)}><Check size={14} /> Accept v{p.version}</Btn>}
              {!declineBlock && <Btn kind="quiet" disabled={busy} onClick={() => void act(() => api.decide(p.id, false), `Proposal v${p.version} declined.`)}><X size={14} /> Decline</Btn>}
            </div>}
            {p.status === 'submitted' && p.author === me && <small className="deals-muted">Waiting for the other side to decide.</small>}
          </li>
        })}</ul> : <p className="deals-muted">No proposals yet.</p>}
        {canPropose(room.stage, mySide) && <ProposalForm busy={busy} next={proposals.length + 1}
          onSubmit={(summary, amount) => act(() => api.propose(room.id, summary, amount), `Proposal v${proposals.length + 1} sent. The other side decides.`)} />}
      </section>

      <section className="deals-block" aria-label="Milestones">
        <Eyebrow>MILESTONES</Eyebrow>
        {milestones.length ? <ul className="deals-list">{milestones.map(m => {
          const ref = { status: m.status, submittedBy: m.submitted_by }
          const submitBlock = milestoneSubmitBlock(ref, room.stage, mySide, role, sidesPresent)
          const reviewBlock = milestoneReviewBlock(ref, me, room.stage, mySide, role, sidesPresent)
          return <MilestoneItem key={m.id} title={m.title} due={m.due_date} status={m.status} busy={busy}
            canSubmit={!submitBlock} canReview={!reviewBlock}
            onSubmit={note => act(() => api.submitMilestone(m.id, note), `“${m.title}” submitted for review.`)}
            onReview={(accept, note) => act(() => api.reviewMilestone(m.id, accept, note), accept ? `“${m.title}” accepted.` : `Changes requested on “${m.title}”.`)} />
        })}</ul> : <p className="deals-muted">No milestones yet. Break the work into checkpoints the buyer can accept.</p>}
        {canEdit && <MilestoneForm busy={busy} onAdd={(title, due) => act(() => api.addMilestone(room.id, title, due), `Milestone “${title}” added.`)} />}
      </section>

      <ParticipantsSection api={api} room={room} members={members} me={me} isOwner={isOwner} busy={busy} act={act} nameOf={nameOf} />

      <section className="deals-block deals-timeline" aria-label="Timeline">
        <Eyebrow>TIMELINE</Eyebrow>
        <ol>{[...events].reverse().map(e => <li key={e.id}>
          <span>{when(e.created_at)}</span>
          <p>{e.kind === 'link' && typeof e.detail['url'] === 'string'
            ? <>{describeEvent(e, nameOf(e.actor), uid => nameOf(uid))} <a href={e.detail['url']} target="_blank" rel="noopener noreferrer nofollow">{String(e.detail['label'] || e.detail['url'])}</a></>
            : describeEvent(e, nameOf(e.actor), uid => nameOf(uid))}</p>
        </li>)}</ol>
        {role && <TimelineForm busy={busy}
          onNote={text => act(() => api.addNote(room.id, text), 'Note added to the timeline.')}
          onLink={(url, label) => act(() => api.addLink(room.id, url, label), 'Link added to the timeline.')} />}
        <small className="deals-muted">The timeline is a permanent record: entries cannot be edited or deleted.</small>
      </section>
    </div>
  </article>
}

function StageActions({ actions, busy, onMove }: { actions: ReturnType<typeof nextActions>; busy: boolean; onMove: (to: DealStage, note: string, outcome: 'won' | 'lost' | null) => void }) {
  const [note, setNote] = useState('')
  return <div className="deals-actions" aria-label="Next steps">
    <span className="deals-muted">Next step</span>
    {actions.map(a => <Btn key={`${a.to}-${a.outcome ?? ''}`} kind={a.tone} disabled={busy} onClick={() => { onMove(a.to, note.trim(), a.outcome ?? null); setNote('') }}>{a.label}</Btn>)}
    <input aria-label="Note for this step (optional)" placeholder="Note for this step (optional)" value={note} maxLength={1000} onChange={e => setNote(e.target.value)} />
  </div>
}

type Act = (fn: () => Promise<{ error: string }>, done: string | ((fresh: RoomBundle | null) => string)) => Promise<boolean>

function TermsSection({ api, room, canEdit, busy, act }: { api: DealsApi; room: DealRoomRow; canEdit: boolean; busy: boolean; act: Act }) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({ title: '', scope: '', deliverables: '', budgetLow: '', budgetHigh: '', currency: 'USD', targetDate: '' })
  const [error, setError] = useState('')
  const start = () => {
    setF({ title: room.title, scope: room.scope, deliverables: room.deliverables, budgetLow: room.budget_low?.toString() ?? '', budgetHigh: room.budget_high?.toString() ?? '', currency: room.currency, targetDate: room.target_date ?? '' })
    setError(''); setEditing(true)
  }
  const save = async () => {
    const v = validateDetails(f)
    if (v.error || !v.patch) { setError(v.error ?? ''); return }
    if (await act(() => api.updateDetails(room.id, v.patch!), 'Saved.')) setEditing(false)
  }
  return <section className="deals-block" aria-label="Scope, budget and date">
    <Eyebrow>SCOPE · BUDGET · DATE</Eyebrow>
    {editing ? <div className="deals-form">
      <label>Title<input value={f.title} maxLength={160} onChange={e => setF({ ...f, title: e.target.value })} /></label>
      <label>Scope<textarea rows={3} maxLength={4000} value={f.scope} onChange={e => setF({ ...f, scope: e.target.value })} /></label>
      <label>Deliverables<textarea rows={3} maxLength={4000} value={f.deliverables} onChange={e => setF({ ...f, deliverables: e.target.value })} /></label>
      <div className="deals-inline-fields">
        <label>Budget from<input inputMode="decimal" value={f.budgetLow} onChange={e => setF({ ...f, budgetLow: e.target.value })} /></label>
        <label>Budget to<input inputMode="decimal" value={f.budgetHigh} onChange={e => setF({ ...f, budgetHigh: e.target.value })} /></label>
        <label>Currency<input value={f.currency} maxLength={3} onChange={e => setF({ ...f, currency: e.target.value.toUpperCase() })} /></label>
        <label>Target date<input type="date" value={f.targetDate} onChange={e => setF({ ...f, targetDate: e.target.value })} /></label>
      </div>
      {error && <p className="deals-error" role="alert">{error}</p>}
      <div className="deals-row"><Btn disabled={busy} onClick={() => void save()}><Check size={14} /> Save terms</Btn><Btn kind="quiet" onClick={() => setEditing(false)}>Cancel</Btn></div>
    </div> : <>
      <dl className="deals-terms">
        <div><dt>Scope</dt><dd>{room.scope || <span className="deals-muted">Not written yet</span>}</dd></div>
        <div><dt>Deliverables</dt><dd>{room.deliverables || <span className="deals-muted">Not written yet</span>}</dd></div>
        <div><dt>Budget</dt><dd>{formatBudget(room.budget_low, room.budget_high, room.currency)}</dd></div>
        <div><dt>Target date</dt><dd>{room.target_date ? day(room.target_date) : <span className="deals-muted">Not set</span>}</dd></div>
      </dl>
      {canEdit && <Btn kind="secondary" onClick={start}><FileText size={14} /> Edit terms</Btn>}
    </>}
  </section>
}

function ProposalForm({ next, busy, onSubmit }: { next: number; busy: boolean; onSubmit: (summary: string, amount: number | null) => Promise<boolean> }) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  if (!open) return <Btn kind="secondary" onClick={() => setOpen(true)}><Send size={14} /> {next === 1 ? 'Send a proposal' : `Send version ${next}`}</Btn>
  const send = async () => {
    const a = parseAmount(amount)
    if (a === 'invalid') { setError('The amount must be a number.'); return }
    if (summary.trim().length < 3) { setError('Describe what you are proposing.'); return }
    setError('')
    if (await onSubmit(summary.trim(), a)) { setSummary(''); setAmount(''); setOpen(false) }
  }
  return <div className="deals-form">
    <label>Proposal v{next}<textarea rows={3} maxLength={4000} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Scope, timing and terms in plain words" /></label>
    <label>Amount (optional)<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 48000" /></label>
    {error && <p className="deals-error" role="alert">{error}</p>}
    <div className="deals-row"><Btn disabled={busy} onClick={() => void send()}><Send size={14} /> Send proposal</Btn><Btn kind="quiet" onClick={() => setOpen(false)}>Cancel</Btn></div>
  </div>
}

function MilestoneItem({ title, due, status, busy, canSubmit, canReview, onSubmit, onReview }: {
  title: string; due: string | null; status: keyof typeof milestoneLabel; busy: boolean; canSubmit: boolean; canReview: boolean
  onSubmit: (note: string) => Promise<boolean>; onReview: (accept: boolean, note: string) => Promise<boolean>
}) {
  const [note, setNote] = useState('')
  return <li className={`deals-milestone m-${status}`}>
    <div><b>{title}</b> <span className="deals-muted">{milestoneLabel[status]}{due ? ` · due ${day(due)}` : ''}</span></div>
    {(canSubmit || canReview) && <div className="deals-row">
      <input aria-label={`Note on ${title} (optional)`} placeholder="Note (optional)" value={note} maxLength={1000} onChange={e => setNote(e.target.value)} />
      {canSubmit && <Btn disabled={busy} onClick={() => void onSubmit(note.trim()).then(ok => { if (ok) setNote('') })}>Submit for review</Btn>}
      {canReview && <Btn disabled={busy} onClick={() => void onReview(true, note.trim()).then(ok => { if (ok) setNote('') })}><Check size={14} /> Accept</Btn>}
      {canReview && <Btn kind="secondary" disabled={busy} onClick={() => void onReview(false, note.trim()).then(ok => { if (ok) setNote('') })}>Request changes</Btn>}
    </div>}
  </li>
}

function MilestoneForm({ busy, onAdd }: { busy: boolean; onAdd: (title: string, due: string | null) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  return <div className="deals-row deals-add">
    <input aria-label="New milestone" placeholder="New milestone" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
    <input aria-label="Due date" type="date" value={due} onChange={e => setDue(e.target.value)} />
    <Btn kind="secondary" disabled={busy || title.trim().length < 2} onClick={() => void onAdd(title.trim(), due || null).then(ok => { if (ok) { setTitle(''); setDue('') } })}><Plus size={14} /> Add milestone</Btn>
  </div>
}

function ParticipantsSection({ api, room, members, me, isOwner, busy, act, nameOf }: {
  api: DealsApi; room: DealRoomRow; members: DealMemberRow[]; me: string; isOwner: boolean; busy: boolean; act: Act; nameOf: (id: string | null) => string
}) {
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([])
  const [pick, setPick] = useState('')
  const [role, setRole] = useState<DealRole>('guest')
  useEffect(() => {
    if (!isOwner || !isOpen(room.stage)) return
    let stale = false
    void api.people().then(list => { if (!stale) setPeople(list) })
    return () => { stale = true }
  }, [api, isOwner, room.stage])
  const invitable = people.filter(p => !members.some(m => m.user_id === p.id))
  const side = (m: DealMemberRow) => sideOf(m.role, room.owner_side)
  return <section className="deals-block" aria-label="Participants">
    <Eyebrow><Users size={11} /> PARTICIPANTS</Eyebrow>
    <ul className="deals-list">{members.map(m => <li key={m.user_id} className="deals-person">
      <b>{nameOf(m.user_id)}</b>
      <span className="deals-muted">{roleLabel[m.role]}{m.role === 'owner' && side(m) ? ` · ${side(m)}` : ''}{m.accepted_at ? '' : ' · invited, not yet accepted'}</span>
      {isOwner && m.user_id !== me && isOpen(room.stage) && <Btn kind="quiet" disabled={busy}
        onClick={() => void act(() => api.remove(room.id, m.user_id), `${nameOf(m.user_id)} removed from the room.`)}><X size={13} /> Remove</Btn>}
    </li>)}</ul>
    {isOwner && isOpen(room.stage) && <div className="deals-row deals-add">
      <select aria-label="Member to invite" value={pick} onChange={e => setPick(e.target.value)}>
        <option value="">Invite a member…</option>
        {invitable.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select aria-label="Their role" value={role} onChange={e => setRole(e.target.value as DealRole)}>
        {(['buyer', 'provider', 'introducer', 'guest'] as const).map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
      </select>
      <Btn kind="secondary" disabled={busy || !pick} onClick={() => {
        const who = people.find(p => p.id === pick)?.name ?? 'them'
        void act(() => api.invite(room.id, pick, role), `Invite sent to ${who} — they need to accept before they can see the room.`).then(ok => { if (ok) setPick('') })
      }}><UserPlus size={14} /> Invite</Btn>
    </div>}
    {!isOwner && <small className="deals-muted">Only the owner invites or removes people.</small>}
  </section>
}

function TimelineForm({ busy, onNote, onLink }: { busy: boolean; onNote: (text: string) => Promise<boolean>; onLink: (url: string, label: string) => Promise<boolean> }) {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  return <div className="deals-form">
    <div className="deals-row deals-add">
      <input aria-label="Add a note" placeholder="Add a note to the record" value={text} maxLength={2000} onChange={e => setText(e.target.value)} />
      <Btn kind="secondary" disabled={busy || !text.trim()} onClick={() => void onNote(text.trim()).then(ok => { if (ok) setText('') })}><Plus size={14} /> Add note</Btn>
    </div>
    <div className="deals-row deals-add">
      <input aria-label="Link" placeholder="https:// link to a document" value={url} maxLength={500} onChange={e => setUrl(e.target.value)} />
      <input aria-label="Link label" placeholder="Label (optional)" value={label} maxLength={200} onChange={e => setLabel(e.target.value)} />
      <Btn kind="secondary" disabled={busy || !url.trim()} onClick={() => {
        const clean = cleanLink(url)
        if (!clean) { setError('Use a web link starting with https://'); return }
        setError('')
        void onLink(clean, label.trim()).then(ok => { if (ok) { setUrl(''); setLabel('') } })
      }}><Link2 size={14} /> Add link</Btn>
    </div>
    {error && <p className="deals-error" role="alert">{error}</p>}
  </div>
}

/* ── Replies to my ask → deal room ───────────────────────────────────────────────────── */

/** Under one of my asks: who replied, with "Open deal room" for each real member's reply. */
export function AskReplies({ askId, askText }: { askId: string; askText: string }) {
  const [rows, setRows] = useState<Array<{ id: string; user_id: string; text: string; name: string }>>([])
  useEffect(() => {
    if (isShowcase()) return
    let stale = false
    void (async () => {
      const r = await db.from('ask_responses').select('id, user_id, text, created_at').eq('ask_id', askId).order('created_at', { ascending: true })
      const list = (r.data ?? []) as Array<{ id: string; user_id: string; text: string }>
      const names = await liveDeals.names(list.map(x => x.user_id))
      if (!stale) setRows(list.map(x => ({ ...x, name: names[x.user_id] ?? 'A member' })))
    })()
    return () => { stale = true }
  }, [askId])
  if (!rows.length) return null
  return <div className="deals-replies" aria-label="Replies to this ask">
    <Eyebrow>REPLIES · {rows.length}</Eyebrow>
    {rows.map(x => <div key={x.id} className="deals-reply">
      <p><b>{x.name}</b> {x.text}</p>
      <OpenDealRoomButton kind="quiet" draft={{
        sourceKind: 'ask', sourceId: x.id, title: `${askText.slice(0, 100)} — with ${x.name}`.slice(0, 160),
        need: `Ask: ${askText}\n\nReply: ${x.text}`, counterpartId: x.user_id, counterpartName: x.name, side: 'buyer',
      }} />
    </div>)}
  </div>
}
