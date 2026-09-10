import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { useNetwork } from '../store'
import { useMoat } from '../moat-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head } from '../ui'
import { EvidenceLink } from '../os-ui'
import type { AdvisoryBoard } from '../domain/moat-models'

export function AdvisoryBoardsPage() {
  const moat = useMoat()
  const net = useNetwork()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [decision, setDecision] = useState('')
  const [context, setContext] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  return <>
    <Head
      label="PRIVATE ADVISORY BOARDS"
      title="A small room for one real decision."
      copy="Not a group chat. A board is three to five people with the right experience, assembled around a specific decision — with the context preserved, the disagreement recorded, and the decision written down so it can be revisited honestly."
      proof={`${moat.boards.length} boards · private by default`}
      action={<Btn onClick={() => setCreating(!creating)}>{creating ? 'Cancel' : 'Create a board'}</Btn>}
    />

    {creating && <section className="module board-form">
      <header><div><Eyebrow>NEW BOARD</Eyebrow><h3>Name the decision, not the topic.</h3></div>
        <button className="icon-btn" onClick={() => setCreating(false)} aria-label="Close"><X size={16} /></button></header>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Board name" />
      <input value={decision} onChange={e => setDecision(e.target.value)} placeholder="The decision you actually have to make" />
      <textarea rows={3} value={context} onChange={e => setContext(e.target.value)} placeholder="What is true today, and what makes this hard" />
      <div className="board-picker">
        {net.members.slice(0, 10).map(m => <button key={m.id} className={picked.includes(m.id) ? 'on' : ''}
          onClick={() => setPicked(picked.includes(m.id) ? picked.filter(x => x !== m.id) : [...picked, m.id])}>{m.name}</button>)}
      </div>
      <Btn disabled={!name.trim() || !decision.trim()} onClick={() => {
        moat.createBoard({ name: name.trim(), decision: decision.trim(), context: context.trim(), memberIds: picked })
        setName(''); setDecision(''); setContext(''); setPicked([]); setCreating(false)
      }}>Create board <ArrowRight size={14} /></Btn>
    </section>}

    <section className="board-list">
      {moat.boards.map(b => <BoardCard key={b.id} board={b} />)}
      {!moat.boards.length && <p className="quiet-empty">No boards yet. The first one usually forms around a decision you have been circling for weeks.</p>}
    </section>
  </>
}

function BoardCard({ board }: { board: AdvisoryBoard }) {
  const net = useNetwork()
  const moat = useMoat()
  const nav = useNav()
  const [record, setRecord] = useState('')
  const [advice, setAdvice] = useState('')
  const [stance, setStance] = useState<'agrees' | 'disagrees' | 'unsure'>('agrees')
  const [as, setAs] = useState(board.memberIds[0] ?? '')
  const agree = board.contributions.filter(c => c.stance === 'agrees')
  const disagree = board.contributions.filter(c => c.stance === 'disagrees')

  return <article className="module board-card">
    <header>
      <div><Eyebrow>{board.visibility.toUpperCase()} BOARD</Eyebrow><h3>{board.name}</h3><p>{board.decision}</p></div>
      <span className={`board-state ${board.decisionMade ? 'made' : ''}`}>{board.decisionMade ? 'Decision made' : 'Decision open'}</span>
    </header>
    <p className="board-context">{board.context}</p>

    <div className="board-members">
      {board.memberIds.map(id => {
        const m = net.members.find(x => x.id === id)
        return m ? <span key={id} className="board-member"><Face person={m} /><b>{m.name}</b><small>{m.title}</small></span> : null
      })}
      {board.invited.map(i => {
        const m = net.members.find(x => x.id === i.memberId)
        return m ? <span key={i.memberId} className="board-member invited"><b>{m.name}</b><small>{i.status} · {i.expertise}</small></span> : null
      })}
    </div>

    <div className="board-columns">
      <div><Eyebrow>WHERE ADVISORS AGREE</Eyebrow>
        {agree.map(c => <p key={c.id}><b>{net.members.find(m => m.id === c.memberId)?.name ?? 'Advisor'}</b> {c.advice} <em>{c.reasoning}</em></p>)}
        {!agree.length && <p className="quiet-empty">No agreement recorded yet.</p>}</div>
      <div><Eyebrow signal>WHERE THEY DISAGREE</Eyebrow>
        {disagree.map(c => <p key={c.id}><b>{net.members.find(m => m.id === c.memberId)?.name ?? 'Advisor'}</b> {c.advice} <em>{c.reasoning}</em></p>)}
        {!disagree.length && <p className="quiet-empty">No dissent recorded. That is usually a sign the board is too similar.</p>}</div>
      <div><Eyebrow>MISSING PERSPECTIVE</Eyebrow>
        {board.missingExpertise.map(m => <p key={m.label}><b>{m.label}</b> {m.why}
          {m.suggestedMemberId && <button className="text-action" onClick={() => moat.inviteToBoard(board.id, m.suggestedMemberId!, m.label)}>Invite {net.members.find(x => x.id === m.suggestedMemberId)?.name}</button>}</p>)}
        {!board.missingExpertise.length && <p className="quiet-empty">Coverage looks complete.</p>}</div>
    </div>

    <div className="board-add">
      <select value={as} onChange={e => setAs(e.target.value)}>
        {board.memberIds.map(id => <option key={id} value={id}>{net.members.find(m => m.id === id)?.name ?? id}</option>)}
      </select>
      <select value={stance} onChange={e => setStance(e.target.value as typeof stance)}>
        <option value="agrees">Agrees</option><option value="disagrees">Disagrees</option><option value="unsure">Unsure</option>
      </select>
      <input value={advice} onChange={e => setAdvice(e.target.value)} placeholder="Record their advice" />
      <Btn kind="secondary" onClick={() => { if (advice.trim()) { moat.contributeToBoard(board.id, { memberId: as, stance, advice: advice.trim(), reasoning: 'Recorded in the board, preserved with the decision context.' }); setAdvice('') } }}>Record</Btn>
    </div>

    {!!board.openLoops.length && <ul className="board-loops">{board.openLoops.map(l => <li key={l}>{l}</li>)}</ul>}

    {board.decisionMade
      ? <p className="board-decision"><Check size={13} /> <b>Decision recorded {board.decidedAt}.</b> {board.decisionRecord}</p>
      : <div className="board-decide">
        <input value={record} onChange={e => setRecord(e.target.value)} placeholder="Write the decision you actually made" />
        <Btn onClick={() => { if (record.trim()) moat.recordBoardDecision(board.id, record.trim()) }}>Record the decision</Btn>
      </div>}

    <footer className="board-foot">
      <EvidenceLink ids={board.evidenceIds} label="Evidence in front of the board" />
      {board.circleId && <button className="text-action" onClick={() => nav.openCircle(board.circleId!)}>Related circle <ArrowRight size={13} /></button>}
      <button className="text-action" onClick={() => nav.setPage('outcomes')}>Link an outcome <ArrowRight size={13} /></button>
    </footer>
  </article>
}
