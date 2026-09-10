import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { useMoat } from '../moat-store'
import { useOS } from '../os-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head } from '../ui'
import { gapBridge } from '../domain/moat-engine'

export function GapMapPage() {
  const net = useNetwork()
  const moat = useMoat()
  const os = useOS()
  const nav = useNav()
  const objective = net.objectives[0]?.title ?? moat.gaps[0]?.objective ?? 'your current objective'
  const strategy = os.strategies[0]

  return <>
    <Head
      label="RELATIONSHIP GAP MAP"
      title="Not who you know. What is missing."
      copy={`Measured against "${objective}", Aetheris shows which categories of relationship your network does not contain — by role, expertise, geography and trust depth — and the strongest credible bridge into each one.`}
      proof={`${moat.gaps.length} gaps identified · every gap carries a bridge, not a chart`}
    />

    <section className="gap-list">
      {moat.gaps.map(gap => {
        const bridge = gapBridge(gap, net.members)
        return <article key={gap.id} className="module gap-card">
          <header>
            <div><Eyebrow>{gap.dimension.toUpperCase()} GAP</Eyebrow><h3>{gap.missing}</h3></div>
            <span className="gap-severity">{gap.severity}</span>
          </header>
          <p className="gap-strength"><b>Where you are strong.</b> {gap.strength}</p>
          <p className="gap-why"><b>Why this gap matters.</b> {gap.whyItMatters}</p>
          {bridge && <div className="gap-bridge">
            <Face person={bridge} />
            <div><Eyebrow>STRONGEST CREDIBLE BRIDGE</Eyebrow><strong>{bridge.name}</strong>
              <small>{bridge.title} · {bridge.company}</small>
              <em>{gap.bridgeReason || `Closest permissioned signal to ${gap.missing.toLowerCase()}.`}</em></div>
            <button className="text-action" onClick={() => nav.openMember(bridge)}>Open profile</button>
          </div>}
          <p className="gap-next"><b>Next move.</b> {gap.nextMove}</p>
          <footer className="gap-foot">
            {!!gap.circleIds.length && <span>Circles that help: {gap.circleIds.join(', ')}</span>}
            {!!gap.systemIds.length && <span>Give value first with: {gap.systemIds.join(', ')}</span>}
            <Btn kind="secondary" onClick={() => { if (strategy) moat.linkGapToStrategy(gap.id, strategy.id); nav.setPage('strategy') }}>
              {gap.strategyId ? 'In your strategy' : 'Add to strategy'} <ArrowRight size={13} />
            </Btn>
            <Btn kind="quiet" onClick={() => nav.setPage('simulation')}>Simulate closing it</Btn>
          </footer>
        </article>
      })}
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY THIS IS NOT A CHART</Eyebrow>
        <h2>A gap is only useful if it comes with a door.</h2>
        <p>Every gap here is measured against a declared objective and paired with the strongest credible bridge, the circle where that relationship gathers, and the system you could give before asking for anything. Strategy turns them into moves. Simulation shows what happens if you make them.</p>
        <button className="text-action" onClick={() => nav.setPage('strategy')}>Open your network strategy <ArrowRight size={14} /></button></div>
    </section>
  </>
}
