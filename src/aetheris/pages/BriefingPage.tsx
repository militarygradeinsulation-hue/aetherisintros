import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNetwork } from '../store'
import { usePro } from '../pro-store'
import { useOS } from '../os-store'
import { useNav } from '../nav'
import { Btn, Eyebrow, Face, Head, memberById } from '../ui'
import { bucketMeaning, groupInbox } from '../domain/pro-engine'
import type { Page } from '../nav'

const pages = new Set<string>(['opportunities', 'dealrooms', 'deals', 'expertise', 'talent', 'capital', 'intelrooms', 'presence', 'permission', 'vault', 'knowledgeassets', 'passport', 'briefing', 'collisions', 'loops', 'travel', 'strategy', 'rooms', 'inbox', 'messages', 'memory', 'intros', 'attribution', 'eventmode'])

export function BriefingPage() {
  const net = useNetwork()
  const pro = usePro()
  const os = useOS()
  const nav = useNav()
  const [mode, setMode] = useState<'briefing' | 'inbox'>('briefing')

  const go = (target?: string) => {
    if (!target) return
    const page = target === 'travel' || target === 'eventpresence' ? 'presence' : target
    if (pages.has(page)) nav.setPage(page as Page)
  }

  const items = pro.briefing({
    decisions: pro.inboxDecisions,
    opportunities: pro.opportunities,
    knowledge: pro.knowledgeAssets,
    problems: pro.problems,
    members: net.members,
    ...(pro.travel[0]?.city ? { travelCity: pro.travel[0].city } : {}),
    ...(pro.eventPresence.find(e => e.optedIn)?.eventName ? { eventName: pro.eventPresence.find(e => e.optedIn)!.eventName } : {}),
    collisions: os.collisions.slice(0, 2).map(c => ({ headline: c.headline, why: c.mutualValue })),
    openLoops: os.rooms.slice(0, 3).map(r => ({ label: r.nextAction, who: r.name })),
    ...(os.strategies[0] ? { strategyNote: os.strategies[0].goal } : {}),
  })

  const sections = [...new Set(items.map(i => i.kind))]
  const buckets = groupInbox(pro.inboxDecisions)

  return <>
    <Head
      label="BRIEFING AND PROFESSIONAL INBOX"
      title="Open once. Know exactly what needs you today."
      copy="Not a feed and not a notification list. Your briefing is composed: what needs your attention, which relationships moved, what opportunity is live, what collided, who you can help, the loops still open, and what is waiting on someone else."
      proof={`${items.length} composed items · ${pro.inboxDecisions.filter(d => d.bucket === 'DECIDE' && d.state === 'open').length} decisions waiting on you`}
      action={<Btn kind="secondary" onClick={() => setMode(mode === 'briefing' ? 'inbox' : 'briefing')}>{mode === 'briefing' ? 'Open the inbox' : 'Back to briefing'} <ArrowRight size={13} /></Btn>}
    />

    {mode === 'briefing' && <section className="briefing">
      {sections.map(section => <article key={section} className="module briefing-section">
        <Eyebrow>{section.toUpperCase()}</Eyebrow>
        {items.filter(i => i.kind === section).map((item, idx) => {
          const m = item.memberId ? memberById(net.members, item.memberId) : undefined
          return <div key={`${section}-${idx}`} className="briefing-item">
            {m && <Face person={m} />}
            <div><strong>{item.headline}</strong><p>{item.detail}</p><em>{item.why}</em></div>
            <div className="team-role-actions">
              {m && <button className="text-action" onClick={() => nav.openMember(m)}>Profile</button>}
              {item.targetPage && <button className="text-action" onClick={() => go(item.targetPage)}>Open</button>}
            </div>
          </div>
        })}
      </article>)}
      {!items.length && <p className="empty-state">Nothing needs you today. That is a real state here, not an empty screen to fill.</p>}
    </section>}

    {mode === 'inbox' && <section className="pro-inbox">
      {buckets.map(({ bucket, items: rows }) => <article key={bucket} className="module inbox-bucket">
        <header><Eyebrow>{bucket}</Eyebrow><small>{bucketMeaning[bucket]}</small></header>
        {rows.map(row => {
          const m = row.memberId ? memberById(net.members, row.memberId) : undefined
          return <div key={row.id} className={`inbox-row ${row.state}`}>
            {m && <Face person={m} />}
            <div>
              <strong>{row.headline}</strong>
              <p>{row.detail}</p>
              <em><b>If you do nothing.</b> {row.consequence}</em>
              {row.due && <span className="scope-tag">Due {row.due}</span>}
            </div>
            <div className="team-role-actions">
              {row.targetPage && <button className="text-action" onClick={() => go(row.targetPage)}>Open</button>}
              {row.state === 'open' && <>
                <button className="text-action" onClick={() => pro.setDecisionState(row.id, 'handled')}>Handled</button>
                <button className="text-action" onClick={() => pro.setDecisionState(row.id, 'waiting')}>Waiting on them</button>
                <button className="text-action" onClick={() => pro.setDecisionState(row.id, 'dismissed')}>Not for me</button>
              </>}
              {row.state !== 'open' && <span className="req-state">{row.state}</span>}
            </div>
          </div>
        })}
        {!rows.length && <p className="empty-state">Empty.</p>}
      </article>)}
    </section>}

    <section className="teach-block">
      <div><Eyebrow>WHY THERE IS NO INFINITE SCROLL</Eyebrow>
        <h2>Five buckets, and every one of them ends.</h2>
        <p>DECIDE means nothing moves until you choose. RESPOND means a person is waiting on words. MOVE is where the value is this week. WAIT is correctly waiting on someone else. FYI requires nothing. Each item states what happens if you do nothing, which is the only honest form of urgency.</p>
        <button className="text-action" onClick={() => nav.setPage('permission')}>How attention is protected <ArrowRight size={14} /></button></div>
    </section>
  </>
}
