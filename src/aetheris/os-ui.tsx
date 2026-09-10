/** Shared Relationship OS components: evidence, twin, trust, paths, capture, intro review. */
import { useMemo, useState } from 'react'
import { Check, Mic, ShieldCheck, X } from 'lucide-react'
import { Btn, Eyebrow, Face, Glyph, Meter } from './ui'
import { useOS } from './os-store'
import { useNetwork } from './store'
import { usePlatform } from './platform'
import { deriveTwin, latentPathsFor, parseCapture, resolveEvidence, reviewIntro, trustAdvice } from './domain/os-engine'
import type {
  AutopilotAction, Band, EvidenceItem, IntroQualityReview, LatentNetworkPath, PathKind, RelationshipTwin,
} from './domain/os-models'
import type { Member } from './social'

export function BandTag({ value, label }: { value: Band; label: string }) {
  return <span className={`band band-${value.toLowerCase()}`}><b>{label}</b><i>{value}</i></span>
}

/* --------------------------------------------------------- evidence drawer */

export function EvidenceLink({ ids, label = 'Why Intros thinks this' }: { ids: string[]; label?: string }) {
  const [open, setOpen] = useState(false)
  if (!ids.length) return null
  return <>
    <button className="evidence-link" onClick={() => setOpen(true)}><Glyph size={11} />{label}</button>
    {open && <EvidenceDrawer ids={ids} onClose={() => setOpen(false)} />}
  </>
}

