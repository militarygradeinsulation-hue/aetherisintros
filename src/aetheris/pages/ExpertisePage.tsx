import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Head as _H, memberById } from '../ui'

type Tab = 'expertise' | 'marketplace' | 'referrals' | 'introducers'

export function ExpertisePage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [tab, setTab] = useState<Tab>('expertise')
  const [need, setNeed] = useState('')
  const [ctxFor, setCtxFor] = useState<string | null>(null)
  const [context, setContext] = useState('')

  const offers = pro.matchExpertise(need)
  const listings = pro.marketplaceRanked({ connections: net.connections, ...(need.trim() ? { need } : {}) })

  return <>
    <Head
      label="EXPERTISE EXCHANGE"
      title="Ask the person who has actually done it."
      copy="Members publish narrow, bounded expertise: the topic, who it is for, the format, how long it takes, and what they will not do. You bring one specific question. Nobody is agreeing to an open-ended relationship, so more people say yes."
      proof={`${pro.expertise.length} offers · ${pro.referrals.length} referrals on record · ranking is never paid for`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('knowledgeassets')}>Knowledge assets <ArrowRight size={13} /></Btn>}
    />

    <div className="filter-chips">
      {(['expertise', 'marketplace', 'referrals', 'introducers'] as Tab[]).map(t =>
        <button key={t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
          {t === 'expertise' ? 'Expertise offers' : t === 'marketplace' ? 'Trusted providers' : t === 'referrals' ? 'Referrals' : 'Introducers'}
        </button>)}
    </div>

    <label className="need-search">What are you actually trying to work out?
      <input value={need} onChange={e => setNeed(e.target.value)} placeholder="Pricing a services business before a raise" />
    </label>

    {tab === 'expertise' && <section className="expertise-list">
      {offers.map(({ offer, fit }) => {
        const m = memberById(net.members, offer.memberId)
        const mine = offer.memberId === 'me'
        return <article key={offer.id} className="module expertise-card">
          <header>
            <div>{m && <Face person={m} />}
              <div><Eyebrow>{offer.terms.toUpperCase()} · {offer.format.toUpperCase()}</Eyebrow>
                <h3>{offer.topic}</h3>
                <small>{mine ? 'Published by you' : m ? `${m.name} · ${m.title}` : 'Member'}</small></div></div>
            <span className="expertise-score">{fit.score}</span>
          </header>
          <p>{offer.offer}</p>
          <dl className="opp-grid">
            <div><dt>Who it is for</dt><dd>{offer.audience}</dd></div>
            <div><dt>Time</dt><dd>{offer.durationMinutes} minutes · {offer.availability}</dd></div>
            <div><dt>Will not do</dt><dd>{offer.constraints}</dd></div>
            <div><dt>Open until</dt><dd>{offer.expiresOn}</dd></div>
          </dl>
          <p className="why-intros"><span><b>Why this appears.</b> {fit.why}</span></p>
          <footer className="opp-foot">
            <Btn kind="secondary" onClick={() => pro.toggleExpertiseSave(offer.id)}>{offer.saved ? 'Saved' : 'Save'}</Btn>
            {!mine && <Btn onClick={() => setCtxFor(ctxFor === offer.id ? null : offer.id)}>Request this</Btn>}
            {m && !mine && <Btn kind="quiet" onClick={() => nav.openMember(m)}>Open profile</Btn>}
          </footer>
          {ctxFor === offer.id && <div className="opp-respond">
            <label>Your one specific question, and the context needed to answer it
              <textarea rows={3} value={context} onChange={e => setContext(e.target.value)} placeholder="Be precise. A vague request wastes the slot and gets declined." />
            </label>
            <Btn disabled={context.trim().length < 20} onClick={() => { pro.requestExpertise(offer.id, context.trim()); setContext(''); setCtxFor(null) }}>Send request</Btn>
          </div>}
          {!!offer.requests.length && mine && <div className="opp-questions">
            <Eyebrow>REQUESTS TO YOU</Eyebrow>
            {offer.requests.map(r => <p key={r.id}>
              <b>{memberById(net.members, r.memberId)?.name ?? 'You'}:</b> {r.context}
              <span className="req-state">{r.state}</span>
              {r.state === 'requested' && <>
                <button className="text-action" onClick={() => pro.setExpertiseRequestState(offer.id, r.id, 'scheduled')}>Schedule</button>
                <button className="text-action" onClick={() => pro.setExpertiseRequestState(offer.id, r.id, 'declined')}>Decline</button>
              </>}
            </p>)}
          </div>}
        </article>
      })}
      <article className="module expertise-publish">
        <Eyebrow>PUBLISH YOUR OWN</Eyebrow>
        <h3>Give before you ask. It is the fastest way to be worth knowing here.</h3>
        <Btn kind="secondary" onClick={() => pro.publishExpertise({
          topic: net.profile.canHelpWith || 'What I can help with',
          offer: `A bounded ${30} minute conversation on ${(net.profile.canHelpWith || 'my area').toLowerCase()}, for people with a specific decision in front of them.`,
          industries: net.profile.industries ?? [],
        })}>Publish a bounded offer from your profile</Btn>
      </article>
    </section>}

    {tab === 'marketplace' && <section className="expertise-list">
      {listings.map(({ listing, why, score }) => {
        const m = memberById(net.members, listing.memberId)
        return <article key={listing.id} className="module expertise-card">
          <header>
            <div>{m && <Face person={m} />}
              <div><Eyebrow>{listing.kind.toUpperCase()}</Eyebrow><h3>{listing.headline}</h3>
                <small>{m ? `${m.name} · ${m.company}` : 'Member'} · {listing.geography}</small></div></div>
            <span className="expertise-score">{score}</span>
          </header>
          <p>{listing.offer}</p>
          <p className="why-intros"><span><b>Why this appears.</b> {why}</span></p>
          <p className="opp-evidence"><b>Rationale.</b> {listing.rationale}</p>
          <footer className="opp-foot">
            {m && <Btn onClick={() => nav.openMember(m)}>Open profile</Btn>}
            {m && <Btn kind="secondary" onClick={() => nav.messageMember(m.id)}>Ask a question</Btn>}
          </footer>
        </article>
      })}
    </section>}

    {tab === 'referrals' && <section className="expertise-list">
      {pro.referrals.map(r => {
        const referee = memberById(net.members, r.refereeId)
        const referrer = memberById(net.members, r.referrerId)
        return <article key={r.id} className="module referral-card">
          <header>
            <div>{referee && <Face person={referee} />}
              <div><Eyebrow>{r.category.toUpperCase()} · {r.strength.toUpperCase()}</Eyebrow>
                <h3>{referee?.name ?? 'Member'}</h3>
                <small>Given by {referrer?.name ?? 'you'} · reconfirm by {r.reconfirmBy}</small></div></div>
          </header>
          <p>{r.context}</p>
          <p className="opp-evidence"><b>Evidence.</b> {r.evidence}</p>
          <p className="opp-qual"><b>Basis of the relationship.</b> {r.relationshipBasis}</p>
          <footer className="opp-foot">
            <span className="scope-tag">{r.shareable ? 'Shareable with a warm path' : 'Private to you'}</span>
            {r.referrerId === 'me' && <Btn kind="quiet" onClick={() => pro.toggleReferralShareable(r.id)}>{r.shareable ? 'Make private' : 'Make shareable'}</Btn>}
            {referee && <Btn kind="secondary" onClick={() => nav.openMember(referee)}>Open profile</Btn>}
          </footer>
        </article>
      })}
    </section>}

    {tab === 'introducers' && <section className="expertise-list">
      {pro.introducerRecords.map(rec => {
        const m = memberById(net.members, rec.memberId)
        return <article key={rec.id} className="module introducer-card">
          <header>
            <div>{m && <Face person={m} />}
              <div><Eyebrow>INTRODUCER RECORD</Eyebrow><h3>{m?.name ?? 'You'}</h3>
                <small>{rec.introStyle}</small></div></div>
          </header>
          <div className="introducer-stats">
            <div><strong>{rec.introsMade}</strong><span>introductions made</span></div>
            <div><strong>{rec.accepted}</strong><span>accepted</span></div>
            <div><strong>{rec.continuedRelationships}</strong><span>still active</span></div>
            <div><strong>{rec.outcomesCreated}</strong><span>outcomes created</span></div>
            <div><strong>{rec.typicalResponseHours}h</strong><span>typical response</span></div>
          </div>
          <p><b>Best for.</b> {rec.bestFor.join(' · ')}</p>
          <p className="opp-qual"><b>How they decline.</b> {rec.declinePattern}</p>
          <p className="why-intros"><span>{rec.note}</span></p>
        </article>
      })}
    </section>}

    <section className="teach-block">
      <div><Eyebrow>WHY REPUTATION HERE IS NOT A SCORE</Eyebrow>
        <h2>Being a good introducer is a professional skill. It should be visible.</h2>
        <p>Referrals name the category, the context and the evidence, and expire until reconfirmed, so nothing becomes a stale endorsement. Introducer records show whether introductions actually turned into relationships. Providers appear because of proof, referrals and real availability — never because they paid.</p>
        <button className="text-action" onClick={() => nav.setPage('talent')}>Find people for a real problem <ArrowRight size={14} /></button></div>
    </section>
  </>
}
