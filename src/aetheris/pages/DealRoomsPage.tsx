import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, memberById } from '../ui'
import type { DealStage } from '../domain/pro-models'

const stages: DealStage[] = ['Evaluating', 'Discussing', 'Diligence', 'Structuring', 'Reviewing', 'Approved', 'Signed', 'Paused', 'Closed']

export function DealRoomsPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [activeId, setActiveId] = useState<string | null>(pro.dealRooms[0]?.id ?? null)
  const [answer, setAnswer] = useState<Record<string, string>>({})
  const [decision, setDecision] = useState('')
  const room = pro.dealRooms.find(r => r.id === activeId) ?? pro.dealRooms[0]

  return <>
    <Head
      label="DEAL ROOMS"
      title="Where a real conversation becomes real business."
      copy="A private room for the people actually doing the thing: the originating relationship path, diligence questions with owners, open loops, decisions on the record, permissions per party, milestones and any documents or signatures the deal needs."
      proof={`${pro.dealRooms.length} rooms · private to their parties · every value figure labelled modeled or recorded`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('opportunities')}>Opportunity exchange <ArrowRight size={13} /></Btn>}
    />

    <div className="filter-chips">
      {pro.dealRooms.map(r => <button key={r.id} className={`chip ${room?.id === r.id ? 'on' : ''}`} onClick={() => setActiveId(r.id)}>{r.name}</button>)}
    </div>

    {!room && <p className="empty-state">No deal room yet. Open one from an opportunity when both sides are serious.</p>}

    {room && <section className="deal-room">
      <article className="module deal-main">
        <header>
          <div><Eyebrow>{room.stage.toUpperCase()}</Eyebrow><h3>{room.name}</h3>
            <small>{room.originatingPath}</small></div>
        </header>

        <div className="deal-stage-row">
          {stages.map(s => <button key={s} className={`chip ${room.stage === s ? 'on' : ''}`} onClick={() => pro.setDealStage(room.id, s)}>{s}</button>)}
        </div>

        <div className="deal-parties">
          {room.partyIds.map(id => {
            const m = memberById(net.members, id)
            if (!m) return <span key={id} className="deal-party-you">You</span>
            return <button key={id} className="deal-party" onClick={() => nav.openMember(m)}><Face person={m} /><span><strong>{m.name}</strong><small>{m.title}</small></span></button>
          })}
        </div>

        <p className="deal-next"><b>Next action.</b> {room.nextAction}</p>
        {room.modeledValue && <p className="deal-value"><b>{room.valueState === 'known' ? 'Recorded value.' : 'Modeled value.'}</b> {room.modeledValue}</p>}

        <div className="deal-block">
          <Eyebrow>DILIGENCE</Eyebrow>
          {room.diligence.map(q => <div key={q.id} className="deal-diligence">
            <p><b>{q.question}</b><small>Owner: {q.owner}</small></p>
            {q.answer ? <p className="deal-answer">{q.answer}</p> : <div className="deal-answer-form">
              <input value={answer[q.id] ?? ''} onChange={e => setAnswer({ ...answer, [q.id]: e.target.value })} placeholder="Answer on the record" />
              <Btn kind="secondary" disabled={(answer[q.id] ?? '').trim().length < 4} onClick={() => { pro.answerDiligence(room.id, q.id, (answer[q.id] ?? '').trim()); setAnswer({ ...answer, [q.id]: '' }) }}>Record</Btn>
            </div>}
          </div>)}
          {!room.diligence.length && <p className="empty-state">No diligence questions yet.</p>}
        </div>

        <div className="deal-columns">
          <div className="deal-block">
            <Eyebrow>OPEN LOOPS</Eyebrow>
            {room.openLoops.map(l => <label key={l.id} className="deal-check">
              <input type="checkbox" checked={l.done} onChange={() => pro.toggleDealLoop(room.id, l.id)} />{l.label}
            </label>)}
          </div>
          <div className="deal-block">
            <Eyebrow>MILESTONES</Eyebrow>
            {room.milestones.map(m => <label key={m.id} className="deal-check">
              <input type="checkbox" checked={m.done} onChange={() => pro.toggleDealMilestone(room.id, m.id)} />
              {m.label} <small>{m.owner} · due {m.due}</small>
            </label>)}
            {!room.milestones.length && <p className="empty-state">No milestones set.</p>}
          </div>
        </div>

        <div className="deal-block">
          <Eyebrow>DECISIONS ON THE RECORD</Eyebrow>
          {room.decisions.map(d => <p key={d.id} className="deal-decision"><b>{d.when}</b> {d.record} <small>— {d.by}</small></p>)}
          <div className="deal-answer-form">
            <input value={decision} onChange={e => setDecision(e.target.value)} placeholder="What was decided, and what it commits you to" />
            <Btn disabled={decision.trim().length < 8} onClick={() => { pro.recordDealDecision(room.id, decision.trim()); setDecision('') }}>Record decision</Btn>
          </div>
        </div>
      </article>

      <aside className="deal-rail">
        <div className="module">
          <Eyebrow>WHO CAN SEE WHAT</Eyebrow>
          {room.permissions.map(p => {
            const m = memberById(net.members, p.memberId)
            return <div key={p.memberId} className="deal-permission">
              <strong>{m?.name ?? 'You'}</strong>
              <p><b>Sees.</b> {p.canSee}</p>
              <p><b>Does not see.</b> {p.cannotSee}</p>
            </div>
          })}
          {!room.permissions.length && <p className="empty-state">Everyone in this room sees the same thing.</p>}
        </div>

        <div className="module">
          <Eyebrow>DOCUMENTS AND SIGNATURES</Eyebrow>
          {pro.transactions.filter(t => t.dealRoomId === room.id || room.transactionIds.includes(t.id)).map(t => <div key={t.id} className="deal-tx">
            <strong>{t.kind}: {t.title}</strong>
            <p>{t.summary}</p>
            {t.amount && <small>{t.amount}</small>}
            <small className={`tx-state ${t.signatureState}`}>{t.signatureState.replace('-', ' ')}</small>
            {t.signatureState !== 'signed' && <Btn kind="secondary" onClick={() => pro.setSignatureState(t.id, t.signatureState === 'not-sent' ? 'awaiting-signature' : 'signed')}>
              {t.signatureState === 'not-sent' ? 'Send for signature' : 'Mark signed'}
            </Btn>}
          </div>)}
          <Btn kind="quiet" onClick={() => pro.addTransaction({
            dealRoomId: room.id, kind: 'Scope', title: `${room.name} — scope of work`,
            parties: room.partyIds, summary: 'Drafted from the objective and the answered diligence in this room.',
            signatureState: 'not-sent', signatureNote: 'Nothing is sent until you choose to send it.',
          })}>Draft a scope from this room</Btn>
        </div>

        <div className="module">
          <Eyebrow>PRIVATE NOTE</Eyebrow>
          <p>{room.privateNote}</p>
        </div>
      </aside>
    </section>}

    <section className="teach-block">
      <div><Eyebrow>WHY BUSINESS CAN FINISH HERE</Eyebrow>
        <h2>The relationship, the diligence and the paperwork stop living in three places.</h2>
        <p>A deal room keeps the path that created it, so nobody forgets who made this possible. Decisions are recorded rather than remembered differently by each side. Permissions are explicit. Documents and signatures sit beside the conversation instead of in an inbox.</p>
        <button className="text-action" onClick={() => nav.setPage('attribution')}>See how outcomes get attributed <ArrowRight size={14} /></button></div>
    </section>
  </>
}
