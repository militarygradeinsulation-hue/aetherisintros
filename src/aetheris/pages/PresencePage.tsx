import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, memberById } from '../ui'

export function PresencePage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [status, setStatus] = useState('')
  const [detail, setDetail] = useState('')

  return <>
    <Head
      label="PRESENCE, TRAVEL AND AVAILABILITY"
      title="Being in the same city is a timing signal, not an excuse to meet everyone."
      copy="Declare where you will be and what you are open to. Aetheris prepares a short plan — two or three people worth meeting, why each one, and the warm path in — plus the events, companies and expertise already in that city."
      proof={`${pro.travel.length} trips · ${pro.eventPresence.filter(e => e.optedIn).length} events opted into · presence is never public by default`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('eventmode')}>Live event mode <ArrowRight size={13} /></Btn>}
    />

    <section className="presence-grid">
      {pro.travel.map(t => <article key={t.id} className="module travel-card">
        <header>
          <div><Eyebrow>TRAVEL · {t.from} → {t.to}</Eyebrow><h3>{t.city}</h3><small>{t.purpose}</small></div>
          <Btn kind="secondary" onClick={() => pro.setTravelVisible(t.id, !t.visible)}>{t.visible ? 'Visible to your network' : 'Private to you'}</Btn>
        </header>

        <div className="deal-block">
          <Eyebrow>WORTH MEETING WHILE YOU ARE THERE</Eyebrow>
          {t.peopleWorthMeeting.map(p => {
            const m = memberById(net.members, p.memberId)
            if (!m) return null
            return <div key={p.memberId} className="travel-person">
              <Face person={m} />
              <div><strong>{m.name}</strong><small>{m.title} · {m.company}</small><em>{p.why}</em>
                <span className="scope-tag">Path: {p.path}</span></div>
              <div className="team-role-actions">
                <button className="text-action" onClick={() => nav.openMember(m)}>Profile</button>
                <button className="text-action" onClick={() => nav.openIntro(m)}>Warm path</button>
              </div>
            </div>
          })}
        </div>

        <div className="deal-block">
          <Eyebrow>YOUR PLAN</Eyebrow>
          {t.plan.map(p => {
            const m = memberById(net.members, p.memberId)
            return <div key={p.id} className="travel-slot">
              <div><strong>{m?.name ?? 'Open slot'}</strong><small>{p.slot}</small><em>{p.why}</em></div>
              <div className="team-role-actions">
                <span className={`req-state ${p.state}`}>{p.state}</span>
                {p.state !== 'confirmed' && <button className="text-action" onClick={() => pro.setTravelPlanState(t.id, p.id, p.state === 'suggested' ? 'requested' : 'confirmed')}>
                  {p.state === 'suggested' ? 'Request it' : 'Confirm it'}
                </button>}
              </div>
            </div>
          })}
          {!t.plan.length && <p className="empty-state">No slots planned. Two good meetings beat ten coffees.</p>}
        </div>

        <div className="travel-context">
          {!!t.events.length && <p><b>Events while you are there.</b> {t.events.join(' · ')}</p>}
          {!!t.circleActivity.length && <p><b>Circle activity.</b> {t.circleActivity.join(' · ')}</p>}
        </div>
      </article>)}

      {pro.eventPresence.map(e => <article key={e.id} className="module event-presence-card">
        <header>
          <div><Eyebrow>EVENT · {e.dates}</Eyebrow><h3>{e.eventName}</h3><small>{e.city} · visible to {e.visibility}</small></div>
          <Btn kind={e.optedIn ? 'secondary' : 'primary'} onClick={() => pro.setEventOptIn(e.id, !e.optedIn)}>{e.optedIn ? 'Attending' : 'Opt in'}</Btn>
        </header>
        {!!e.intents.length && <p><b>What you are there for.</b> {e.intents.join(' · ')}</p>}

        <div className="deal-block">
          <Eyebrow>WHO IS WORTH YOUR TIME</Eyebrow>
          {e.roster.map(r => {
            const m = memberById(net.members, r.memberId)
            const introducer = r.introducerId ? memberById(net.members, r.introducerId) : undefined
            if (!m) return null
            return <div key={r.memberId} className="travel-person">
              <Face person={m} />
              <div><strong>{m.name}</strong><small>{m.title} · {m.company}</small><em>{r.why}</em>
                <span className="scope-tag">{r.mutualContext}</span>
                {introducer && <span className="scope-tag">{introducer.name} can introduce you</span>}</div>
              <div className="team-role-actions">
                <button className="text-action" onClick={() => nav.openMember(m)}>Profile</button>
                <button className="text-action" onClick={() => nav.openIntro(m)}>Warm path</button>
              </div>
            </div>
          })}
        </div>

        <div className="deal-columns">
          <div className="deal-block">
            <Eyebrow>MEETINGS</Eyebrow>
            {e.meetings.map(m => {
              const person = memberById(net.members, m.memberId)
              return <div key={m.id} className="travel-slot">
                <div><strong>{person?.name ?? 'Member'}</strong><small>{m.when}</small></div>
                <div className="team-role-actions">
                  <span className={`req-state ${m.state}`}>{m.state}</span>
                  {m.state !== 'met' && <button className="text-action" onClick={() => pro.setEventMeetingState(e.id, m.id, m.state === 'suggested' ? 'requested' : m.state === 'requested' ? 'confirmed' : 'met')}>
                    {m.state === 'suggested' ? 'Request' : m.state === 'requested' ? 'Confirm' : 'Mark met'}
                  </button>}
                </div>
              </div>
            })}
          </div>
          <div className="deal-block">
            <Eyebrow>AFTER THE EVENT</Eyebrow>
            {e.followUps.map(f => <label key={f.id} className="deal-check">
              <input type="checkbox" checked={f.done} onChange={() => pro.toggleEventFollowUp(e.id, f.id)} />
              {f.label} <small>{memberById(net.members, f.memberId)?.name ?? ''}</small>
            </label>)}
            {!e.followUps.length && <p className="empty-state">Nothing outstanding.</p>}
          </div>
        </div>
      </article>)}
    </section>

    <section className="module availability-block">
      <Eyebrow>PROFESSIONAL AVAILABILITY</Eyebrow>
      <h3>Say what you are open to. It changes what reaches you.</h3>
      <p className="availability-copy">Availability is not a status game. Active windows influence matching and outreach: a member who is not accepting sales outreach simply will not receive it, and a member open to advisory conversations gets surfaced for board and advisory intent.</p>
      <div className="availability-list">
        {pro.proAvailability.map(a => {
          const m = memberById(net.members, a.memberId)
          return <div key={a.id} className={`availability-row ${a.active ? 'on' : ''}`}>
            <div><strong>{a.status}</strong><small>{m?.name ?? 'You'} · {a.detail}</small>
              <span className="scope-tag">{a.audienceConstraint}</span></div>
            {a.memberId === 'me' && <Btn kind="quiet" onClick={() => pro.setAvailabilityActive(a.id, !a.active)}>{a.active ? 'Active' : 'Off'}</Btn>}
          </div>
        })}
      </div>
      <div className="room-post">
        <label>Publish a new window
          <input value={status} onChange={e => setStatus(e.target.value)} placeholder="Open to two advisory conversations this quarter" />
        </label>
        <label>What that means in practice
          <input value={detail} onChange={e => setDetail(e.target.value)} placeholder="Manufacturing operations only. Warm paths first." />
        </label>
        <Btn disabled={status.trim().length < 8 || detail.trim().length < 8} onClick={() => { pro.publishAvailability({ status: status.trim(), detail: detail.trim() }); setStatus(''); setDetail('') }}>Publish</Btn>
      </div>
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY PRESENCE IS PRIVATE BY DEFAULT</Eyebrow>
        <h2>Nobody should learn your travel schedule by accident.</h2>
        <p>Trips and event attendance start private. You choose the audience, and Aetheris only proposes a handful of meetings that are worth the time — with the reason and the warm path attached, so you never walk into a room unprepared or arrive as a stranger.</p>
        <button className="text-action" onClick={() => nav.setPage('permission')}>How attention is protected <ArrowRight size={14} /></button></div>
    </section>
  </>
}
