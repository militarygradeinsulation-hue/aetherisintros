import { useEffect, useState } from 'react'
import { BarChart3, Handshake, Network, Store, UsersRound } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import BusinessAnalystPanel from '../BusinessAnalystPanel'
import { WarmReferralPanel } from '../WarmReferralPanel'
import { TrackRecordDashboard } from '../TrackRecordDashboard'
import { StorefrontPanel } from '../StorefrontPanel'
import { SyndicationRoomsPanel } from '../SyndicationRoomsPanel'
import { Eyebrow } from '../ui'

type WorkbenchTab = 'analyst' | 'referrals' | 'track' | 'storefront' | 'syndication'

const tabs: Array<{ id: WorkbenchTab; label: string; icon: typeof BarChart3; copy: string }> = [
  { id: 'analyst', label: 'Business Analyst', icon: BarChart3, copy: 'Strategic analysis from the business and relationship evidence already in Ask Intros.' },
  { id: 'referrals', label: 'Warm Referrals', icon: Network, copy: 'High-context paths to people worth meeting, with a human approval step before outreach.' },
  { id: 'track', label: 'Track Record', icon: Handshake, copy: 'Outcomes, follow-through and verified reputation signals—not self-awarded credibility.' },
  { id: 'storefront', label: 'Storefront & Proposals', icon: Store, copy: 'Define what you offer and manage structured proposals without turning the network into a public marketplace.' },
  { id: 'syndication', label: 'Syndication', icon: UsersRound, copy: 'Private small-group rooms for co-invest, co-sponsor and co-refer decisions.' },
]

export function ExecutiveWorkPage() {
  const [tab, setTab] = useState<WorkbenchTab>('analyst')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void supabase.auth.getUser().then(({ data }) => {
      if (live) setUserId(data.user?.id ?? null)
    })
    return () => { live = false }
  }, [])

  const current = tabs.find(item => item.id === tab) ?? tabs[0]!

  return <section className="executive-workbench">
    <header className="page-title">
      <div>
        <Eyebrow>EXECUTIVE WORKBENCH</Eyebrow>
        <h1>Turn relationship intelligence into work.</h1>
        <p>{current.copy}</p>
      </div>
    </header>

    <nav className="ops-tabs executive-workbench-tabs" aria-label="Executive workbench tools">
      {tabs.map(item => {
        const Icon = item.icon
        return <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>
          <Icon size={14} /> {item.label}
        </button>
      })}
    </nav>

    <div className="executive-workbench-body">
      {tab === 'analyst' && <BusinessAnalystPanel />}
      {tab === 'referrals' && <WarmReferralPanel />}
      {tab === 'track' && (userId ? <TrackRecordDashboard userId={userId} /> : <p className="ops-note">Sign in to view your Track Record.</p>)}
      {tab === 'storefront' && <StorefrontPanel />}
      {tab === 'syndication' && <SyndicationRoomsPanel />}
    </div>
  </section>
}
