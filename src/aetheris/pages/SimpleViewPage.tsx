import { useMemo, useState } from 'react'
import { useNetwork } from '../store'
import { useNav } from '../nav'
import { rankMatches } from '../matching'
import { Face } from '../ui'
import type { Member } from '../social'

/**
 * Simple view — a single ledger screen in the navy + yellow palette.
 * Everything here reads live network state and every control is wired.
 */
export default function SimpleViewPage() {
  const net = useNetwork()
  const nav = useNav()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const hit = (...parts: Array<string | undefined>) =>
    !query || parts.filter(Boolean).join(' ').toLowerCase().includes(query)

  const me = net.profile
  const ranked = useMemo(
    () => rankMatches(me, net.members, net.connections),
    [me, net.members, net.connections],
  )
  const lead = ranked[0]

  const people = ranked.filter(r => hit(r.member.name, r.member.company, r.member.title, r.member.focus, r.member.industry)).slice(0, 6)
  const signals = net.activity.filter(s => hit(s.text, s.kind)).slice(0, 6)
  const memory = net.learnings.filter(l => hit(l.text, l.category, l.source)).slice(0, 6)
  const asks = net.asks.filter(a => hit(a.ask, a.detail, a.industry, a.location)).slice(0, 5)
  const threads = net.threads.filter(t => {
    const person = net.members.find(m => m.id === t.memberId)
    return hit(person?.name, t.introContext, t.messages[t.messages.length - 1]?.text)
  }).slice(0, 5)

  const filled = [me.name, me.title, me.company, me.location, me.thesis, me.lookingFor, me.canHelpWith, me.availability]
    .filter(v => Boolean(v && String(v).trim())).length
  const complete = Math.round((filled / 8) * 100)

  const openMember = (m: Member) => nav.openMember(m)
  const nameOf = (id: string) => net.members.find(m => m.id === id)?.name ?? 'A member'

  return <div className="sv">
    <section className="sv-masthead">
      <div>
        <div className="sv-eyebrow">Explainable introductions with active memory</div>
        <h1>Turn your network into a compounding advantage.</h1>
        <p>One screen: who matters, why now, what you owe, and the next useful move. Nothing here is decoration — every line is live.</p>
        <div className="sv-search">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people, signals, needs, memory, conversations…" aria-label="Search the ledger" />
          {q ? <button className="sv-ghost" onClick={() => setQ('')}>Clear</button> : null}
        </div>
      </div>
      <aside className="sv-rail">
        <div className="sv-kicker">Profile signal</div>
        <div className="sv-progress"><span style={{ width: `${complete}%` }} /></div>
        <div className="sv-progress-text"><strong>{complete}%</strong> of your context is on record</div>
        <div className="sv-stats">
          <div><b>{net.asks.filter(a => a.mine).length}</b><span>Open asks</span></div>
          <div><b>{net.threads.length}</b><span>Conversations</span></div>
          <div><b>{net.connections.length}</b><span>Connections</span></div>
        </div>
        <div className="sv-rail-actions">
          <button className="sv-primary" onClick={() => nav.postNeed()}>What do you need right now?</button>
          <button className="sv-ghost" onClick={() => nav.setPage('profile')}>Edit your profile</button>
        </div>
      </aside>
    </section>

    {lead ? <section className="sv-lead">
      <div className="sv-lead-main">
        <div className="sv-eyebrow">Lead story</div>
        <h2>{lead.member.name} — {lead.match.headline}</h2>
        <p>{lead.member.title} at {lead.member.company} · {lead.member.location}. {lead.member.focus}</p>
        <ul className="sv-reasons">
          {lead.match.components.slice(0, 4).map(c => <li key={c.label}>
            <span className="sv-reason-label">{c.label}</span>
            <span className="sv-reason-score">{c.score}</span>
            <span className="sv-reason-evidence">{c.evidence}</span>
          </li>)}
        </ul>
        <div className="sv-actions">
          <button className="sv-primary" onClick={() => nav.openIntro(lead.member)}>Request intro</button>
          <button className="sv-ghost" onClick={() => nav.messageMember(lead.member.id)}>Message</button>
          <button className="sv-ghost" onClick={() => openMember(lead.member)}>Open profile</button>
        </div>
      </div>
      <div className="sv-lead-score">
        <div className="sv-kicker">Compatibility</div>
        <strong>{lead.match.total}</strong>
        <span>/100</span>
        <p>{lead.match.sharedInterests.slice(0, 3).join(' · ') || 'Shared context builds as you act.'}</p>
      </div>
    </section> : null}

    <section className="sv-columns">
      <article className="sv-col">
        <div className="sv-eyebrow">People worth knowing</div>
        {people.length ? <ul className="sv-list">
          {people.map(r => <li key={r.member.id}>
            <Face person={r.member} />
            <div className="sv-list-copy">
              <button className="sv-link" onClick={() => openMember(r.member)}>{r.member.name}</button>
              <small>{r.member.title} · {r.member.company}</small>
            </div>
            <span className="sv-score">{r.match.total}</span>
            <button className="sv-mini" onClick={() => nav.messageMember(r.member.id)}>Message</button>
          </li>)}
        </ul> : <p className="sv-empty">No members match that search yet.</p>}
        <button className="sv-ghost" onClick={() => nav.setPage('discover')}>Open Discover</button>
      </article>

      <article className="sv-col">
        <div className="sv-eyebrow">Signals</div>
        {signals.length ? <ul className="sv-plain">
          {signals.map(s => <li key={s.id}>
            <span className="sv-tag">{s.kind}</span>
            <b>{s.text}</b>
            <small>{s.when}</small>
          </li>)}
        </ul> : <p className="sv-empty">Signals appear as relationships move.</p>}
        <button className="sv-ghost" onClick={() => nav.setPage('insights')}>Open Insights</button>
      </article>

      <article className="sv-col">
        <div className="sv-eyebrow">Active memory</div>
        {memory.length ? <ul className="sv-plain">
          {memory.map(l => <li key={l.id}>
            <span className="sv-tag">{l.category}</span>
            <b>{l.text}</b>
            <small>{l.source} · confidence {l.confidence}</small>
          </li>)}
        </ul> : <p className="sv-empty">Memory fills in as you talk and act.</p>}
        <button className="sv-ghost" onClick={() => nav.setPage('memory')}>Open Memory</button>
      </article>
    </section>

    <section className="sv-split">
      <article className="sv-col">
        <div className="sv-eyebrow">Needs on the ledger</div>
        {asks.length ? <ul className="sv-plain">
          {asks.map(a => <li key={a.id}>
            <b>{a.ask}</b>
            <small>{nameOf(a.memberId)} · {a.industry} · {a.posted}</small>
            <div className="sv-inline">
              <button className="sv-mini" onClick={() => nav.messageMember(a.memberId)}>Respond</button>
              <button className="sv-mini" onClick={() => net.requestWarmPath(a.id)}>Warm path</button>
            </div>
          </li>)}
        </ul> : <p className="sv-empty">No needs match. Post yours and the network reads it.</p>}
        <div className="sv-inline">
          <button className="sv-primary" onClick={() => nav.postNeed()}>Post a need</button>
          <button className="sv-ghost" onClick={() => nav.setPage('needs')}>Open Needs</button>
        </div>
      </article>

      <article className="sv-col">
        <div className="sv-eyebrow">Conversations waiting</div>
        {threads.length ? <ul className="sv-plain">
          {threads.map(t => <li key={t.id}>
            <b>{nameOf(t.memberId)}</b>
            <small>{t.messages[t.messages.length - 1]?.text ?? t.introContext}</small>
            <button className="sv-mini" onClick={() => nav.goToThread(t.id)}>Open thread</button>
          </li>)}
        </ul> : <p className="sv-empty">Start a conversation with a reason and it lands here.</p>}
        <button className="sv-ghost" onClick={() => nav.setPage('messages')}>Open Messages</button>
      </article>
    </section>
  </div>
}
