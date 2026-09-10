import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Numeral, memberById } from '../ui'
import type { PrivacyScope } from '../types'

const scopes: PrivacyScope[] = ['private', 'team', 'organization', 'shareable', 'public']

export function PassportPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [memberId, setMemberId] = useState('me')
  const passport = pro.passportProfiles.find(p => p.memberId === memberId)
  const credibility = pro.credibility(memberId)
  const graph = pro.proofGraph(memberId)
  const reputations = pro.reputationFor(memberId)
  const credentials = pro.credentials.filter(c => c.memberId === memberId)
  const person = memberId === 'me'
    ? { id: 'me', name: net.profile.name, initials: net.profile.initials }
    : memberById(net.members, memberId)

  return <>
    <Head
      label="PROFESSIONAL PASSPORT"
      title="Real identity. Real work. Verified where it matters."
      copy="A passport is not a resume. It separates what has been verified from what is self-stated, shows the work itself with the evidence attached, and lets you control the audience for every field independently."
      proof={`${credibility.verified} verified credentials · ${graph.nodes.length} proof nodes · ${credibility.selfStated} claims labelled self-stated`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('profile')}>Your public profile <ArrowRight size={13} /></Btn>}
    />

    <div className="filter-chips">
      {['me', ...pro.passportProfiles.filter(p => p.memberId !== 'me').map(p => p.memberId)].map(id => {
        const m = id === 'me' ? { name: 'You' } : memberById(net.members, id)
        return m ? <button key={id} className={`chip ${memberId === id ? 'on' : ''}`} onClick={() => setMemberId(id)}>{m.name}</button> : null
      })}
    </div>

    {passport && person && <section className="passport-layout">
      <article className="module passport-main">
        <header className="passport-head">
          <Face person={person} portrait />
          <div>
            <Eyebrow>{passport.identityState === 'verified' ? 'IDENTITY VERIFIED' : 'IDENTITY UNVERIFIED'}</Eyebrow>
            <h2>{person.name}</h2>
            <p className="passport-headline">{passport.headline}</p>
            <small>{passport.identityNote}</small>
          </div>
          <div className="passport-score">
            <Numeral value={credibility.score} />
            <span>{credibility.verdict}</span>
          </div>
        </header>

        <p className="passport-summary">{passport.credibilitySummary}</p>
        <p className="why-intros"><span><b>How this reading is built.</b> {credibility.reasoning}</span></p>

        <div className="passport-stats">
          <div><strong>{passport.outcomesCreated}</strong><span>outcomes created</span></div>
          <div><strong>{passport.introductionsCompleted}</strong><span>introductions completed</span></div>
          <div><strong>{passport.referencesVerified}</strong><span>references verified</span></div>
        </div>

        <div className="deal-block">
          <Eyebrow>WHAT THEY ARE TRUSTED WITH</Eyebrow>
          <p className="availability-copy">Expertise here is functional, not a title. {passport.functionalExpertise.join(' · ')}</p>
          <p className="availability-copy">Industries: {passport.industries.join(' · ')}</p>
          <p className="availability-copy">Contact preferences: {passport.contactPreferences.join(' · ')}</p>
        </div>

        <div className="deal-block">
          <Eyebrow>CREDENTIALS</Eyebrow>
          {credentials.map(c => <div key={c.id} className="credential-row">
            <div><strong>{c.title}</strong><small>{c.kind} · {c.organization} · {c.from}{c.to ? ` – ${c.to}` : ' – present'}</small>
              <em>{c.detail}</em></div>
            <div className="credential-state">
              <span className={`verify-tag ${c.state}`}>{c.state.replace('-', ' ')}</span>
              {c.verifiedBy && <small>Verified by {c.verifiedBy}</small>}
            </div>
          </div>)}
          {!credentials.length && <p className="empty-state">Nothing recorded yet.</p>}
        </div>

        <div className="deal-block">
          <Eyebrow>PROOF OF WORK</Eyebrow>
          <p className="availability-copy">{graph.answer}</p>
          <div className="proof-kinds">{graph.byKind.map(k => <span key={k.kind} className="scope-tag">{k.count} {k.kind.toLowerCase()}</span>)}</div>
          {graph.nodes.map(n => <div key={n.id} className="proof-row">
            <div><Eyebrow>{n.kind.toUpperCase()}</Eyebrow><strong>{n.label}</strong>
              <small>{n.role} · {n.from}{n.to ? ` – ${n.to}` : ''}</small>
              <em>{n.contribution}</em>
              <p className="proof-evidence"><b>Evidence.</b> {n.evidence}</p>
              {!!n.collaboratorIds.length && <div className="proof-collaborators">
                {n.collaboratorIds.map(id => {
                  const m = memberById(net.members, id)
                  return m ? <button key={id} className="text-action" onClick={() => nav.openMember(m)}>{m.name}</button> : null
                })}
              </div>}
            </div>
            <span className={`verify-tag ${n.state}`}>{n.state.replace('-', ' ')}</span>
          </div>)}
        </div>

        {!!graph.edges.length && <div className="deal-block">
          <Eyebrow>HOW THE WORK CONNECTS</Eyebrow>
          {graph.edges.map(e => {
            const from = pro.proofNodes.find(n => n.id === e.fromId)
            const to = pro.proofNodes.find(n => n.id === e.toId)
            return <p key={e.id} className="proof-edge"><b>{from?.label ?? e.fromId}</b> {e.kind.replace(/-/g, ' ')} <b>{to?.label ?? e.toId}</b> — {e.note}</p>
          })}
        </div>}
      </article>

      <aside className="passport-rail">
        <div className="module">
          <Eyebrow>CONTEXTUAL REPUTATION</Eyebrow>
          <p className="availability-copy">Not one score. Reputation here is specific to a context, and states what someone is trusted with.</p>
          {reputations.map(r => <div key={r.id} className="reputation-row">
            <strong>{r.context}</strong>
            <p><b>Best for.</b> {r.bestFor}</p>
            {!!r.trustedIn.length && <p><b>Trusted in.</b> {r.trustedIn.join(' · ')}</p>}
            {!!r.provenWith.length && <p><b>Proven with.</b> {r.provenWith.join(' · ')}</p>}
            <div className="reputation-stats">
              <span>{r.outcomesCreated} outcomes</span>
              <span>intro quality {r.introQuality}</span>
              <span>referral strength {r.referralStrength}</span>
            </div>
            <small>{r.sourceType} · confidence {r.confidence} · {r.scope}</small>
          </div>)}
          {!reputations.length && <p className="empty-state">No contextual reputation recorded yet.</p>}
        </div>

        {memberId === 'me' && <div className="module">
          <Eyebrow>WHO SEES WHICH FIELD</Eyebrow>
          <p className="availability-copy">Every field carries its own audience. Nothing here is all-or-nothing.</p>
          {Object.entries(passport.fieldScopes).map(([field, scope]) => <label key={field} className="scope-control">
            <span>{field}</span>
            <select value={scope} onChange={e => pro.setFieldScope('me', field, e.target.value as PrivacyScope)}>
              {scopes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>)}
        </div>}

        <div className="module">
          <Eyebrow>WHAT VERIFICATION MEANS</Eyebrow>
          <p><b>Verified.</b> A named organisation or reference confirmed it.</p>
          <p><b>Self-reported.</b> The member stated it. Shown, and labelled.</p>
          <p><b>Pending.</b> Submitted, not yet confirmed.</p>
          <p>Aetheris never quietly upgrades a self-stated claim, and matching weights verified work more heavily than claims.</p>
        </div>
      </aside>
    </section>}

    <section className="teach-block">
      <div><Eyebrow>WHY A PASSPORT INSTEAD OF A PROFILE</Eyebrow>
        <h2>Titles are cheap. Work with evidence attached is not.</h2>
        <p>A passport shows the projects, companies, systems, outcomes, introductions and references behind a person, and who they did them with. That is what makes a reference call unnecessary, and it is what lets Aetheris explain a recommendation instead of asserting one.</p>
        <button className="text-action" onClick={() => nav.setPage('expertise')}>See referrals and introducer records <ArrowRight size={14} /></button></div>
    </section>
  </>
}
