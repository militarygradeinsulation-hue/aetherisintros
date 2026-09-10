import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, MessageSquareText, Plus, Send, Share2, X } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Glyph, Head, Meter, Numeral, Why } from '../ui'
import { funnel, rankPlacements, systemVelocity } from '../domain/engine'
import { placementStages, type PlacementStage, type SystemCategory, type SystemRecord } from '../domain/models'

const categories: SystemCategory[] = [
  'Product', 'Methodology', 'Software', 'Process', 'Service',
  'Framework', 'Research', 'Investment thesis', 'Distribution channel', 'Capability',
]

export function SystemsPage({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string | null) => void }) {
  const platform = usePlatform()
  const [creating, setCreating] = useState(false)
  const open = platform.systems.find(s => s.id === openId) ?? null

  if (open) return <SystemDetail system={open} onBack={() => setOpenId(null)} />

  const mine = platform.systems.filter(s => s.ownerId === 'me' && s.status !== 'archived')
  const network = platform.systems.filter(s => s.ownerId !== 'me')
  const archived = platform.systems.filter(s => s.status === 'archived')

  return <>
    <Head
      label="SYSTEMS / THINGS YOU CAN MOVE"
      title="A system is anything you are trying to place."
      copy="A product, a method, a capability, a thesis. Intros treats it as a first-class object with the people, circles and timing that would carry it forward."
      proof={`${platform.systems.length} systems in the graph · ${platform.placements.length} live placements`}
      action={<Btn onClick={() => setCreating(true)}><Plus size={14} /> Create system</Btn>}
    />

    <section className="sys-list">
      <header className="section-line"><Eyebrow>YOUR SYSTEMS</Eyebrow><small>{mine.length} active</small></header>
      {mine.map(s => <SystemRow key={s.id} system={s} onOpen={() => setOpenId(s.id)} />)}
    </section>

    <section className="sys-list">
      <header className="section-line"><Eyebrow>CIRCULATING IN YOUR NETWORK</Eyebrow><small>{network.length} shared by members</small></header>
      {network.map(s => <SystemRow key={s.id} system={s} onOpen={() => setOpenId(s.id)} />)}
    </section>

    {archived.length > 0 && <section className="sys-list">
      <header className="section-line"><Eyebrow>ARCHIVED</Eyebrow><small>{archived.length}</small></header>
      {archived.map(s => <SystemRow key={s.id} system={s} onOpen={() => setOpenId(s.id)} />)}
    </section>}

    <section className="teach-block">
      <div><Eyebrow>WHY SYSTEMS EXIST HERE</Eyebrow>
        <h2>Most good work never reaches the room where it matters.</h2>
        <p>Placing a system is a relationship problem: the right people, in the right circle, at the moment the outcome is already owned. Intros ranks that, shows the reasoning, and records what happened.</p>
      </div>
      <ul className="teach-points">
        <li><b>Placement engine</b><span>Ranks people and circles by fit, timing, trust and friction.</span></li>
        <li><b>System velocity</b><span>Weighted stage movement, not impressions.</span></li>
        <li><b>Placement history</b><span>Created → Placed → Conversation → Introduction → Demonstration → Adoption → Referral.</span></li>
      </ul>
    </section>

    {creating && <CreateSystem onClose={() => setCreating(false)} onCreated={id => { setCreating(false); setOpenId(id) }} />}
  </>
}

function SystemRow({ system, onOpen }: { system: SystemRecord; onOpen: () => void }) {
  const platform = usePlatform()
  const velocity = systemVelocity(system, platform.placements)
  return <article className="sys-row">
    <button className="sys-row-main" onClick={onOpen}>
      <span className="sys-cat">{system.category}</span>
      <strong>{system.name}</strong>
      <em>{system.thesis}</em>
      <small>{system.industries.join(' · ')} · {system.geography}</small>
    </button>
    <div className="sys-row-meta">
      <Numeral value={velocity.score} of=" velocity" />
      <ul>
        <li><b>{system.activePlacements}</b>active</li>
        <li><b>{system.adoptionCount}</b>adopted</li>
        <li><b>{system.referralCount}</b>referred</li>
      </ul>
      <Btn kind="secondary" onClick={onOpen}>Place this system <ArrowRight size={14} /></Btn>
    </div>
  </article>
}

