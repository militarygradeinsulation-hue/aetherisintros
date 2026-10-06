import { useState } from 'react'
import { Archive, ArrowLeft } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useOS } from '../os-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Numeral } from '../ui'
import { EvidenceLink, LatentPathList, TrustBudgetNote } from '../os-ui'
import { roomStages, type OpportunityRoom, type RoomStage } from '../domain/os-models'

export function OpportunityRoomsPage({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string | null) => void }) {
  const os = useOS()
  const open = os.rooms.find(r => r.id === openId) ?? null
  if (open) return <RoomDetail room={open} onBack={() => setOpenId(null)} />

  const live = os.rooms.filter(r => !r.archived)
  const closed = os.rooms.filter(r => r.archived)

  return <>
    <Head
      label="OPPORTUNITY ROOMS"
      title="One place per opportunity that actually deserves one."
      copy="A room gathers the people, the company, the system, the circle, the intro state, the conversation, the open loops and the evidence behind a single opportunity — so nothing has to be reassembled from memory."
      proof={`${live.length} live rooms · ${os.rooms.reduce((n, r) => n + r.peopleIds.length, 0)} people involved`}
    />
    <section className="room-list">
      {live.map(r => <RoomRow key={r.id} room={r} onOpen={() => setOpenId(r.id)} />)}
      {!live.length && <p className="quiet-empty">No live rooms. Open one the moment an opportunity has more than one moving part.</p>}
    </section>
    {closed.length > 0 && <section className="room-list">
      <header className="section-line"><Eyebrow>ARCHIVED</Eyebrow><small>{closed.length}</small></header>
      {closed.map(r => <RoomRow key={r.id} room={r} onOpen={() => setOpenId(r.id)} />)}
    </section>}
  </>
}

function RoomRow({ room, onOpen }: { room: OpportunityRoom; onOpen: () => void }) {
  const net = useNetwork()
  const people = room.peopleIds.map(id => net.members.find(m => m.id === id)).filter(Boolean)
  return <article className="room-row">
    <button className="room-row-main" onClick={onOpen}>
      <span className="room-stage">{room.stage}</span>
      <strong>{room.name}</strong>
      <em>{room.thesis}</em>
      <small>{room.valueState === 'known' ? room.knownValue : room.valueState === 'modeled' ? `Modelled: ${room.modeledValue}` : 'Value unquantified'}</small>
    </button>
    <div className="room-row-meta">
      <Numeral value={room.confidence} of=" confidence" />
      <div className="room-faces">{people.slice(0, 4).map(p => p && <Face key={p.id} person={p} />)}</div>
    </div>
  </article>
}

