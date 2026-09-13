import { useMemo, useState } from 'react'
import { ArrowRight, Bookmark, CalendarDays, Check, MapPin, Users } from 'lucide-react'
import { events } from '../social'
import { showcaseOnly } from '../showcase'
import { useNetwork } from '../store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Why } from '../ui'

const eventDetails = [
  { type: 'Private dinner', focus: 'Operating leadership · owner relationships', capacity: 24, attendeeIds: ['p7', 'p8', 'p15', 'p19'], note: 'A small room for operators carrying integration, expansion and value-creation mandates.' },
  { type: 'Industry summit', focus: 'Industrial systems · manufacturing', capacity: 180, attendeeIds: ['p3', 'p12', 'p17', 'p20'], note: 'Practitioners comparing where industrial technology is producing measurable operating change.' },
  { type: 'Private roundtable', focus: 'Portfolio operations · private capital', capacity: 32, attendeeIds: ['p2', 'p8', 'p11', 'p21'], note: 'A closed working session for operating partners, investors and trusted specialists.' },
]

export function EventsPage() {
  const net = useNetwork()
  const nav = useNav()
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Private dinner', 'Industry summit', 'Private roundtable']
  const rows = useMemo(() => showcaseOnly(events).map((event, index) => ({ ...event, ...eventDetails[index % eventDetails.length]! }))
    .filter(event => filter === 'All' || event.type === filter), [filter])

  return <>
    <Head
      label="EVENTS / ROOMS WITH CONSEQUENCE"
      title="Be in the room before the opportunity is obvious."
      copy="Professional events become useful when you know who is attending, what they are moving, and where a credible conversation already has context."
      proof={`${showcaseOnly(events).length} relevant rooms · ${net.registeredEvents.length} on your calendar`}
    />

    <section className="event-editorial">
      <div><Eyebrow>YOUR EVENT INTELLIGENCE</Eyebrow><h2>Find the room.<br /><em>Know who matters inside it.</em></h2></div>
      <p>Intros compares each guest list with your needs, systems, circles and warm paths. Registration is only the beginning; the useful outcome is a prepared conversation.</p>
    </section>

    <div className="state-filters event-filters">{filters.map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>

    <section className="event-list">{!rows.length && <p className="empty-state">No member events yet. Events appear here as members and circles schedule real rooms.</p>}{rows.map((event, index) => {
      const attendees = event.attendeeIds.map(id => net.members.find(member => member.id === id)).filter(Boolean)
      const registered = net.registeredEvents.includes(event.id)
      const saved = net.savedEvents.includes(event.id)
      const strongest = attendees.slice().sort((a, b) => (b?.scoreTotal ?? 0) - (a?.scoreTotal ?? 0))[0]
      return <article className="event-report" key={event.id}>
        <div className="event-date"><span>{String(index + 1).padStart(2, '0')}</span><CalendarDays size={18} /></div>
        <div className="event-main">
          <Eyebrow signal={index === 0}>{event.type.toUpperCase()}</Eyebrow>
          <h2>{event.name}</h2>
          <p>{event.note}</p>
          <dl>
            <div><dt>WHEN</dt><dd>{event.when}</dd></div>
            <div><dt>WHERE</dt><dd><MapPin size={12} /> {event.where}</dd></div>
            <div><dt>ROOM</dt><dd><Users size={12} /> {event.capacity} people · {event.who}</dd></div>
            <div><dt>FOCUS</dt><dd>{event.focus}</dd></div>
          </dl>
          <div className="event-actions">
            <Btn onClick={() => net.toggleEventRegistration(event.id)}>{registered ? <><Check size={14} /> Registered</> : 'Register'}</Btn>
            <Btn kind="secondary" onClick={() => net.toggleEventSave(event.id)}><Bookmark size={14} /> {saved ? 'Saved' : 'Save'}</Btn>
            {strongest && <Btn kind="quiet" onClick={() => nav.openHandshake(strongest.id)}>Request intro to attendee</Btn>}
          </div>
        </div>
        <aside className="event-intel">
          <Eyebrow>RELEVANT ATTENDEES</Eyebrow>
          <div className="event-faces">{attendees.map(member => member && <button key={member.id} onClick={() => nav.openMember(member)}><Face person={member} portrait /><span><b>{member.name}</b><small>{member.title} · {member.company}</small></span><em>{member.scoreTotal}</em></button>)}</div>
          {strongest && <Why>{strongest.name.split(' ')[0]} is your strongest current reason to enter this room: {strongest.whyNow.toLowerCase()}</Why>}
          <button className="text-action" onClick={() => nav.setPage('discover')}>Find more relevant attendees <ArrowRight size={14} /></button>
        </aside>
      </article>
    })}</section>
  </>
}
