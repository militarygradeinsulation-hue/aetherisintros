import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, BadgeCheck, Briefcase, CalendarDays, Check, ChevronLeft, CircleDot,
  Handshake, LockKeyhole, MessageSquareText, Plus, Send, Target, X,
} from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { usePublicBadge, VerifiedBadge } from './badge'
import { useOps } from './crm/store'
import { rankMatches } from './matching'
import { useNav } from './nav'
import type { Member } from './social'
import { useNetwork } from './store'
import { Btn, Eyebrow, Face } from './ui'

export const OPEN_TO_OPTIONS = [
  'Customer conversations', 'Strategic partnerships', 'Investment conversations',
  'Acquisition discussions', 'Advisory conversations', 'Speaking / Podcasts',
  'Hiring / Talent', 'Vendor introductions',
] as const

type Recommendation = {
  id: string
  author_id: string
  recipient_id: string
  body: string
  relationship_context: string
  outcome: string
  who_should_meet: string
  display_approved: boolean
  created_at: string
  authorName?: string
}

function useRecommendations(memberId: string) {
  const [rows, setRows] = useState<Recommendation[]>([])
  const [ready, setReady] = useState(false)
  const reload = async () => {
    const result = await supabase.from('executive_recommendations').select('*').eq('recipient_id', memberId).order('created_at', { ascending: false })
    const recommendations = (result.data ?? []) as Recommendation[]
    const ids = [...new Set(recommendations.map(row => row.author_id))]
    const names = ids.length ? await supabase.from('profiles').select('id,name').in('id', ids) : { data: [] }
    const byId = new Map((names.data ?? []).map(row => [row.id, row.name]))
    setRows(recommendations.map(row => ({ ...row, authorName: byId.get(row.author_id) ?? 'Verified member' })))
    setReady(true)
  }
  useEffect(() => { void reload() }, [memberId])
  return { rows, ready, reload }
}

function splitValues(value: string) {
  return value.split(/[,;·\n]+/).map(item => item.trim()).filter(Boolean).slice(0, 6)
}

function ScheduleDialog({ person, crmPersonId, onClose }: { person: Member; crmPersonId?: string; onClose: () => void }) {
  const ops = useOps()
  const start = new Date(Date.now() + 86400000)
  start.setHours(10, 0, 0, 0)
  const [when, setWhen] = useState(start.toISOString().slice(0, 16))
  const [title, setTitle] = useState(`Conversation with ${person.name}`)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const save = async () => {
    setSaving(true); setMessage('')
    const { data } = await supabase.auth.getUser()
    const begins = new Date(when)
    const ends = new Date(begins.getTime() + 30 * 60 * 1000)
    if (!data.user || Number.isNaN(begins.getTime())) { setMessage('Choose a valid time.'); setSaving(false); return }
    const result = await supabase.from('calendar_events').insert({
      user_id: data.user.id, member_id: person.id, title: title.trim(), notes: `Relationship meeting with ${person.name}`,
      location: 'Video call', kind: 'meeting', starts_at: begins.toISOString(), ends_at: ends.toISOString(), all_day: false,
    }).select('id').single()
    if (result.error) { setMessage(result.error.message); setSaving(false); return }
    if (crmPersonId) await ops.logActivity({ kind: 'meeting', subject: title.trim(), personId: crmPersonId, calendarEventId: result.data.id })
    setMessage('Meeting added to your calendar with this relationship attached.')
    setSaving(false)
  }
  return <div className="modal-wrap" onMouseDown={onClose}>
    <section className="modal executive-schedule" onMouseDown={event => event.stopPropagation()}>
      <header><div><Eyebrow>FIND A TIME</Eyebrow><h2>Meet with {person.name}</h2><p>This creates a private meeting linked to this relationship.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
      <label>Meeting title<input value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Date and time<input type="datetime-local" value={when} onChange={event => setWhen(event.target.value)} /></label>
      {message && <p className="executive-form-note">{message}</p>}
      <footer><Btn kind="quiet" onClick={onClose}>Close</Btn><Btn disabled={saving || !title.trim()} onClick={() => void save()}>{saving ? 'Saving…' : 'Add to calendar'}</Btn></footer>
    </section>
  </div>
}

