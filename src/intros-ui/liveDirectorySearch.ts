import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { supabase } from '@/integrations/supabase/client'
import { reportClientError } from '@/lib/error-report'
import {
  EMPTY_FILTERS, PAGE_SIZE, groupFacets, searchArgs, totalOf,
  type FacetGroups, type MemberSearchRow,
} from '@/aetheris/directory-filters'
import { loadMyProfile, PROFILE_COLUMNS, profileToMember, type LiveProfileRow } from '@/aetheris/live'
import { toNetworkMember } from './liveMembers'
import type { NetworkMember } from './networkData'

export interface LiveDirectoryFilters {
  query: string
  industry: string
  location: string
}

interface DirectoryPage {
  members: NetworkMember[]
  total: number
  rawTotal: number
  rawCount: number
  page: number
}

export interface LiveDirectoryStats {
  members: number
  companies: number
  locations: number
  industries: number
}

const db = supabase as any // RPCs are forward-migrated ahead of generated client types.

const normalized = (value: string) => value.trim().toLowerCase()

function selfMatches(me: LiveProfileRow | null, filters: LiveDirectoryFilters): boolean {
  if (!me) return false
  const q = normalized(filters.query)
  const industry = normalized(filters.industry)
  const location = normalized(filters.location)
  if (industry && !(me.industries ?? []).some(v => normalized(v) === industry)) return false
  if (location && !normalized(me.location ?? '').includes(location)) return false
  if (!q) return true
  const haystack = [
    me.name, me.title, me.company, me.location, me.can_help_with, me.looking_for,
    ...(me.industries ?? []), ...(me.expertise ?? []),
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

async function loadPage(filters: LiveDirectoryFilters, page: number): Promise<DirectoryPage> {
  try {
    const auth = await supabase.auth.getUser()
    const userId = auth.data.user?.id
    if (!userId) throw new Error('Your session has expired. Sign in again.')

    const args = searchArgs({
      ...EMPTY_FILTERS,
      query: filters.query,
      industry: filters.industry,
      location: filters.location,
      verifiedOnly: true,
    }, page, PAGE_SIZE)

    const search = await db.rpc('search_members', args)
    if (search.error) throw search.error
    const rows = (search.data ?? []) as MemberSearchRow[]
    const rawTotal = totalOf(rows)
    const me = await loadMyProfile(userId)
    const ids = rows.map(row => String(row.id)).filter(id => id && id !== userId)

    if (!ids.length) {
      return {
        members: [],
        total: Math.max(0, rawTotal - (selfMatches(me, filters) ? 1 : 0)),
        rawTotal,
        rawCount: rows.length,
        page,
      }
    }

    const profiles = await supabase.from('profiles').select(PROFILE_COLUMNS).in('id', ids)
    if (profiles.error) throw profiles.error
    const byId = new Map(
      ((profiles.data ?? []) as unknown as LiveProfileRow[]).map(profile => [profile.id, profile]),
    )

    const members = rows.flatMap(row => {
      const profile = byId.get(String(row.id))
      return profile ? [toNetworkMember(profileToMember(profile, me))] : []
    })

    return {
      members,
      total: Math.max(0, rawTotal - (selfMatches(me, filters) ? 1 : 0)),
      rawTotal,
      rawCount: rows.length,
      page,
    }
  } catch (error) {
    reportClientError(error, 'live-directory-search')
    throw error
  }
}

async function loadFacets(): Promise<FacetGroups> {
  try {
    const result = await db.rpc('member_directory_facets')
    if (result.error) throw result.error
    return groupFacets(result.data ?? [])
  } catch (error) {
    reportClientError(error, 'live-directory-facets')
    throw error
  }
}

async function loadStats(): Promise<LiveDirectoryStats> {
  try {
    const result = await db.rpc('member_directory_stats')
    if (result.error) throw result.error
    const row = Array.isArray(result.data) ? result.data[0] : result.data
    return {
      members: Number(row?.members) || 0,
      companies: Number(row?.companies) || 0,
      locations: Number(row?.locations) || 0,
      industries: Number(row?.industries) || 0,
    }
  } catch (error) {
    reportClientError(error, 'live-directory-stats')
    throw error
  }
}

export function useLiveMemberDirectory(enabled: boolean, filters: LiveDirectoryFilters) {
  const pages = useInfiniteQuery({
    queryKey: ['live-member-directory', filters.query.trim(), filters.industry, filters.location],
    enabled,
    initialPageParam: 0,
    staleTime: 30_000,
    queryFn: ({ pageParam }) => loadPage(filters, Number(pageParam) || 0),
    getNextPageParam: (last) =>
      (last.page + 1) * PAGE_SIZE < last.rawTotal ? last.page + 1 : undefined,
  })

  const facets = useQuery({
    queryKey: ['live-member-directory-facets'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: loadFacets,
  })

  const stats = useQuery({
    queryKey: ['live-member-directory-stats'],
    enabled,
    staleTime: 60_000,
    queryFn: loadStats,
  })

  const allPages = pages.data?.pages ?? []
  const members = allPages.flatMap(page => page.members)
  const total = allPages[0]?.total ?? 0

  return {
    members,
    total,
    facets: facets.data ?? { industry: [], location: [], expertise: [] },
    stats: stats.data ?? { members: 0, companies: 0, locations: 0, industries: 0 },
    loading: pages.isLoading,
    fetchingMore: pages.isFetchingNextPage,
    hasMore: Boolean(pages.hasNextPage),
    loadMore: () => pages.fetchNextPage(),
    error: pages.error instanceof Error ? pages.error.message : '',
  }
}