function SystemDetail({ system, onBack }: { system: SystemRecord; onBack: () => void }) {
  const platform = usePlatform()
  const net = useNetwork()
  const nav = useNav()
  const [tab, setTab] = useState<'placements' | 'engine' | 'history'>('engine')
  const velocity = systemVelocity(system, platform.placements)
  const steps = funnel(system, platform.placements)
  const placements = platform.placements.filter(p => p.systemId === system.id)
  const candidates = useMemo(
    () => rankPlacements(system, net.members, platform.circles, platform.intents, platform.placements).slice(0, 6),
    [system, net.members, platform.circles, platform.intents, platform.placements],
  )
  const bestCircles = [...platform.circles].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3)
  const bestPeople = candidates.filter(c => c.targetType === 'person').slice(0, 3)
  const connector = [...platform.reputation].sort((a, b) => b.outcomesCreated - a.outcomesCreated)[0]
  const connectorMember = connector ? net.members.find(m => m.id === connector.memberId) : undefined

  return <article className="sys-detail">
    <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> All systems</button>

    <header className="sys-hero">
      <div>
        <Eyebrow>{system.category.toUpperCase()} · {system.status.toUpperCase()}</Eyebrow>
        <h1>{system.name}</h1>
        <h2>{system.thesis}</h2>
        <p>{system.description}</p>
        <div className="sys-hero-actions">
          <Btn onClick={() => setTab('engine')}>Place this system <ArrowRight size={14} /></Btn>
          <Btn kind="secondary" onClick={() => platform.updateSystem(system.id, { status: system.status === 'placing' ? 'active' : 'placing' })}>
            {system.status === 'placing' ? 'Pause placing' : 'Start placing'}
          </Btn>
          <Btn kind="quiet" onClick={() => void navigator.clipboard?.writeText(`${system.name} — ${system.thesis}`).catch(() => {})}><Share2 size={14} /> Share</Btn>
          <Btn kind="quiet" onClick={() => { platform.archiveSystem(system.id); onBack() }}>Archive</Btn>
        </div>
        <dl className="sys-stats">
          <div><dt>Velocity</dt><dd>{velocity.score}</dd></div>
          <div><dt>Active</dt><dd>{system.activePlacements}</dd></div>
          <div><dt>Target</dt><dd>{system.targetPlacements}</dd></div>
          <div><dt>Adopted</dt><dd>{system.adoptionCount}</dd></div>
          <div><dt>Referred</dt><dd>{system.referralCount}</dd></div>
        </dl>
      </div>
      <aside className="sys-hero-side">
        <span>PLACEMENT GOAL</span>
        <p>{system.placementGoal}</p>
        <span>VALUE PROPOSITION</span>
        <p>{system.valueProposition}</p>
        <span>WHO BENEFITS</span>
        <p>{system.whoBenefits}</p>
      </aside>
    </header>

    <div className="sys-modules">
      <section className="mod">
        <header><span>BEST CIRCLES</span></header>
        <ul className="mod-rows">{bestCircles.map(c => <li key={c.id}>
          <button onClick={() => nav.openCircle(c.id)}><b>{c.name}</b><small>{c.purpose}</small></button>
          <em>{c.relevanceScore}</em>
        </li>)}</ul>
      </section>
      <section className="mod">
        <header><span>BEST PEOPLE</span></header>
        <ul className="mod-rows">{bestPeople.map(c => {
          const member = net.members.find(m => m.id === c.targetId)
          return <li key={c.targetId}>
            <button onClick={() => member && nav.openMember(member)}>
              {member && <Face person={member} portrait />}
              <span><b>{member?.name}</b><small>{c.reasonFit}</small></span>
            </button>
            <em>{c.fitScore}</em>
          </li>
        })}</ul>
      </section>
      <section className="mod">
        <header><span>BEST CONNECTOR</span></header>
        {connectorMember
          ? <div className="connector-box">
            <Face person={connectorMember} portrait large />
            <div><b>{connectorMember.name}</b><small>{connector?.introStyle}</small>
              <em>{connector?.outcomesCreated} outcomes · usually replies {connector?.typicalResponse.toLowerCase()}</em></div>
          </div>
          : <p className="empty-state">No connector record yet.</p>}
        <header className="mod-second"><span>WARMEST PATH</span></header>
        <p className="mod-copy">{candidates[0]?.trustPath.join(' → ') ?? 'No path mapped yet.'}</p>
      </section>
    </div>

    <div className="sys-modules two">
      <section className="mod">
        <header><span>WHY THIS FITS</span></header>
        <p className="mod-copy">{system.description}</p>
        <ul className="mod-list">{system.bestFitRoles.map(r => <li key={r}>{r}</li>)}</ul>
        <header className="mod-second"><span>EXPECTED FRICTION</span></header>
        <p className="mod-copy">{system.expectedFriction}</p>
      </section>
      <section className="mod">
        <header><span>EVIDENCE</span></header>
        <ul className="mod-list">{system.evidence.map(e => <li key={e}>{e}</li>)}</ul>
        <header className="mod-second"><span>PROOF</span></header>
        <ul className="mod-list">{system.proof.map(e => <li key={e}>{e}</li>)}</ul>
      </section>
    </div>

    <section className="funnel">
      <header><Eyebrow>PLACEMENT FUNNEL</Eyebrow><small>{velocity.note}</small></header>
      <ol>{steps.map(s => <li key={s.label}><b>{s.count}</b><span>{s.label}</span></li>)}</ol>
    </section>

    <div className="state-filters">
      {([['engine', 'Placement engine'], ['placements', `Placements (${placements.length})`], ['history', 'Placement history']] as const)
        .map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
    </div>

    {tab === 'engine' && <section className="candidate-list">
      {candidates.map(c => <article key={`${c.targetType}-${c.targetId}`} className="candidate">
        <header>
          <div><Eyebrow signal>{c.targetType === 'circle' ? 'CIRCLE' : 'PERSON'}</Eyebrow><h3>{c.targetLabel}</h3></div>
          <Numeral value={c.fitScore} of=" fit" />
        </header>
        <div className="candidate-meters">
          <Meter label="Circle relevance" value={c.circleRelevance} />
          <Meter label="Timing" value={c.timingScore} />
          <Meter label="Confidence" value={c.confidence} />
        </div>
        <dl>
          <div><dt>WHY IT FITS</dt><dd>{c.reasonFit}</dd></div>
          <div><dt>WHY NOW</dt><dd>{c.reasonNow}</dd></div>
          <div><dt>MUTUAL VALUE</dt><dd>{c.mutualValue}</dd></div>
          <div><dt>EXPECTED OUTCOME</dt><dd>{c.expectedOutcome}</dd></div>
          <div><dt>FRICTION</dt><dd>{c.friction}</dd></div>
          <div><dt>TRUST PATH</dt><dd>{c.trustPath.join(' → ')}</dd></div>
        </dl>
        {c.unknowns.length > 0 && <p className="unknown-line"><b>Unknown:</b> {c.unknowns.join(' · ')}</p>}
        <Why>{c.reasonFit} Timing scored {c.timingScore} because {c.reasonNow.toLowerCase()}</Why>
        <footer>
          <small>Suggested next step · {c.nextStep}</small>
          <div>
            {c.targetType === 'person' && <Btn kind="quiet" onClick={() => nav.messageMember(c.targetId)}><MessageSquareText size={14} /> Message</Btn>}
            {c.targetType === 'circle' && <Btn kind="quiet" onClick={() => nav.openCircle(c.targetId)}>Open circle</Btn>}
            <Btn onClick={() => { platform.startPlacement(system.id, { type: c.targetType, id: c.targetId, label: c.targetLabel }, c); setTab('placements') }}>
              <Plus size={14} /> Start placement
            </Btn>
          </div>
        </footer>
      </article>)}
    </section>}

    {tab === 'placements' && <section className="candidate-list">
      {placements.length === 0 && <p className="empty-state">No placements yet. Open the placement engine and start with the highest fit.</p>}
      {placements.map(p => <article key={p.id} className="candidate">
        <header>
          <div><Eyebrow signal>{p.stage.toUpperCase()}</Eyebrow><h3>{p.targetLabel}</h3></div>
          <Numeral value={p.fitScore} of=" fit" />
        </header>
        <dl>
          <div><dt>MUTUAL VALUE</dt><dd>{p.mutualValue || '—'}</dd></div>
          <div><dt>NEXT STEP</dt><dd>{p.nextStep || '—'}</dd></div>
          <div><dt>TRUST PATH</dt><dd>{p.trustPath.join(' → ')}</dd></div>
          <div><dt>EVIDENCE</dt><dd>{p.provenance.sourceType} · confidence {p.provenance.confidence} · {p.provenance.scope}</dd></div>
        </dl>
        <StageMover placement={p.id} stage={p.stage} />
        <ol className="history-line">{p.history.map(h => <li key={`${h.stage}-${h.when}`}><i /><div><p>{h.stage}</p><small>{h.when} · {h.note}</small></div></li>)}</ol>
      </article>)}
    </section>}

    {tab === 'history' && <section className="mod">
      <header><span>EVERYTHING THAT HAPPENED</span></header>
      <ol className="history-line">
        {placements.flatMap(p => p.history.map(h => ({ ...h, label: p.targetLabel })))
          .sort((a, b) => (a.when < b.when ? 1 : -1))
          .map(h => <li key={`${h.label}-${h.stage}-${h.when}`}><i />
            <div><p>{h.label} — {h.stage}</p><small>{h.when} · {h.note}</small></div></li>)}
      </ol>
    </section>}
  </article>
}

