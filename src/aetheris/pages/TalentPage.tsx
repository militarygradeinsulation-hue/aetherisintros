import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, memberById } from '../ui'
import type { SuggestedTeam } from '../domain/pro-models'

export function TalentPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [draft, setDraft] = useState<SuggestedTeam | null>(null)
  const [title, setTitle] = useState('')
  const [problem, setProblem] = useState('')

  return <>
    <Head
      label="CAPABILITY AND TEAMS"
      title="Post the problem. Not a job description."
      copy="Members describe what they are trying to solve, why it matters and what good looks like. Aetheris then proposes the shape of a team — executive, operator, advisor, fractional or project — from people already reachable through real relationships, and shows why each person belongs there."
      proof={`${pro.problems.filter(p => p.status === 'open').length} open problems · ${pro.teams.length} saved teams · no job board, no applications`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('expertise')}>Expertise exchange <ArrowRight size={13} /></Btn>}
    />

    <section className="module talent-post">
      <Eyebrow>POST A PROBLEM</Eyebrow>
      <label>What are you trying to solve?
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Second shift is producing 40% of first shift output" />
      </label>
      <label>The problem in plain language, including what you have already tried
        <textarea rows={3} value={problem} onChange={e => setProblem(e.target.value)} placeholder="No job description. Describe the situation and what good would look like." />
      </label>
      <Btn disabled={title.trim().length < 8 || problem.trim().length < 20} onClick={() => {
        pro.postProblem({ title: title.trim(), problem: problem.trim(), whatGoodLooksLike: 'To be agreed with whoever comes in.' })
        setTitle(''); setProblem('')
      }}>Post it to your network</Btn>
    </section>

    <section className="talent-list">
      {pro.problems.map(p => {
        const owner = memberById(net.members, p.ownerId)
        const saved = pro.teams.find(t => t.problemId === p.id)
        return <article key={p.id} className="module talent-card">
          <header>
            <div><Eyebrow>{p.kind.toUpperCase()} · {p.status.toUpperCase()}</Eyebrow>
              <h3>{p.title}</h3>
              <small>{p.confidentialCompany ? 'Company withheld until both sides agree' : owner ? `${owner.name} · ${owner.company}` : 'You'} · {p.geography}</small></div>
          </header>
          <p>{p.problem}</p>
          <dl className="opp-grid">
            <div><dt>Why it matters</dt><dd>{p.whyItMatters || 'Stated privately.'}</dd></div>
            <div><dt>What good looks like</dt><dd>{p.whatGoodLooksLike}</dd></div>
            <div><dt>Constraints</dt><dd>{p.constraints || 'None stated.'}</dd></div>
            <div><dt>Shapes that could work</dt><dd>{p.paths.join(' · ')}</dd></div>
          </dl>
          <footer className="opp-foot">
            <Btn onClick={() => setDraft(pro.suggestTeam(p.id, { members: net.members, connections: net.connections }) ?? null)}>Propose a team</Btn>
            {owner && p.ownerId !== 'me' && <Btn kind="secondary" onClick={() => nav.messageMember(owner.id)}>Offer help privately</Btn>}
            {saved && <span className="scope-tag">Team saved</span>}
          </footer>
        </article>
      })}
    </section>

    {draft && <section className="module team-draft">
      <header><Eyebrow>PROPOSED TEAM</Eyebrow><h3>{draft.objective}</h3></header>
      <p className="team-path">{draft.strongestPath}</p>
      <div className="team-roles">
        {draft.roles.map(role => {
          const m = memberById(net.members, role.memberId)
          if (!m) return null
          return <div key={role.memberId} className="team-role">
            <Face person={m} />
            <div>
              <Eyebrow>{role.role.toUpperCase()} · {role.path.toUpperCase()}</Eyebrow>
              <strong>{m.name}</strong><small>{m.title} · {m.company}</small>
              <em>{role.why}</em>
              {!!role.proofNodeIds.length && <span className="scope-tag">{role.proofNodeIds.length} proof node{role.proofNodeIds.length === 1 ? '' : 's'} behind this</span>}
            </div>
            <div className="team-role-actions">
              <button className="text-action" onClick={() => nav.openMember(m)}>Profile</button>
              <button className="text-action" onClick={() => nav.openIntro(m)}>Warm path</button>
            </div>
          </div>
        })}
      </div>
      <footer className="opp-foot">
        <Btn onClick={() => { const saved = pro.saveTeam(draft); setDraft(saved) }}>{draft.saved ? 'Saved' : 'Save this team'}</Btn>
        <Btn kind="quiet" onClick={() => setDraft(null)}>Dismiss</Btn>
      </footer>
    </section>}

    {!!pro.teams.length && <section className="talent-list">
      {pro.teams.map(t => <article key={t.id} className="module talent-card">
        <header><div><Eyebrow>SAVED TEAM</Eyebrow><h3>{t.objective}</h3><small>{t.strongestPath}</small></div></header>
        <div className="team-roles compact">
          {t.roles.map(role => {
            const m = memberById(net.members, role.memberId)
            if (!m) return null
            return <div key={role.memberId} className="team-role">
              <div><Eyebrow>{role.role.toUpperCase()}</Eyebrow><strong>{m.name}</strong><em>{role.why}</em></div>
              <div className="team-role-actions">
                {t.invited.includes(m.id)
                  ? <span className="scope-tag">Invited</span>
                  : <button className="text-action" onClick={() => pro.inviteToTeam(t.id, m.id)}>Invite to the team</button>}
              </div>
            </div>
          })}
        </div>
      </article>)}
    </section>}

    <section className="teach-block">
      <div><Eyebrow>WHY THIS IS NOT HIRING SOFTWARE</Eyebrow>
        <h2>The right answer is often a shape nobody advertised.</h2>
        <p>Sometimes the answer is a fractional operator plus one advisor, not a full-time hire. Because Aetheris knows proven work, referrals and real availability, it can propose that shape and show the warm path into each person, so the first conversation is never cold.</p>
        <button className="text-action" onClick={() => nav.setPage('capital')}>Capital, acquisition and board conversations <ArrowRight size={14} /></button></div>
    </section>
  </>
}
