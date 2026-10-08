/**
 * The "This week" queue at the top of the live Home: the handful of actions waiting on the
 * member, each with one button. Renders nothing for signed-out or demo visitors.
 */
import { useEffect, useState } from 'react'
import { ArrowRight, Building2, CheckCircle2, Clock, HandHelping, MessageSquareReply } from 'lucide-react'

import { buildWeek, loadWeekInputs, type WeekItem, type WeekKind, type WeekTarget } from './this-week'

const icon: Record<WeekKind, typeof Clock> = {
  respond: MessageSquareReply, checkin: Clock, help: HandHelping, quiet_ask: Clock, company_risk: Building2,
}

export function ThisWeekPanel({ onOpen }: { onOpen: (target: WeekTarget) => void }) {
  const [items, setItems] = useState<WeekItem[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let stale = false
    void loadWeekInputs().then(r => {
      if (stale) return
      setItems(r.data ? buildWeek(r.data) : null)
      setError(r.error)
    })
    return () => { stale = true }
  }, [])
  if (items === null) return null

  return <section className="this-week" aria-label="This week">
    <header>
      <span className="home-board-label">This week</span>
      <h2>{items.length ? `${items.length} thing${items.length === 1 ? '' : 's'} waiting on you.` : 'Nothing is waiting on you.'}</h2>
      {!items.length && <p><CheckCircle2 size={14} /> Every request is answered and every introduction followed up. Post an ask when you need something.</p>}
    </header>
    {items.length > 0 && <ol>{items.map(item => {
      const Icon = icon[item.kind]
      return <li key={item.key} className={`tw-${item.kind}`}>
        <Icon size={16} aria-hidden />
        <div><b>{item.title}</b><span>{item.detail}</span></div>
        <button type="button" onClick={() => onOpen(item.target)}>{item.action} <ArrowRight size={13} /></button>
      </li>
    })}</ol>}
    {error && <p className="tw-error">Some items could not load: {error}</p>}
  </section>
}
