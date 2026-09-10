import { useState } from 'react'
import { Check, Clock, MessageSquareText, Plus, Send, X } from 'lucide-react'
import { useNetwork } from '../store'
import { usePlatform } from '../platform'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, Why } from '../ui'
import type { PrivacyScope } from '../types'

export function LoopsPage() {
  const platform = usePlatform()
  const net = useNetwork()
  const nav = useNav()
  const [tab, setTab] = useState<'open' | 'mine' | 'theirs' | 'triggers' | 'closed'>('open')
  const [adding, setAdding] = useState(false)

  const open = platform.loops.filter(l => l.status === 'open')
  const triggers = platform.triggers.filter(t => t.status === 'new')
  const list = tab === 'open' ? open
    : tab === 'mine' ? open.filter(l => l.owner === 'me')
      : tab === 'theirs' ? open.filter(l => l.owner === 'them')
        : tab === 'closed' ? platform.loops.filter(l => l.status !== 'open')
          : []

  return <>
    <Head
      label="OPEN LOOPS / UNFINISHED BUSINESS"
      title="Relationships fail in the gap between promise and delivery."
      copy="Every commitment, question and waiting-on is tracked with who owns it and what proves it. Nothing depends on you remembering."
      proof={`${open.length} open · ${open.filter(l => l.owner === 'me').length} yours · ${triggers.length} memories just became relevant`}
      action={<Btn onClick={() => setAdding(true)}><Plus size={14} /> Add loop</Btn>}
    />

    <div className="state-filters">
      {([['open', `All open (${open.length})`], ['mine', `You owe (${open.filter(l => l.owner === 'me').length})`],
      ['theirs', `Waiting on them (${open.filter(l => l.owner === 'them').length})`],
      ['triggers', `Reactivated memory (${triggers.length})`], ['closed', 'Closed']] as const)
        .map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
    </div>

    {tab !== 'triggers' && <section className="loop-list">
      {list.map(l => {
        const member = net.members.find(m => m.id === l.memberId)
        return <article key={l.id} className={`loop-row ${l.priority}`}>
          <div className="loop-main">
            <header>
              <Eyebrow signal={l.priority === 'high'}>{l.owner === 'me' ? 'YOU OWE THIS' : l.owner === 'them' ? 'WAITING ON THEM' : 'SHARED'}</Eyebrow>
              <h3>{l.title}</h3>
            </header>
            <p>{l.evidence}</p>
            <small>{l.source}{l.dueAt ? ` · due ${l.dueAt}` : ''}{l.trigger ? ` · waits on: ${l.trigger}` : ''} · {l.scope}</small>
          </div>
          <div className="loop-side">
            {member && <button className="mod-link with-face" onClick={() => nav.openMember(member)}><Face person={member} portrait /> {member.name.split(' ')[0]}</button>}
            <div className="row-actions">
              {member && <Btn kind="quiet" onClick={() => nav.messageMember(member.id)}><MessageSquareText size={13} /> Message</Btn>}
              {l.status === 'open'
                ? <>
                  <Btn kind="quiet" onClick={() => platform.snoozeLoop(l.id)}><Clock size={13} /> Snooze</Btn>
                  <Btn onClick={() => platform.completeLoop(l.id)}><Check size={13} /> Close loop</Btn>
                </>
                : <Btn kind="secondary" onClick={() => platform.reopenLoop(l.id)}>Reopen</Btn>}
            </div>
          </div>
        </article>
      })}
      {list.length === 0 && <p className="empty-state">Nothing here. That is the goal.</p>}
    </section>}

    {tab === 'triggers' && <section className="loop-list">
      {triggers.map(t => {
        const member = net.members.find(m => m.id === t.memberId)
        return <article key={t.id} className="loop-row trigger">
          <div className="loop-main">
            <header><Eyebrow signal>MEMORY REACTIVATED · CONFIDENCE {t.confidence}</Eyebrow><h3>{t.matchedEvent}</h3></header>
            <p className="quote-inline">“{t.sourceMemory}”</p>
            <small>Trigger condition: {t.triggerCondition} · {t.when} · {t.scope}</small>
            <Why>You stored this months ago. The condition you were waiting for just occurred, so it moved to the top.</Why>
          </div>
          <div className="loop-side">
            {member && <button className="mod-link with-face" onClick={() => nav.openMember(member)}><Face person={member} portrait /> {member.name.split(' ')[0]}</button>}
            <p className="mod-copy">{t.recommendedAction}</p>
            <div className="row-actions">
              <Btn kind="quiet" onClick={() => platform.dismissTrigger(t.id)}>Dismiss</Btn>
              <Btn onClick={() => { platform.actOnTrigger(t.id); if (member) nav.messageMember(member.id) }}>Act on it</Btn>
            </div>
          </div>
        </article>
      })}
      {triggers.length === 0 && <p className="empty-state">No stored memory has been reactivated by an event recently.</p>}
    </section>}

    {adding && <AddLoop onClose={() => setAdding(false)} />}
  </>
}

function AddLoop({ onClose }: { onClose: () => void }) {
  const platform = usePlatform()
  const net = useNetwork()
  const [form, setForm] = useState({
    title: '', memberId: net.members[0]?.id ?? '', owner: 'me' as 'me' | 'them' | 'shared',
    priority: 'medium' as 'low' | 'medium' | 'high', evidence: '', trigger: '', dueAt: '',
    scope: 'private' as PrivacyScope, source: 'Added manually',
  })
  return <div className="modal-wrap light-modal-wrap" onMouseDown={onClose}>
    <div className="modal need-modal" onMouseDown={e => e.stopPropagation()}>
      <header><div><Eyebrow>ADD OPEN LOOP</Eyebrow><h2>What is unfinished?</h2>
        <p>Name the commitment and who owns it. Intros will surface it when it matters.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button></header>
      <div className="need-form">
        <label><span>01 / What is outstanding</span><textarea rows={2} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Send the throughput model to Mina" /></label>
        <label><span>02 / Person</span>
          <select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}>
            {net.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></label>
        <label><span>03 / Who owns it</span>
          <select value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value as typeof form.owner })}>
            <option value="me">You</option><option value="them">Them</option><option value="shared">Shared</option>
          </select></label>
        <label><span>04 / Priority</span>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as typeof form.priority })}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select></label>
        <label><span>05 / Evidence</span><textarea rows={2} value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} placeholder="Where this promise was made." /></label>
        <label><span>06 / Waits on (optional trigger)</span><textarea rows={1} value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} placeholder="Their board meeting closes" /></label>
        <label><span>07 / Privacy</span>
          <select value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value as PrivacyScope })}>
            <option value="private">Private</option><option value="shareable">Shareable</option><option value="team">Team</option>
          </select></label>
      </div>
      <footer><Btn kind="quiet" onClick={onClose}>Cancel</Btn>
        <Btn disabled={!form.title.trim()} onClick={() => {
          platform.createLoop({
            title: form.title.trim(), owner: form.owner, memberId: form.memberId,
            source: form.source, priority: form.priority, scope: form.scope,
            evidence: form.evidence.trim() || 'Recorded by you.',
            ...(form.trigger.trim() ? { trigger: form.trigger.trim() } : {}),
            ...(form.dueAt ? { dueAt: form.dueAt } : {}),
          })
          onClose()
        }}><Send size={15} /> Add loop</Btn></footer>
    </div>
  </div>
}
