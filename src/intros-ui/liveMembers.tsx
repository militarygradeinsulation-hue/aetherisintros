import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { loadVisibleMemberProfiles, profileToMember } from '@/aetheris/live'
import { useNetwork } from '@/aetheris/store'
import type { Member, MemberRole } from '@/aetheris/social'
import type { NetworkMember } from './networkData'

const roleType = (role: MemberRole): NetworkMember['roleType'] => {
  switch (role) {
    case 'Investor': return 'investor'
    case 'Advisor': return 'advisor'
    case 'Specialist': return 'expert'
    case 'Operator':
    case 'Executive': return 'operator'
    case 'Connector':
    case 'Founder':
    default: return 'founder'
  }
}

/** Maps real network members into the new shell's member shape. No invented values. */
export function toNetworkMember(m: Member): NetworkMember {
  const [firstName = m.name, ...rest] = String(m.name ?? '').split(' ')
  // Keep the raw value: a real member's photo may be a direct URL or a private
  // storage object path — AvatarImage resolves both. Never substitute a stock photo.
  const avatar = m.avatarUrl && String(m.avatarUrl).trim() ? String(m.avatarUrl) : ''
  const score = Math.round(m.scoreTotal ?? 0)
  return {
    id: m.id, name: m.name, firstName, lastName: rest.join(' '),
    title: m.title ?? '', company: m.company ?? '', industry: m.industry ?? '',
    roleType: roleType(m.role), location: m.location ?? '', avatarUrl: avatar, verified: true,
    matchScore: score,
    matchTier: score >= 85 ? 'EXCELLENT FIT' : score >= 75 ? 'STRONG FIT' : score >= 65 ? 'GOOD FIT' : 'POTENTIAL',
    bioStatement: m.whatIDo || m.focus || m.thesis || '', fullBio: m.thesis || m.whatIDo || '',
    quote: m.building || '', yearsInRole: '', almaMater: '', website: '', linkedin: m.linkedin ?? '',
    focusAreas: m.expertise ?? m.tags ?? [], currentObjectives: m.needs ?? [],
    compatibility: { strategicFit: m.score?.strategicFit ?? 0, sharedInterests: m.score?.mutualValue ?? 0, networkValue: m.score?.opportunityValue ?? 0 },
    mutualConnectionsCount: m.mutuals?.length ?? 0, mutualConnections: [],
    openToIntros: true, introStatusText: m.availability || '',
    recentPosts: [], recommendations: [],
    networkInfluence: { strongerReplies: '—', introSuccessRate: '—', fasterConversations: '—', peopleInNetwork: 0, companiesCount: 0, keyThemes: 0, sharedInvestors: 0 },
  }
}

/**
 * The live People, profile, and bubble screens must derive identity from the
 * approved member registry. Never let a demo catalogue row become an intro
 * target even if a legacy network/store snapshot contains one.
 */
function Bridge({ onMembers, onError }: {
  onMembers: (m: NetworkMember[]) => void
  onError?: (error: string) => void
}) {
  const net = useNetwork()
  const latest = useRef(net.members)
  latest.current = net.members

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { data: session, error } = await supabase.auth.getUser()
        if (error || !session.user) throw new Error('Sign in to see verified live members.')
        const canonical = await loadVisibleMemberProfiles(null, 100)
        if (!alive) return
        const storeMembers = new Map(latest.current.filter(m => isLiveMemberId(m.id)).map(m => [m.id, m]))
        const next = canonical
          .filter(p => isLiveMemberId(p.id) && p.id !== session.user!.id)
          .map(p => toNetworkMember(storeMembers.get(p.id) ?? profileToMember(p, null)))
        onMembers(next)
        onError?.('')
      } catch (error) {
        if (!alive) return
        // An errored registry is NOT permission to show the fictional catalogue.
        onMembers([])
        onError?.(error instanceof Error ? error.message : 'Live member directory is unavailable.')
      }
    }
    void load()
    const onVisible = () => { if (!document.hidden) void load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [onMembers, onError, net.synced])
  return null
}

export const isLiveMemberId = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export function LiveMembers({ onMembers, onError }: {
  onMembers: (m: NetworkMember[]) => void
  onError?: (error: string) => void
}) {
  return <Bridge onMembers={onMembers} {...(onError ? { onError } : {})} />
}
