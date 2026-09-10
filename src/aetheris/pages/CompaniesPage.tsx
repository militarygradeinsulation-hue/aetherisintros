import { AlertTriangle, ArrowLeft, Check, Lightbulb, MessageSquareText, ShieldCheck } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { useMoat } from '../moat-store'
import { Btn, Eyebrow, Face, Head, Numeral, Why } from '../ui'
import { assessCompanyFit, deriveChain } from '../domain/engine'
import type { CompanyProfile } from '../domain/models'

export function CompaniesPage({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string | null) => void }) {
  const platform = usePlatform()
  const net = useNetwork()
  const open = platform.companies.find(c => c.id === openId) ?? null
  if (open) return <CompanyDetail company={open} onBack={() => setOpenId(null)} />

  return <>
    <Head
      label="COMPANIES / ORGANIZATIONAL VIEW"
      title="You do not reach a company. You reach a person inside it."
      copy="Every organization here shows the people you already know, the strongest entry, the conversations that already happened, and what went quiet."
      proof={`${platform.companies.length} organizations mapped from your relationships`}
    />
    <section className="company-list">
      {platform.companies.map(c => <CompanyRow key={c.id} company={c} score={assessCompanyFit(c, { members: net.members, systems: platform.systems, intents: platform.intents, circles: platform.circles, relationships: platform.orgRelationships, outcomes: platform.outcomes }).score} onOpen={() => setOpenId(c.id)} />)}
    </section>
  </>
}

function CompanyRow({ company, score, onOpen }: { company: CompanyProfile; score: number; onOpen: () => void }) {
  const net = useNetwork()
  const people = company.peopleIds.map(id => net.members.find(m => m.id === id)).filter(Boolean).slice(0, 3)
  return <article className="company-row">
    <button onClick={onOpen}>
      <Eyebrow>{company.industry.toUpperCase()}</Eyebrow>
      <h3>{company.name}</h3>
      <small>{company.location} · {company.size}</small>
      <p>{company.strongestEntry}</p>
    </button>
    <div className="company-row-side">
      <div className="company-fit-preview"><strong>{score}</strong><span>GOLDEN FIT<br />/100</span></div>
      <div className="circle-faces">{people.map(m => m && <Face key={m.id} person={m} />)}<small>{company.peopleIds.length} known</small></div>
      <Btn kind="secondary" onClick={onOpen}>Open organization</Btn>
    </div>
  </article>
}