export function ExecutivePage({ person, onClose, onIntro, onMessage }: {
  person: Member
  onClose: () => void
  onIntro: (person: Member) => void
  onMessage: (memberId: string) => void
}) {
  const net = useNetwork()
  const ops = useOps()
  const nav = useNav()
  const badge = usePublicBadge(person.id)
  const recommendations = useRecommendations(person.id)
  const [relationshipOpen, setRelationshipOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [note, setNote] = useState('')
  const [opportunityName, setOpportunityName] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [recommendationNote, setRecommendationNote] = useState('')
  const match = useMemo(() => rankMatches(net.profile, [person], net.connections)[0]?.match, [net.profile, net.connections, person])
  const connected = net.connections.includes(person.id)
  const crmPerson = ops.personForMember(person.id)
  const company = crmPerson?.companyId ? ops.companies.find(item => item.id === crmPerson.companyId) : undefined
  const opportunities = crmPerson ? ops.opportunities.filter(item => item.personId === crmPerson.id && !item.archived) : []
  const tasks = crmPerson ? ops.tasks.filter(item => item.personId === crmPerson.id && item.status !== 'done' && item.status !== 'cancelled') : []
  const crmNotes = crmPerson ? ops.notes.filter(item => item.entityType === 'person' && item.entityId === crmPerson.id) : []
  const activities = crmPerson ? ops.activities.filter(item => item.personId === crmPerson.id).slice(0, 5) : []
  const privateMemories = net.notes.filter(item => item.personId === person.id)
  const thread = net.threads.find(item => item.memberId === person.id)
  const ask = net.asks.find(item => item.memberId === person.id)
  const posts = net.posts.filter(item => item.memberId === person.id).slice(0, 3)
  const openTo = person.openTo ?? []
  const warmPath = person.bestPath.length > 2 || match?.mutualConnections.length
  const canSchedule = person.schedulingEnabled === true

  const primary = ask && !connected
    ? { label: 'Respond to signal', icon: <CircleDot size={15} />, run: () => { const id = net.respondToAsk(ask.id, `I’m responding to your signal: ${ask.ask}`); if (id) nav.goToThread(id) } }
    : connected
      ? { label: 'Message', icon: <MessageSquareText size={15} />, run: () => onMessage(person.id) }
      : warmPath
        ? { label: 'Request introduction', icon: <Handshake size={15} />, run: () => onIntro(person) }
        : { label: 'Request connection', icon: <Plus size={15} />, run: () => net.connect(person.id) }

  const ensureCrm = async () => crmPerson ?? ops.addMemberToCrm({ id: person.id, name: person.name, title: person.title, company: person.company, location: person.location })
  const addOpportunity = async () => {
    const linked = await ensureCrm()
    if (!linked || !opportunityName.trim()) return
    await ops.createOpportunity({ name: opportunityName.trim(), personId: linked.id, companyId: linked.companyId, source: 'Executive Page', nextAction: `Qualify with ${person.name}` })
    setOpportunityName('')
  }
  const addPrivateNote = async () => {
    const value = note.trim()
    if (!value) return
    net.addNote(person.id, value, 'private')
    const linked = await ensureCrm()
    if (linked) await ops.addNote('person', linked.id, value)
    setNote('')
  }
  const submitRecommendation = async () => {
    if (recommendation.trim().length < 10) return
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const result = await supabase.from('executive_recommendations').insert({ author_id: data.user.id, recipient_id: person.id, body: recommendation.trim() })
    setRecommendationNote(result.error ? result.error.message : 'Sent privately. They choose whether it appears on their page.')
    if (!result.error) setRecommendation('')
    await recommendations.reload()
  }

  const proof = recommendations.rows.filter(item => item.display_approved)
  return <article className="executive-page">
    <button className="member-back" onClick={onClose}><ChevronLeft size={16} /> Back to Network</button>
    <header className="executive-identity">
      <figure><Face person={person} portrait large /></figure>
      <div className="executive-identity-copy">
        <div className="executive-verified"><VerifiedBadge memberId={person.id} detail />{!badge?.role && <span>Network member</span>}</div>
        <h1>{person.name}</h1>
        <p className="executive-role">{person.title}{person.company ? ` · ${person.company}` : ''}</p>
        <p className="executive-statement">“{person.whatIDo || person.thesis || person.focus || 'No executive statement recorded yet.'}”</p>
        <p className="executive-meta">{[person.location, person.industry, ...person.expertise.slice(0, 2)].filter(Boolean).join(' · ')}</p>
        <div className="executive-actions"><Btn onClick={primary.run}>{primary.icon}{primary.label}</Btn>
          {canSchedule && <Btn kind="secondary" onClick={() => setScheduleOpen(true)}><CalendarDays size={15} /> Find a time</Btn>}</div>
      </div>
    </header>

    <section className="executive-why" aria-label="Relationship intelligence">
      <article><Eyebrow>WHY THEM</Eyebrow><p>{match?.components[0]?.evidence || person.whyThem || 'No evidence-backed relevance recorded yet.'}</p></article>
      <article><Eyebrow>WHY YOU</Eyebrow><p>{person.whyYou || 'No mutual-value evidence recorded yet.'}</p></article>
      <article className="timing"><Eyebrow signal>WHY NOW</Eyebrow><p>{person.whyNow || 'No current timing signal recorded.'}</p></article>
    </section>

    <section className="executive-path">
      <div><Eyebrow>MUTUAL VALUE</Eyebrow><p>{match?.headline || 'The relationship has not gathered enough shared context yet.'}</p></div>
      <div><Eyebrow>WARMEST PATH</Eyebrow><p>{person.bestPath.length ? person.bestPath.join(' → ') : 'No warm path recorded.'}</p></div>
      <div><Eyebrow>RELATIONSHIP</Eyebrow><p>{connected ? 'Connected' : person.introState === 'requested' ? 'Introduction requested' : 'Not connected yet'}</p></div>
      <div><Eyebrow>NEXT ACTION</Eyebrow><p>{person.nextAction || primary.label}</p></div>
    </section>

    <div className="executive-body">
      <main>
        <section className="executive-section"><Eyebrow>WHAT I’M BUILDING</Eyebrow><h2>{person.building || person.focus || 'Not shared yet.'}</h2></section>
        <div className="executive-two">
          <section className="executive-section"><Eyebrow>LOOKING FOR</Eyebrow><ul>{person.needs.length ? person.needs.map(item => <li key={item}>{item}</li>) : <li>Nothing shared yet.</li>}</ul></section>
          <section className="executive-section"><Eyebrow>CAN HELP WITH</Eyebrow><ul>{person.offers.length ? person.offers.slice(0, 6).map(item => <li key={item}>{item}</li>) : <li>Nothing shared yet.</li>}</ul></section>
        </div>
        <section className="executive-section"><Eyebrow>OPEN TO</Eyebrow>{openTo.length ? <ul className="executive-open-to">{openTo.map(item => <li key={item}><Check size={13} />{item}</li>)}</ul> : <p className="executive-empty">No conversation types selected.</p>}</section>
        <section className="executive-section"><div className="executive-section-head"><div><Eyebrow signal>CURRENT SIGNALS</Eyebrow><h2>What needs attention now.</h2></div></div>
          <div className="executive-signals">
            {ask && <article><span>LOOKING FOR</span><h3>{ask.ask}</h3><p>{ask.detail}</p><Btn kind="secondary" onClick={() => { const id = net.respondToAsk(ask.id, `I’m responding to your signal: ${ask.ask}`); if (id) nav.goToThread(id) }}><Send size={14} /> Respond</Btn></article>}
            {posts.map(post => <article key={post.id}><span>{post.kind.toUpperCase()}</span><h3>{post.text}</h3><p>{post.detail}</p><Btn kind="quiet" onClick={() => { const id = net.respondToPost(post.id, person.id); if (id) nav.goToThread(id) }}>Continue in Messages <ArrowRight size={13} /></Btn></article>)}
            {!ask && !posts.length && <p className="executive-empty">No current network-safe Signals recorded.</p>}
          </div>
        </section>
        <section className="executive-section"><Eyebrow>RELATIONSHIP PROOF</Eyebrow>
          <div className="executive-proof">
            {badge?.role && <article><BadgeCheck size={18} /><b>{badge.business ? `Verified ${badge.business}` : 'Verified executive'}</b><p>{badge.summary || 'Identity and controlling role reviewed by Ask Intros.'}</p></article>}
            {['introduced', 'conversing', 'closed'].includes(person.introState) && <article><Handshake size={18} /><b>Recorded introduction</b><p>This relationship has a recorded introduction state in Ask Intros.</p></article>}
            {proof.map(item => <article key={item.id}><BadgeCheck size={18} /><b>{item.authorName}</b><p>{item.body}</p>{item.outcome && <small>{item.outcome}</small>}</article>)}
            {!badge?.role && !proof.length && !['introduced', 'conversing', 'closed'].includes(person.introState) && <p className="executive-empty">No verified relationship outcomes recorded yet.</p>}
          </div>
          <details className="executive-recommend"><summary>Recommend {person.name.split(' ')[0]}</summary><textarea value={recommendation} onChange={event => setRecommendation(event.target.value)} rows={3} placeholder="What are they actually good at, who should meet them, or what did the connection lead to?" /><Btn disabled={recommendation.trim().length < 10} onClick={() => void submitRecommendation()}>Send for approval</Btn>{recommendationNote && <small>{recommendationNote}</small>}</details>
        </section>
      </main>

      <aside className={`executive-private ${relationshipOpen ? 'open' : ''}`}>
        <button className="executive-private-toggle" onClick={() => setRelationshipOpen(value => !value)}><LockKeyhole size={14} /><span>Your relationship</span><em>{relationshipOpen ? 'Hide' : 'Open'}</em></button>
        <div className="executive-private-body">
          <header><Eyebrow>PRIVATE CONTEXT</Eyebrow><small>Visible only to you</small></header>
          <dl>
            <div><dt>Status</dt><dd>{connected ? 'Connected' : person.relationshipStatus}</dd></div>
            <div><dt>Last interaction</dt><dd>{crmPerson?.lastActivityAt ? new Date(crmPerson.lastActivityAt).toLocaleDateString() : person.lastInteractionDays ? `${person.lastInteractionDays} days ago` : 'Not recorded'}</dd></div>
            <div><dt>CRM lifecycle</dt><dd>{crmPerson?.lifecycle ?? 'Not in CRM'}</dd></div>
            <div><dt>Company</dt><dd>{company?.name ?? person.company ?? 'Not recorded'}</dd></div>
            <div><dt>Open opportunities</dt><dd>{opportunities.length || 'None'}</dd></div>
            <div><dt>Open tasks</dt><dd>{tasks.length || 'None'}</dd></div>
            <div><dt>Conversation</dt><dd>{thread ? `${thread.messages.length} messages` : 'Not started'}</dd></div>
            <div><dt>Introduction</dt><dd>{person.introState}</dd></div>
          </dl>
          {!crmPerson && <Btn kind="secondary" onClick={() => void ensureCrm()}><Briefcase size={14} /> Add to CRM</Btn>}
          {crmPerson && <Btn kind="quiet" onClick={() => nav.setPage('crm')}><Briefcase size={14} /> Open in CRM</Btn>}
          <div className="executive-private-action"><label>Private note<textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Context, promise, or next move…" /></label><Btn kind="secondary" disabled={!note.trim()} onClick={() => void addPrivateNote()}>Record note</Btn></div>
          <div className="executive-private-action"><label>New opportunity<input value={opportunityName} onChange={event => setOpportunityName(event.target.value)} placeholder={`Opportunity with ${person.name}`} /></label><Btn kind="secondary" disabled={!opportunityName.trim()} onClick={() => void addOpportunity()}><Target size={14} /> Create linked opportunity</Btn></div>
          {(privateMemories.length > 0 || crmNotes.length > 0) && <div className="executive-private-list"><Eyebrow>NOTES & MEMORY</Eyebrow>{[...privateMemories.map(item => ({ id: item.id, body: item.text })), ...crmNotes].slice(0, 5).map(item => <p key={item.id}>{item.body}</p>)}</div>}
          {activities.length > 0 && <div className="executive-private-list"><Eyebrow>RECENT HISTORY</Eyebrow>{activities.map(item => <p key={item.id}><b>{item.subject}</b><small>{new Date(item.occurredAt).toLocaleDateString()}</small></p>)}</div>}
        </div>
      </aside>
    </div>
    {scheduleOpen && <ScheduleDialog person={person} crmPersonId={crmPerson?.id} onClose={() => setScheduleOpen(false)} />}
  </article>
}

export function ExecutiveIdentityEditor({ openPhotoEditor }: { openPhotoEditor: () => void }) {
  const net = useNetwork()
  const [draft, setDraft] = useState({
    title: net.profile.title, company: net.profile.company, location: net.profile.location,
    whatIDo: net.profile.whatIDo ?? '', building: net.profile.building ?? net.profile.focus,
    lookingFor: net.profile.lookingFor, canHelpWith: net.profile.canHelpWith,
    openTo: net.profile.openTo ?? [], schedulingEnabled: net.profile.schedulingEnabled ?? false,
    availability: net.profile.availability,
  })
  const [message, setMessage] = useState('')
  const toggle = (value: string) => setDraft(current => ({ ...current, openTo: current.openTo.includes(value) ? current.openTo.filter(item => item !== value) : [...current.openTo, value] }))
  const save = async () => {
    await net.updateExecutiveProfile({ ...draft, focus: draft.building })
    setMessage('Executive identity updated across Ask Intros.')
  }
  const preview: Member = {
    id: 'me', name: net.profile.name || 'Your name', initials: net.profile.initials || 'ME', title: draft.title,
    company: draft.company, location: draft.location, role: 'Executive', industry: net.profile.industries[0] ?? '', tags: net.profile.expertise,
    expertise: net.profile.expertise, needs: splitValues(draft.lookingFor), offers: splitValues(draft.canHelpWith), focus: draft.building,
    thesis: net.profile.thesis, availability: draft.availability, mutuals: [], introState: 'recommended', joined: '', lastInteractionDays: 0,
    relationshipStatus: 'active', score: { strategicFit: 0, mutualValue: 0, timing: 0, trust: 0, relationshipStrength: 0, decisionInfluence: 0, opportunityValue: 0, friction: 0 },
    scoreTotal: 0, radar: 'strategic', whyThem: '', whyYou: '', whyNow: '', bestPath: [], nextAction: '', dontDo: '', confidence: 0,
    avatarUrl: net.profile.avatarUrl, whatIDo: draft.whatIDo, building: draft.building, openTo: draft.openTo, schedulingEnabled: draft.schedulingEnabled,
  }
  return <div className="executive-editor-page">
    <header className="executive-editor-head"><div><Eyebrow>ME / EXECUTIVE IDENTITY</Eyebrow><h1>One identity. Every relationship.</h1><p>Edit the same concise profile verified members see. Verification remains controlled by the review system.</p></div><span className="executive-unverified">Verification status is not editable</span></header>
    <div className="executive-editor-grid">
      <section className="executive-edit-form">
        <Btn kind="secondary" onClick={openPhotoEditor}>Change name or photo</Btn>
        <div className="executive-form-grid">
          <label>Headline / title<input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Company<input value={draft.company} onChange={event => setDraft({ ...draft, company: event.target.value })} /></label>
          <label>Location<input value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} /></label>
          <label>Availability<input value={draft.availability} onChange={event => setDraft({ ...draft, availability: event.target.value })} /></label>
          <label className="wide">What I actually do<textarea rows={3} value={draft.whatIDo} onChange={event => setDraft({ ...draft, whatIDo: event.target.value })} /></label>
          <label className="wide">What I’m building<textarea rows={3} value={draft.building} onChange={event => setDraft({ ...draft, building: event.target.value })} /></label>
          <label className="wide">Looking for<textarea rows={3} value={draft.lookingFor} onChange={event => setDraft({ ...draft, lookingFor: event.target.value })} /></label>
          <label className="wide">Can help with<textarea rows={3} value={draft.canHelpWith} onChange={event => setDraft({ ...draft, canHelpWith: event.target.value })} /></label>
        </div>
        <fieldset><legend>Open to</legend><div className="executive-toggle-grid">{OPEN_TO_OPTIONS.map(option => <label key={option}><input type="checkbox" checked={draft.openTo.includes(option)} onChange={() => toggle(option)} /><span>{option}</span></label>)}</div></fieldset>
        <label className="executive-scheduling-toggle"><input type="checkbox" checked={draft.schedulingEnabled} onChange={event => setDraft({ ...draft, schedulingEnabled: event.target.checked })} /><span><b>Enable Find a Time</b><small>Verified members can add a relationship-linked meeting to their calendar.</small></span></label>
        <div className="executive-save"><Btn onClick={() => void save()}>Save executive identity</Btn>{message && <small>{message}</small>}</div>
      </section>
      <aside className="executive-live-preview"><Eyebrow>LIVE PROFILE PREVIEW</Eyebrow><Face person={preview} large portrait /><h2>{preview.name}</h2><p>{preview.title}{preview.company ? ` · ${preview.company}` : ''}</p><blockquote>“{preview.whatIDo || 'Add the clearest statement of what you actually do.'}”</blockquote><small>{[preview.location, preview.industry].filter(Boolean).join(' · ')}</small><div className="executive-preview-open">{preview.openTo.map(item => <span key={item}>{item}</span>)}</div></aside>
    </div>
  </div>
}