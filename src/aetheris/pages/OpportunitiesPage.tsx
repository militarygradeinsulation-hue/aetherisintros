import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Numeral, Why, memberById } from '../ui'
import { OpenDealRoomButton } from '../deals-ui'

const kinds = ['All', 'Partnership', 'Advisory role', 'Board seat', 'Acquisition', 'Investment', 'Pilot', 'Hiring', 'Expert request'] as const

export function OpportunitiesPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [kind, setKind] = useState<string>('All')
  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [question, setQuestion] = useState('')

  const ranked = pro.rankOpportunities({
    industries: net.profile.industries ?? [],
    expertise: net.profile.expertise ?? [],
    connections: net.connections,
  }).filter(r => kind === 'All' || r.opportunity.kind === kind)

  return <>
    <Head
      label="OPPORTUNITY EXCHANGE"
      title="Real opportunity, posted by the person who owns it."
      copy="Partnerships, advisory seats, pilots, capital, acquisitions and expert requests — each one carries the objective, who it is for, what qualifies you, what is offered in return, and an expiry date so nothing lingers as noise."
      proof={`${pro.opportunities.filter(o => o.status !== 'expired').length} live · ranked by fit and relationship path, never by payment`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('rooms')}>Opportunity rooms <ArrowRight size={13} /></Btn>}
    />

    <div className="filter-chips">
      {kinds.map(k => <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}
    </div>

    <section className="opp-list">
      {ranked.map(({ opportunity: o, fit }) => {
        const owner = memberById(net.members, o.ownerId)
        const open = openId === o.id
        return <article key={o.id} className={`module opp-card ${fit.expired ? 'expired' : ''}`}>
          <header>
            <div>
              <Eyebrow>{o.kind.toUpperCase()}{o.confidential ? ' · CONFIDENTIAL' : ''}</Eyebrow>
              <h3>{o.title}</h3>
              <small>{o.confidential && !owner ? 'Identity withheld until both sides agree' : owner ? `${owner.name} · ${owner.title}` : 'Member of the network'}</small>
            </div>
            <Numeral value={fit.score} />
          </header>

          <p className="opp-objective">{o.objective}</p>
          <dl className="opp-grid">
            <div><dt>Who it is for</dt><dd>{o.whoItIsFor}</dd></div>
            <div><dt>What is needed</dt><dd>{o.whatIsNeeded}</dd></div>
            <div><dt>What is offered</dt><dd>{o.whatIsOffered}</dd></div>
            <div><dt>Mutual value</dt><dd>{o.mutualValue}</dd></div>
            <div><dt>Why now</dt><dd>{o.whyNow}</dd></div>
            <div><dt>{fit.expired ? 'Expired' : 'Closes'}</dt><dd>{o.expiresOn}</dd></div>
          </dl>

          {!!o.qualification.length && <p className="opp-qual"><b>What qualifies someone.</b> {o.qualification.join(' · ')}</p>}
          {!!o.evidence.length && <p className="opp-evidence"><b>Evidence.</b> {o.evidence.join(' · ')}</p>}
          <Why>{fit.why}{fit.missing.length ? ` Still unproven for you: ${fit.missing.join(', ')}.` : ''}</Why>

          <footer className="opp-foot">
            {owner && <Btn kind="quiet" onClick={() => nav.openMember(owner)}>Open profile</Btn>}
            <Btn kind="secondary" onClick={() => pro.toggleOpportunitySave(o.id)}>{o.saved ? 'Saved' : 'Save'}</Btn>
            {fit.expired
              ? <Btn kind="secondary" onClick={() => pro.renewOpportunity(o.id)}>Renew for 30 days</Btn>
              : <Btn onClick={() => setOpenId(open ? null : o.id)}>{open ? 'Close' : 'Express interest'}</Btn>}
            <OpenDealRoomButton kind="quiet" draft={{
              sourceKind: 'manual', sourceId: null, title: o.title, counterpartId: owner?.id ?? null, ...(owner ? { counterpartName: owner.name } : {}),
              need: [o.whatIsNeeded && `Needed: ${o.whatIsNeeded}`, o.whatIsOffered && `Offered: ${o.whatIsOffered}`, o.mutualValue && `Mutual value: ${o.mutualValue}`].filter(Boolean).join('\n'),
            }} />
          </footer>

          {open && <div className="opp-respond">
            <label>What is the specific reason this is a fit for you?
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="One paragraph. No pitch, no template." />
            </label>
            <div className="opp-respond-actions">
              <Btn disabled={note.trim().length < 12} onClick={() => { pro.expressInterest(o.id, note.trim()); setNote(''); setOpenId(null) }}>Send interest</Btn>
              <Btn kind="secondary" disabled={note.trim().length < 12} onClick={() => { pro.expressInterest(o.id, note.trim(), 'warm-path'); setNote(''); setOpenId(null) }}>Ask for a warm path instead</Btn>
            </div>
            <label>Or ask a question in public so everyone benefits from the answer
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What does the first 90 days look like?" />
            </label>
            <Btn kind="quiet" disabled={question.trim().length < 8} onClick={() => { pro.askOpportunityQuestion(o.id, question.trim()); setQuestion('') }}>Ask publicly</Btn>
          </div>}

          {!!o.questions.length && <div className="opp-questions">
            <Eyebrow>OPEN QUESTIONS</Eyebrow>
            {o.questions.map(q => <p key={q.id}><b>{q.question}</b>{q.answer ? <span> {q.answer}</span> : <em> Awaiting an answer from the owner.</em>}</p>)}
          </div>}

          {!!o.interest.length && <p className="opp-interest">{o.interest.length} member{o.interest.length === 1 ? '' : 's'} in conversation. Interest is private to the owner.</p>}
        </article>
      })}
      {!ranked.length && <p className="empty-state">No live opportunity in this category. Post one and it will be routed by fit, not blasted to everyone.</p>}
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY THIS IS NOT A JOB BOARD OR A LEAD LIST</Eyebrow>
        <h2>Every opportunity here expires, and every ranking explains itself.</h2>
        <p>Nobody can pay to appear higher. Ranking comes from your industries, your proven expertise, whether you already have a relationship with the owner, and whether the objective carries evidence. Interest is private, questions are public, and the moment two parties are serious it becomes a deal room with real diligence.</p>
        <button className="text-action" onClick={() => nav.setPage('deals')}>See deal rooms <ArrowRight size={14} /></button></div>
    </section>
  </>
}