export function EvidenceDrawer({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const os = useOS()
  const items = resolveEvidence(os.evidence, ids)
  return <div className="modal-veil" onClick={onClose}>
    <aside className="evidence-drawer" onClick={e => e.stopPropagation()}>
      <header>
        <div><Eyebrow>EVIDENCE</Eyebrow><h3>Why Intros thinks this</h3></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close evidence"><X size={16} /></button>
      </header>
      <p className="drawer-note">Every recommendation is traceable. Private sources are named, never quoted across a permission boundary.</p>
      <ul className="evidence-list">
        {items.map(e => <EvidenceRow key={e.id} item={e} />)}
        {!items.length && <li className="evidence-empty">No evidence recorded yet for this recommendation.</li>}
      </ul>
    </aside>
  </div>
}

export function EvidenceRow({ item }: { item: EvidenceItem }) {
  return <li className={`evidence-row cat-${item.category.toLowerCase()}`}>
    <div className="evidence-head">
      <span className="evidence-cat">{item.category}</span>
      <small>{item.sourceLabel} · {item.date}</small>
    </div>
    <p>{item.shareable ? item.statement : item.scope === 'private' ? item.statement : item.statement}</p>
    <footer>
      <span className={`scope-tag scope-${item.scope}`}>{item.scope}</span>
      <span className="evidence-conf">{item.confidence}% confidence</span>
      <span className="evidence-share">{item.shareable ? 'Can be shared' : 'Stays private'}</span>
    </footer>
  </li>
}

/* -------------------------------------------------------- relationship twin */

export function useTwin(person: Member): RelationshipTwin {
  const os = useOS()
  const platform = usePlatform()
  return useMemo(
    () => os.twins.find(t => t.memberId === person.id) ?? deriveTwin(person, { loops: platform.loops, triggers: platform.triggers }),
    [os.twins, person, platform.loops, platform.triggers],
  )
}

export function TwinPanel({ person, compact = false }: { person: Member; compact?: boolean }) {
  const twin = useTwin(person)
  return <section className={`twin-panel ${compact ? 'compact' : ''}`}>
    <header className="section-line">
      <Eyebrow signal>RELATIONSHIP TWIN · PRIVATE</Eyebrow>
      <small>{twin.weather} · updated {twin.updatedAt}</small>
    </header>
    <p className="twin-lede">{twin.communicationStyle} {twin.responsiveness}</p>
    <div className="twin-grid">
      <div><b>What usually works</b><ul>{twin.whatWorks.map(x => <li key={x}>{x}</li>)}</ul></div>
      <div><b>What to avoid</b><ul>{twin.whatToAvoid.map(x => <li key={x}>{x}</li>)}</ul></div>
      <div><b>Best next move</b><p>{twin.bestNextMove}</p></div>
      <div><b>What changed recently</b>
        {twin.whatChanged.length ? <ul>{twin.whatChanged.map(x => <li key={x}>{x}</li>)}</ul> : <p>Nothing new since your last exchange.</p>}
      </div>
    </div>
    {!compact && <>
      <div className="twin-meta">
        <div><Eyebrow>TRUST HISTORY</Eyebrow><p>{twin.trustHistory}</p></div>
        <div><Eyebrow>PREFERRED INTRO STYLE</Eyebrow><p>{twin.preferredIntroStyle}</p></div>
        <div><Eyebrow>MEETING STYLE</Eyebrow><p>{twin.meetingStyle}</p></div>
        <div><Eyebrow>TIMING WINDOWS</Eyebrow><p>{twin.timingWindows.join(' · ') || 'No window recorded.'}</p></div>
      </div>
      <ul className="twin-inferences">
        {twin.inferences.map(i => <li key={i.id}>
          <b>{i.label}</b><span>{i.value}</span>
          <small>{i.sourceLabel} · {i.confidence}% · {i.scope}</small>
        </li>)}
      </ul>
    </>}
    <p className="twin-guard"><ShieldCheck size={12} /> This model is yours. {person.name.split(' ')[0]} never sees it.</p>
  </section>
}

/* ---------------------------------------------------------- trust budget */

export function TrustBudgetNote({ candidateIds }: { candidateIds: string[] }) {
  const os = useOS()
  const advice = trustAdvice(os.trustBudgets, candidateIds)
  return <div className="trust-note">
    <Eyebrow signal>TRUST BUDGET</Eyebrow>
    <p>{advice.sentence}</p>
    {advice.caution.length > 0 && <ul>{advice.caution.map(c => <li key={c}>{c}</li>)}</ul>}
  </div>
}

/* ------------------------------------------------------- latent network */

export function PathToggle({ value, onChange }: { value: PathKind | 'all'; onChange: (v: PathKind | 'all') => void }) {
  const options: Array<PathKind | 'all'> = ['all', 'direct', 'warm', 'contextual']
  return <div className="path-toggle" role="tablist" aria-label="Path type">
    {options.map(o => <button key={o} role="tab" aria-selected={value === o} className={value === o ? 'on' : ''} onClick={() => onChange(o)}>
      {o === 'all' ? 'All paths' : o === 'contextual' ? 'Contextual' : o[0]!.toUpperCase() + o.slice(1)}
    </button>)}
  </div>
}

export function LatentPathList({ personId, companyId, kind = 'all' }: { personId?: string; companyId?: string; kind?: PathKind | 'all' }) {
  const os = useOS()
  const paths = latentPathsFor(os.latentPaths, { ...(personId ? { personId } : {}), ...(companyId ? { companyId } : {}), kind })
  if (!paths.length) return <p className="quiet-empty">No credible path recorded yet. Nothing invented to fill the gap.</p>
  return <ul className="latent-list">{paths.map(p => <LatentPathRow key={p.id} path={p} />)}</ul>
}

export function LatentPathRow({ path }: { path: LatentNetworkPath }) {
  return <li className={`latent-row kind-${path.kind}`}>
    <div className="latent-head">
      <span className="latent-kind">{path.kind}</span>
      <BandTag value={path.strength} label="Strength" />
      <small>{path.degree}° · {path.contextSource}</small>
    </div>
    <p className="latent-statement">{path.statement}</p>
    <ol className="latent-hops">{path.hops.map((h, i) => <li key={`${path.id}-${i}`}><b>{h.label}</b><span>{h.note}</span><small>{h.context}</small></li>)}</ol>
    <footer>
      {path.consentRequired ? <span className="consent-req">Consent required before contact</span> : <span className="consent-ok">No consent needed</span>}
      <EvidenceLink ids={path.evidenceIds} label="See the path evidence" />
    </footer>
  </li>
}

/* ------------------------------------------------- intro quality control */

export function IntroQualityReviewPanel({ person, mutualValueText, contextText, onVerdict }: {
  person: Member; mutualValueText: string; contextText: string; onVerdict?: (v: IntroQualityReview) => void
}) {
  const os = useOS()
  const review = useMemo(() => {
    const r = reviewIntro({ person, mutualValueText, contextText, budgets: os.trustBudgets, recentDeclines: 0 })
    onVerdict?.(r)
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, mutualValueText, contextText, os.trustBudgets])
  return <section className={`intro-review verdict-${review.verdict.replace(/\s+/g, '-').toLowerCase()}`}>
    <header>
      <div><Eyebrow signal>INTRODUCTION QUALITY REVIEW</Eyebrow><h4>{review.verdict}</h4></div>
      <Meter label="Quality" value={review.score} />
    </header>
    <ul className="review-checks">
      {review.checks.map(c => <li key={c.key} className={c.pass ? 'pass' : 'fail'}>
        <span aria-hidden="true">{c.pass ? <Check size={13} /> : <X size={13} />}</span>
        <div><b>{c.label}</b><em>{c.reason}</em>{!c.pass && c.fix && <small>Fix: {c.fix}</small>}</div>
      </li>)}
    </ul>
    <p className="review-trust">{review.trustBudgetNote}</p>
  </section>
}

/* ------------------------------------------------ voice → network memory */

export function VoiceCaptureModal({ onClose }: { onClose: () => void }) {
  const os = useOS()
  const net = useNetwork()
  const platform = usePlatform()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [capture, setCapture] = useState<ReturnType<typeof parseCapture> | null>(null)
  const [approved, setApproved] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)

  const speechAvailable = typeof window !== 'undefined'
    && Boolean((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)

  const listen = () => {
    const Ctor = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const parts: string[] = []
      for (let i = 0; i < e.results.length; i += 1) parts.push(e.results[i]![0]!.transcript)
      setText(parts.join(' '))
    }
    rec.onend = () => setListening(false)
    rec.start()
    setListening(true)
  }

  const review = () => setCapture(parseCapture(text, net.members))

  const commit = () => {
    if (!capture) return
    const chosen = capture.proposals.filter(p => approved[p.id])
    os.saveCapture({ ...capture, proposals: capture.proposals.map(p => ({ ...p, approved: Boolean(approved[p.id]), rejected: !approved[p.id] })), status: 'saved' })
    for (const p of chosen) {
      os.addEvidence({ statement: p.detail, sourceLabel: 'Conversation capture', category: 'Known', scope: p.scope, shareable: p.scope !== 'private', confidence: p.confidence, ...(p.personId ? { personId: p.personId } : {}) })
      if (p.kind === 'memory' || p.kind === 'person update' || p.kind === 'company update') {
        net.addNote(p.personId ?? 'me', p.detail, p.scope)
      }
      if (p.kind === 'open loop' || p.kind === 'trigger memory') {
        platform.createLoop({
          title: p.summary, owner: 'me', memberId: p.personId ?? 'me', source: 'Conversation capture',
          ...(p.kind === 'trigger memory' ? { trigger: p.detail } : {}),
          priority: 'medium', evidence: p.detail, scope: p.scope,
        })
      }
      if (p.kind === 'opportunity room') {
        os.createRoom({
          name: p.summary, thesis: p.detail, ...(p.personId ? { peopleIds: [p.personId] } : {}),
          nextAction: 'Confirm the timing before proposing anything.',
        })
      }
      if (p.kind === 'connection chain') {
        os.addInboxItem({
          kind: 'new context', title: p.summary, whyThisMatters: 'A possible path appeared in conversation.',
          whyNow: 'Paths decay quickly once the conversation is over.', nextMove: 'Confirm the relationship before asking.',
          lanes: ['This Week'], ...(p.personId ? { personId: p.personId } : {}), priority: 62,
        })
      }
    }
    setSaved(true)
  }

  return <div className="modal-veil" onClick={onClose}>
    <div className="modal capture-modal" onClick={e => e.stopPropagation()}>
      <header className="modal-head">
        <div><Eyebrow signal>CAPTURE CONVERSATION</Eyebrow><h3>Say what happened. Approve what gets remembered.</h3></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close capture"><X size={16} /></button>
      </header>

      {saved ? <div className="capture-done">
        <p>Saved. Only the items you approved were written to your network memory. Nothing was shared with anyone.</p>
        <Btn onClick={onClose}>Done</Btn>
      </div> : !capture ? <>
        <p className="modal-copy">Speak or type it the way you would tell a colleague. Intros proposes the updates; you decide which ones exist.</p>
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={6}
          placeholder="I talked to Mark. He is opening a second facility next spring. He wants to talk after his board meeting in November. Sarah might know his CFO."
        />
        <div className="capture-actions">
          {speechAvailable
            ? <Btn kind="secondary" onClick={listen} disabled={listening}><Mic size={14} /> {listening ? 'Listening…' : 'Use microphone'}</Btn>
            : <small className="capture-fallback">Microphone unavailable in this browser — typing works the same way.</small>}
          <Btn onClick={review} disabled={text.trim().length < 12}>Review proposals</Btn>
        </div>
      </> : <>
        <p className="modal-copy">{capture.proposals.length} proposed updates. Approve each one; nothing saves or shares by itself.</p>
        <ul className="proposal-list">
          {capture.proposals.map(p => <li key={p.id} className={approved[p.id] ? 'on' : ''}>
            <div>
              <span className="proposal-kind">{p.kind}</span>
              <b>{p.summary}</b>
              <em>{p.detail}</em>
              <small>{p.confidence}% confidence · {p.scope}</small>
            </div>
            <button className={`approve-btn ${approved[p.id] ? 'on' : ''}`} onClick={() => setApproved(a => ({ ...a, [p.id]: !a[p.id] }))}>
              {approved[p.id] ? <><Check size={13} /> Approved</> : 'Approve'}
            </button>
          </li>)}
        </ul>
        <div className="capture-actions">
          <Btn kind="quiet" onClick={() => setCapture(null)}>Back</Btn>
          <Btn onClick={commit} disabled={!Object.values(approved).some(Boolean)}>Save approved items</Btn>
        </div>
      </>}
    </div>
  </div>
}

