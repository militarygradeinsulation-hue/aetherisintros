// @ts-nocheck
import { useEffect } from 'react';
import { NetworkProvider, useNetwork } from '@/aetheris/store';
import type { NetworkMember } from './networkData';

/** Maps real network members into the new shell's member shape. No invented values. */
function toNetworkMember(m: any): NetworkMember {
  const [firstName = m.name, ...rest] = String(m.name ?? '').split(' ');
  const avatar = m.avatarUrl && /^https?:|^\/|^data:/.test(m.avatarUrl) ? m.avatarUrl : '';
  const score = Math.round(m.scoreTotal ?? 0);
  return {
    id: m.id, name: m.name, firstName, lastName: rest.join(' '),
    title: m.title ?? '', company: m.company ?? '', industry: m.industry ?? '',
    roleType: 'founder', location: m.location ?? '', avatarUrl: avatar, verified: true,
    matchScore: score,
    matchTier: score >= 85 ? 'EXCELLENT FIT' : score >= 75 ? 'STRONG FIT' : score >= 65 ? 'GOOD FIT' : 'POTENTIAL',
    bioStatement: m.whatIDo || m.focus || m.thesis || '', fullBio: m.thesis || m.whatIDo || '',
    quote: m.building || '', yearsInRole: '', almaMater: '', website: '', linkedin: m.linkedin ?? '',
    focusAreas: m.expertise ?? m.tags ?? [], currentObjectives: m.needs ?? [],
    compatibility: { strategicFit: m.score?.strategicFit ?? 0, sharedInterests: m.score?.mutualValue ?? 0, networkValue: m.score?.opportunityValue ?? 0 },
    mutualConnectionsCount: m.mutuals?.length ?? 0, mutualConnections: [],
    openToIntros: true, introStatusText: m.availability || '',
    recentPosts: [], recommendations: [],
    networkInfluence: { strongerReplies: '—', introSuccessRate: '—', fasterConversations: '—', peopleInNetwork: 0, companiesCount: 0, keyThemes: 0 },
  } as NetworkMember;
}

function Bridge({ onMembers }: { onMembers: (m: NetworkMember[]) => void }) {
  const net = useNetwork();
  useEffect(() => { onMembers(net.members.map(toNetworkMember)); }, [net.members]);
  return null;
}

export function LiveMembers({ onMembers }: { onMembers: (m: NetworkMember[]) => void }) {
  return <NetworkProvider mode="live"><Bridge onMembers={onMembers} /></NetworkProvider>;
}
