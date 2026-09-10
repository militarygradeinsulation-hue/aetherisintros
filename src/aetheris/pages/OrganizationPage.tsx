import { useState } from 'react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Numeral, Why } from '../ui'
import { deriveWeather, weatherTone } from '../domain/engine'

/** Team / organization view: shared relationship capital without exposing private context. */
export function OrganizationPage() {
  const platform = usePlatform()
  const net = useNetwork()
  const nav = useNav()
  const [company, setCompany] = useState<string>('all')

  const companies = Array.from(new Set(platform.orgRelationships.map(r => r.companyName)))
  const rels = platform.orgRelationships.filter(r => company === 'all' || r.companyName === company)
  const shareable = rels.filter(r => r.scope !== 'private')
  const owners = Array.from(new Set(rels.map(r => r.ownerName)))
  const coverage = platform.companies.map(c => ({
    name: c.name,
    known: c.peopleIds.length,
    owners: platform.orgRelationships.filter(r => r.companyName === c.name).length,
  }))
  const atRisk = net.members
    .map(m => ({ m, w: deriveWeather(m, platform.loops) }))
    .filter(x => weatherTone[x.w.state] === 'risk' || x.w.state === 'Cooling')
    .slice(0, 5)

  return <>
    <Head
      label="ORGANIZATION / SHARED RELATIONSHIP CAPITAL"
      title="Your team already knows more people than anyone can remember."
      copy="This view shows who holds which relationship and where the door is. Private notes stay private — only the relationship itself is shared."
      proof={`${rels.length} organizational relationships · ${shareable.length} shareable with your team · ${owners.length} relationship owners`}
    />

    <div className="state-filters">
      <button className={company === 'all' ? 'active' : ''} onClick={() => setCompany('all')}>All companies</button>
      {companies.map(c => <button key={c} className={company === c ? 'active' : ''} onClick={() => setCompany(c)}>{c}</button>)}
    </div>

    <div className="sys-modules two">
      <section className="mod">
        <header><span>WHO KNOWS WHOM</span></header>
        <ul className="mod-rows">{rels.map(r => <li key={r.id}>
          <span><b>{r.ownerName} — {r.companyName}</b><small>{r.relationshipType} · {r.note}</small></span>
          <Numeral value={r.strength} of=" strength" />
        </li>)}{rels.length === 0 && <li><small>No relationships recorded for this company.</small></li>}</ul>
        <Why>Relationship strength here is derived from recency, reciprocity and delivered commitments — not from contact frequency.</Why>
      </section>
      <section className="mod">
        <header><span>COVERAGE BY ORGANIZATION</span></header>
        <ul className="coverage-list">{coverage.map(c => <li key={c.name}>
          <button onClick={() => { const found = platform.companies.find(x => x.name === c.name); if (found) nav.openCompany(found.id) }}>
            <b>{c.name}</b><small>{c.known} people known · {c.owners} internal owners</small>
          </button>
          <i><b style={{ width: `${Math.min(100, c.known * 22)}%` }} /></i>
        </li>)}</ul>
        <header className="mod-second"><span>PRIVACY RULE</span></header>
        <p className="mod-copy">Shared here: the fact of a relationship, its strength band and the door it opens. Never shared: private notes, commercial constraints, or anything scoped private by its owner.</p>
      </section>
    </div>

    <section className="mod">
      <header><span>RELATIONSHIPS AT RISK ACROSS THE TEAM</span></header>
      <ul className="shared-list">{atRisk.map(({ m, w }) => <li key={m.id}>
        <Face person={m} portrait />
        <div><strong>{m.name}</strong><small>{w.state} — {w.why}</small></div>
        <div className="row-actions">
          <Btn kind="quiet" onClick={() => nav.openMember(m)}>Open</Btn>
          <Btn kind="quiet" onClick={() => nav.messageMember(m.id)}>Reopen</Btn>
        </div>
      </li>)}{atRisk.length === 0 && <li><small>No relationship is currently cooling or at risk.</small></li>}</ul>
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY THIS EXISTS</Eyebrow>
        <h2>Relationship capital should survive a person leaving.</h2>
        <p>When a team member moves on, the door they opened usually closes with them. Organizational memory keeps the relationship legible without turning it into a contact database.</p>
      </div>
      <ul className="teach-points">
        <li><b>Owned, not pooled</b><span>Each relationship keeps its owner.</span></li>
        <li><b>Doors, not dossiers</b><span>Only what opens a conversation is shared.</span></li>
        <li><b>Consent first</b><span>Introductions still require both sides to agree.</span></li>
      </ul>
    </section>
  </>
}
