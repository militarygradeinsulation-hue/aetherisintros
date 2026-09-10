import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { useMoat } from '../moat-store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { Eyebrow, Face, Head } from '../ui'
import { diffSnapshots } from '../domain/moat-engine'

export function TimeMachinePage() {
  const moat = useMoat()
  const net = useNetwork()
  const platform = usePlatform()
  const nav = useNav()
  const ordered = [...moat.snapshots].sort((a, b) => a.takenAt.localeCompare(b.takenAt))
  const [index, setIndex] = useState(0)
  const from = ordered[index] ?? ordered[0]
  const to = ordered[ordered.length - 1]
  if (!from || !to) return <Head label="TIME MACHINE" title="No snapshots yet." copy="Snapshots build as your network changes." />
  const diff = diffSnapshots(from, to)
  const named = (ids: string[]) => ids.map(id => net.members.find(m => m.id === id)?.name ?? id)
  const circleNames = (ids: string[]) => ids.map(id => platform.circles.find(c => c.id === id)?.name ?? id)

  return <>
    <Head
      label="NETWORK TIME MACHINE"
      title="What compounded, and what quietly stopped."
      copy="Growth in a network is not node count. This compares your relationships at two points in time and shows what changed, which introductions created downstream relationships, which circles became relevant, and what went dormant while you were busy."
      proof={`${ordered.length} snapshots · ${from.label} → ${to.label}`}
    />

    <section className="module timeline-scrub">
      <header><div><Eyebrow>TIMELINE</Eyebrow><h3>{from.label} compared with {to.label}</h3></div></header>
      <input type="range" min={0} max={Math.max(0, ordered.length - 1)} value={index}
        onChange={e => setIndex(Number(e.target.value))} aria-label="Snapshot date" />
      <div className="scrub-marks">{ordered.map((s, i) => <button key={s.id} className={i === index ? 'on' : ''} onClick={() => setIndex(i)}>{s.label}<small>{s.takenAt}</small></button>)}</div>
      <p className="scrub-note">{from.note}</p>
    </section>

    <div className="time-grid">
      <section className="module"><header><div><Eyebrow>NEW RELATIONSHIPS</Eyebrow><h3>{diff.newRelationships.length} appeared</h3></div></header>
        <ul className="time-people">{diff.newRelationships.map(id => {
          const m = net.members.find(x => x.id === id)
          return m ? <li key={id}><Face person={m} /><div><strong>{m.name}</strong><small>{m.company}</small></div>
            <button className="text-action" onClick={() => nav.openMember(m)}>Open</button></li> : null
        })}
          {!diff.newRelationships.length && <li className="quiet-empty">No new relationships in this window.</li>}</ul></section>

      <section className="module"><header><div><Eyebrow signal>WENT DORMANT</Eyebrow><h3>{diff.dormant.length}</h3></div></header>
        <ul className="time-list">{named(diff.dormant).map(n => <li key={n}>{n}</li>)}
          {!diff.dormant.length && <li className="quiet-empty">Nothing went dormant.</li>}</ul></section>

      <section className="module"><header><div><Eyebrow>CIRCLES THAT BECAME RELEVANT</Eyebrow><h3>{diff.circlesGainedRelevance.length}</h3></div></header>
        <ul className="time-list">{circleNames(diff.circlesGainedRelevance).map(n => <li key={n}>{n}</li>)}
          {!diff.circlesGainedRelevance.length && <li className="quiet-empty">No change.</li>}</ul></section>

      <section className="module"><header><div><Eyebrow>SYSTEMS THAT SPREAD</Eyebrow><h3>{diff.systemsSpread.length}</h3></div></header>
        <ul className="time-list">{diff.systemsSpread.map(id => <li key={id}>{platform.systems.find(s => s.id === id)?.name ?? id}</li>)}
          {!diff.systemsSpread.length && <li className="quiet-empty">No system travelled in this window.</li>}</ul></section>

      <section className="module"><header><div><Eyebrow>OPPORTUNITIES APPEARED</Eyebrow><h3>{diff.opportunitiesAppeared.length}</h3></div></header>
        <ul className="time-list">{diff.opportunitiesAppeared.map(o => <li key={o}>{o}</li>)}
          {!diff.opportunitiesAppeared.length && <li className="quiet-empty">None new.</li>}</ul></section>

      <section className="module"><header><div><Eyebrow>OPPORTUNITIES CLOSED OR LOST</Eyebrow><h3>{diff.opportunitiesClosed.length}</h3></div></header>
        <ul className="time-list">{diff.opportunitiesClosed.map(o => <li key={o}>{o}</li>)}
          {!diff.opportunitiesClosed.length && <li className="quiet-empty">None closed.</li>}</ul></section>
    </div>

    <section className="teach-block">
      <div><Eyebrow>COMPOUNDING, NOT COUNTING</Eyebrow>
        <h2>{diff.downstream[0]}</h2>
        <p>The point of a relationship network is what the second and third relationship produce. Attribution traces where each outcome actually came from.</p>
        <button className="text-action" onClick={() => nav.setPage('attribution')}>Trace an outcome to its origin <ArrowRight size={14} /></button></div>
    </section>
  </>
}
