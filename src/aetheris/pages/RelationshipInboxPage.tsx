import { useState } from 'react'
import { Check, Clock } from 'lucide-react'
import { useNetwork } from '../store'
import { useOS } from '../os-store'
import { useNav } from '../nav'
import { Btn, Face, Head } from '../ui'
import { EvidenceLink } from '../os-ui'
import { orderInbox } from '../domain/os-engine'
import type { InboxLane, RelationshipInboxItem } from '../domain/os-models'

const lanes: Array<'All' | InboxLane> = ['All', 'Today', 'This Week', 'Mine', 'Waiting on Them', 'Opportunities', 'Give Before Ask']

export function RelationshipInboxPage() {
  const os = useOS()
  const [lane, setLane] = useState<'All' | InboxLane>('All')
  const items = orderInbox(os.inbox, lane)
  const done = os.inbox.filter(i => i.status === 'done').length

  return <>
    <Head
      label="RELATIONSHIP INBOX"
      title="What deserves your attention."
      copy="The relationships where your attention matters today."
      proof={`${items.length} open · ${done} closed this cycle`}
    />
    <nav className="lane-row" role="tablist" aria-label="Inbox lanes">
      {lanes.map(l => <button key={l} role="tab" aria-selected={lane === l} className={lane === l ? 'on' : ''} onClick={() => setLane(l)}>{l}</button>)}
    </nav>
    <section className="inbox-list">
      {items.map(i => <InboxRow key={i.id} item={i} />)}
      {!items.length && <p className="quiet-empty">Nothing in this lane. That is a good state, not an empty one.</p>}
    </section>
  </>
}

export function InboxRow({ item, compact = false }: { item: RelationshipInboxItem; compact?: boolean }) {
  const os = useOS()
  const net = useNetwork()
  const nav = useNav()
  const person = net.members.find(m => m.id === item.personId)

  const act = () => {
    if (item.threadId) return nav.goToThread(item.threadId)
    if (item.collisionId) return nav.setPage('collisions')
    if (item.roomId) return nav.openRoom(item.roomId)
    if (item.systemId) return nav.openSystem(item.systemId)
    if (person) return nav.openMember(person)
    nav.setPage('memory')
  }

  return <article className={`inbox-row kind-${item.kind.replace(/\s+/g, '-')} ${compact ? 'compact' : ''}`}>
    <div className="inbox-lead">
      {person ? <Face person={person} /> : <span className="inbox-mark" aria-hidden="true" />}
      <div>
        <span className="inbox-kind">{item.kind}</span>
        <b>{item.title}</b>
      </div>
    </div>
    {!compact && <div className="inbox-reasons">
      <dl><div><dt>Why now</dt><dd>{item.whyNow}</dd></div></dl>
      <details>
        <summary className="cursor-pointer text-sm font-medium">View reasoning and next move</summary>
        <dl>
          <div><dt>Why this matters</dt><dd>{item.whyThisMatters}</dd></div>
          <div><dt>Next move</dt><dd>{item.nextMove}</dd></div>
        </dl>
      </details>
    </div>}
    <footer>
      <EvidenceLink ids={item.evidenceIds} label="Evidence" />
      <div className="inbox-actions">
        <Btn onClick={act}>{item.threadId ? 'Open conversation' : item.roomId ? 'Open room' : person ? 'Open profile' : 'Review'}</Btn>
        <Btn kind="quiet" onClick={() => os.completeInboxItem(item.id)}><Check size={13} /> Done</Btn>
        <Btn kind="quiet" onClick={() => os.snoozeInboxItem(item.id)}><Clock size={13} /> Snooze</Btn>
      </div>
    </footer>
  </article>
}
