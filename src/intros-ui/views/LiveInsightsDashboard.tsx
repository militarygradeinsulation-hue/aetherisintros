import { ArrowRight, Bookmark, Building2, MessageCircle, Network, Users } from 'lucide-react'
import { useNetwork } from '@/aetheris/store'
import { liveInsightsSnapshot } from '@/aetheris/live-insights'
import type { ActivePage } from '../components/layout/TopNavigation'
import '../components/home/live-executive-overview.css'

export function LiveInsightsDashboard({ onNavigate }: { onNavigate: (page: ActivePage) => void }) {
  const graph = useNetwork()
  const snapshot = liveInsightsSnapshot(graph)
  return <section className="live-exec" aria-labelledby="live-insights-title">
    <header className="live-exec-head">
      <div><span className="live-exec-eyebrow">YOUR ACCOUNT / CURRENT SNAPSHOT</span>
        <h1 id="live-insights-title">Network insights</h1>
        <p>Confirmed records visible to your account. Counts describe the loaded network, not all platform activity.</p>
      </div>
      <button type="button" className="live-exec-view-feed" onClick={() => onNavigate('people')}>Open member network <ArrowRight size={15}/></button>
    </header>
    {snapshot.state === 'loading' ? <p className="live-exec-state" role="status">Loading your network insights…</p>
      : snapshot.state === 'unavailable' ? <div className="live-exec-state live-exec-error" role="alert">
        Network insights could not be loaded. Your last data is preserved; no sample metrics are shown.
        <button type="button" onClick={() => window.location.reload()}>Retry loading</button>
      </div>
      : <>
        <div className="live-exec-stat-grid" aria-label="Confirmed account counts">
          {[
            { label: 'Directory members', value: snapshot.directoryPeople, icon: Users, page: 'people' as const },
            { label: 'Your connections', value: snapshot.connections, icon: Network, page: 'people' as const },
            { label: 'Companies in directory', value: snapshot.companies, icon: Building2, page: 'people' as const },
            { label: 'Saved members', value: snapshot.savedMembers, icon: Bookmark, page: 'people' as const },
            { label: 'Unread conversations', value: snapshot.unreadConversations, icon: MessageCircle, page: 'messages' as const },
          ].map(({ label, value, icon: Icon, page }) => <button key={label} type="button" className="live-exec-stat" onClick={() => onNavigate(page)}>
            <span className="live-exec-stat-top"><Icon size={17}/><ArrowRight size={14}/></span>
            <strong>{value.toLocaleString()}</strong><span>{label}</span>
          </button>)}
        </div>
        <div className="live-exec-panels">
          <section className="live-exec-panel" aria-label="Current introduction states">
            <div className="live-exec-panel-title"><div><span>INTRODUCTIONS</span><h2>Your current relationships</h2></div>
              <button type="button" onClick={() => onNavigate('intros')}>Review <ArrowRight size={14}/></button></div>
            <dl className="live-insights-states">{snapshot.introductions.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.count}</dd></div>)}</dl>
            <p className="live-exec-foot">Each member appears in their current state. These are not conversion rates or historical totals.</p>
          </section>
          <section className="live-exec-panel" aria-label="Confirmed content and recent activity">
            <div className="live-exec-panel-title"><div><span>YOUR VISIBLE NETWORK</span><h2>Updates and activity</h2></div></div>
            <p className="live-exec-empty">{snapshot.sharedPosts.toLocaleString()} shared updates · {snapshot.sharedAsks.toLocaleString()} shared asks</p>
            {graph.activity.length ? graph.activity.slice(0, 4).map(item => <div key={item.id} className="live-exec-row live-exec-row-static"><span className="live-exec-row-content"><strong>{item.text}</strong><small>{item.kind} · {item.when}</small></span></div>)
              : <p className="live-exec-empty">No recent activity has been recorded for your account.</p>}
          </section>
        </div>
        <p className="live-exec-foot">Historical growth, communication heatmaps and opportunity values appear only when supported by recorded events.</p>
      </>}
  </section>
}
