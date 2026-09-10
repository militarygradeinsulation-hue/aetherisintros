import { useNetwork } from '../store'
import { useOS } from '../os-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Numeral } from '../ui'
import { EvidenceLink } from '../os-ui'
import type { OpportunityCollision } from '../domain/os-models'

export function CollisionsPage() {
  const os = useOS()
  const live = os.collisions.filter(c => c.status === 'new' || c.status === 'reviewed')
  const handled = os.collisions.filter(c => c.status === 'dismissed' || c.status === 'snoozed' || c.status === 'converted')

  return <>
    <Head
      label="OPPORTUNITY COLLISIONS"
      title="Three separate signals just formed one opportunity."
      copy="One member is buying. Another is selling. A third knows both. Individually these are ordinary updates; together they are an opening with a limited window. Intros watches for the combination, not the noise."
      proof={`${live.length} live collisions across ${new Set(os.collisions.map(c => c.sector)).size} sectors`}
    />
    <section className="collision-list">
      {live.map(c => <CollisionCard key={c.id} collision={c} />)}
      {!live.length && <p className="quiet-empty">No collisions right now. Signals are still being collected.</p>}
    </section>
    {handled.length > 0 && <section className="collision-list">
      <header className="section-line"><Eyebrow>HANDLED</Eyebrow><small>{handled.length}</small></header>
      {handled.map(c => <CollisionCard key={c.id} collision={c} />)}
    </section>}
  </>
}

export function CollisionCard({ collision, compact = false }: { collision: OpportunityCollision; compact?: boolean }) {
  const os = useOS()
  const net = useNetwork()
  const nav = useNav()
  const people = collision.peopleIds.map(id => net.members.find(m => m.id === id)).filter(Boolean)

  return <article className={`collision-card ${compact ? 'compact' : ''} status-${collision.status}`}>
    <header>
      <div>
        <Eyebrow signal>{collision.sector.toUpperCase()} · COLLISION</Eyebrow>
        <h3>{collision.headline}</h3>
      </div>
      <Numeral value={collision.confidence} of=" confidence" />
    </header>
    <ol className="collision-signals">
      {collision.signals.map(s => <li key={s.id}>
        <span className="signal-dot" aria-hidden="true" />
        <div><b>{s.text}</b><small>{s.sourceLabel} · {s.when}</small></div>
      </li>)}
    </ol>
    {!compact && <>
      <dl className="collision-reasons">
        <div><dt>Timing</dt><dd>{collision.timingEvent}</dd></div>
        <div><dt>Mutual value</dt><dd>{collision.mutualValue}</dd></div>
        <div><dt>Trust path</dt><dd>{collision.trustPath.join(' → ')}</dd></div>
        <div><dt>Safe to say</dt><dd>{collision.safeSummary}</dd></div>
      </dl>
      <div className="collision-faces">{people.map(p => p && <button key={p.id} onClick={() => nav.openMember(p)}><Face person={p} /><span>{p.name}</span></button>)}</div>
    </>}
    <p className="collision-action"><b>Recommended:</b> {collision.recommendedAction}</p>
    <footer>
      <EvidenceLink ids={collision.evidenceIds} />
      <div className="inbox-actions">
        {collision.roomId
          ? <Btn onClick={() => nav.openRoom(collision.roomId!)}>Open room</Btn>
          : <Btn onClick={() => {
            const room = os.createRoom({
              name: collision.headline, thesis: collision.mutualValue, peopleIds: collision.peopleIds,
              ...(collision.companyIds[0] ? { companyId: collision.companyIds[0] } : {}),
              systemIds: collision.systemIds, circleIds: collision.circleIds, evidenceIds: collision.evidenceIds,
              stage: 'Qualified', confidence: collision.confidence, nextAction: collision.recommendedAction,
            })
            os.setCollisionStatus(collision.id, 'converted', room.id)
            nav.openRoom(room.id)
          }}>Open opportunity room</Btn>}
        {collision.peopleIds[0] && <Btn kind="secondary" onClick={() => {
          const person = net.members.find(m => m.id === collision.peopleIds[0])
          if (person) nav.openIntro(person)
        }}>Ask for intro</Btn>}
        <Btn kind="quiet" onClick={() => os.setCollisionStatus(collision.id, 'snoozed')}>Snooze</Btn>
        <Btn kind="quiet" onClick={() => os.setCollisionStatus(collision.id, 'dismissed')}>Dismiss</Btn>
      </div>
    </footer>
  </article>
}
