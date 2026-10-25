import { WeeklyDigest } from '@/features/commons-trust/WeeklyDigest'
import { BusinessTools } from '@/features/business-tools/BusinessTools'
import { useState } from 'react'
import { BarChart3, Handshake, Network, Store, UsersRound } from 'lucide-react'

import BusinessAnalystPanel from '../BusinessAnalystPanel'
import { WarmReferralPanel } from '../WarmReferralPanel'
import { CurrentUserTrackRecord } from '../CurrentUserTrackRecord'
import { StorefrontPanel } from '../StorefrontPanel'
import { SyndicationRoomsPanel } from '../SyndicationRoomsPanel'
import { Eyebrow } from '../ui'
import '../executive-work-intelligence.css'

type WorkbenchTab = 'digest' | 'tools' | 'analyst' | 'referrals' | 'track' | 'storefront' | 'syndication'

const tabs: Array<{ id: WorkbenchTab; label: string; icon: typeof BarChart3; copy: string }> = [
  { id: 'tools', label: 'Business Tools', icon: Store, copy: 'Create private content, sales drafts, business reviews, and plans with tools customized for your profile.' },
  { id: 'digest', label: 'Weekly Digest', icon: UsersRound, copy: 'A quiet, factual summary of recent posts from the people you follow.' },
  { id: 'analyst', label: 'Business Analyst', icon: BarChart3, copy: 'Strategic analysis from the business and relationship evidence already in Ask Intros.' },
  { id: 'referrals', label: 'Warm Referrals', icon: Network, copy: 'High-context paths to people worth meeting, with a human approval step before outreach.' },
  { id: 'track', label: 'Track Record', icon: Handshake, copy: 'Outcomes, follow-through and verified reputation signals—not self-awarded credibility.' },
  { id: 'storefront', label: 'Storefront & Proposals', icon: Store, copy: 'Define what you offer and manage structured proposals without turning the network into a public marketplace.' },
  { id: 'syndication', label: 'Syndication', icon: UsersRound, copy: 'Private small-group rooms for co-invest, co-sponsor and co-refer decisions.' },
]

export function ExecutiveWorkPage() {
  const [tab, setTab] = useState<WorkbenchTab>('tools')
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
        return <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} aria-pressed={tab === item.id} aria-controls="executive-workbench-panel" onClick={() => setTab(item.id)}>
          <Icon size={14} /> {item.label}
        </button>
      })}
    </nav>

    <div id="executive-workbench-panel" className="executive-workbench-body" role="region" aria-label={current.label}>
      {tab === 'digest' && <WeeklyDigest />}
      {tab === 'tools' && <BusinessTools />}
      {tab === 'analyst' && <BusinessAnalystPanel />}
      {tab === 'referrals' && <WarmReferralPanel />}
      {tab === 'track' && <CurrentUserTrackRecord />}
      {tab === 'storefront' && <StorefrontPanel />}
      {tab === 'syndication' && <SyndicationRoomsPanel />}
    </div>
  </section>
}
