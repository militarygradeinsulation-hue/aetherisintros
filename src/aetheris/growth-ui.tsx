/**
 * Admin-only growth: weekly active members, new members, signup-cohort retention, the
 * first-week activation funnel and DAU/WAU. Reads admin_growth_metrics() (drizzle 0051), which
 * counts days members opened the app (no content, no page views).
 */
import { useEffect, useState } from 'react'
import { LineChart } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { barPct, pctText } from './activation'
import { Eyebrow } from './ui'

interface Growth {
  weeks: Array<{ week: string; active: number; new_members: number }>
  retention: Array<{ cohort: string; size: number; weeks: Array<number | null> }>
  funnel: Record<'members' | 'profile' | 'verified' | 'goals' | 'ask' | 'intro' | 'push' | 'calendar', number>
  last_7_days: { wau: number; avg_dau: number; dau_wau: number | null }
}

const FUNNEL: Array<[keyof Growth['funnel'], string]> = [
  ['profile', 'Photo and headline'], ['verified', 'Verified'], ['goals', 'Goals set'], ['ask', 'Posted an ask'],
  ['intro', 'First introduction'], ['push', 'Notifications on'], ['calendar', 'Calendar connected'],
]

const weekLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function AdminGrowthPanel() {
  const [g, setG] = useState<Growth | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void (supabase as any).rpc('admin_growth_metrics', { p_weeks: 12 }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .then((r: { data: Growth | null; error: { message: string } | null }) => { if (r.error) setError(r.error.message); else setG(r.data) })
  }, [])
  if (error) return <section className="executive-section"><Eyebrow><LineChart size={12} /> GROWTH</Eyebrow><p className="og-note">{error}</p></section>
  if (!g) return null
  const maxActive = Math.max(1, ...g.weeks.map(w => Math.max(w.active, w.new_members)))
  const members = g.funnel.members || 0
  const tracked = g.weeks.some(w => w.active > 0)
  return <section className="executive-section admin-health">
    <Eyebrow><LineChart size={12} /> GROWTH</Eyebrow>
    <h2>{g.last_7_days.wau} active member{g.last_7_days.wau === 1 ? '' : 's'} in the last 7 days.</h2>
    <dl className="oc-funnel">
      <div><dt>Weekly active</dt><dd>{g.last_7_days.wau}</dd></div>
      <div><dt>Avg daily active</dt><dd>{g.last_7_days.avg_dau}</dd></div>
      <div><dt>DAU / WAU</dt><dd>{g.last_7_days.dau_wau == null ? '—' : `${Math.round(g.last_7_days.dau_wau * 100)}%`}</dd></div>
      <div><dt>Members</dt><dd>{members}</dd></div>
    </dl>
    {!tracked && <p className="og-note">Activity is counted from the day this release went live, so earlier weeks show zero active members.</p>}

    <h3>Weekly active and new members</h3>
    <div className="growth-scroll"><table className="admin-health-table growth-table"><thead><tr><th>Week of</th><th>Active</th><th>New</th></tr></thead>
      <tbody>{g.weeks.map(w => <tr key={w.week}>
        <td>{weekLabel(w.week)}</td>
        <td><span className="growth-bar"><i style={{ width: `${barPct(w.active, maxActive)}%` }} /></span>{w.active}</td>
        <td><span className="growth-bar new"><i style={{ width: `${barPct(w.new_members, maxActive)}%` }} /></span>{w.new_members}</td>
      </tr>)}</tbody></table></div>

    <h3>Retention by signup week</h3>
    <div className="growth-scroll"><table className="admin-health-table"><thead><tr><th>Joined week of</th><th>Members</th><th>Week 1</th><th>Week 2</th><th>Week 3</th><th>Week 4</th></tr></thead>
      <tbody>{g.retention.filter(c => c.size > 0).map(c => <tr key={c.cohort}>
        <td>{weekLabel(c.cohort)}</td><td>{c.size}</td>
        {[0, 1, 2, 3].map(k => <td key={k}>{pctText(c.weeks?.[k])}</td>)}
      </tr>)}</tbody></table></div>
    {!g.retention.some(c => c.size > 0) && <p className="og-note">No one joined in these weeks yet.</p>}

    <h3>First-week activation</h3>
    <div className="growth-scroll"><table className="admin-health-table growth-table"><thead><tr><th>Step</th><th>Members</th></tr></thead>
      <tbody>{FUNNEL.map(([key, label]) => <tr key={key}>
        <td>{label}</td>
        <td><span className="growth-bar"><i style={{ width: `${barPct(g.funnel[key] ?? 0, members)}%` }} /></span>{g.funnel[key] ?? 0}{members ? <small>{Math.round(((g.funnel[key] ?? 0) / members) * 100)}% of members</small> : null}</td>
      </tr>)}</tbody></table></div>
    <p className="og-note">Admins only. A member counts as active on a day they open the app; weeks start Monday (UTC). Retention is the share of a signup week's members active in each of the four weeks after.</p>
  </section>
}
