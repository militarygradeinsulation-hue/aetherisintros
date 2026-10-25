import { useState } from 'react'
import { BadgeCheck, CheckCircle2, FileText, Handshake, MailCheck, MessageCircle, UserCheck, Users, Clock3 } from 'lucide-react'
import type { AdminCountKey, AdminStats } from './lib/admin-overview-contract'
import './admin-metric-bento.css'
const groups = {
  membership: [
    {key:'approved_members',label:'Approved members',Icon:BadgeCheck,featured:true},
    {key:'registered_accounts',label:'Registered accounts',Icon:Users},
    {key:'confirmed_accounts',label:'Confirmed emails',Icon:MailCheck},
    {key:'onboarded_profiles',label:'Completed onboarding',Icon:UserCheck},
    {key:'pending_members',label:'Pending / waitlisted',Icon:Clock3},
  ],
  activity: [
    {key:'introduction_requests',label:'Introduction requests',Icon:Handshake,featured:true},
    {key:'messages',label:'Messages sent',Icon:MessageCircle},
    {key:'posts',label:'Network posts',Icon:FileText},
    {key:'asks',label:'Member asks',Icon:CheckCircle2},
  ],
} satisfies Record<string,{key:AdminCountKey;label:string;Icon:typeof Users;featured?:boolean}[]>

/** Compact tiles adapted from the supplied analytics/Web3 layouts; real snapshot totals only. */
export function AdminMetricBento({ stats }: { stats: AdminStats }) {
  const [group, setGroup] = useState<keyof typeof groups>('membership')
  return <section className="admin-metric-bento" aria-label="Platform statistics">
    <header><div><h2>Network pulse</h2><p>All-time totals · one server snapshot</p></div><div className="admin-metric-switch" role="group" aria-label="Statistics group">{(['membership','activity'] as const).map(value => <button type="button" key={value} aria-pressed={group === value} onClick={() => setGroup(value)}>{value === 'membership' ? 'Membership' : 'Activity'}</button>)}</div></header>
    <div className="admin-metric-grid">{groups[group].map(metric => <article key={metric.key} data-featured={'featured' in metric && metric.featured ? 'true' : undefined}>
      <metric.Icon aria-hidden="true" size={20}/><p>{metric.label}</p><strong>{stats[metric.key].toLocaleString()}</strong><small>Recorded total</small>
    </article>)}</div>
    <p className="admin-metric-note">Snapshot: {new Date(stats.generated_at).toLocaleString()}. Historical trends and growth rates are not available from this read.</p>
  </section>
}
