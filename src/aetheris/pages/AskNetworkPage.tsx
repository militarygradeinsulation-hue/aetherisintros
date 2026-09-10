import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useMoat } from '../moat-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head } from '../ui'
import { useOutreachGate } from '../moat-ui'
import { routeQuestion } from '../domain/moat-engine'
import type { AudienceScope, NetworkQuestion } from '../domain/moat-models'

const audiences: Array<{ id: AudienceScope; label: string; note: string }> = [
  { id: 'public', label: 'Public', note: 'Anyone in Aetheris can see the question.' },
  { id: 'network', label: 'Network', note: 'Members with a permissioned signal on the topic.' },
  { id: 'connections', label: 'Connections', note: 'Only people you already know.' },
  { id: 'circle', label: 'Circle', note: 'One circle, no wider.' },
  { id: 'organization', label: 'Organization', note: 'Your organization only.' },
  { id: 'private-routed', label: 'Private routed', note: 'Nobody sees the question but the people it concerns.' },
]

export function AskNetworkPage() {
  const net = useNetwork()
  const platform = usePlatform()
  const moat = useMoat()
  const nav = useNav()
  const { gate, modal } = useOutreachGate()
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [audience, setAudience] = useState<AudienceScope>('network')
  const [circleId, setCircleId] = useState(platform.circles[0]?.id ?? '')
  const [preview, setPreview] = useState(false)

  const circle = platform.circles.find(c => c.id === circleId)
  const circleMemberIds = circle?.memberIds ?? []
  const routedPreview = question.trim().length > 8
    ? moat.review(question, { channel: 'network-question', authorId: 'me' })
    : null

  const submit = () => {
    if (question.trim().length < 8) return
    gate(`${question} ${context}`, { channel: 'network-question', authorId: 'me' }, () => {
      moat.askNetwork({
        question: question.trim(), context: context.trim(), audience,
        ...(audience === 'circle' ? { circleId } : {}),
        members: net.members, connections: net.connections, circleMemberIds,
      })
      setQuestion(''); setContext(''); setPreview(false)
    })
  }

  return <>
    <Head
      label="ASK MY NETWORK"
      title="Ask the people who would actually know."
      copy="Not a broadcast. Aetheris routes your question only to members whose permissioned expertise, circles, companies and current intent suggest they can genuinely help — and tells you why each one was chosen."
      proof={`${moat.questions.length} questions asked · routing is explainable, never paid`}
    />

    <section className="module ask-composer">
      <header><div><Eyebrow>YOUR QUESTION</Eyebrow><h3>One clear question beats ten introductions.</h3></div></header>
      <textarea rows={2} value={question} onChange={e => setQuestion(e.target.value)}
        placeholder="Who knows a manufacturing company dealing with quoting delays?" />
      <textarea rows={2} value={context} onChange={e => setContext(e.target.value)}
        placeholder="Context: why you are asking, and what the person answering gets out of it." />
      <div className="ask-audience">
        {audiences.map(a => <button key={a.id} className={audience === a.id ? 'on' : ''} onClick={() => setAudience(a.id)}>{a.label}</button>)}
      </div>
      {audience === 'circle' && <select value={circleId} onChange={e => setCircleId(e.target.value)}>
        {platform.circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>}
      <p className="ask-audience-note">{audiences.find(a => a.id === audience)?.note}</p>
      {routedPreview && routedPreview.flags.length > 0 && <p className="ask-quality"><b>{routedPreview.verdict}.</b> {routedPreview.flags[0]!.plainLanguage}</p>}
      <div className="ask-composer-actions">
        <Btn kind="secondary" onClick={() => setPreview(!preview)} disabled={question.trim().length < 8}>Preview routed audience</Btn>
        <Btn onClick={submit} disabled={question.trim().length < 8}>Ask my network <ArrowRight size={14} /></Btn>
      </div>
      {preview && <RoutedPreview question={question} audience={audience} circleMemberIds={circleMemberIds} />}
    </section>

    <section className="question-list">
      {moat.questions.map(q => <QuestionCard key={q.id} question={q} />)}
      {!moat.questions.length && <p className="quiet-empty">No questions yet. Ask one — it is the fastest way to find who actually knows.</p>}
    </section>

    <section className="teach-block">
      <div><Eyebrow>HOW ROUTING WORKS</Eyebrow>
        <h2>Nobody gets a question they cannot answer.</h2>
        <p>Aetheris matches a question against permissioned expertise, verified passport claims, circle membership, company context and current intent. Members with no signal on the topic never see it — which is why answers here come back at a rate no broadcast feed can match.</p>
        <button className="text-action" onClick={() => nav.setPage('circles')}>Ask inside a circle instead <ArrowRight size={14} /></button></div>
    </section>
    {modal}
  </>
}

function RoutedPreview({ question, audience, circleMemberIds }: { question: string; audience: AudienceScope; circleMemberIds: string[] }) {
  const net = useNetwork()
  const moat = useMoat()
  const result = routeQuestion(question, {
    members: net.members, audience, connections: net.connections,
    circleMemberIds, passports: moat.passports,
  })
  return <div className="routed-preview">
    <Eyebrow>WHO THIS WOULD REACH</Eyebrow>
    <ul>{result.routed.map(r => {
      const m = net.members.find(x => x.id === r.memberId)
      if (!m) return null
      return <li key={r.memberId}><Face person={m} /><div><strong>{m.name}</strong><small>{m.title} · {m.company}</small><em>{r.reason}</em></div><span>{r.confidence}</span></li>
    })}</ul>
    <p className="routed-logic">{result.logic.join(' · ')}</p>
    <p className="routed-private">{moat.passports.length} passports consulted. Nothing private was used to decide this.</p>
  </div>
}

function QuestionCard({ question }: { question: NetworkQuestion }) {
  const net = useNetwork()
  const moat = useMoat()
  const nav = useNav()
  const [reply, setReply] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  return <article className="module question-card">
    <header>
      <div><Eyebrow>{question.audience.toUpperCase()} · {question.status.toUpperCase()}</Eyebrow>
        <h3>{question.question}</h3>{question.context && <p>{question.context}</p>}</div>
    </header>
    <ul className="question-routed">
      {question.routed.map(r => {
        const m = net.members.find(x => x.id === r.memberId)
        if (!m) return null
        return <li key={r.memberId}>
          <Face person={m} />
          <div><strong>{m.name}</strong><small>{m.title} · {m.company}</small><em>{r.reason}</em>
            {r.responded && <p className="question-response">“{r.response}”</p>}
            {!r.responded && replyTo === r.memberId && <div className="question-reply">
              <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Record what they said" />
              <Btn kind="secondary" onClick={() => { moat.answerQuestion(question.id, r.memberId, reply); setReply(''); setReplyTo(null) }}>Save</Btn>
            </div>}
          </div>
          <div className="question-row-actions">
            <span>{r.confidence}</span>
            {r.responded ? <Check size={14} /> : <button className="text-action" onClick={() => setReplyTo(r.memberId)}>Log reply</button>}
            <button className="text-action" onClick={() => nav.openMember(m)}>Open</button>
          </div>
        </li>
      })}
    </ul>
    <p className="routed-logic">{question.routingLogic.join(' · ')}</p>
    <footer className="question-foot">
      {question.outcome && <span>{question.outcome}</span>}
      {question.status !== 'closed' && <Btn kind="quiet" onClick={() => moat.closeQuestion(question.id, 'Closed with the answers received.')}>Close question</Btn>}
    </footer>
  </article>
}