function StageMover({ placement, stage }: { placement: string; stage: PlacementStage }) {
  const platform = usePlatform()
  const [note, setNote] = useState('')
  const idx = placementStages.indexOf(stage)
  return <div className="stage-mover">
    <div className="stage-track">{placementStages.slice(0, 9).map((s, i) => (
      <button key={s} className={i === idx ? 'active' : i < idx ? 'done' : ''}
        onClick={() => platform.advancePlacement(placement, s, note.trim() || `Moved to ${s}.`)}>
        {i < idx ? <Check size={11} /> : null}{s}
      </button>
    ))}</div>
    <div className="stage-note">
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="What changed? This is recorded with the stage." />
      <Btn kind="quiet" onClick={() => platform.advancePlacement(placement, 'Closed/Not Now', note.trim() || 'Closed for now.')}>Close / not now</Btn>
    </div>
  </div>
}

function CreateSystem({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const platform = usePlatform()
  const [form, setForm] = useState({
    name: '', thesis: '', category: 'Product' as SystemCategory, description: '',
    industries: '', roles: '', geography: '', proof: '', goal: '', value: '', friction: '', benefits: '',
  })
  const ready = form.name.trim() && form.thesis.trim()
  const field = (key: keyof typeof form, label: string, placeholder: string, rows = 1) =>
    <label key={key}><span>{label}</span>
      <textarea rows={rows} value={form[key] as string} placeholder={placeholder}
        onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>
  return <div className="modal-wrap light-modal-wrap" onMouseDown={onClose}>
    <div className="modal need-modal" onMouseDown={e => e.stopPropagation()}>
      <header>
        <div><Eyebrow>CREATE SYSTEM</Eyebrow><h2>What are you trying to place?</h2>
          <p>Describe it the way you would to someone who could adopt it tomorrow.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button>
      </header>
      <div className="need-form">
        {field('name', '01 / Name', 'Golden Report')}
        {field('thesis', '02 / Short thesis', 'One sentence a busy operator would repeat.', 2)}
        <label><span>03 / Category</span>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as SystemCategory })}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select></label>
        {field('description', '04 / What it actually does', 'The method, the sequence, the artefact people receive.', 3)}
        {field('industries', '05 / Industries (comma separated)', 'Manufacturing, Field services')}
        {field('roles', '06 / Best-fit roles (comma separated)', 'CEO, Operating Partner')}
        {field('geography', '07 / Geography', 'US — Midwest first')}
        {field('proof', '08 / Proof (one per line)', 'Found $2.1M of unquoted work at a 140-person fabricator', 2)}
        {field('goal', '09 / Current placement goal', 'Six diagnostics inside PE-backed operating companies.')}
        {field('value', '10 / Value proposition', 'Evidence before spend.')}
        {field('friction', '11 / Expected friction', 'They expect another dashboard.')}
        {field('benefits', '12 / Who benefits', 'Operating partners answerable for revenue.')}
      </div>
      <footer>
        <Btn kind="quiet" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!ready} onClick={() => {
          const split = (v: string) => v.split(/[,\n]/).map(x => x.trim()).filter(Boolean)
          const id = platform.createSystem({
            name: form.name.trim(), thesis: form.thesis.trim(), category: form.category,
            description: form.description.trim() || form.thesis.trim(),
            industries: split(form.industries), bestFitRoles: split(form.roles),
            geography: form.geography.trim() || 'US', proof: split(form.proof),
            placementGoal: form.goal.trim() || 'Place with two credible first adopters.',
            valueProposition: form.value.trim() || form.thesis.trim(),
            expectedFriction: form.friction.trim() || 'Unproven with this audience. Lead with evidence.',
            whoBenefits: form.benefits.trim() || 'People accountable for the outcome this affects.',
          })
          onCreated(id)
        }}><Send size={15} /> Create system</Btn>
      </footer>
    </div>
  </div>
}
