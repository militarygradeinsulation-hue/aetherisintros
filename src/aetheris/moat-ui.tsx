/** Shared moat-layer components: passport, outreach review, serendipity, reciprocity, decay, representative. */
import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, ShieldCheck, X } from 'lucide-react'
import { Btn, Eyebrow, Face, Glyph } from './ui'
import { useMoat } from './moat-store'
import { useNetwork } from './store'
import { useNav } from './nav'
import { EvidenceLink } from './os-ui'
import {
  availabilityEligibility, canAskConnector, credibilityBand, decayFor, deriveDecay,
  passportFor, reciprocityFor, representativeReply,
} from './domain/moat-engine'
import type { OutreachQualityReview, SerendipityMatch } from './domain/moat-models'
import type { OutreachContext } from './domain/moat-engine'
import type { Member } from './social'

/* ------------------------------------------------- professional passport */

export function PassportModule({ memberId, compact = false }: { memberId: string; compact?: boolean }) {
  const moat = useMoat()
  const passport = passportFor(moat.passports, memberId)
  const band = credibilityBand(passport)
  if (!passport) {
    return <section className="module passport-module">
      <header><Eyebrow>PROFESSIONAL PASSPORT</Eyebrow><h3>No passport yet.</h3></header>
      <p className="passport-note">Every claim on this profile is self-reported. Aetheris does not award badges — credibility here means evidence for a specific conversation.</p>
    </section>
  }
  const claims = [passport.company, passport.role, ...passport.expertise]
  return <section className="module passport-module">
    <header>
      <div><Eyebrow>PROFESSIONAL PASSPORT</Eyebrow><h3>Why they are credible for this conversation.</h3></div>
      <span className={`passport-band band-${band.band.toLowerCase().replace(/[^a-z]/g, '-')}`}>{band.band}</span>
    </header>
    <p className="passport-note">{passport.credibilityNote}</p>
    <ul className="passport-claims">
      {claims.map(c => <li key={c.id} className={`claim-${c.state}`}>
        <span>{c.label}</span><strong>{c.value}</strong>
        <em>{c.state === 'verified' ? `Verified${c.verifiedBy ? ` · ${c.verifiedBy}` : ''}` : c.state === 'pending' ? 'Verification pending' : 'Self-reported'}</em>
      </li>)}
    </ul>
    {!compact && <>
      <div className="passport-grid">
        <div><span>Prior companies</span><p>{passport.priorCompanies.join(' · ') || '—'}</p></div>
        <div><span>Introductions honoured</span><p>{passport.introductionsHonoured} of {passport.introductionsCompleted}</p></div>
        <div><span>Systems contributed</span><p>{passport.systemsContributed.length || '—'}</p></div>
        <div><span>Circles</span><p>{passport.circleIds.length}</p></div>
      </div>
      {!!passport.references.length && <div className="passport-refs">
        <Eyebrow>PROFESSIONAL REFERENCES</Eyebrow>
        {passport.references.map(r => <p key={r.id}><strong>{r.name}</strong> <span>{r.relationship}</span> — {r.note} <em>{r.state}</em></p>)}
      </div>}
      <p className="passport-band-note"><Glyph size={11} />{band.note}</p>
      <EvidenceLink ids={passport.company.evidenceIds} label="Evidence behind these claims" />
    </>}
  </section>
}

/* ---------------------------------------------- outreach quality review */

export function useOutreachGate() {
  const moat = useMoat()
  const [pending, setPending] = useState<{ review: OutreachQualityReview; send: (text: string) => void } | null>(null)

  const gate = (text: string, ctx: Omit<OutreachContext, 'rules'>, send: (text: string) => void) => {
    const review = moat.review(text, ctx)
    moat.recordReview(review)
    if (review.verdict === 'Ready') { send(text); return true }
    setPending({ review, send })
    return false
  }

  const modal = pending
    ? <OutreachReviewModal
      review={pending.review}
      onClose={() => setPending(null)}
      onSend={text => { pending.send(text); setPending(null) }}
    />
    : null

  return { gate, modal }
}

