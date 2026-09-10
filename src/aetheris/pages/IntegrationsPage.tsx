import { useState } from 'react'
import { useNetwork } from '../store'
import { useMoat } from '../moat-store'
import { useOS } from '../os-store'
import { Btn, Eyebrow, Head } from '../ui'
import { relationshipContext } from '../domain/moat-engine'
import type { ContextSurface } from '../domain/moat-models'

export function IntegrationsPage() {
  const moat = useMoat()
  const net = useNetwork()
  const os = useOS()
  const [surface, setSurface] = useState<ContextSurface>(moat.adapters[0]?.surface ?? 'email sidebar')
  const [subject, setSubject] = useState(net.members[0]?.name ?? '')
  const member = net.members.find(m => m.name.toLowerCase() === subject.trim().toLowerCase()) ?? net.members[0]
  const [answer, setAnswer] = useState<ReturnType<typeof relationshipContext> | null>(null)

  return <>
    <Head
      label="INTROS EVERYWHERE"
      title="Relationship context wherever the conversation happens."
      copy="Aetheris is not trying to be another tab. The context layer answers one question — who is this person to me, what is open between us, and what would help right now — inside email, calendar, browser and the tools you already use."
      proof="Permission-aware by design · every answer respects your consent ledger"
    />

    <section className="adapters-grid">
      {moat.adapters.map(a => <article key={a.id} className={`module adapter-card ${a.connected ? 'on' : ''}`}>
        <header><div><Eyebrow>{a.surface.toUpperCase()}</Eyebrow><h3>{a.readiness}</h3></div>
          <span className={`adapter-dot ${a.connected ? 'live' : ''}`} /></header>
        <p>{a.description}</p>
        <p className="adapter-scopes">Scopes requested: {a.scopesRequested.join(', ')}</p>
        <p className="adapter-note">{a.note}</p>
      </article>)}
    </section>

    <section className="module context-probe">
      <header><div><Eyebrow signal>CONTEXT PREVIEW</Eyebrow><h3>What an outside surface would be told.</h3></div></header>
      <div className="probe-row">
        <select value={surface} onChange={e => setSurface(e.target.value as ContextSurface)}>
          {moat.adapters.map(a => <option key={a.id} value={a.surface}>{a.surface}</option>)}
        </select>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Person or company" />
        <Btn onClick={() => {
          if (!member) return
          const result = relationshipContext({
            member,
            weather: `${member.relationshipStatus} · last exchange ${member.lastInteractionDays} days ago`,
            openLoops: os.inbox.filter(i => i.memberId === member.id && i.status === 'open').map(i => i.title),
            currentIntent: member.needs[0] ?? 'Nothing declared',
            roomIds: os.rooms.filter(r => r.memberIds.includes(member.id)).map(r => r.id),
            scopesAllowed: ['shareable', 'public'],
            ledger: moat.consent,
          })
          setAnswer(result)
          moat.logContextQuery({
            id: `ctx-${Date.now().toString(36)}`, surface, subject: member.name, memberId: member.id,
            askedAt: new Date().toISOString().slice(0, 10), answer: result as never,
          } as never)
        }}>Ask the context layer</Btn>
      </div>
      {answer && <div className="probe-answer">
        <p><b>Identity.</b> {answer.identity}</p>
        <p><b>Relationship weather.</b> {answer.weather}</p>
        <p><b>Open loops.</b> {answer.openLoops.join(' · ') || 'None'}</p>
        <p><b>What they are moving.</b> {answer.currentIntent}</p>
        <p><b>Best next action.</b> {answer.nextAction}</p>
        {!!answer.withheld.length && <p className="probe-withheld"><b>Withheld by your consent settings.</b> {answer.withheld.join(' · ')}</p>}
      </div>}
      <p className="probe-note">Outside surfaces receive shareable context only. Private notes, memory and intents never leave Aetheris unless you widen their scope in the consent ledger.</p>
    </section>

    {!!moat.contextQueries.length && <section className="module probe-log">
      <header><div><Eyebrow>QUERY LOG</Eyebrow><h3>Every outside request is recorded.</h3></div></header>
      <ul>{moat.contextQueries.slice(-8).reverse().map(q => <li key={q.id}><b>{q.surface}</b> asked about {q.subject} <small>{q.askedAt}</small></li>)}</ul>
    </section>}
  </>
}
