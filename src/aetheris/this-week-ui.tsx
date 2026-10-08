/**
 * The "This week" queue at the top of the live Home: the handful of actions waiting on the
 * member, each with one button. Renders nothing for signed-out or demo visitors.
 */
import { useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { ArrowRight, Building2, CheckCircle2, Clock, HandHelping, Hourglass, MessageSquareReply } from 'lucide-react'

import { buildWeek, loadWeekInputs, type WeekItem, type WeekKind, type WeekTarget } from './this-week'

const icon: Record<WeekKind, typeof Clock> = {
  respond: MessageSquareReply, checkin: Clock, unanswered: Hourglass, help: HandHelping, quiet_ask: Clock, company_risk: Building2,
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
    <DigestToggle />
  </section>
}

/** Opt in to receiving this list by email every Monday (off by default). */
function DigestToggle() {
  const [uid, setUid] = useState<string | null>(null)
  const [on, setOn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let stale = false
    void (async () => {
      const { data } = await supabase.auth.getSession()
      const id = data.session?.user.id ?? null
      if (stale || !id) return
      setUid(id)
      const r = await (supabase as any).from('email_preferences').select('weekly_digest').eq('user_id', id).maybeSingle() // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!stale) setOn(!!r.data?.weekly_digest)
    })()
    return () => { stale = true }
  }, [])
  if (!uid || on === null) return null
  const toggle = async () => {
    setBusy(true)
    const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const existing = await db.from('email_preferences').select('user_id').eq('user_id', uid).maybeSingle()
    const r = existing.data
      ? await db.from('email_preferences').update({ weekly_digest: !on }).eq('user_id', uid)
      : await db.from('email_preferences').insert({ user_id: uid, weekly_digest: !on })
    if (!r.error) setOn(!on)
    setBusy(false)
  }
  return <label className="tw-digest"><input type="checkbox" checked={on} disabled={busy} onChange={() => void toggle()} /> Email me this every Monday morning</label>
}