function RoomDetail({ room, onBack }: { room: OpportunityRoom; onBack: () => void }) {
  const os = useOS()
  const net = useNetwork()
  const platform = usePlatform()
  const nav = useNav()
  const [note, setNote] = useState('')
  const [loop, setLoop] = useState('')
  const people = room.peopleIds.map(id => net.members.find(m => m.id === id)).filter(Boolean)
  const systems = room.systemIds.map(id => platform.systems.find(s => s.id === id)).filter(Boolean)
  const circles = room.circleIds.map(id => platform.circles.find(c => c.id === id)).filter(Boolean)
  const loops = platform.loops.filter(l => room.openLoopIds.includes(l.id))

  return <>
    <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> All rooms</button>
    <header className="room-identity">
      <div>
        <Eyebrow>OPPORTUNITY ROOM</Eyebrow>
        <h1>{room.name}</h1>
        <p>{room.thesis}</p>
        <small>Opened {room.createdAt} · updated {room.updatedAt}</small>
      </div>
      <div className="room-identity-meta">
        <Numeral value={room.confidence} of=" confidence" />
        <span className={`value-state ${room.valueState}`}>{room.valueState}</span>
      </div>
    </header>

    <section className="room-stageline">
      {roomStages.map(s => <button
        key={s} className={`stage-pip ${room.stage === s ? 'on' : ''} ${roomStages.indexOf(s) < roomStages.indexOf(room.stage) ? 'past' : ''}`}
        onClick={() => os.advanceRoom(room.id, s as RoomStage)}
      >{s}</button>)}
    </section>

    <div className="room-grid">
      <section className="room-mod">
        <Eyebrow>NEXT ACTION</Eyebrow>
        <p className="room-next">{room.nextAction}</p>
        {room.blockers.length > 0 && <>
          <Eyebrow signal>BLOCKERS</Eyebrow>
          <ul className="room-blockers">{room.blockers.map(b => <li key={b}>{b}</li>)}</ul>
        </>}
        <EvidenceLink ids={room.evidenceIds} />
      </section>

      <section className="room-mod">
        <Eyebrow>VALUE</Eyebrow>
        <p>{room.knownValue || 'Nothing known yet.'}</p>
        <p className="room-modelled">{room.modeledValue ? `Modelled: ${room.modeledValue}` : 'No model claimed.'}</p>
        <small className="room-value-note">Known and modelled value are kept separate. Intros never presents a model as a fact.</small>
      </section>

      <section className="room-mod">
        <Eyebrow>PEOPLE</Eyebrow>
        <ul className="room-people">
          {people.map(p => p && <li key={p.id}>
            <button onClick={() => nav.openMember(p)}><Face person={p} /><span><b>{p.name}</b><em>{p.title} · {p.company}</em></span></button>
          </li>)}
        </ul>
        <select className="room-add" value="" onChange={e => e.target.value && os.addToRoom(room.id, 'peopleIds', e.target.value)}>
          <option value="">Add person…</option>
          {net.members.filter(m => !room.peopleIds.includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </section>

      <section className="room-mod">
        <Eyebrow>SYSTEMS &amp; CIRCLES</Eyebrow>
        <ul className="room-tags">
          {systems.map(s => s && <li key={s.id}><button onClick={() => nav.openSystem(s.id)}>{s.name}</button></li>)}
          {circles.map(c => c && <li key={c.id}><button onClick={() => nav.openCircle(c.id)}>{c.name}</button></li>)}
        </ul>
        <div className="room-add-row">
          <select value="" onChange={e => e.target.value && os.addToRoom(room.id, 'systemIds', e.target.value)}>
            <option value="">Add system…</option>
            {platform.systems.filter(s => !room.systemIds.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value="" onChange={e => e.target.value && os.addToRoom(room.id, 'circleIds', e.target.value)}>
            <option value="">Add circle…</option>
            {platform.circles.filter(c => !room.circleIds.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </section>

      <section className="room-mod">
        <Eyebrow>OPEN LOOPS</Eyebrow>
        <ul className="room-loops">
          {loops.map(l => <li key={l.id}><b>{l.title}</b><small>{l.status} · {l.priority}</small></li>)}
          {!loops.length && <li className="quiet-empty">No commitments recorded in this room.</li>}
        </ul>
        <form onSubmit={e => {
          e.preventDefault()
          if (!loop.trim()) return
          platform.createLoop({
            title: loop, owner: 'me', memberId: room.peopleIds[0] ?? 'me', source: room.name,
            priority: 'medium', evidence: room.thesis, scope: 'private',
          })
          os.logRoomEvent(room.id, `Open loop created: ${loop}`)
          setLoop('')
        }}>
          <input value={loop} onChange={e => setLoop(e.target.value)} placeholder="Create an open loop…" />
          <Btn kind="secondary">Add</Btn>
        </form>
      </section>

      <section className="room-mod">
        <Eyebrow>TRUST PATH</Eyebrow>
        <TrustBudgetNote candidateIds={room.peopleIds} />
      </section>

      <section className="room-mod wide">
        <Eyebrow>CONTEXTUAL PATHS INTO THIS OPPORTUNITY</Eyebrow>
        <LatentPathList {...(room.companyId ? { companyId: room.companyId } : {})} {...(room.peopleIds[0] ? { personId: room.peopleIds[0] } : {})} />
      </section>

      <section className="room-mod wide">
        <Eyebrow>TIMELINE</Eyebrow>
        <ol className="room-timeline">
          {room.timeline.map(t => <li key={t.id}><small>{t.when}</small><span>{t.text}</span>{t.stage && <em>{t.stage}</em>}</li>)}
        </ol>
        <form onSubmit={e => { e.preventDefault(); if (!note.trim()) return; os.logRoomEvent(room.id, note); setNote('') }}>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Record what just happened…" />
          <Btn kind="secondary">Log</Btn>
        </form>
      </section>
    </div>

    <div className="room-footer-actions">
      <Btn kind="secondary" onClick={() => {
        platform.recordOutcome({
          type: 'opportunity', headline: `${room.name} — outcome recorded`, ownerId: 'me',
          ...(room.peopleIds[0] ? { memberId: room.peopleIds[0] } : {}),
          ...(room.systemIds[0] ? { systemId: room.systemIds[0] } : {}),
          directValue: { state: room.valueState, note: room.knownValue || room.modeledValue },
          influencedValue: { state: 'modeled', note: room.modeledValue },
          evidence: room.thesis, confidence: room.confidence,
        } as never)
        os.logRoomEvent(room.id, 'Outcome recorded.')
      }}>Record outcome</Btn>
      <Btn kind="quiet" onClick={() => { os.archiveRoom(room.id); onBack() }}><Archive size={14} /> Close room</Btn>
    </div>
  </>
}