/* --------------------------------------------------------- autopilot card */

export function AutopilotCard({ action }: { action: AutopilotAction }) {
  const os = useOS()
  const net = useNetwork()
  const [draft, setDraft] = useState(action.draft)
  const [editing, setEditing] = useState(false)
  const person = net.members.find(m => m.id === action.personId)
  const gated = action.requiresApproval || net.autonomy < action.minimumAutonomy

  return <article className={`autopilot-card status-${action.status}`}>
    <header>
      <div className="ap-title">
        <span className="ap-kind">{action.kind}</span>
        <b>{action.title}</b>
      </div>
      {person && <Face person={person} />}
    </header>
    {editing
      ? <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} />
      : <p className="ap-draft">{draft}</p>}
    <dl className="ap-meta">
      <div><dt>Why prepared</dt><dd>{action.whyPrepared}</dd></div>
      <div><dt>Expected benefit</dt><dd>{action.expectedBenefit}</dd></div>
      <div><dt>Trust budget</dt><dd>{action.trustBudgetImpact}</dd></div>
      <div><dt>Privacy</dt><dd>{action.scope}</dd></div>
    </dl>
    <footer>
      <span className={`ap-gate ${gated ? 'gated' : 'open'}`}>
        <ShieldCheck size={12} /> {gated ? 'Approval required' : `Autonomy level ${net.autonomy} permits this`}
      </span>
      <EvidenceLink ids={action.evidenceIds} label="Evidence" />
      {action.status === 'prepared' ? <div className="ap-actions">
        <Btn onClick={() => { os.updateAutopilotDraft(action.id, draft); os.setAutopilotStatus(action.id, 'approved') }}>Approve</Btn>
        <Btn kind="secondary" onClick={() => { if (editing) os.updateAutopilotDraft(action.id, draft); setEditing(!editing) }}>{editing ? 'Save edit' : 'Edit'}</Btn>
        <Btn kind="quiet" onClick={() => os.setAutopilotStatus(action.id, 'skipped')}>Skip</Btn>
        <Btn kind="quiet" onClick={() => os.setAutopilotStatus(action.id, 'snoozed')}>Snooze</Btn>
      </div> : <span className="ap-status">{action.status}</span>}
    </footer>
  </article>
}
