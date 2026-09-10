import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face } from '../ui'
import { intentTypes, type IntentType, type Visibility } from '../domain/models'

/** Compact live-intent strip: what you are moving right now, with an expiry. */
export function IntentStrip({ onCreate }: { onCreate: () => void }) {
  const platform = usePlatform()
  const mine = platform.intents.filter(i => i.memberId === 'me')
  const active = mine.filter(i => i.status === 'active')
  return <section className="intent-strip">
    <header>
      <Eyebrow>LIVE INTENT · WHAT YOU ARE MOVING</Eyebrow>
      <Btn kind="quiet" onClick={onCreate}>Post intent</Btn>
    </header>
    {active.length === 0
      ? <p className="empty-state">No live intent. Post one and the network can match it — intents expire so nothing stays stale.</p>
      : <ul>{active.map(i => <li key={i.id}>
        <b>{i.type}</b>
        <span>{i.title}</span>
        <small>{i.audience} · expires {i.expiresAt} · {i.visibility}</small>
        <button onClick={() => platform.expireIntent(i.id)}>Withdraw</button>
      </li>)}</ul>}
    {mine.some(i => i.status === 'expired') && <div className="expired-intents">
      <Eyebrow>EXPIRED</Eyebrow>
      {mine.filter(i => i.status === 'expired').map(i => <button key={i.id} onClick={() => platform.reactivateIntent(i.id)}>{i.title} — reactivate</button>)}
    </div>}
  </section>
}

/** Network-wide intent board — what everyone is trying to move right now. */
export function IntentBoard() {
  const platform = usePlatform()
  const net = useNetwork()
  const nav = useNav()
  const [type, setType] = useState<'all' | IntentType>('all')
  const live = platform.intents.filter(i => i.status === 'active' && i.memberId !== 'me' && (type === 'all' || i.type === type))
  const types = intentTypes.filter(t => platform.intents.some(i => i.type === t && i.status === 'active' && i.memberId !== 'me'))

  return <section className="intent-board">
    <header className="section-line"><Eyebrow>LIVE INTENT ACROSS THE NETWORK</Eyebrow><small>{live.length} active</small></header>
    <div className="state-filters">
      <button className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>All</button>
      {types.map(t => <button key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>{t}</button>)}
    </div>
    <div className="intent-grid">
      {live.map(i => {
        const member = net.members.find(m => m.id === i.memberId)
        return <article key={i.id} className={`intent-card urgency-${i.urgency}`}>
          <header><Eyebrow signal={i.urgency === 'high'}>{i.type}</Eyebrow><h3>{i.title}</h3></header>
          <p>{i.statement}</p>
          <small>{i.audience}{i.geographyFilter ? ` · ${i.geographyFilter}` : ''} · expires {i.expiresAt}</small>
          {i.valueOffered && <p className="intent-value"><b>In return.</b> {i.valueOffered}</p>}
          <footer>
            {member && <button className="mod-link with-face" onClick={() => nav.openMember(member)}><Face person={member} portrait /> {member.name}</button>}
            <div className="row-actions">
              {member && <Btn kind="quiet" onClick={() => nav.messageMember(member.id)}>Message</Btn>}
              {member && <Btn onClick={() => nav.openHandshake(member.id)}>Handshake</Btn>}
            </div>
          </footer>
        </article>
      })}
      {live.length === 0 && <p className="empty-state">No live intent of this type right now.</p>}
    </div>
  </section>
}

export function IntentModal({ onClose }: { onClose: () => void }) {
  const platform = usePlatform()
  const [form, setForm] = useState({
    type: 'I NEED' as IntentType, title: '', statement: '', audience: '', roles: '', industries: '',
    geography: '', urgency: 'medium' as 'low' | 'medium' | 'high', visibility: 'network' as Visibility,
    value: '', evidence: '', systemId: '',
  })
  return <div className="modal-wrap light-modal-wrap" onMouseDown={onClose}>
    <div className="modal need-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Eyebrow>POST LIVE INTENT</Eyebrow><h2>What are you moving right now?</h2>
        <p>Intent expires. That is deliberate — the network should only match what is actually current.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="need-form">
        <label><span>01 / Intent type</span>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as IntentType })}>
            {intentTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label><span>02 / Headline</span><textarea rows={1} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="A plant to run the throughput diagnostic in" /></label>
        <label><span>03 / Full statement</span><textarea rows={3} value={form.statement} onChange={e => setForm({ ...form, statement: e.target.value })} placeholder="Say it the way you would say it out loud." /></label>
        <label><span>04 / Who this is for</span><textarea rows={2} value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} placeholder="Operating partners at PE-backed manufacturers" /></label>
        <label><span>05 / Roles (comma separated)</span><textarea rows={1} value={form.roles} onChange={e => setForm({ ...form, roles: e.target.value })} placeholder="COO, Operating Partner" /></label>
        <label><span>06 / Industries (comma separated)</span><textarea rows={1} value={form.industries} onChange={e => setForm({ ...form, industries: e.target.value })} placeholder="Manufacturing" /></label>
        <label><span>07 / Geography</span><textarea rows={1} value={form.geography} onChange={e => setForm({ ...form, geography: e.target.value })} placeholder="US Midwest" /></label>
        <label><span>08 / Urgency</span>
          <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value as typeof form.urgency })}>
            <option value="high">High — weeks matter</option><option value="medium">Medium</option><option value="low">Low</option>
          </select></label>
        <label><span>09 / Visibility</span>
          <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value as Visibility })}>
            <option value="network">Network</option><option value="connections">Connections only</option><option value="private">Private (matching only)</option>
          </select></label>
        <label><span>10 / What you offer in return</span><textarea rows={2} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="Be specific. Vague reciprocity reads as nothing." /></label>
        <label><span>11 / Related system</span>
          <select value={form.systemId} onChange={e => setForm({ ...form, systemId: e.target.value })}>
            <option value="">None</option>
            {platform.systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
      </div>
      <footer><Btn kind="quiet" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!form.title.trim()} onClick={() => {
          const split = (v: string) => v.split(',').map(x => x.trim()).filter(Boolean)
          platform.createIntent({
            type: form.type, title: form.title.trim(), statement: form.statement.trim() || form.title.trim(),
            audience: form.audience.trim() || 'Anyone who can move this', roleFilter: split(form.roles),
            companyFilter: [], industryFilter: split(form.industries), geographyFilter: form.geography.trim(),
            urgency: form.urgency, visibility: form.visibility,
            valueOffered: form.value.trim() || 'Context, candid feedback and a useful introduction in return.',
            evidence: form.evidence.trim() ? [form.evidence.trim()] : [],
            ...(form.systemId ? { relatedSystemId: form.systemId } : {}),
          })
          onClose()
        }}><Send size={15} /> Post intent</Btn></footer>
    </div>
  </div>
}