export function OutreachReviewModal({ review, onClose, onSend }: {
  review: OutreachQualityReview; onClose: () => void; onSend: (text: string) => void
}) {
  const [text, setText] = useState(review.text)
  const moat = useMoat()
  const [current, setCurrent] = useState(review)
  const recheck = (next: string) => {
    const fresh = moat.review(next, { channel: review.channel, authorId: review.authorId })
    setCurrent(fresh)
    return fresh
  }
  return <div className="modal-wrap" onMouseDown={onClose}>
    <div className="modal outreach-modal" onMouseDown={e => e.stopPropagation()}>
      <header>
        <div><Eyebrow signal>NETWORK CONSTITUTION</Eyebrow>
          <h2>{current.verdict === 'Hold' ? 'This one should not be sent.' : current.verdict === 'Reads As Promotional' ? 'This reads as promotional and does not yet create clear mutual value.' : 'This needs a little more context.'}</h2>
          <p>Aetheris reviews outbound contact against the Constitution, not your tone. Normal professional conversation passes untouched.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close review"><X size={17} /></button>
      </header>
      <div className="outreach-body">
        <div>
          <label><Eyebrow>YOUR MESSAGE</Eyebrow>
            <textarea rows={6} value={text} onChange={e => { setText(e.target.value); recheck(e.target.value) }} /></label>
          <div className="outreach-actions">
            <Btn kind="secondary" onClick={() => { const next = current.suggestedRewrite; setText(next); recheck(next) }}>Rewrite for me</Btn>
            <Btn kind="secondary" onClick={() => { const next = `${text}\n\nContext: what I am moving, why now, and what you would be walking into.`; setText(next); recheck(next) }}>Add context</Btn>
            <Btn kind="quiet" onClick={onClose}>Narrow audience</Btn>
            <Btn disabled={!current.allowSend} onClick={() => onSend(text)}>
              {current.allowSend ? 'Send' : 'Send blocked'} <ArrowRight size={14} />
            </Btn>
          </div>
        </div>
        <aside>
          <div className="outreach-verdict"><strong>{current.verdict}</strong><span>message quality {current.quality}</span></div>
          <ul className="outreach-flags">
            {current.flags.map(f => <li key={f.kind}><AlertTriangle size={13} />
              <div><b>{f.principle}</b><p>{f.plainLanguage}</p><em>{f.fix}</em></div></li>)}
            {!current.flags.length && <li className="clear"><Check size={13} /><div><b>Clear</b><p>Nothing here reads as promotional.</p></div></li>}
          </ul>
          {!!current.strengths.length && <div className="outreach-strengths"><Eyebrow>WHAT WORKS</Eyebrow>
            <ul>{current.strengths.map(s => <li key={s}><Check size={12} />{s}</li>)}</ul></div>}
          <p className="outreach-private"><ShieldCheck size={12} /> Flags are private. Aetheris never publishes a reputation score.</p>
        </aside>
      </div>
    </div>
  </div>
}

/* ------------------------------------------------------ serendipity */

export function SerendipityCard({ match }: { match: SerendipityMatch }) {
  const moat = useMoat()
  const net = useNetwork()
  const nav = useNav()
  const [open, setOpen] = useState(false)
  const person = net.members.find(m => m.id === match.memberId)
  if (!person) return null
  return <article className={`serendipity-card ${open ? 'open' : ''}`}>
    <header>
      <Face person={person} />
      <div><strong>{person.name}</strong><small>{person.title} · {person.company}</small></div>
      <span className="serendipity-confidence">{match.confidence}</span>
    </header>
    <p className="serendipity-basis">{match.basis.join(' · ')}</p>
    <p className="serendipity-lead"><b>Why this is unexpected.</b> {match.whyUnexpected}</p>
    {open && <div className="serendipity-detail">
      <p><b>Why it could matter.</b> {match.whyItCouldMatter}</p>
      <p><b>Why now.</b> {match.whyNow}</p>
      <p><b>Mutual value.</b> {match.mutualValue}</p>
      <p className="serendipity-risk"><b>Risk and uncertainty.</b> {match.uncertainty}</p>
      <EvidenceLink ids={match.evidenceIds} label="Evidence behind this overlap" />
    </div>}
    <footer>
      <button className="text-action" onClick={() => setOpen(!open)}>{open ? 'Collapse' : 'Open the reasoning'}</button>
      <Btn kind="secondary" onClick={() => { net.connect(person.id); moat.setSerendipityStatus(match.id, 'acted') }}>Connect</Btn>
      <Btn kind="secondary" onClick={() => { moat.setSerendipityStatus(match.id, 'acted'); nav.openIntro(person) }}>Request intro</Btn>
      <Btn kind="quiet" onClick={() => moat.setSerendipityStatus(match.id, 'dismissed')}>Dismiss</Btn>
      <Btn kind="quiet" onClick={() => moat.setSerendipityStatus(match.id, 'not-relevant')}>Not relevant</Btn>
    </footer>
  </article>
}

/* ------------------------------------------------------ reciprocity */

export function ReciprocityNote({ memberId, circleId }: { memberId?: string; circleId?: string }) {
  const moat = useMoat()
  const signal = memberId ? reciprocityFor(moat.reciprocity, memberId) : moat.reciprocity.find(s => s.circleId === circleId && s.direction === 'you owe value')
  if (!signal) return null
  return <p className={`reciprocity-note ${signal.direction === 'you owe value' ? 'owes' : ''}`}>
    <Glyph size={11} /><span><b>Give before ask.</b> {signal.recommendation}</span>
  </p>
}

