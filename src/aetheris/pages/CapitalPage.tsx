import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Numeral, memberById } from '../ui'
import { capitalFit } from '../domain/pro-engine'

type Tab = 'capital' | 'acquisition' | 'board'

export function CapitalPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [tab, setTab] = useState<Tab>('capital')

  const investors = pro.capital.filter(c => c.side === 'investor')
  const companies = pro.capital.filter(c => c.side === 'company')

  return <>
    <Head
      label="CAPITAL, OWNERSHIP AND GOVERNANCE"
      title="Serious money conversations, without a pitch queue."
      copy="Investors publish a thesis, stage, sector, timing and explicit exclusions. Companies publish purpose, traction, use of funds and round state. Aetheris only puts them in front of each other when thesis and timing genuinely align — and always through a warm path."
      proof={`${investors.length} investor profiles · ${companies.length} companies · ${pro.acquisitions.filter(a => a.confidential).length} confidential owner conversations`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('opportunities')}>Opportunity exchange <ArrowRight size={13} /></Btn>}
    />

    <div className="filter-chips">
      {(['capital', 'acquisition', 'board'] as Tab[]).map(t => <button key={t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
        {t === 'capital' ? 'Capital fit' : t === 'acquisition' ? 'Acquisition and succession' : 'Board and advisory'}
      </button>)}
    </div>

    {tab === 'capital' && <section className="capital-grid">
      {companies.map(company => {
        const companyMember = memberById(net.members, company.memberId)
        return <article key={company.id} className="module capital-card">
          <header>
            <div>{companyMember && <Face person={companyMember} />}
              <div><Eyebrow>RAISING · {company.openness.toUpperCase()}</Eyebrow>
                <h3>{companyMember?.company ?? 'Company'}</h3>
                <small>{company.raisePurpose ?? company.thesis}</small></div></div>
          </header>
          <dl className="opp-grid">
            <div><dt>Traction</dt><dd>{company.traction ?? 'Stated privately.'}</dd></div>
            <div><dt>Use of funds</dt><dd>{company.useOfFunds ?? 'Stated privately.'}</dd></div>
            <div><dt>Round state</dt><dd>{company.roundState ?? company.timing}</dd></div>
            <div><dt>Wants</dt><dd>{company.desiredInvestorProfile ?? 'Investors who have done this stage before.'}</dd></div>
          </dl>

          <div className="capital-matches">
            <Eyebrow>THESIS AND TIMING CHECK</Eyebrow>
            {investors.map(inv => {
              const fit = capitalFit(inv, company)
              const invMember = memberById(net.members, inv.memberId)
              return <div key={inv.id} className={`capital-match ${fit.verdict === 'Not a fit right now' ? 'cold' : ''}`}>
                <div className="capital-match-head">
                  <div><strong>{invMember?.name ?? 'Investor'}</strong><small>{inv.thesis}</small></div>
                  <Numeral value={fit.score} />
                </div>
                <p className="capital-verdict">{fit.verdict}</p>
                {!!fit.aligned.length && <p><b>Aligned.</b> {fit.aligned.join(' · ')}</p>}
                {!!fit.gaps.length && <p className="capital-gap"><b>Gaps.</b> {fit.gaps.join(' · ')}</p>}
                <p className="why-intros"><span><b>What to do.</b> {fit.guidance}</span></p>
                {invMember && fit.verdict !== 'Not a fit right now' && <div className="opp-foot">
                  <Btn kind="secondary" onClick={() => nav.openIntro(invMember)}>Request a warm path</Btn>
                  <Btn kind="quiet" onClick={() => nav.openMember(invMember)}>Open profile</Btn>
                </div>}
              </div>
            })}
          </div>
        </article>
      })}
    </section>}

    {tab === 'acquisition' && <section className="capital-grid">
      {pro.acquisitions.map(a => {
        const m = memberById(net.members, a.memberId)
        const revealed = a.identityRevealed || !a.confidential
        return <article key={a.id} className="module acquisition-card">
          <header>
            <div><Eyebrow>{a.role.toUpperCase()} · {a.interestLevel.toUpperCase()}{a.confidential ? ' · CONFIDENTIAL' : ''}</Eyebrow>
              <h3>{a.sector} · {a.sizeBand}</h3>
              <small>{revealed ? (m ? `${m.name} · ${m.company}` : 'You') : 'Identity withheld until both sides agree to proceed'}</small></div>
          </header>
          <dl className="opp-grid">
            <div><dt>Timeline</dt><dd>{a.timeline}</dd></div>
            <div><dt>Geography</dt><dd>{a.geography}</dd></div>
            <div><dt>Company characteristics</dt><dd>{a.companyCharacteristics}</dd></div>
            <div><dt>Structure preference</dt><dd>{a.structurePreference}</dd></div>
            <div><dt>Operator need</dt><dd>{a.operatorNeed || 'None stated.'}</dd></div>
            <div><dt>Financing need</dt><dd>{a.financingNeed || 'None stated.'}</dd></div>
          </dl>
          {!!a.evidence.length && <p className="opp-evidence"><b>Evidence.</b> {a.evidence.join(' · ')}</p>}
          <p className="why-intros"><span><b>How this stays safe.</b> Nothing about this moves without an explicit approval from both sides, and identity is only revealed when both have approved. {a.approvals.length} approval{a.approvals.length === 1 ? '' : 's'} recorded so far.</span></p>
          <footer className="opp-foot">
            <Btn kind="secondary" onClick={() => pro.approveAcquisitionStep(a.id)}>Approve the next step</Btn>
            {!a.identityRevealed && a.confidential && <Btn kind="quiet" onClick={() => pro.revealAcquisitionIdentity(a.id)}>Reveal identity to the other side</Btn>}
            {a.memberId === 'me' && <Btn kind="quiet" onClick={() => pro.setAcquisitionInterest(a.id, a.interestLevel === 'Exploring' ? 'Serious' : 'Under agreement')}>Move to {a.interestLevel === 'Exploring' ? 'serious' : 'under agreement'}</Btn>}
            <Btn kind="quiet" onClick={() => nav.setPage('knowledgeassets')}>Ask for human review</Btn>
          </footer>
        </article>
      })}
    </section>}

    {tab === 'board' && <section className="capital-grid">
      {pro.boardIntents.map(b => {
        const m = memberById(net.members, b.memberId)
        return <article key={b.id} className="module board-card">
          <header>
            <div>{m && <Face person={m} />}
              <div><Eyebrow>{b.side === 'company' ? 'COMPANY SEEKING' : 'MEMBER OFFERING'} · {b.openness.toUpperCase()}</Eyebrow>
                <h3>{b.side === 'company' ? `${b.companyStage} · ${b.sector}` : (m?.name ?? 'You')}</h3>
                <small>{b.cadence} · {b.compensation} · {b.geography}</small></div></div>
          </header>
          <dl className="opp-grid">
            {!!b.expertiseNeeded.length && <div><dt>Expertise needed</dt><dd>{b.expertiseNeeded.join(' · ')}</dd></div>}
            {!!b.expertiseOffered.length && <div><dt>Expertise offered</dt><dd>{b.expertiseOffered.join(' · ')}</dd></div>}
            <div><dt>Commitment</dt><dd>{b.commitment}</dd></div>
            <div><dt>Company size</dt><dd>{b.companySize}</dd></div>
            {!!b.conflicts.length && <div><dt>Declared conflicts</dt><dd>{b.conflicts.join(' · ')}</dd></div>}
          </dl>
          <footer className="opp-foot">
            {m && b.memberId !== 'me' && <Btn kind="secondary" onClick={() => nav.openIntro(m)}>Request a warm path</Btn>}
            {b.memberId === 'me' && <Btn kind="quiet" onClick={() => pro.setBoardOpenness(b.id, b.openness === 'Open' ? 'Selective' : b.openness === 'Selective' ? 'Closed' : 'Open')}>Openness: {b.openness}</Btn>}
            <Btn kind="quiet" onClick={() => nav.setPage('boards')}>Private advisory boards</Btn>
          </footer>
        </article>
      })}
    </section>}

    <section className="teach-block">
      <div><Eyebrow>WHY NOBODY GETS PITCHED HERE</Eyebrow>
        <h2>Alignment first. Introduction second. Pitch only if invited.</h2>
        <p>Exclusions are honoured, not ignored. If the stage or sector is wrong, Aetheris says so and tells you what would have to change instead of routing a hopeful pitch. Confidential owner conversations reveal nothing — not even identity — until both sides approve.</p>
        <button className="text-action" onClick={() => nav.setPage('permission')}>See how permission to pitch works <ArrowRight size={14} /></button></div>
    </section>
  </>
}
