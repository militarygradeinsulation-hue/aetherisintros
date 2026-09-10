import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Head, memberById } from '../ui'
import { pitchReadiness } from '../domain/pro-engine'

export function PermissionPage() {
  const net = useNetwork()
  const pro = usePro()
  const nav = useNav()
  const [category, setCategory] = useState('Vendor or software pitch')
  const [reason, setReason] = useState('')
  const [whyRelevant, setWhyRelevant] = useState('')
  const [value, setValue] = useState('')
  const [whyNow, setWhyNow] = useState('')
  const [evidence, setEvidence] = useState('')
  const [recipientId, setRecipientId] = useState(net.members[0]?.id ?? '')
  const [label, setLabel] = useState('')

  const readiness = pitchReadiness({
    category, reason, whyRelevant, valueToRecipient: value, whyNow,
    evidence: evidence.trim() ? [evidence.trim()] : [],
  })
  const verdict = pro.boundaryCheck(category, { recipientId, warmPath: net.connections.includes(recipientId) })
  const standard = pro.standard[0]

  return <>
    <Head
      label="PERMISSION AND BOUNDARIES"
      title="Attention is the scarcest thing here. It is treated that way."
      copy="Certain categories of outreach cannot simply arrive. They become a structured request the recipient decides on: yes, not now with a revisit trigger, refer me to someone better, or never for this category. Boundaries are enforced by the product, not by hope."
      proof={`${pro.boundaries.filter(b => b.active).length} active boundaries · ${pro.pitchRequests.filter(p => p.decision === 'pending').length} requests awaiting a decision`}
      action={<Btn kind="secondary" onClick={() => nav.setPage('constitution')}>Network constitution <ArrowRight size={13} /></Btn>}
    />

    <section className="permission-layout">
      <article className="module permission-form">
        <Eyebrow>REQUEST PERMISSION TO PITCH</Eyebrow>
        <h3>If you cannot explain why it is relevant to them, it is not ready.</h3>

        <label>Who
          <select value={recipientId} onChange={e => setRecipientId(e.target.value)}>
            {net.members.map(m => <option key={m.id} value={m.id}>{m.name} · {m.title}</option>)}
          </select>
        </label>
        <label>Category
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {['Vendor or software pitch', 'Fundraising pitch', 'Recruiting approach', 'Partnership proposal', 'Advisory inquiry', 'Any outreach'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className={`boundary-verdict ${verdict.allowed ? 'ok' : 'blocked'}`}>
          <Eyebrow>{verdict.allowed ? 'NO BOUNDARY APPLIES' : verdict.requiresPermission ? 'PERMISSION REQUIRED' : 'BOUNDARY IN FORCE'}</Eyebrow>
          <p>{verdict.explanation}</p>
          {verdict.rerouteTo && <p><b>Rerouted to.</b> {verdict.rerouteTo}</p>}
        </div>

        <label>Reason for the request
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Plain language. No template." />
        </label>
        <label>Why it is relevant to them specifically
          <textarea rows={2} value={whyRelevant} onChange={e => setWhyRelevant(e.target.value)} placeholder="Something only true of this person." />
        </label>
        <label>What they get out of it
          <textarea rows={2} value={value} onChange={e => setValue(e.target.value)} placeholder="Their side of the value, not yours." />
        </label>
        <label>Why now
          <input value={whyNow} onChange={e => setWhyNow(e.target.value)} placeholder="The timing signal that makes this the right week" />
        </label>
        <label>One piece of evidence
          <input value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="A recorded outcome, a shared project, a named reference" />
        </label>

        <p className={`readiness ${readiness.ready ? 'ok' : 'not'}`}>{readiness.note}</p>
        <Btn disabled={!readiness.ready} onClick={() => {
          pro.requestPermission({
            recipientId, category, reason: reason.trim(), whyRelevant: whyRelevant.trim(),
            valueToRecipient: value.trim(), whyNow: whyNow.trim(),
            ...(net.connections.includes(recipientId) ? { warmPath: 'Existing direct relationship' } : {}),
            evidence: evidence.trim() ? [evidence.trim()] : [],
          })
          setReason(''); setWhyRelevant(''); setValue(''); setWhyNow(''); setEvidence('')
        }}>Send the request</Btn>
      </article>

      <aside className="permission-rail">
        <div className="module">
          <Eyebrow>REQUESTS AWAITING YOUR DECISION</Eyebrow>
          {pro.pitchRequests.filter(p => p.recipientId === 'me').map(p => {
            const requester = memberById(net.members, p.requesterId)
            return <div key={p.id} className="permission-request">
              <strong>{requester?.name ?? 'A member'}</strong>
              <small>{p.category}</small>
              <p><b>Why relevant.</b> {p.whyRelevant}</p>
              <p><b>Your side of it.</b> {p.valueToRecipient}</p>
              <p><b>Why now.</b> {p.whyNow}</p>
              {p.warmPath && <span className="scope-tag">Warm path: {p.warmPath}</span>}
              {!!p.evidence.length && <span className="scope-tag">Evidence: {p.evidence.join(' · ')}</span>}
              {p.decision === 'pending' ? <div className="permission-actions">
                <Btn onClick={() => pro.decidePermission(p.id, 'yes')}>Yes</Btn>
                <Btn kind="secondary" onClick={() => pro.decidePermission(p.id, 'not-now', 'Revisit after the current quarter closes')}>Not now</Btn>
                <Btn kind="quiet" onClick={() => pro.decidePermission(p.id, 'refer', 'Referred to a better-placed colleague')}>Refer</Btn>
                <Btn kind="quiet" onClick={() => pro.decidePermission(p.id, 'never-category')}>Never for this category</Btn>
              </div> : <span className={`req-state ${p.decision}`}>{p.decision.replace('-', ' ')}{p.revisitTrigger ? ` · ${p.revisitTrigger}` : ''}{p.referredTo ? ` · ${p.referredTo}` : ''}</span>}
            </div>
          })}
          {!pro.pitchRequests.some(p => p.recipientId === 'me') && <p className="empty-state">Nothing waiting. That is the point.</p>}
        </div>

        <div className="module">
          <Eyebrow>YOUR BOUNDARIES</Eyebrow>
          {pro.boundaries.filter(b => b.memberId === 'me').map(b => <div key={b.id} className={`boundary-row ${b.active ? 'on' : ''}`}>
            <div><strong>{b.label}</strong><small>{b.category} · {b.action.replace('-', ' ')}{b.rerouteTo ? ` → ${b.rerouteTo}` : ''}</small>
              <em>{b.explanation}</em></div>
            <Btn kind="quiet" onClick={() => pro.toggleBoundary(b.id)}>{b.active ? 'On' : 'Off'}</Btn>
          </div>)}
          <div className="room-post">
            <label>Add a boundary
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="No unsolicited agency outreach" />
            </label>
            <Btn kind="secondary" disabled={label.trim().length < 6} onClick={() => {
              pro.addBoundary({
                label: label.trim(), category: 'Any outreach', action: 'require-permission',
                explanation: 'You asked for this category to require a structured request before it reaches you.',
              })
              setLabel('')
            }}>Add</Btn>
          </div>
        </div>

        {standard && <div className="module standard-card">
          <Eyebrow>THE AETHERIS STANDARD · {standard.version}</Eyebrow>
          <ul className="standard-list">{standard.principles.map(p => <li key={p}>{p}</li>)}</ul>
          <p>{standard.note}</p>
          <Btn kind={standard.accepted ? 'secondary' : 'primary'} onClick={() => pro.acceptStandard(!standard.accepted)}>
            {standard.accepted ? `Accepted ${standard.acceptedAt ?? ''}` : 'Accept the standard'}
          </Btn>
        </div>}
      </aside>
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY THIS IS THE WHOLE PRODUCT</Eyebrow>
        <h2>Real identity. Real work. Real context. No mass outreach.</h2>
        <p>Every other professional network sells your attention to whoever pays for it. Here, a boundary is code: blocked categories never arrive, permission categories become a structured request with a real decision, and &ldquo;not now&rdquo; comes with the trigger that will make it now. Saying no costs you nothing socially.</p>
        <button className="text-action" onClick={() => nav.setPage('briefing')}>Open your briefing <ArrowRight size={14} /></button></div>
    </section>
  </>
}
