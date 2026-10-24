import { MemberThumbnail } from '../components/shared/MemberThumbnail';
/* Native Absolute Ledger record/detail layout for Ask Intros consent workflows. */
import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Handshake, Users } from 'lucide-react';
import type { IntroRequest, NetworkMember } from '@/intros-ui/networkData';
import type { ActivePage } from '@/intros-ui/components/layout/TopNavigation';
import { PageHeader, Panel, StatCard } from '@/intros-ui/components/layout/LedgerUiKit';
import { IntrosHubView } from '@/intros-ui/views/IntrosHubView';
import './ledger-introductions.css';

export function LedgerIntroductions({
  requests, members, live, children, onNavigate, onReview, onDismiss, onRequest,
}: {
  requests: IntroRequest[];
  members: NetworkMember[];
  live: boolean;
  children?: React.ReactNode;
  onNavigate: (page: ActivePage, memberId?: string) => void;
  onReview: (request: IntroRequest) => void;
  onDismiss: (id: string) => void;
  onRequest: (member: NetworkMember) => void;
}) {
  const [filter, setFilter] = useState<'all'|'pending'|'accepted'>('all');
  const [builderOpen, setBuilderOpen] = useState(false);
  const shown = requests.filter(request => filter === 'all' || request.status === filter);
  return <div className="ledger-introductions">
    <PageHeader eyebrow="Relationships / Introductions" title="Introduction pipeline"
      description="Make consent-first introductions and track the next step from one relationship workspace."
      actions={<button type="button" className="ledger-ui-button primary" onClick={() => onNavigate('people')}>
        <Users size={15}/> Find a member</button>} />
    {!live && <div className="ledger-dashboard-stats">
      <StatCard label="Introduction requests" value={String(requests.length)} hint="Showcase records" icon={<Handshake size={17}/>}/>
      <StatCard label="Pending" value={String(requests.filter(x=>x.status==='pending').length)} hint="Waiting for review" icon={<Clock3 size={17}/>}/>
      <StatCard label="Accepted" value={String(requests.filter(x=>x.status==='accepted').length)} hint="Consent received" icon={<CheckCircle2 size={17}/>}/>
      <StatCard label="Members available" value={String(members.filter(x=>x.openToIntros).length)} hint="Open to introductions" icon={<Users size={17}/>}/>
    </div>}
    <div className="ledger-intros-grid">
      <Panel title="Introduction workflow" subtitle={live ? 'Consent, routing and follow-through are managed by your live member engine' : 'Review and respond to sample introduction requests'}
        className="ledger-intros-main" bodyClassName="ledger-intros-list">
        {live ? children : <>
          <div className="ledger-intros-filters">
            {(['all','pending','accepted'] as const).map(status=><button type="button" key={status} aria-pressed={filter===status}
              onClick={()=>setFilter(status)}>{status === 'all' ? 'All requests' : status}</button>)}
          </div>
          {shown.length ? shown.map(request=><article key={request.id} className="ledger-intro-row">
            <div><span className="ledger-intro-status">{request.status}</span><h3>{request.requesterName} <ArrowRight size={14}/> {request.targetName}</h3>
              <p>{request.note}</p><small>{request.date} · {request.requesterCompany} / {request.targetCompany}</small>
            </div>
            <div className="ledger-intro-row-actions">
              {request.status==='pending' && <button type="button" className="ledger-ui-button primary" onClick={()=>onReview(request)}>Review</button>}
              {request.status==='pending' && <button type="button" className="ledger-ui-button secondary" onClick={()=>onDismiss(request.id)}>Dismiss</button>}
            </div>
          </article>) : <p className="ledger-ui-empty">No introduction requests for this status.</p>}
          <button type="button" className="ledger-intro-builder-button" aria-expanded={builderOpen} onClick={()=>setBuilderOpen(v=>!v)}>
            {builderOpen ? 'Close advanced introduction builder' : 'Open advanced introduction builder'} <ArrowRight size={14}/>
          </button>
          {builderOpen && <IntrosHubView introRequests={requests} networkMembers={members}
            onNavigate={onNavigate} onReviewRequest={onReview} onDismissRequest={onDismiss} onRequestIntro={onRequest}/>}
        </>}
      </Panel>
      <Panel title="Suggested counterparts" subtitle="People available for a meaningful conversation" bodyClassName="ledger-intros-people">
        {members.filter(person=>person.openToIntros).slice(0,5).map(person=><div className="ledger-person" key={person.id}>
          <button type="button" className="ledger-person-main" onClick={()=>onNavigate('people',person.id)}>
            <MemberThumbnail name={person.name} source={person.avatarUrl} className="ledger-person-initial"/>
            <span><strong>{person.name}</strong><small>{person.title} · {person.company}</small></span>
          </button>
          <button type="button" className="ledger-person-intro" aria-label={'Request introduction to '+person.name}
            onClick={()=>onRequest(person)}><Handshake size={16}/></button>
        </div>)}
        {!members.length && <p className="ledger-ui-empty">Your network is loading.</p>}
      </Panel>
    </div>
  </div>;
}