function CompanyDetail({ company, onBack }: { company: CompanyProfile; onBack: () => void }) {
  const platform = usePlatform()
  const net = useNetwork()
  const nav = useNav()
  const moat = useMoat()
  const passport = moat.orgPassports.find(p => p.companyId === company.id || p.companyName === company.name)
  const people = company.peopleIds.map(id => net.members.find(m => m.id === id)).filter(Boolean)
  const systems = platform.systems.filter(s => company.relevantSystemIds.includes(s.id))
  const intents = platform.intents.filter(i => company.openIntentIds.includes(i.id))
  const circles = platform.circles.filter(c => company.relatedCircleIds.includes(c.id))
  const orgRels = platform.orgRelationships.filter(r => r.companyName === company.name)
  const strongest = [...people].filter(Boolean).sort((a, b) => b!.score.trust - a!.score.trust)[0]
  const chain = strongest ? deriveChain(strongest, net.members) : null
  const fit = assessCompanyFit(company, {
    members: net.members, systems: platform.systems, intents: platform.intents,
    circles: platform.circles, relationships: platform.orgRelationships, outcomes: platform.outcomes,
  })

  return <article className="company-detail">
    <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> All companies</button>
    <header className="circle-hero">
      <div>
        <Eyebrow>{company.industry.toUpperCase()} · {company.size.toUpperCase()}</Eyebrow>
        <h1>{company.name}</h1>
        <h2>{company.strongestEntry}</h2>
        <p>{company.location}. {company.peopleIds.length} people in your graph work or worked here.</p>
        <div className="sys-hero-actions">
          {strongest && <Btn onClick={() => nav.openHandshake(strongest.id)}>Prepare handshake</Btn>}
          {strongest && <Btn kind="secondary" onClick={() => nav.messageMember(strongest.id)}><MessageSquareText size={14} /> Message {strongest.name.split(' ')[0]}</Btn>}
        </div>
      </div>
      <aside className="sys-hero-side">
        <span>CONTEXTUAL PATHS</span>
        <ul className="mod-list">{company.contextualPaths.map(p => <li key={p}>{p}</li>)}</ul>
        {chain && <><span>BEST NEXT HOP</span><p>{chain.bestNextHop}</p></>}
      </aside>
    </header>

    <section className="golden-report">
      <header className="golden-report-head">
        <div><Eyebrow>THE GOLDEN FIT REPORT</Eyebrow><h2>Company compatibility, without the sales gloss.</h2><p>{fit.standard}</p></div>
        <div className="golden-score"><strong>{fit.score}</strong><span>/100 FIT</span><em>{fit.verdict}</em><small>{fit.confidence}% evidence confidence</small></div>
      </header>
      <div className="golden-dimensions">
        {fit.dimensions.map(dimension => <article key={dimension.label}>
          <div><span>{dimension.label}</span><strong>{dimension.score}</strong></div>
          <i><b style={{ width: `${dimension.score}%` }} /></i>
          <p>{dimension.evidence}</p><small>{Math.round(dimension.weight * 100)}% of overall score</small>
        </article>)}
      </div>
      <div className="golden-truth-grid">
        <section><header><Check size={14} /><span>STRENGTHS</span></header><ul>{fit.strengths.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section><header><AlertTriangle size={14} /><span>WEAKNESSES & RISKS</span></header><ul>{fit.weaknesses.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section><header><ShieldCheck size={14} /><span>WHAT IS STILL UNKNOWN</span></header><ul>{fit.unknowns.map(item => <li key={item}>{item}</li>)}</ul></section>
      </div>
      <section className="golden-ideas">
        <header><Lightbulb size={15} /><div><span>WAYS THESE COMPANIES COULD WORK TOGETHER</span><small>Ideas are hypotheses until both sides validate them.</small></div></header>
        <div>{fit.collaborationIdeas.map((idea, index) => <article key={idea.title}><em>0{index + 1}</em><h3>{idea.title}</h3><p>{idea.detail}</p><small>FIRST STEP</small><strong>{idea.firstStep}</strong></article>)}</div>
      </section>
    </section>

    {passport && <section className="org-passport">
      <header>
        <div><Eyebrow>ORGANIZATION RELATIONSHIP PASSPORT · {passport.scope.toUpperCase()}</Eyebrow>
          <h2>Everything your side of the house knows about {passport.companyName}.</h2>
          <p>{passport.summary}</p>
          <small>Last updated {passport.updatedAt}. Only what this scope permits is shown.</small></div>
        <div className="org-passport-owners">
          <span>RELATIONSHIP OWNERS</span>
          {passport.relationshipOwners.map(o => <p key={o.memberId}><strong>{o.name}</strong><small>{o.role}</small></p>)}
        </div>
      </header>
      <div className="org-passport-grid">
        <section className="mod">
          <header><span>OPEN LOOPS</span></header>
          <ul className="mod-list amber">{passport.openLoops.map(l => <li key={l}>{l}</li>)}</ul>
          {!passport.openLoops.length && <p className="empty-state">Nothing open.</p>}
        </section>
        <section className="mod">
          <header><span>DORMANT OPPORTUNITIES</span></header>
          <ul className="mod-list">{passport.dormantOpportunities.map(l => <li key={l}>{l}</li>)}</ul>
          {!passport.dormantOpportunities.length && <p className="empty-state">Nothing dormant.</p>}
        </section>
        <section className="mod">
          <header><span>PEOPLE WHO MOVED ON</span></header>
          <ul className="mod-list">{passport.formerEmployees.map(f => <li key={f.memberId}>{f.name} — now at {f.nowAt}</li>)}</ul>
          {!passport.formerEmployees.length && <p className="empty-state">No recorded departures.</p>}
        </section>
      </div>
      <section className="mod org-passport-chronology">
        <header><span>RELATIONSHIP CHRONOLOGY</span></header>
        <ul className="mod-list">{passport.chronology.map(e => <li key={e.id}>
          <b>{e.when} · {e.kind}</b> {e.text} <small>{e.scope}</small>
        </li>)}</ul>
      </section>
    </section>}

    <div className="sys-modules">
      <section className="mod">
        <header><span>WHO YOU KNOW HERE</span></header>
        <ul className="shared-list">{people.map(m => m && <li key={m.id}>
          <Face person={m} portrait />
          <div><strong>{m.name}</strong><small>{m.title}</small></div>
          <button className="mod-link" onClick={() => nav.openMember(m)}>View</button>
        </li>)}</ul>
      </section>
      <section className="mod">
        <header><span>PREVIOUS CONVERSATIONS</span></header>
        <ul className="mod-list">{company.previousConversations.map(c => <li key={c}>{c}</li>)}</ul>
        <header className="mod-second"><span>WHAT WENT DORMANT</span></header>
        <ul className="mod-list amber">{company.dormantOpportunities.map(c => <li key={c}>{c}</li>)}</ul>
      </section>
      <section className="mod">
        <header><span>ORGANIZATIONAL RELATIONSHIPS</span></header>
        <ul className="mod-rows">{orgRels.map(r => <li key={r.id}>
          <span><b>{r.ownerName}</b><small>{r.relationshipType} · {r.note}</small></span>
          <Numeral value={r.strength} of=" strength" />
        </li>)}{orgRels.length === 0 && <li><small>No shared organizational relationships recorded.</small></li>}</ul>
      </section>
    </div>

    <div className="sys-modules two">
      <section className="mod">
        <header><span>RELEVANT SYSTEMS</span></header>
        <ul className="mod-rows">{systems.map(s => <li key={s.id}>
          <button onClick={() => nav.openSystem(s.id)}><b>{s.name}</b><small>{s.thesis}</small></button>
        </li>)}{systems.length === 0 && <li><small>Nothing of yours is a natural fit here yet.</small></li>}</ul>
        <header className="mod-second"><span>RELATED CIRCLES</span></header>
        <ul className="mod-rows">{circles.map(c => <li key={c.id}>
          <button onClick={() => nav.openCircle(c.id)}><b>{c.name}</b><small>{c.purpose}</small></button>
        </li>)}</ul>
      </section>
      <section className="mod">
        <header><span>OPEN INTENTS INSIDE</span></header>
        <ul className="mod-rows">{intents.map(i => <li key={i.id}>
          <span><b>{i.title}</b><small>{i.type} · {i.statement}</small></span>
        </li>)}{intents.length === 0 && <li><small>Nobody here has posted a live intent.</small></li>}</ul>
        {chain && <Why>{chain.recommendation}</Why>}
      </section>
    </div>

    <section className="mod">
      <header><span>RELATIONSHIP TIMELINE</span></header>
      <ol className="history-line">{company.timeline.map(t => <li key={`${t.when}-${t.text}`}><i /><div><p>{t.text}</p><small>{t.when}</small></div></li>)}</ol>
    </section>
  </article>
}
