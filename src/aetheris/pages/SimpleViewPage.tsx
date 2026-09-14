import { useMemo, useState } from 'react'
import { ArrowUpRight, Search } from 'lucide-react'
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

  const people = ranked.filter(r => r.member.id !== lead?.member.id && hit(r.member.name, r.member.company, r.member.title, r.member.focus, r.member.industry)).slice(0, 6)
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
    <header className="sv-header">
      <div className="sv-brandline">
        <div><span className="sv-brandmark">A</span><strong>INTRO LEDGER</strong></div>
        <span>DIAGNOSE → MAP → SCORE → CONNECT → COMPOUND ↺</span>
      </div>
      <div className="sv-masthead">
        <div className="sv-intro">
          <div className="sv-eyebrow">Explainable introductions with active memory</div>
          <h1>Your network.<br /><em>Clearly explained.</em></h1>
          <p>Who matters, why now, what is moving, and the next useful action — in one live relationship ledger.</p>
          <label className="sv-search">
            <Search size={17} aria-hidden="true" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the entire ledger…" aria-label="Search the ledger" />
            {q ? <button className="sv-clear" onClick={() => setQ('')}>Clear</button> : <span>⌘ K</span>}
          </label>
        </div>
        <aside className="sv-rail">
          <div className="sv-profile-head">
            <span className="sv-self-avatar">{me.initials || 'ME'}</span>
            <div><div className="sv-kicker">Your relationship signal</div><strong>{me.name || 'Complete your profile'}</strong><small>{me.title || 'Add your role'}{me.company ? ` · ${me.company}` : ''}</small></div>
          </div>
          <div className="sv-progress-label"><span>Context synced</span><strong>{complete}%</strong></div>
          <div className="sv-progress"><span style={{ width: `${complete}%` }} /></div>
          <div className="sv-stats">
            <div><b>{net.connections.length}</b><span>Connections</span></div>
            <div><b>{net.asks.filter(a => a.mine).length}</b><span>Open asks</span></div>
            <div><b>{net.threads.length}</b><span>Threads</span></div>
          </div>
          <button className="sv-text-action" onClick={() => nav.setPage('profile')}>Review profile <ArrowUpRight size={14} /></button>
        </aside>
      </div>
    </header>

    <section className="sv-section-head"><div><span>01</span><h2>Lead introduction</h2></div><p>The strongest current fit, with the evidence left visible.</p></section>
    {lead ? <section className="sv-lead">
      <div className="sv-lead-person">
        <Face person={lead.member} large portrait />
        <div><div className="sv-eyebrow">Highest-confidence path</div><h2>{lead.member.name}</h2><p>{lead.member.title} at {lead.member.company}<br />{lead.member.location}</p></div>
      </div>
      <div className="sv-lead-main">
        <div className="sv-kicker">Why this introduction</div>
        <h3>{lead.match.headline}</h3>
        <p>{lead.member.focus}</p>
        <ul className="sv-reasons">
          {lead.match.components.slice(0, 4).map(c => <li key={c.label}>
            <span className="sv-reason-label">{c.label}</span>
            <span className="sv-reason-evidence">{c.evidence}</span>
            <span className="sv-reason-score">+{c.score}</span>
          </li>)}
        </ul>
      </div>
      <div className="sv-lead-score">
        <div className="sv-kicker">Relationship fit</div>
        <div><strong>{lead.match.total}</strong><span>/100</span></div>
        <p>{lead.match.sharedInterests.slice(0, 3).join(' · ') || 'Shared context builds as you act.'}</p>
        <button className="sv-primary" onClick={() => nav.openIntro(lead.member)}>Request introduction</button>
        <button className="sv-ghost" onClick={() => nav.messageMember(lead.member.id)}>Message</button>
        <button className="sv-text-action" onClick={() => openMember(lead.member)}>View full profile <ArrowUpRight size={14} /></button>
      </div>
    </section> : <section className="sv-empty-panel"><strong>No introduction is ready yet.</strong><p>Build your profile and connections to create an explainable match.</p><button className="sv-primary" onClick={() => nav.setPage('profile')}>Complete profile</button></section>}

    <section className="sv-section-head"><div><span>02</span><h2>Relationship field</h2></div><p>The people, intentions, and context shaping your next move.</p></section>
    <section className="sv-columns">
      <article className="sv-col sv-people-widget">
        <div className="sv-panel-head"><div><span>PEOPLE</span><strong>Worth knowing</strong></div><b>{people.length.toString().padStart(2, '0')}</b></div>
        {people.length ? <ul className="sv-list">
          {people.map((r, index) => <li key={r.member.id}>
            <span className="sv-row-index">{String(index + 1).padStart(2, '0')}</span>
            <div className="sv-list-copy">
              <button className="sv-link" onClick={() => openMember(r.member)}>{r.member.name}</button>
              <small>{r.member.title} · {r.member.company}</small>
            </div>
            <span className="sv-score">{r.match.total}<small>FIT</small></span>
            <button className="sv-icon-action" aria-label={`Message ${r.member.name}`} onClick={() => nav.messageMember(r.member.id)}>↗</button>
          </li>)}
        </ul> : <p className="sv-empty">No members match that search yet.</p>}
        <button className="sv-text-action" onClick={() => nav.setPage('discover')}>Open people network <ArrowUpRight size={14} /></button>
      </article>

      <article className="sv-col">
        <div className="sv-panel-head"><div><span>INTENT</span><strong>Needs on the ledger</strong></div><b>{asks.length.toString().padStart(2, '0')}</b></div>
        {asks.length ? <ul className="sv-plain sv-asks">
          {asks.map(a => <li key={a.id}>
            <span className="sv-tag">{a.industry || 'Open need'}</span>
            <b>{a.ask}</b>
            <small>{nameOf(a.memberId)} · {a.location || 'Location open'} · {a.posted}</small>
            <div className="sv-inline"><button className="sv-mini" onClick={() => nav.messageMember(a.memberId)}>Respond</button><button className="sv-mini" onClick={() => net.requestWarmPath(a.id)}>Warm path</button></div>
          </li>)}
        </ul> : <p className="sv-empty">No needs match. Add yours so the network can act.</p>}
        <div className="sv-inline"><button className="sv-primary" onClick={() => nav.postNeed()}>Post a need</button><button className="sv-text-action" onClick={() => nav.setPage('needs')}>View all <ArrowUpRight size={14} /></button></div>
      </article>

      <article className="sv-col">
        <div className="sv-panel-head"><div><span>MEMORY</span><strong>Context retained</strong></div><b>{memory.length.toString().padStart(2, '0')}</b></div>
        {memory.length ? <ul className="sv-plain">
          {memory.map(l => <li key={l.id}>
            <span className="sv-tag">{l.category}</span>
            <b>{l.text}</b>
            <small>{l.source} · confidence {l.confidence}</small>
          </li>)}
        </ul> : <p className="sv-empty">Memory fills in as you talk and act.</p>}
        <button className="sv-text-action" onClick={() => nav.setPage('memory')}>Open Active Memory <ArrowUpRight size={14} /></button>
      </article>
    </section>

    <section className="sv-section-head"><div><span>03</span><h2>Current movement</h2></div><p>A ledger of changing signals and conversations already in motion.</p></section>
    <section className="sv-split">
      <article className="sv-col">
        <div className="sv-panel-head"><div><span>ACTION LOG</span><strong>Signals worth attention</strong></div><b>{signals.length.toString().padStart(2, '0')}</b></div>
        {signals.length ? <ul className="sv-log">
          {signals.map((s, index) => <li key={s.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i />
            <div><b>{s.text}</b><small>{s.kind} · {s.when}</small></div>
          </li>)}
        </ul> : <p className="sv-empty">Signals appear here as relationships change.</p>}
        <button className="sv-text-action" onClick={() => nav.setPage('insights')}>Open relationship insights <ArrowUpRight size={14} /></button>
      </article>

      <article className="sv-col">
        <div className="sv-panel-head"><div><span>ROOMS</span><strong>Conversations in motion</strong></div><b>{threads.length.toString().padStart(2, '0')}</b></div>
        {threads.length ? <ul className="sv-rooms">
          {threads.map(t => <li key={t.id}>
            <span className="sv-room-avatar">{nameOf(t.memberId).split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span>
            <div><b>{nameOf(t.memberId)}</b><small>{t.messages[t.messages.length - 1]?.text ?? t.introContext}</small></div>
            <button className="sv-icon-action" aria-label={`Open conversation with ${nameOf(t.memberId)}`} onClick={() => nav.goToThread(t.id)}>↗</button>
          </li>)}
        </ul> : <p className="sv-empty">Start a conversation with a reason and it lands here.</p>}
        <button className="sv-text-action" onClick={() => nav.setPage('messages')}>Open all messages <ArrowUpRight size={14} /></button>
      </article>
    </section>
    <footer className="sv-footer"><span>AETHERIS INTROS</span><p>People × Context × Opportunity.</p><button className="sv-primary" onClick={() => nav.postNeed()}>What do you need right now?</button></footer>
  </div>
}
