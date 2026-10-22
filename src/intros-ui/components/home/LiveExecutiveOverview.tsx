import { ArrowRight, BookOpenText, BriefcaseBusiness, MessageCircle, Network, Send, Users } from 'lucide-react'
import { useNetwork } from '@/aetheris/store'
import { memberOverviewSnapshot } from '@/aetheris/live-overview'
import type { ActivePage } from '../layout/TopNavigation'
import './live-executive-overview.css'

interface Props {
  onNavigate: (page: ActivePage) => void
  onWorkspace: (destination: string) => void
}

/** Shown only behind the verified member access gate in the live workspace.
 * The existing social feed and member graph are the only sources of truth.
 * This component never reads demo identities or writes synthetic metrics.
 */
export function LiveExecutiveOverview({ onNavigate, onWorkspace }: Props) {
  const graph = useNetwork()
  const summary = memberOverviewSnapshot(graph)
  const posts = graph.posts.filter(post => post.visibility !== 'private')
  const asks = graph.asks.filter(ask => ask.visibility === 'network')
  const activity = graph.activity.slice(0, 2)
  const nameOf = (id: string) => graph.members.find(member => member.id === id)?.name

  const openFeed = () => {
    window.dispatchEvent(new Event('intros:dashboard-feed'))
    requestAnimationFrame(() => {
      document.getElementById('home-social-board')?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
    })
  }

  return <section className="live-exec" aria-labelledby="live-exec-title">
    <div className="live-exec-head">
      <div>
        <span className="live-exec-eyebrow">YOUR CONNECTED WORKSPACE</span>
        <h2 id="live-exec-title">Executive overview</h2>
        <p>People, introductions, messages and opportunities. One verified network.</p>
      </div>
      <button type="button" className="live-exec-view-feed" onClick={openFeed}>Open social feed <ArrowRight size={15}/></button>
    </div>

    {summary.state === 'loading' ? <div className="live-exec-state" role="status">Loading your private network overview…</div>
      : summary.state === 'unavailable' ? <div className="live-exec-state live-exec-error" role="alert">
        Some member information could not be loaded. No example counts are substituted.
        <button type="button" onClick={() => window.location.reload()}>Retry loading</button>
      </div>
      : <>
        <div className="live-exec-stat-grid" aria-label="Member metrics from your account">
          {[
            { label: 'Directory members', value: summary.directoryPeople, icon: Users, run: () => onNavigate('people') },
            { label: 'Your connections', value: summary.connections, icon: Network, run: () => onNavigate('people') },
            { label: 'Unread conversations', value: summary.unreadConversations, icon: MessageCircle, run: () => onNavigate('messages') },
            { label: 'Shared updates', value: summary.sharedPosts, icon: BookOpenText, run: openFeed },
          ].map(item => {
            const Icon = item.icon
            return <button key={item.label} type="button" onClick={item.run} className="live-exec-stat">
              <span className="live-exec-stat-top"><Icon size={17}/><ArrowRight size={14}/></span>
              <strong>{item.value.toLocaleString()}</strong>
              <span>{item.label}</span>
            </button>
          })}
        </div>
        <div className="live-exec-panels">
          <div className="live-exec-panel" aria-label="Current needs and offers">
            <div className="live-exec-panel-title">
              <div><span>NEED / OFFER</span><h3>Shared opportunities</h3></div>
              <button type="button" onClick={() => onWorkspace('needs')}>Open exchange <ArrowRight size={14}/></button>
            </div>
            {asks.length ? <div className="live-exec-rows">
              {asks.slice(0, 2).map(ask => <button type="button" key={ask.id} onClick={() => onWorkspace('needs')} className="live-exec-row">
                <span className="live-exec-row-icon"><BriefcaseBusiness size={15}/></span>
                <span className="live-exec-row-content"><strong>{ask.ask}</strong><small>{nameOf(ask.memberId) || (ask.mine ? 'Your network ask' : 'Shared member ask')}</small></span>
                <ArrowRight size={14}/>
              </button>)}
            </div> : <p className="live-exec-empty">No shared asks are available to your account yet.</p>}
            <div className="live-exec-foot">{summary.sharedAsks.toLocaleString()} visible shared asks</div>
          </div>
          <div className="live-exec-panel" aria-label="Recent member activity">
            <div className="live-exec-panel-title">
              <div><span>WHAT CHANGED</span><h3>Network activity</h3></div>
              <button type="button" onClick={() => onNavigate('insights')}>View insights <ArrowRight size={14}/></button>
            </div>
            {activity.length ? <div className="live-exec-rows">
              {activity.map(signal => <div key={signal.id} className="live-exec-row live-exec-row-static">
                <span className="live-exec-row-icon"><Send size={14}/></span>
                <span className="live-exec-row-content"><strong>{signal.text}</strong><small>{signal.kind} · {signal.when}</small></span>
              </div>)}
            </div> : <p className="live-exec-empty">No recent network activity is available yet.</p>}
            <div className="live-exec-foot">
              {posts.length ? 'Open the live feed to read updates and respond.' : 'Your first shared update can start a conversation.'}
            </div>
          </div>
        </div>
        <div className="live-exec-actions" aria-label="Member quick actions">
          <button type="button" onClick={() => onNavigate('intros')}>Review introductions <ArrowRight size={13}/></button>
          <button type="button" onClick={() => onWorkspace('crm')}>Open CRM <ArrowRight size={13}/></button>
          <button type="button" onClick={() => onWorkspace('opportunities')}>Opportunities <ArrowRight size={13}/></button>
          <button type="button" onClick={() => onWorkspace('profile')}>My profile <ArrowRight size={13}/></button>
        </div>
      </>}
  </section>
}