export function ConnectorAskGuard({ memberId }: { memberId: string }) {
  const moat = useMoat()
  const guard = canAskConnector(moat.reciprocity, memberId)
  return <p className={`connector-guard ${guard.safe ? '' : 'hold'}`}>
    {guard.safe ? <Check size={12} /> : <AlertTriangle size={12} />}<span>{guard.note}</span>
  </p>
}

/* --------------------------------------------------- decay prevention */

export function DecayPrevention({ person }: { person: Member }) {
  const moat = useMoat()
  const risk = useMemo(() => decayFor(moat.decay, person.id) ?? deriveDecay(person), [moat.decay, person])
  const nav = useNav()
  return <section className="module decay-module">
    <header>
      <div><Eyebrow signal>RELATIONSHIP WEATHER · PREVENTION</Eyebrow><h3>{risk.horizon}</h3></div>
      <span className="decay-risk">{risk.risk}</span>
    </header>
    <ul className="decay-causes">
      {risk.causes.map(c => <li key={c.cause}><b>{c.cause}</b><span>{c.explanation}</span></li>)}
    </ul>
    <p className="decay-action"><b>Minimum appropriate action.</b> {risk.minimumAction}</p>
    <div className="decay-actions">
      {risk.actionKind === 'do nothing yet'
        ? <span className="decay-hold">Do nothing yet — this is the healthiest move.</span>
        : <Btn kind="secondary" onClick={() => nav.messageMember(person.id)}>Take the minimum action <ArrowRight size={13} /></Btn>}
      <EvidenceLink ids={risk.evidenceIds} label="Why Intros thinks this" />
    </div>
  </section>
}

/* ---------------------------------------------- digital representative */

export function RepresentativeAsk({ person }: { person: Member }) {
  const moat = useMoat()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [log, setLog] = useState<Array<{ q: string; a: string; permitted: boolean }>>([])
  const policy = moat.representatives[0]
  if (!policy) return null
  const approvedFacts = moat.consent
    .filter(e => !e.revoked && policy.approvedScopes.includes(e.scope))
    .map(e => ({ item: e.item, detail: e.detail }))

  const ask = () => {
    if (!question.trim()) return
    const reply = representativeReply(question, policy, { ownerName: person.name, approvedFacts })
    setLog([...log, { q: question, a: reply.answer, permitted: reply.permitted }])
    moat.logRepresentative({ from: 'Preview visitor', question, answer: reply.answer, permitted: reply.permitted, handedOff: reply.handoff })
    setQuestion('')
  }

  return <section className="module rep-module">
    <header><div><Eyebrow>AETHERIS REPRESENTATIVE</Eyebrow>
      <h3>Ask their representative.</h3></div></header>
    <p className="rep-disclaimer">This is an Aetheris representative answering from {person.name.split(' ')[0]}’s approved context. It is not {person.name}, it never agrees to anything, and it cannot see private memory.</p>
    {!open && <Btn kind="secondary" onClick={() => setOpen(true)}>Ask their representative</Btn>}
    {open && <div className="rep-thread">
      {log.map((l, i) => <div key={i} className={`rep-turn ${l.permitted ? '' : 'refused'}`}>
        <p className="rep-q">{l.q}</p><p className="rep-a">{l.a}</p></div>)}
      <div className="rep-input">
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder={`Would ${person.name.split(' ')[0]} be interested in…`} onKeyDown={e => { if (e.key === 'Enter') ask() }} />
        <Btn onClick={ask}>Ask</Btn>
      </div>
      <p className="rep-limits">{policy.authorityLimits.join(' · ')}</p>
    </div>}
  </section>
}

/* ------------------------------------------ introduction availability */

export function AvailabilityWindows({ memberId }: { memberId: string }) {
  const moat = useMoat()
  const net = useNetwork()
  const windows = moat.availability.filter(w => w.memberId === memberId)
  if (!windows.length) return null
  return <section className="module intro-window-module">
    <header><div><Eyebrow>INTRODUCTION AVAILABILITY</Eyebrow>
      <h3>Published capacity, not paid access.</h3></div></header>
    {windows.map(w => {
      const state = availabilityEligibility(w, {
        contextProvided: [net.profile.focus, net.profile.lookingFor, net.profile.canHelpWith],
        relationshipStrength: 'warm',
      })
      return <article key={w.id} className={`intro-window ${state.eligible ? 'open' : 'closed'}`}>
        <header><strong>{w.category}</strong><span>{Math.max(0, state.remaining)} of {w.maxIntroductions} left · closes {w.closesAt}</span></header>
        <ul>{w.qualification.map(q => <li key={q}>{q}</li>)}</ul>
        <p className="window-note">{w.note}</p>
        {state.eligible
          ? <Btn kind="secondary" onClick={() => moat.useAvailability(w.id)}>Request through this window</Btn>
          : <p className="window-blocked"><AlertTriangle size={12} /> {state.reasons.join(' ')}</p>}
      </article>
    })}
  </section>
}
