import { useState } from 'react'
import { ArrowRight, Check, MapPin, Mic } from 'lucide-react'
import { useNetwork } from '../store'
import { useMoat } from '../moat-store'
import { useOS } from '../os-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head } from '../ui'
import { ReciprocityNote } from '../moat-ui'
import type { LiveEvent } from '../domain/moat-models'

export function EventModePage() {
  const moat = useMoat()
  const [openId, setOpenId] = useState(moat.events[0]?.id ?? '')
  const active = moat.events.find(e => e.id === openId) ?? moat.events[0]

  return <>
    <Head
      label="EVENT MODE"
      title="Walk into the room already knowing."
      copy="Conferences, dinners, investor meetings and private gatherings run on the same question: who is here, who should I meet, and who can introduce us in this room. Event Mode answers it before you arrive and captures what happened before it fades."
      proof={`${moat.events.length} events · attendance visibility is yours to set`}
    />
    <nav className="lane-row" role="tablist" aria-label="Events">
      {moat.events.map(e => <button key={e.id} role="tab" aria-selected={openId === e.id} className={openId === e.id ? 'on' : ''} onClick={() => setOpenId(e.id)}>{e.name}</button>)}
    </nav>
    {active && <EventDetail event={active} />}
  </>
}

function EventDetail({ event }: { event: LiveEvent }) {
  const net = useNetwork()
  const moat = useMoat()
  const os = useOS()
  const nav = useNav()
  const [why, setWhy] = useState('')
  const [who, setWho] = useState(event.attendeeIds[0] ?? '')
  const attendees = event.attendeeIds.map(id => net.members.find(m => m.id === id)).filter(Boolean)
  const canHelp = attendees.filter(m => m!.needs.length).slice(0, 3)

  return <>
    <section className="module event-head">
      <header>
        <div><Eyebrow signal>{event.kind.toUpperCase()} · {event.status.toUpperCase()}</Eyebrow>
          <h2>{event.name}</h2>
          <p><MapPin size={13} /> {event.venue} · {event.city} · {event.startsAt}</p></div>
        <div className="event-visibility">
          <span>ATTENDANCE VISIBLE TO</span>
          {(['private', 'circle', 'attendees', 'network'] as const).map(v =>
            <button key={v} className={event.attendanceVisibility === v ? 'on' : ''} onClick={() => moat.setEventVisibility(event.id, v)}>{v}</button>)}
        </div>
      </header>
      <ul className="event-goals">{event.goals.map(g => <li key={g}>{g}</li>)}</ul>
    </section>

    <div className="event-grid">
      <section className="module">
        <header><div><Eyebrow>WHO IS HERE</Eyebrow><h3>{attendees.length} members you can reach in person.</h3></div></header>
        <ul className="event-people">
          {attendees.map(m => <li key={m!.id}>
            <Face person={m!} />
            <div><strong>{m!.name}</strong><small>{m!.title} · {m!.company}</small>
              <em>{m!.bestPath.length > 2 ? `Warm path in the room: ${m!.bestPath[1]}` : 'Direct approach'}</em></div>
            <button className="text-action" onClick={() => nav.openMember(m!)}>Open</button>
          </li>)}
        </ul>
      </section>

      <section className="module">
        <header><div><Eyebrow signal>MY EVENT PLAN</Eyebrow><h3>Three conversations, not thirty.</h3></div></header>
        <ul className="event-plan">
          {event.myPlan.map(p => {
            const m = net.members.find(x => x.id === p.memberId)
            if (!m) return null
            const introducer = p.introducerId ? net.members.find(x => x.id === p.introducerId) : undefined
            return <li key={p.id} className={p.done ? 'done' : ''}>
              <button className="plan-check" onClick={() => moat.toggleEventPlanItem(event.id, p.id)} aria-label="Mark done"><Check size={13} /></button>
              <div><strong>{m.name}</strong><em>{p.why}</em>
                <p className="plan-opener">“{p.opener}”</p>
                {introducer && <small>Can introduce you in the room: {introducer.name}</small>}</div>
            </li>
          })}
        </ul>
        <div className="event-plan-add">
          <select value={who} onChange={e => setWho(e.target.value)}>
            {attendees.map(m => <option key={m!.id} value={m!.id}>{m!.name}</option>)}
          </select>
          <input value={why} onChange={e => setWhy(e.target.value)} placeholder="Why this conversation matters" />
          <Btn kind="secondary" onClick={() => { if (why.trim()) { moat.addEventPlanItem(event.id, { memberId: who, why, opener: 'Open with the specific problem, not the pitch.' }); setWhy('') } }}>Add</Btn>
        </div>
      </section>

      <section className="module">
        <header><div><Eyebrow>WHO I CAN HELP</Eyebrow><h3>Give first. It is the whole format.</h3></div></header>
        <ul className="event-help">
          {canHelp.map(m => <li key={m!.id}><strong>{m!.name}</strong><span>{m!.needs[0]}</span>
            <Btn kind="quiet" onClick={() => nav.messageMember(m!.id)}>Offer something</Btn></li>)}
        </ul>
        <ReciprocityNote circleId={event.circleIds[0]} />
      </section>

      <section className="module">
        <header><div><Eyebrow>SESSIONS</Eyebrow><h3>Where the conversations actually happen.</h3></div></header>
        <ul className="event-sessions">
          {event.sessions.map(s => <li key={s.id}><strong>{s.title}</strong><span>{s.when} · {s.room}</span>
            <em>{s.peopleIds.map(id => net.members.find(m => m.id === id)?.name).filter(Boolean).join(', ') || 'Open room'}</em></li>)}
          {!event.sessions.length && <li className="quiet-empty">No published sessions.</li>}
        </ul>
        <p className="event-systems">Systems relevant to this room: {event.systemIds.join(', ') || 'none flagged'}</p>
      </section>
    </div>

    <section className="module event-followup">
      <header><div><Eyebrow signal>AFTER THE ROOM</Eyebrow><h3>Capture it within {event.followUpWindowDays} days or lose it.</h3></div></header>
      <p>Rapid capture turns a room into relationships: a voice note becomes Active Memory, an unfinished sentence becomes an open loop, and a promise becomes a follow-up with a date on it.</p>
      <div className="event-followup-actions">
        <Btn kind="secondary" onClick={nav.captureConversation}><Mic size={14} /> Capture what happened</Btn>
        <Btn kind="secondary" onClick={() => nav.setPage('loops')}>Open loops <ArrowRight size={13} /></Btn>
        <Btn kind="quiet" onClick={() => nav.setPage('inbox')}>Follow-up queue</Btn>
        <Btn kind="quiet" onClick={() => moat.setEventStatus(event.id, event.status === 'follow-up' ? 'closed' : 'follow-up')}>
          {event.status === 'follow-up' ? 'Close the event' : 'Move to follow-up'}
        </Btn>
      </div>
      <p className="event-os-note">{os.inbox.filter(i => i.status === 'open').length} items already waiting in Attention. Event follow-ups join the same list rather than a separate inbox.</p>
    </section>
  </>
}
