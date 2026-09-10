import { useState } from 'react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useOS } from '../os-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head } from '../ui'
import { BandTag, EvidenceLink } from '../os-ui'
import type { NetworkSimulation, SimulationInput } from '../domain/os-models'

const blank: SimulationInput = {
  thingToMove: '', audience: '', targetCount: 10, horizon: 'Next two quarters',
  geography: '', industries: [], allowedCircleIds: [], excludedPersonIds: [],
}

export function SimulationPage() {
  const os = useOS()
  const net = useNetwork()
  const platform = usePlatform()
  const nav = useNav()
  const [input, setInput] = useState<SimulationInput>(blank)
  const [result, setResult] = useState<NetworkSimulation | null>(null)
  const set = <K extends keyof SimulationInput>(k: K, v: SimulationInput[K]) => setInput(p => ({ ...p, [k]: v }))

  const circleNames = Object.fromEntries(platform.circles.map(c => [c.id, c.name]))

  return <>
    <Head
      label="NETWORK SIMULATION"
      title="Ask the network a strategic question before you spend a relationship."
      copy="How would you actually reach ten manufacturing chief executives in Indiana? Which connector carries it? Where does it stall? Intros answers in bands with the evidence, and refuses to invent a probability it cannot support."
      proof={`${os.simulations.length} saved simulations · ${platform.circles.length} circles available`}
    />

    <section className="sim-form">
      <div className="sim-fields">
        <label>Thing to move<input value={input.thingToMove} onChange={e => set('thingToMove', e.target.value)} placeholder="Golden Fit Report" /></label>
        <label>Target audience<input value={input.audience} onChange={e => set('audience', e.target.value)} placeholder="PE portfolio operating partners" /></label>
        <label>Target count<input type="number" min={1} max={200} value={input.targetCount} onChange={e => set('targetCount', Number(e.target.value))} /></label>
        <label>Time horizon<input value={input.horizon} onChange={e => set('horizon', e.target.value)} placeholder="By 31 December" /></label>
        <label>Geography<input value={input.geography} onChange={e => set('geography', e.target.value)} placeholder="Indiana" /></label>
        <label>Industries<input value={input.industries.join(', ')} onChange={e => set('industries', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Manufacturing, Private equity" /></label>
        <label>System<select value={input.systemId ?? ''} onChange={e => setInput(p => e.target.value ? { ...p, systemId: e.target.value } : (({ systemId, ...rest }) => rest)(p) as SimulationInput)}>
          <option value="">None</option>
          {platform.systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <label>Allowed circles<select multiple value={input.allowedCircleIds} onChange={e => set('allowedCircleIds', Array.from(e.target.selectedOptions).map(o => o.value))}>
          {platform.circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
        <label>Exclude relationships<select multiple value={input.excludedPersonIds} onChange={e => set('excludedPersonIds', Array.from(e.target.selectedOptions).map(o => o.value))}>
          {net.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select></label>
      </div>
      <div className="sim-run">
        <Btn disabled={!input.thingToMove.trim() || !input.audience.trim()} onClick={() => setResult(os.simulate(input, net.members, circleNames))}>Run simulation</Btn>
        <small>Bands are directional. Intros will tell you where the data is thin instead of dressing it up.</small>
      </div>
    </section>

    {result && <SimulationResult sim={result} onSaved={() => { os.saveSimulation(result) }} />}

    {os.simulations.length > 0 && <section className="sim-saved">
      <header className="section-line"><Eyebrow>SAVED SIMULATIONS</Eyebrow><small>{os.simulations.length}</small></header>
      <ul>{os.simulations.map(s => <li key={s.id}>
        <button onClick={() => setResult(s)}><b>{s.question}</b><small>{s.createdAt} · friction {s.estimatedFriction} · confidence {s.confidence}</small></button>
        {s.savedAsStrategyId && <button className="link-btn" onClick={() => nav.setPage('strategy')}>View strategy</button>}
      </li>)}</ul>
    </section>}
  </>
}

function SimulationResult({ sim, onSaved }: { sim: NetworkSimulation; onSaved: () => void }) {
  const os = useOS()
  const net = useNetwork()
  const nav = useNav()
  const connectors = sim.strongestConnectorIds.map(id => net.members.find(m => m.id === id)).filter(Boolean)

  return <section className="sim-result">
    <header className="sim-result-head">
      <div><Eyebrow signal>SIMULATION</Eyebrow><h2>{sim.question}</h2></div>
      <div className="sim-bands">
        <BandTag value={sim.estimatedFriction} label="Friction" />
        <BandTag value={sim.confidence} label="Confidence" />
      </div>
    </header>

    <div className="sim-grid">
      <section className="sim-mod">
        <Eyebrow>LIKELY PATHS</Eyebrow>
        <ul className="sim-paths">{sim.likelyPaths.map(p => <li key={p.id}>
          <b>{p.label}</b>
          <div className="sim-path-bands"><BandTag value={p.reach} label="Reach" /><BandTag value={p.friction} label="Friction" /><BandTag value={p.trustCost} label="Trust cost" /></div>
          <em>{p.note}</em>
        </li>)}</ul>
      </section>
      <section className="sim-mod">
        <Eyebrow>STRONGEST CONNECTORS</Eyebrow>
        <ul className="sim-people">{connectors.map(p => p && <li key={p.id}>
          <button onClick={() => nav.openMember(p)}><Face person={p} /><span><b>{p.name}</b><em>{p.company}</em></span></button>
        </li>)}</ul>
      </section>
      <section className="sim-mod"><Eyebrow>BOTTLENECKS</Eyebrow><ul>{sim.bottlenecks.map(b => <li key={b}>{b}</li>)}</ul></section>
      <section className="sim-mod"><Eyebrow signal>TRUST WARNINGS</Eyebrow><ul>{sim.trustWarnings.map(b => <li key={b}>{b}</li>)}</ul></section>
      <section className="sim-mod"><Eyebrow>REQUIRED PROOF</Eyebrow><ul>{sim.requiredProof.map(b => <li key={b}>{b}</li>)}</ul></section>
      <section className="sim-mod"><Eyebrow>RELATIONSHIP GAPS</Eyebrow><ul>{sim.relationshipGaps.map(b => <li key={b}>{b}</li>)}</ul></section>
      <section className="sim-mod wide">
        <Eyebrow>SEQUENCE</Eyebrow>
        <ol className="sim-sequence">{sim.sequence.map(s => <li key={s}>{s}</li>)}</ol>
      </section>
      <section className="sim-mod wide">
        <Eyebrow>WHERE THIS IS UNCERTAIN</Eyebrow>
        <ul className="sim-uncertainty">{sim.uncertainty.map(u => <li key={u}>{u}</li>)}</ul>
        <EvidenceLink ids={sim.evidenceIds} />
      </section>
    </div>

    <div className="sim-actions">
      <Btn onClick={onSaved}>Save simulation</Btn>
      <Btn kind="secondary" onClick={() => { os.createStrategyFromSimulation(sim, net.members); nav.setPage('strategy') }}>Save as strategy</Btn>
      <Btn kind="secondary" onClick={() => {
        const room = os.createRoom({
          name: sim.input.thingToMove || sim.question, thesis: sim.sequence[0] ?? sim.question,
          peopleIds: sim.strongestConnectorIds, systemIds: sim.input.systemId ? [sim.input.systemId] : [],
          circleIds: sim.input.allowedCircleIds, stage: 'Qualified', confidence: 50,
          nextAction: sim.sequence[0] ?? 'Write the artefact worth forwarding.', blockers: sim.bottlenecks,
        })
        nav.openRoom(room.id)
      }}>Create opportunity room</Btn>
    </div>
  </section>
}
