/**
 * Opportunity Graph surfaces. Contextual panels only — they live inside the
 * existing Home, Network, Work, Me, Executive Page and Needs surfaces.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, CircleDot, Compass, DoorOpen, Link2, LockKeyhole, Pause, Play, Plus, Route as RouteIcon, ShieldCheck, Trash2, X } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { useOps } from './crm/store'
import { useGraph, useGraphInputs } from './graph-store'
import { useNav } from './nav'
import { IntroOutcomeTimeline } from './outcomes-ui'
import {
  INTENT_CATEGORIES, MISSION_TYPES, RULE_KINDS, activeMission, evaluateRules, graphInsights, meetingBrief, missionTypeLabel,
  parseDebrief, relationshipWeather, reverseDiscovery, routeTo, trustDimensions,
  type IntentCategory, type IntentPrivacy, type Mission, type MissionType,
} from './opportunity-graph'
import type { Member } from './social'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v)

/* ───────────────────────── Mission Mode ───────────────────────── */

const blankMission = { title: '', objective: '', missionType: 'custom' as MissionType, targetCompany: '', targetIndustry: '', targetGeography: '', targetDate: '', horizon: '', privacy: 'private' as Mission['privacy'], successDefinition: '', linkedOpportunityId: '' }

export function MissionDrawer({ onClose }: { onClose: () => void }) {
  const graph = useGraph()
  const ops = useOps()
  const [draft, setDraft] = useState<typeof blankMission & { id?: string }>(blankMission)
  const set = (k: keyof typeof blankMission, v: string) => setDraft(d => ({ ...d, [k]: v }))
  const save = async () => {
    await graph.saveMission({
      ...(draft.id ? { id: draft.id } : {}), title: draft.title.trim(), objective: draft.objective, missionType: draft.missionType,
      targetCompany: draft.targetCompany, targetIndustry: draft.targetIndustry, targetGeography: draft.targetGeography,
      targetDate: draft.targetDate || null, horizon: draft.horizon, privacy: draft.privacy, successDefinition: draft.successDefinition,
      linkedOpportunityId: draft.linkedOpportunityId || null,
    })
    setDraft(blankMission)
  }
  const edit = (m: Mission) => setDraft({ id: m.id, title: m.title, objective: m.objective, missionType: m.missionType, targetCompany: m.targetCompany, targetIndustry: m.targetIndustry, targetGeography: m.targetGeography, targetDate: m.targetDate ?? '', horizon: m.horizon, privacy: m.privacy, successDefinition: m.successDefinition, linkedOpportunityId: m.linkedOpportunityId ?? '' })
  return <div className="modal-wrap" onMouseDown={onClose}>
    <section className="modal og-drawer" onMouseDown={e => e.stopPropagation()} aria-label="Mission Mode">
      <header><div><Eyebrow signal>MISSION MODE</Eyebrow><h2>One objective. The whole network ranked around it.</h2>
        <p>Missions are private to you. The active mission reranks Network, Reverse Discovery and the Opportunity Graph.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
      {graph.error && <p className="executive-form-note">{graph.error}</p>}
      <div className="og-mission-list">
        {graph.missions.map(m => <article key={m.id} className={`og-mission status-${m.status}`}>
          <div><small>{missionTypeLabel[m.missionType]} · {m.status.toUpperCase()} · {m.privacy}</small><b>{m.title}</b><p>{m.objective}</p></div>
          <div className="og-row-actions">
            <button onClick={() => edit(m)}>Edit</button>
            {m.status !== 'active' && <button onClick={() => void graph.setMissionStatus(m.id, 'active')}><Play size={12} /> Activate</button>}
            {m.status === 'active' && <button onClick={() => void graph.setMissionStatus(m.id, 'paused')}><Pause size={12} /> Pause</button>}
            {m.status !== 'completed' && <button onClick={() => void graph.setMissionStatus(m.id, 'completed')}><Check size={12} /> Complete</button>}
            <button onClick={() => void graph.removeMission(m.id)} aria-label="Delete mission"><Trash2 size={12} /></button>
          </div>
        </article>)}
        {!graph.missions.length && <p className="executive-empty">No missions yet. Name the one outcome that matters most this quarter.</p>}
      </div>
      <div className="og-form">
        <label>Mission title<input value={draft.title} onChange={e => set('title', e.target.value)} placeholder="Land three PE-backed manufacturing customers" /></label>
        <label>Objective<textarea rows={2} value={draft.objective} onChange={e => set('objective', e.target.value)} placeholder="Plain language: what outcome, for whom, why." /></label>
        <label>Type<select value={draft.missionType} onChange={e => set('missionType', e.target.value)}>{MISSION_TYPES.map(t => <option key={t} value={t}>{missionTypeLabel[t]}</option>)}</select></label>
        <label>Privacy<select value={draft.privacy} onChange={e => set('privacy', e.target.value)}><option value="private">Private</option><option value="trusted">Trusted (kept private until trusted sharing exists)</option><option value="network">Network</option></select></label>
        <label>Target company<input value={draft.targetCompany} onChange={e => set('targetCompany', e.target.value)} /></label>
        <label>Target industry<input value={draft.targetIndustry} onChange={e => set('targetIndustry', e.target.value)} /></label>
        <label>Target geography<input value={draft.targetGeography} onChange={e => set('targetGeography', e.target.value)} /></label>
        <label>Target date<input type="date" value={draft.targetDate} onChange={e => set('targetDate', e.target.value)} /></label>
        <label>Success looks like<input value={draft.successDefinition} onChange={e => set('successDefinition', e.target.value)} /></label>
        <label>Linked opportunity<select value={draft.linkedOpportunityId} onChange={e => set('linkedOpportunityId', e.target.value)}><option value="">None</option>{ops.opportunities.filter(o => !o.archived).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      </div>
      <footer>{draft.id && <Btn kind="quiet" onClick={() => setDraft(blankMission)}>Cancel edit</Btn>}<Btn disabled={!draft.title.trim()} onClick={() => void save()}>{draft.id ? 'Save mission' : <><Plus size={14} /> Create mission</>}</Btn></footer>
    </section>
  </div>
}

export function ActiveMissionTile() {
  const graph = useGraph()
  const g = useGraphInputs()
  const nav = useNav()
  const ops = useOps()
  const [open, setOpen] = useState(false)
  const mission = activeMission(graph.missions)
  const insight = useMemo(() => graphInsights(g, null).find(i => i.id === 'mission'), [g])
  const linked = mission?.linkedOpportunityId ? ops.opportunities.find(o => o.id === mission.linkedOpportunityId) : undefined
  return <div className="og-tile">
    <Eyebrow signal>ACTIVE MISSION</Eyebrow>
    {mission ? <>
      <h3>{mission.title}</h3>
      <small>{missionTypeLabel[mission.missionType]}{mission.targetDate ? ` · by ${new Date(mission.targetDate).toLocaleDateString()}` : ''}</small>
      {linked && <p>Linked opportunity: <b>{linked.name}</b> · {linked.stageName}</p>}
      <p className="og-next"><b>Best next move.</b> {insight ? `${insight.title} — ${insight.evidence[0] ?? ''}` : 'No member matches the mission language yet. Add target industry or geography.'}</p>
      <div className="og-row-actions">
        {insight?.action.memberId && <button onClick={() => { const m = g.members.find(x => x.id === insight.action.memberId); if (m) nav.openMember(m) }}>Open person <ArrowRight size={12} /></button>}
        <button onClick={() => setOpen(true)}>Manage missions</button>
      </div>
    </> : <>
      <h3>No active mission.</h3><p>Name one strategic objective and Ask Intros reranks the network around it.</p>
      <Btn onClick={() => setOpen(true)}><Plus size={14} /> Start a mission</Btn>
    </>}
    {open && <MissionDrawer onClose={() => setOpen(false)} />}
  </div>
}

/* ───────────────────────── Opportunity Graph ───────────────────────── */

const LAST_VISIT = 'aetheris.graph.lastVisit'
export function OpportunityGraphTile() {
  const g = useGraphInputs()
  const nav = useNav()
  const [since] = useState(() => (typeof window === 'undefined' ? null : localStorage.getItem(LAST_VISIT)))
  useEffect(() => { localStorage.setItem(LAST_VISIT, new Date().toISOString()) }, [])
  const insights = useMemo(() => graphInsights(g, since), [g, since])
  return <div className="og-tile og-graph">
    <Eyebrow signal>OPPORTUNITY GRAPH</Eyebrow>
    <h3>{insights.length ? 'What your graph shows right now.' : 'The graph fills in as you act.'}</h3>
    <ol className="og-insights">{insights.slice(0, 5).map(i => <li key={i.id}>
      <small>{i.question}</small><b>{i.title}</b>
      <details><summary>Evidence</summary><ul>{i.evidence.map(e => <li key={e}>{e}</li>)}</ul></details>
      <button onClick={() => { if (i.action.memberId) { const m = g.members.find(x => x.id === i.action.memberId); if (m) nav.openMember(m) } else if (i.action.page) nav.setPage(i.action.page as never) }}>{i.action.label} <ArrowRight size={12} /></button>
    </li>)}</ol>
    {!insights.length && <p>Add a mission, record a meeting, or post a Signal. Every insight here is derived from recorded data only.</p>}
  </div>
}

/* ───────────────────────── Reverse Discovery ───────────────────────── */

export function ReverseDiscoveryPanel({ memberId, limit = 5 }: { memberId?: string; limit?: number }) {
  const g = useGraphInputs()
  const nav = useNav()
  const net = useNetwork()
  const matches = useMemo(() => reverseDiscovery(memberId ? { ...g, members: g.members.filter(m => m.id === memberId) } : g, limit), [g, memberId, limit])
  return <section className="executive-section og-reverse">
    <Eyebrow signal>WHO NEEDS SOMETHING I CAN PROVIDE?</Eyebrow>
    {!g.me.offers.length && <p className="executive-empty">Add “Can help with” to your Executive Page so matching has something real to compare.</p>}
    {g.me.offers.length > 0 && !matches.length && <p className="executive-empty">{memberId ? 'Nothing they currently need overlaps with what you offer.' : 'No current member need overlaps with what you offer.'}</p>}
    <div className="og-reverse-list">{matches.map(m => <article key={m.member.id}>
      <header><b>{m.member.name}</b><small>{m.member.title}{m.member.company ? ` · ${m.member.company}` : ''}</small></header>
      <dl>
        <div><dt>WHAT THEY NEED</dt><dd>{m.need}</dd></div>
        <div><dt>WHY YOU FIT</dt><dd>{m.whyYouFit.map(r => `${r.label}: ${r.evidence}`).join(' · ')}</dd></div>
        <div><dt>WHY NOW</dt><dd>{m.whyNow}</dd></div>
        <div><dt>BEST PATH</dt><dd>{m.path}</dd></div>
      </dl>
      {m.askId ? <Btn kind="secondary" onClick={() => { const id = net.respondToAsk(m.askId as string, `I can help with this: ${m.need}`); if (id) nav.goToThread(id) }}>Respond to Signal</Btn>
        : <Btn kind="secondary" onClick={() => nav.openMember(m.member)}>Open Executive Page</Btn>}
    </article>)}</div>
  </section>
}

/* ───────────────────────── Routing ───────────────────────── */

export function RoutingPanel({ target }: { target: Member }) {
  const g = useGraphInputs()
  const route = useMemo(() => routeTo(target, g), [target, g])
  return <section className="executive-section og-route">
    <Eyebrow><RouteIcon size={12} /> OPPORTUNITY ROUTING</Eyebrow>
    {route.best ? <>
      <div className="og-path">{route.best.labels.map((l, i) => <span key={`${l}-${i}`}>{l}</span>)}</div>
      <dl>
        <div><dt>WHY THIS PATH</dt><dd>{route.best.reasons.map(r => `${r.label}: ${r.evidence}`).join(' · ')}{!route.best.recorded && ' · From the member’s recorded best-path notes, not verified connections.'}</dd></div>
        <div><dt>WHO SHOULD ASK FIRST</dt><dd>{route.whoAsksFirst}</dd></div>
        <div><dt>SAFE TO SHARE</dt><dd>{route.safeContext.join(' · ') || 'Only your public Executive Page fields.'}</dd></div>
        <div><dt>NEVER SHARED</dt><dd>{route.excluded.join(' · ')}</dd></div>
      </dl>
      {route.alternatives.length > 0 && <details><summary>Alternative paths ({route.alternatives.length})</summary><ul>{route.alternatives.map(p => <li key={p.labels.join()}>{p.labels.join(' → ')} <small>{p.reasons.slice(0, 2).map(r => r.evidence).join(' · ')}</small></li>)}</ul></details>}
      <p className="og-note">A suggested path until each person consents. No one is committed to introduce you.</p>
    </> : <p className="executive-empty">{route.whoAsksFirst}</p>}
  </section>
}

/* ───────────────────────── Weather + Trust ───────────────────────── */

export function WeatherPanel({ member }: { member: Member }) {
  const g = useGraphInputs()
  const w = useMemo(() => relationshipWeather(member, g), [member, g])
  return <div className={`og-weather w-${w.state.toLowerCase().replace(/\s+/g, '-')}`}>
    <Eyebrow>RELATIONSHIP WEATHER</Eyebrow><b>{w.state}</b>
    <ul>{w.evidence.map(e => <li key={e}>{e}</li>)}</ul>
  </div>
}

export function TrustPanel({ member, verified, approvedRecommendations }: { member: Member; verified: boolean; approvedRecommendations: number }) {
  const g = useGraphInputs()
  const dims = useMemo(() => trustDimensions(member, g, { verified, approvedRecommendations }), [member, g, verified, approvedRecommendations])
  return <div className="og-trust">
    <Eyebrow><ShieldCheck size={12} /> TRUST CAPITAL</Eyebrow>
    <p className="og-note">No single score. Dimensions marked private use only your own records and are never shown to others.</p>
    <ul>{dims.map(d => <li key={d.key} className={d.status}><b>{d.label}</b><span>{d.evidence}</span>{d.privateSource && <em><LockKeyhole size={10} /> private</em>}</li>)}</ul>
  </div>
}

/* ───────────────────────── Meeting Brief + Debrief ───────────────────────── */

export function MeetingBriefPanel({ member }: { member: Member }) {
  const g = useGraphInputs()
  const ops = useOps()
  const net = useNetwork()
  const graph = useGraph()
  const brief = useMemo(() => meetingBrief(member, g), [member, g])
  const [text, setText] = useState('')
  const [done, setDone] = useState('')
  const parsed = useMemo(() => parseDebrief(text, g.members.filter(m => m.id !== member.id)), [text, g.members, member.id])
  const apply = async () => {
    const person = ops.personForMember(member.id) ?? await ops.addMemberToCrm({ id: member.id, name: member.name, title: member.title, company: member.company, location: member.location })
    if (!person) { setDone('Sign in to save the debrief to your private records.'); return }
    await ops.logActivity({ kind: 'meeting', subject: `Debrief: ${member.name}`, detail: parsed.summary || text.slice(0, 280), personId: person.id })
    for (const p of parsed.promises) await ops.createTask({ title: p.slice(0, 140), personId: person.id, companyId: person.companyId, priority: 'medium', status: 'open' })
    if (parsed.nextMeeting) await ops.createTask({ title: `Schedule next meeting with ${member.name} (${parsed.nextMeeting})`, personId: person.id, status: 'open', priority: 'medium' })
    const opp = ops.opportunities.find(o => o.personId === person.id && !o.archived && o.status === 'open')
    if (parsed.opportunityChange && opp) await ops.updateOpportunity(opp.id, { detail: `${opp.detail ? `${opp.detail}\n` : ''}${new Date().toLocaleDateString()}: ${parsed.opportunityChange}` })
    parsed.introduce.forEach(m => net.addNote(member.id, `Consider introducing ${member.name} to ${m.name} (from meeting debrief).`, 'private'))
    await graph.logEvent('person', person.id, 'meeting_debrief', `Debrief recorded for ${member.name}`, { promises: parsed.promises.length, introduce: parsed.introduce.map(m => m.id) })
    setDone(`Saved: 1 activity, ${parsed.promises.length + (parsed.nextMeeting ? 1 : 0)} tasks${parsed.opportunityChange && opp ? ', opportunity updated' : ''}${parsed.introduce.length ? `, ${parsed.introduce.length} intro ideas` : ''}. No new people were created.`)
    setText('')
  }
  return <details className="executive-section og-brief"><summary><Compass size={14} /> Meeting brief & 30-second debrief</summary>
    <dl>
      <div><dt>WHO</dt><dd>{brief.who}</dd></div><div><dt>WHY THIS MEETING</dt><dd>{brief.why}</dd></div>
      <div><dt>LAST INTERACTION</dt><dd>{brief.last}</dd></div>
      <div><dt>PROMISES / OPEN LOOPS</dt><dd>{brief.promises.length ? brief.promises.join(' · ') : 'None recorded.'}</dd></div>
      <div><dt>RELEVANT</dt><dd>{brief.relevant.join(' · ') || 'No Signal, mission or opportunity linked.'}</dd></div>
      <div><dt>WARM PATH</dt><dd>{brief.path}</dd></div>
      <div><dt>SAFE OPENER</dt><dd>{brief.opener}</dd></div>
      <div><dt>QUESTIONS</dt><dd><ol>{brief.questions.map(q => <li key={q}>{q}</li>)}</ol></dd></div>
    </dl>
    <label>After the meeting — what happened, what was promised, next meeting, opportunity change, people to introduce.
      <textarea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="Good call. I will send the pilot outline by Friday. Next meeting next week. Pilot budget approved. I should introduce Mina." /></label>
    {text.trim() && <p className="og-note">Detected: {parsed.promises.length} promises · next meeting: {parsed.nextMeeting ?? 'none'} · opportunity: {parsed.opportunityChange ? 'yes' : 'no'} · introductions: {parsed.introduce.map(m => m.name).join(', ') || 'none'}</p>}
    <Btn kind="secondary" disabled={!text.trim()} onClick={() => void apply()}>Save debrief</Btn>
    {done && <p className="executive-form-note">{done}</p>}
  </details>
}

/* ───────────────────────── Context Capsule + Room + Feedback ───────────────────────── */

type Capsule = { id: string; intro_request_id: string; why_exists: string; why_requester: string; why_target: string; why_now: string; first_goal: string; shared_context: string; excluded_context: string; mission_title: string; signal_text: string; requester_approved: boolean; target_approved: boolean }
type IntroRow = { id: string; user_id: string; target_user_id: string | null; requester_opt_in: boolean; member_opt_in: boolean; status: string }
type Room = { id: string; intro_request_id: string; participant_a: string; participant_b: string; status: string; outcome: string; next_steps: string[]; commitments: string[]; meeting_at: string | null }

export function IntroWorkflow({ member }: { member: Member }) {
  const g = useGraphInputs()
  const graph = useGraph()
  const net = useNetwork()
  const ops = useOps()
  const nav = useNav()
  const [intro, setIntro] = useState<IntroRow | null>(null)
  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [roomOpen, setRoomOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const mission = activeMission(graph.missions)
  const ask = g.asks.find(a => a.memberId === member.id)
  const route = useMemo(() => routeTo(member, g), [member, g])
  const [draft, setDraft] = useState({
    why_exists: route.best ? `Suggested path: ${route.best.labels.join(' → ')}` : '',
    why_requester: g.me.whatIDo || '', why_target: member.needs[0] ? `Relevant to their stated need: ${member.needs[0]}` : '',
    why_now: ask ? `Their active Signal: ${ask.ask}` : member.whyNow || '', first_goal: '', shared_context: route.safeContext.join('\n'),
    excluded_context: route.excluded.join(', '), mission_title: mission && mission.privacy !== 'private' ? mission.title : '', signal_text: ask?.ask ?? '',
  })

  const load = async () => {
    if (!graph.signedIn || !isUuid(member.id)) return
    const r = await db.from('intro_requests').select('id,user_id,target_user_id,requester_opt_in,member_opt_in,status').or(`and(user_id.eq.${graph.userId},member_id.eq.${member.id}),and(target_user_id.eq.${graph.userId},user_id.eq.${member.id})`).limit(1).maybeSingle()
    setIntro(r.data ?? null)
    if (r.data) {
      const c = await db.from('intro_context_capsules').select('*').eq('intro_request_id', r.data.id).maybeSingle()
      setCapsule(c.data ?? null)
      const rm = await db.from('relationship_rooms').select('*').eq('intro_request_id', r.data.id).maybeSingle()
      setRoom(rm.data ?? null)
    }
  }
  useEffect(() => { void load() }, [member.id, graph.userId])

  const decision = evaluateRules(graph.rules, { kind: 'make_intro', scope: 'network', topic: `${draft.why_exists} ${draft.shared_context} ${draft.mission_title}` })
  const blockedByRule = evaluateRules(graph.rules, { kind: 'share', scope: 'network', topic: `${draft.shared_context} ${draft.mission_title}` })

  const submit = async () => {
    if (!blockedByRule.allowed) { setMsg(blockedByRule.reason); return }
    if (!graph.signedIn || !isUuid(member.id)) { net.requestIntro(member.id); setMsg('Introduction requested in preview. Sign in with a verified account to persist the shared capsule.'); return }
    let row = intro
    if (!row) {
      const ins = await db.from('intro_requests').insert({ user_id: graph.userId, member_id: member.id, target_user_id: member.id, reason: draft.why_exists, mutual_value: draft.why_target }).select('id,user_id,target_user_id,requester_opt_in,member_opt_in,status').single()
      if (ins.error) { setMsg(ins.error.message); return }
      row = ins.data as IntroRow
    }
    const payload = { intro_request_id: row.id, ...draft }
    const res = capsule ? await db.from('intro_context_capsules').update(draft).eq('id', capsule.id) : await db.from('intro_context_capsules').insert(payload)
    if (res.error) { setMsg(res.error.message); return }
    net.requestIntro(member.id)
    const person = ops.personForMember(member.id)
    if (person) await ops.logActivity({ kind: 'intro', subject: `Introduction requested: ${member.name}`, personId: person.id, introRequestId: row.id })
    await graph.logEvent('intro_request', row.id, 'capsule_shared', `Context capsule prepared for ${member.name}`)
    setMsg('Capsule saved. They review exactly this shared context before opting in.')
    await load()
  }
  const approveAsTarget = async () => {
    if (!intro || !capsule) return
    await db.from('intro_context_capsules').update({ target_approved: true }).eq('id', capsule.id)
    await db.from('intro_requests').update({ member_opt_in: true, status: 'accepted' }).eq('id', intro.id)
    await graph.logEvent('intro_request', intro.id, 'accepted', `Introduction accepted with ${member.name}`)
    const person = ops.personForMember(member.id)
    if (person) await ops.logActivity({ kind: 'intro', subject: `Introduction accepted: ${member.name}`, personId: person.id, introRequestId: intro.id })
    await load()
  }
  const openRoom = async () => {
    if (!intro) return
    if (!room) {
      const res = await db.from('relationship_rooms').insert({ intro_request_id: intro.id, participant_a: intro.user_id, participant_b: intro.target_user_id }).select('*').single()
      if (res.error) { setMsg(res.error.message); return }
      setRoom(res.data)
    }
    setRoomOpen(true)
  }
  const bothIn = intro?.requester_opt_in && intro?.member_opt_in
  const iAmTarget = intro && intro.target_user_id === graph.userId
  const F = (k: keyof typeof draft, label: string, rows = 2) => <label>{label}<textarea rows={rows} value={draft[k]} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} /></label>

  return <section className="executive-section og-capsule">
    <Eyebrow><Link2 size={12} /> CONTEXT CAPSULE</Eyebrow>
    <p className="og-note">Only what you write here is shared. Private CRM notes, private Signals, deal amounts, private memory, Digital You, verification evidence and security data are never inserted. {decision.reason}</p>
    {capsule && <div className="og-capsule-status"><span>{capsule.requester_approved ? '✓ Requester approved' : 'Requester pending'}</span><span>{capsule.target_approved ? '✓ Recipient approved' : 'Recipient reviewing'}</span></div>}
    {iAmTarget && capsule ? <div className="og-capsule-read">
      <dl>{(['why_exists', 'why_requester', 'why_target', 'why_now', 'first_goal', 'shared_context'] as const).map(k => capsule[k] ? <div key={k}><dt>{k.replace(/_/g, ' ').toUpperCase()}</dt><dd>{capsule[k]}</dd></div> : null)}</dl>
      {!intro.member_opt_in && <Btn onClick={() => void approveAsTarget()}>Accept introduction with this context</Btn>}
    </div> : <details open={!capsule}><summary>{capsule ? 'Edit shared capsule' : 'Build the capsule before requesting'}</summary><div className="og-form">
      {F('why_exists', 'Why this introduction exists')}{F('why_requester', 'Why you may care')}{F('why_target', `Why ${member.name.split(' ')[0]} may care`)}
      {F('why_now', 'Why now')}{F('first_goal', 'Goal for the first conversation')}{F('shared_context', 'Approved shared context', 3)}{F('excluded_context', 'Explicitly excluded / private')}
      <label>Linked mission (only if not private)<input value={draft.mission_title} onChange={e => setDraft(d => ({ ...d, mission_title: e.target.value }))} /></label>
      <Btn onClick={() => void submit()}><Plus size={14} /> {capsule ? 'Update capsule' : 'Request introduction with capsule'}</Btn>
    </div></details>}
    {bothIn && <Btn kind="secondary" onClick={() => void openRoom()}><DoorOpen size={14} /> Open Relationship Room</Btn>}
    {intro && !bothIn && <small className="og-note">Relationship Room opens after both sides opt in.</small>}
    {msg && <p className="executive-form-note">{msg}</p>}
    {bothIn && intro && <IntroOutcomeTimeline introRequestId={intro.id} myId={graph.userId} />}
    {bothIn && <IntroFeedbackForm member={member} introRequestId={intro?.id ?? null} connectorName={route.best?.hops[0]?.name ?? ''} />}
    {roomOpen && room && capsule && <RelationshipRoom room={room} capsule={capsule} member={member} onClose={() => setRoomOpen(false)} onChange={setRoom} onMessage={() => nav.messageMember(member.id)} />}
  </section>
}

function RelationshipRoom({ room, capsule, member, onClose, onChange, onMessage }: { room: Room; capsule: Capsule; member: Member; onClose: () => void; onChange: (r: Room) => void; onMessage: () => void }) {
  const net = useNetwork()
  const ops = useOps()
  const graph = useGraph()
  const [step, setStep] = useState('')
  const [commitment, setCommitment] = useState('')
  const [note, setNote] = useState('')
  const thread = net.threads.find(t => t.memberId === member.id)
  const update = async (patch: Partial<Room>) => {
    const res = await db.from('relationship_rooms').update(patch).eq('id', room.id).select('*').single()
    if (!res.error) onChange(res.data)
  }
  const toOpportunity = async () => {
    const person = ops.personForMember(member.id) ?? await ops.addMemberToCrm({ id: member.id, name: member.name, title: member.title, company: member.company, location: member.location })
    if (!person) return
    const existing = ops.opportunities.find(o => o.personId === person.id && !o.archived && o.source === 'Relationship Room')
    if (existing) { setNote(`Already linked: ${existing.name}`); return }
    await ops.createOpportunity({ name: `${member.company || member.name} — from introduction`, personId: person.id, companyId: person.companyId, source: 'Relationship Room', nextAction: room.next_steps[0] ?? 'Agree next step' })
    await graph.logEvent('relationship_room', room.id, 'opportunity_created', `Opportunity created from room with ${member.name}`)
    setNote('Linked to your canonical CRM person and company. No duplicate participants were created.')
  }
  return <div className="modal-wrap" onMouseDown={onClose}>
    <section className="modal og-drawer" onMouseDown={e => e.stopPropagation()} aria-label="Relationship Room">
      <header><div><Eyebrow signal>RELATIONSHIP ROOM</Eyebrow><h2>You and {member.name}</h2><p>Only mutually shared context lives here. Your private notes stay on your side.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
      <div className="og-room">
        <article><Eyebrow>SHARED CAPSULE</Eyebrow><p><b>Why:</b> {capsule.why_exists}</p><p><b>Goal:</b> {capsule.first_goal || 'Not set'}</p><p><b>Shared:</b> {capsule.shared_context}</p></article>
        <article><Eyebrow>CONVERSATION</Eyebrow><p>{thread ? `${thread.messages.length} messages` : 'Not started'}</p>{thread?.messages.slice(-2).map(m => <p key={m.id}><small>{m.from === 'me' ? 'You' : member.name.split(' ')[0]}:</small> {m.text}</p>)}<Btn kind="quiet" onClick={onMessage}>Open conversation</Btn></article>
        <article><Eyebrow>MEETING</Eyebrow><input type="datetime-local" value={room.meeting_at?.slice(0, 16) ?? ''} onChange={e => void update({ meeting_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></article>
        <article><Eyebrow>AGREED NEXT STEPS</Eyebrow><ul>{room.next_steps.map(s => <li key={s}>{s}</li>)}</ul><div className="og-inline"><input value={step} onChange={e => setStep(e.target.value)} placeholder="Add a next step" /><button disabled={!step.trim()} onClick={() => { void update({ next_steps: [...room.next_steps, step.trim()] }); setStep('') }}>Add</button></div></article>
        <article><Eyebrow>SHARED COMMITMENTS</Eyebrow><ul>{room.commitments.map(s => <li key={s}>{s}</li>)}</ul><div className="og-inline"><input value={commitment} onChange={e => setCommitment(e.target.value)} placeholder="Who promised what" /><button disabled={!commitment.trim()} onClick={() => { void update({ commitments: [...room.commitments, commitment.trim()] }); setCommitment('') }}>Add</button></div></article>
        <article><Eyebrow>OUTCOME</Eyebrow><select value={room.outcome} onChange={e => void update({ outcome: e.target.value, status: e.target.value ? 'closed' : 'open' })}><option value="">Open</option>{['conversation', 'partnership', 'customer', 'hire', 'investor', 'advisor', 'no outcome'].map(o => <option key={o} value={o}>{o}</option>)}</select>
          <Btn kind="secondary" onClick={() => void toOpportunity()}>Create / link CRM opportunity</Btn>{note && <small>{note}</small>}</article>
      </div>
    </section>
  </div>
}

function IntroFeedbackForm({ member, introRequestId, connectorName }: { member: Member; introRequestId: string | null; connectorName: string }) {
  const graph = useGraph()
  const [f, setF] = useState({ relevant: null as boolean | null, contextAccurate: null as boolean | null, wouldTakeAgain: null as boolean | null, outcomeCategory: 'conversation', privateNote: '', shareable: false })
  const [saved, setSaved] = useState(false)
  const existing = graph.feedback.find(x => x.memberId === member.id)
  const YN = ({ k, label }: { k: 'relevant' | 'contextAccurate' | 'wouldTakeAgain'; label: string }) => <div className="og-yn"><span>{label}</span><button className={f[k] === true ? 'active' : ''} onClick={() => setF(v => ({ ...v, [k]: true }))}>Yes</button><button className={f[k] === false ? 'active' : ''} onClick={() => setF(v => ({ ...v, [k]: false }))}>No</button></div>
  if (existing || saved) return <p className="og-note"><Check size={12} /> Introduction quality recorded privately{existing?.shareable ? ' (marked shareable)' : ''}.</p>
  return <details className="og-feedback"><summary>Record introduction quality (private by default)</summary>
    <YN k="relevant" label="Was this relevant?" /><YN k="contextAccurate" label="Did the context explain why you should meet?" />
    {connectorName && <YN k="wouldTakeAgain" label={`Take another qualified intro from ${connectorName}?`} />}
    <label>Outcome<select value={f.outcomeCategory} onChange={e => setF(v => ({ ...v, outcomeCategory: e.target.value }))}>{['conversation', 'partnership', 'customer', 'hire', 'investor', 'advisor', 'no_outcome', 'other'].map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}</select></label>
    <label>Private note<textarea rows={2} value={f.privateNote} onChange={e => setF(v => ({ ...v, privateNote: e.target.value }))} /></label>
    <label className="og-check"><input type="checkbox" checked={f.shareable} onChange={e => setF(v => ({ ...v, shareable: e.target.checked }))} /> Let the other participant see these answers (never the private note)</label>
    <Btn kind="secondary" onClick={() => { void graph.recordFeedback({ introRequestId, memberId: member.id, connectorName, relevant: f.relevant, contextAccurate: f.contextAccurate, wouldTakeAgain: f.wouldTakeAgain, outcomeCategory: f.outcomeCategory, shareable: f.shareable, privateNote: f.privateNote }); setSaved(true) }}>Save feedback</Btn>
    <small className="og-note">Recommendations are written separately on the Executive Page.</small>
  </details>
}

/* ───────────────────────── Intent Exchange ───────────────────────── */

type IntentRow = { id: string; ask: string; category: string; visibility: string; status: string; expires_at: string | null; industry: string; location: string; mission_id: string | null }

export function IntentExchangePanel() {
  const graph = useGraph()
  const net = useNetwork()
  const nav = useNav()
  const [mine, setMine] = useState<IntentRow[]>([])
  const [filter, setFilter] = useState<'ALL' | IntentCategory>('ALL')
  const [form, setForm] = useState({ category: 'LOOKING FOR' as IntentCategory, statement: '', industry: '', location: '', privacy: 'network' as IntentPrivacy, days: '30', missionId: '', reveal: true })
  const [msg, setMsg] = useState('')
  const load = async () => {
    if (!graph.signedIn) return
    const r = await db.from('asks').select('id,ask,category,visibility,status,expires_at,industry,location,mission_id').eq('author_id', graph.userId).order('created_at', { ascending: false })
    setMine(r.data ?? [])
  }
  useEffect(() => { void load() }, [graph.userId])
  const post = async () => {
    const statement = form.statement.trim()
    if (!statement) return
    const privacy = form.privacy === 'trusted' ? 'private' : form.privacy
    if (!graph.signedIn) {
      net.addAsk({ ask: statement, detail: `${form.category}`, whyNow: '', offer: '', industry: form.industry, location: form.location, urgency: 'medium', visibility: privacy === 'private' ? 'private' : 'network' })
      setMsg('Posted in preview only. Sign in with a verified account to publish.'); setForm(f => ({ ...f, statement: '' })); return
    }
    const expires = new Date(Date.now() + Number(form.days) * 86400000).toISOString()
    const res = await db.from('asks').insert({
      id: `ask-${Date.now().toString(36)}`, author_id: graph.userId, ask: statement, detail: '', why_now: '', offer: '', industry: form.industry, location: form.location,
      urgency: 'medium', posted: 'Just now', response_count: 0, visibility: privacy, category: form.category, expires_at: expires,
      mission_id: form.missionId || null, reveal_identity: form.reveal, status: 'active',
    })
    setMsg(res.error ? res.error.message : form.privacy === 'trusted' ? 'Saved as Private — trusted sharing stays off until an explicit permission model exists.' : privacy === 'private' ? 'Saved privately. Only your matching engine uses it.' : 'Live to verified members until it expires.')
    if (!res.error) setForm(f => ({ ...f, statement: '' }))
    await load()
  }
  const close = async (id: string) => { await db.from('asks').update({ status: 'closed' }).eq('id', id); await load() }
  const network = net.asks.filter(a => !a.mine && a.memberId !== 'me' && a.visibility !== 'private')
    .filter(a => filter === 'ALL' || ((a as unknown as { category?: string }).category ?? 'LOOKING FOR') === filter)
  return <section className="og-exchange">
    <header><Eyebrow signal>SIGNALS · INTENT EXCHANGE</Eyebrow><h2>Say what you are moving. It expires, so it stays true.</h2>
      <p>Private Signals feed only your own matching. Network Signals reach verified members. Nothing is shown after it expires or closes.</p></header>
    <div className="og-form">
      <label>Type<select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as IntentCategory }))}>{INTENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="wide">Statement<input value={form.statement} onChange={e => setForm(f => ({ ...f, statement: e.target.value }))} placeholder="A COO who has run a plant consolidation in the Midwest" /></label>
      <label>Industry<input placeholder="e.g. Manufacturing" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></label>
      <label>Geography<input placeholder="e.g. US Midwest" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></label>
      <label>Privacy<select value={form.privacy} onChange={e => setForm(f => ({ ...f, privacy: e.target.value as IntentPrivacy }))}><option value="private">PRIVATE</option><option value="trusted">TRUSTED (held private)</option><option value="network">NETWORK</option><option value="shareable">SHAREABLE</option></select></label>
      <label>Expires in<select value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))}>{['7', '14', '30', '60', '90'].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
      <label>Mission<select value={form.missionId} onChange={e => setForm(f => ({ ...f, missionId: e.target.value }))}><option value="">None</option>{graph.missions.filter(m => m.status !== 'completed').map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
      <label className="og-check"><input type="checkbox" checked={form.reveal} onChange={e => setForm(f => ({ ...f, reveal: e.target.checked }))} /> Reveal my identity</label>
    </div>
    <Btn disabled={!form.statement.trim()} onClick={() => void post()}><CircleDot size={14} /> Post Signal</Btn>
    {msg && <p className="executive-form-note">{msg}</p>}
    {mine.length > 0 && <div className="og-mine"><Eyebrow>YOUR SIGNALS</Eyebrow>{mine.map(i => <article key={i.id}><b>{i.category}</b><span>{i.ask}</span><small>{i.visibility.toUpperCase()} · {i.status}{i.expires_at ? ` · expires ${new Date(i.expires_at).toLocaleDateString()}` : ''}</small>{i.status === 'active' && <button onClick={() => void close(i.id)}>Close</button>}</article>)}</div>}
    <div className="state-filters">{(['ALL', ...INTENT_CATEGORIES] as const).map(c => <button key={c} className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>{c}</button>)}</div>
    <div className="og-reverse-list">{network.slice(0, 8).map(a => { const m = net.members.find(x => x.id === a.memberId); return <article key={a.id}>
      <header><b>{(a as unknown as { category?: string }).category ?? 'LOOKING FOR'}</b><small>{m?.name ?? 'Verified member'} · {a.posted}</small></header><p>{a.ask}</p>
      {m && <Btn kind="secondary" onClick={() => nav.openMember(m)}>Open Executive Page</Btn>}
    </article> })}{!network.length && <p className="executive-empty">No network Signals in this category.</p>}</div>
  </section>
}

/* ───────────────────────── Digital You rules ───────────────────────── */

export function DigitalYouRulesPanel() {
  const graph = useGraph()
  return <section className="executive-section og-rules">
    <Eyebrow><LockKeyhole size={12} /> DIGITAL YOU · RELATIONSHIP RULES</Eyebrow>
    <p className="og-note">Rules can only tighten what Ask Intros may do. Sending messages and making introductions always require your approval.</p>
    <ul>{RULE_KINDS.map(r => { const on = graph.rules.find(x => x.ruleKind === r.kind)?.enabled ?? false; return <li key={r.kind}>
      <label className="og-check"><input type="checkbox" checked={on} onChange={e => void graph.setRule(r.kind, r.action, e.target.checked)} /> {r.label}</label><small>{r.action.toUpperCase()}</small>
    </li> })}</ul>
  </section>
}

/* ───────────────────────── Delegates + Organization ───────────────────────── */

const DELEGATE_PERMS = [['calendar', 'Calendar & meeting prep'], ['crm', 'CRM / Work'], ['draft_messages', 'Draft messages (never send)'], ['relationship_notes', 'Relationship notes'], ['scheduling', 'Scheduling'], ['opportunity_updates', 'Opportunity updates']] as const

export function DelegatesPanel() {
  const graph = useGraph()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Executive assistant')
  const [perms, setPerms] = useState<string[]>(['calendar', 'scheduling'])
  return <section className="executive-section og-delegates">
    <Eyebrow><ShieldCheck size={12} /> DELEGATES</Eyebrow>
    <p className="og-note">A delegate is not a network member. They cannot browse the network, send introductions or messages, or see network-private information. Access is least-privilege and revocable.</p>
    <ul className="og-mine">{graph.delegates.map(d => <article key={d.id}><b>{d.roleLabel}</b><span>{d.delegateEmail}</span><small>{d.status.toUpperCase()} · {d.permissions.join(', ') || 'no access'}</small>{d.status !== 'revoked' && <button onClick={() => void graph.revokeDelegate(d.id)}>Revoke</button>}</article>)}</ul>
    <div className="og-form">
      <label>Delegate email<input value={email} onChange={e => setEmail(e.target.value)} placeholder="assistant@company.com" /></label>
      <label>Role<select value={role} onChange={e => setRole(e.target.value)}>{['Executive assistant', 'Chief of staff', 'CFO', 'COO', 'Sales leader', 'Other trusted operator'].map(r => <option key={r}>{r}</option>)}</select></label>
    </div>
    <div className="og-perms">{DELEGATE_PERMS.map(([k, l]) => <label key={k} className="og-check"><input type="checkbox" checked={perms.includes(k)} onChange={e => setPerms(p => e.target.checked ? [...p, k] : p.filter(x => x !== k))} /> {l}</label>)}</div>
    <Btn kind="secondary" disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={() => { void graph.addDelegate(email, role, perms); setEmail('') }}>Authorise delegate</Btn>
    {graph.error && <p className="executive-form-note">{graph.error}</p>}
  </section>
}

export function OrganizationRelationshipView() {
  const g = useGraphInputs()
  const nav = useNav()
  const [target, setTarget] = useState('')
  const companies = useMemo(() => [...new Set(g.members.map(m => m.company).filter(Boolean))].sort(), [g.members])
  const people = g.members.filter(m => target && m.company === target)
  const paths = people.map(p => ({ p, r: routeTo(p, g) })).sort((a, b) => (b.r.best?.score ?? -99) - (a.r.best?.score ?? -99))
  const direct = people.filter(p => g.connections.includes(p.id))
  return <section className="executive-section og-org">
    <Eyebrow>ORGANIZATION RELATIONSHIPS</Eyebrow>
    <p className="og-note">Which relationships connect you to a target company, the strongest path, and the gaps. Team members appear here once they are authorised delegates with shared relationship notes.</p>
    <label>Target company<select value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose a company</option>{companies.map(c => <option key={c}>{c}</option>)}</select></label>
    {target && <dl>
      <div><dt>PEOPLE AT {target.toUpperCase()}</dt><dd>{people.map(p => p.name).join(', ') || 'None visible'}</dd></div>
      <div><dt>DIRECT RELATIONSHIPS</dt><dd>{direct.map(p => p.name).join(', ') || 'None — gap'}</dd></div>
      <div><dt>STRONGEST PATH</dt><dd>{paths[0]?.r.best ? paths[0].r.best.labels.join(' → ') : 'No recorded path — gap'}</dd></div>
      <div><dt>OVERLAPS</dt><dd>{paths.filter(x => x.r.best && x.r.best.hops.length).map(x => x.r.best?.hops[0]?.name).filter(Boolean).join(', ') || 'None'}</dd></div>
    </dl>}
    {paths[0] && <Btn kind="quiet" onClick={() => nav.openMember(paths[0]!.p)}>Open {paths[0].p.name}</Btn>}
  </section>
}

/* ───────────────────────── Passport ───────────────────────── */

const PASSPORT_FIELDS = [['identity', 'Verified identity'], ['company', 'Verified company'], ['what_i_do', 'What I do'], ['building', 'Building'], ['looking_for', 'Looking for'], ['can_help_with', 'Can help with'], ['open_to', 'Open To'], ['recommendations', 'Approved recommendations'], ['signal', 'Selected Signal'], ['scheduling', 'Scheduling availability']] as const

function PassportQr({ url }: { url: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => { void import('qrcode').then(q => q.toDataURL(url, { margin: 1, width: 120 })).then(setSrc) }, [url])
  return src ? <img className="og-qr" alt="Passport QR code" src={src} /> : null
}

export function PassportManager() {
  const graph = useGraph()
  const net = useNetwork()
  const [kind, setKind] = useState<'network' | 'shareable'>('shareable')
  const [label, setLabel] = useState('Relationship Passport')
  const [fields, setFields] = useState<string[]>(['identity', 'company', 'what_i_do', 'looking_for', 'can_help_with'])
  const [askId, setAskId] = useState('')
  const myAsks = net.asks.filter(a => a.mine && a.visibility !== 'private')
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return <section className="executive-section og-passport">
    <Eyebrow signal>RELATIONSHIP PASSPORT</Eyebrow>
    <h2>Share exactly what you choose. Revoke it any time.</h2>
    <p className="og-note">Passports never include contact details, CRM data, private Signals or verification documents.</p>
    <div className="og-form">
      <label>Label<input value={label} onChange={e => setLabel(e.target.value)} /></label>
      <label>Audience<select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="shareable">Shareable link / QR</option><option value="network">Verified members only</option></select></label>
      {fields.includes('signal') && <label>Signal<select value={askId} onChange={e => setAskId(e.target.value)}><option value="">Choose</option>{myAsks.map(a => <option key={a.id} value={a.id}>{a.ask}</option>)}</select></label>}
    </div>
    <div className="og-perms">{PASSPORT_FIELDS.map(([k, l]) => <label key={k} className="og-check"><input type="checkbox" checked={fields.includes(k)} onChange={e => setFields(f => e.target.checked ? [...f, k] : f.filter(x => x !== k))} /> {l}</label>)}</div>
    <Btn disabled={!fields.length} onClick={() => void graph.createPassport({ kind, label, fields, selectedAskId: askId || null })}><Plus size={14} /> Create passport</Btn>
    {graph.error && <p className="executive-form-note">{graph.error}</p>}
    <div className="og-mine">{graph.passports.map(p => { const url = `${origin}/passport/${p.token}`; return <article key={p.id}>
      <b>{p.label}</b><span>{p.kind === 'network' ? 'Verified members' : 'Shareable'} · {p.fields.length} fields{p.revoked ? ' · REVOKED' : ''}</span>
      {!p.revoked && <><small className="og-url">{url}</small>
        <PassportQr url={url} />
        <button onClick={() => void navigator.clipboard?.writeText(url)}>Copy link</button><button onClick={() => void graph.revokePassport(p.id)}>Revoke</button></>}
    </article> })}</div>
  </section>
}
