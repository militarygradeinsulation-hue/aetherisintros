import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNetwork } from '@/aetheris/store';
import { findPublishedNeedMatches } from '@/aetheris/domain/published-need-matches';

export function PublishedNeedMatchesPanel({onOpen}: {onOpen:()=>void}) {
  const graph=useNetwork();
  const [requested,setRequested]=useState(false);
  const ready=graph.synced && !graph.feedError && !graph.networkLoadError;
  const allowed=graph.preferences.useRecommendations;
  const capabilities=[graph.profile.canHelpWith || '', ...(graph.profile.expertise || [])];
  const matches=requested && ready && allowed ? findPublishedNeedMatches({capabilities,asks:graph.asks,connectedIds:graph.connections,allowed}) : [];
  return <section className="exec-brief" aria-label="Published business need matches">
    <header><div><h3>Opportunity radar</h3><p>Compare your stated capabilities with open needs shared by the network.</p></div>
      <button type="button" disabled={!ready||!allowed} onClick={()=>setRequested(value=>!value)} aria-expanded={requested}>{requested?'Hide review':'Find opportunities'}</button>
    </header>
    {!ready && <p role="status">Network evidence is not available yet.</p>}
    {!allowed && <p>Recommendations are off in your preferences.</p>}
    {requested && ready && allowed && <>
      <p className="exec-brief-note">Specific words shared by a published need and your profile are evidence for review, not verified qualification or consent to outreach. No AI calls.</p>
      {matches.length ? <ul>{matches.map(match=><li key={match.id}><div>
        <small>{match.urgency.toUpperCase()} · Published need{match.directConnection?' · Recorded connection':''}</small>
        <strong>{match.ask}</strong><p>Capability overlap: {match.evidence.join(', ')}</p>
        <p className="exec-brief-note">Verify scope, timing, qualification and mutual consent before responding.</p>
      </div><button type="button" onClick={onOpen}>Open exchange <ArrowRight size={14}/></button></li>)}</ul>:<p>No sufficiently specific overlap was found in the visible open needs. Update your capabilities or review the exchange directly.</p>}
    </>}
  </section>
}
