/**
 * Pure helpers for the member directory's structured search (0052 `search_members` and
 * `member_directory_facets`). No network; unit-tested.
 */

export interface DirectoryFilters {
  query: string
  industry: string
  location: string
  expertise: string
  lookingFor: string
  verifiedOnly: boolean
}

export const EMPTY_FILTERS: DirectoryFilters = { query: '', industry: '', location: '', expertise: '', lookingFor: '', verifiedOnly: false }

export const PAGE_SIZE = 30

export interface MemberSearchRow {
  id: string
  name: string
  initials: string
  title: string
  company: string
  location: string
  industries: string[]
  expertise: string[]
  can_help_with: string
  looking_for: string
  avatar_url: string | null
  verified: boolean
  total_count: number | string
}

export interface FacetRow { kind: string; value: string; members: number }
export interface Facet { value: string; members: number }
export interface FacetGroups { industry: Facet[]; location: Facet[]; expertise: Facet[] }

const clip = (value: string, max: number) => value.trim().slice(0, max)

/** Arguments for `search_members`, with blank filters sent as null so they do not narrow. */
export function searchArgs(filters: DirectoryFilters, page = 0, pageSize = PAGE_SIZE) {
  const one = (value: string) => {
    const v = clip(value, 80)
    return v ? [v] : null
  }
  return {
    p_query: clip(filters.query, 200) || null,
    p_industries: one(filters.industry),
    p_location: clip(filters.location, 120) || null,
    p_expertise: one(filters.expertise),
    p_verified_only: filters.verifiedOnly,
    p_limit: pageSize,
    p_offset: Math.max(0, page) * pageSize,
    p_looking_for: clip(filters.lookingFor, 200) || null,
  }
}

/** How many structured filters (not the free-text box) are narrowing the results. */
export function activeFilterCount(filters: DirectoryFilters): number {
  return [filters.industry, filters.location, filters.expertise, filters.lookingFor].filter(v => v.trim()).length + (filters.verifiedOnly ? 1 : 0)
}

export function groupFacets(rows: readonly FacetRow[] | null | undefined): FacetGroups {
  const groups: FacetGroups = { industry: [], location: [], expertise: [] }
  for (const row of rows ?? []) {
    if (row.kind !== 'industry' && row.kind !== 'location' && row.kind !== 'expertise') continue
    const members = Number(row.members) || 0
    // The server already hides values fewer than three members share; never show one anyway.
    if (members < 3 || !row.value?.trim()) continue
    groups[row.kind].push({ value: row.value, members })
  }
  for (const key of ['industry', 'location', 'expertise'] as const) {
    groups[key].sort((a, b) => b.members - a.members || a.value.localeCompare(b.value))
  }
  return groups
}

export function totalOf(rows: readonly MemberSearchRow[]): number {
  return rows.length ? Number(rows[0]?.total_count) || rows.length : 0
}

/** The one-line context under a member's name. */
export function memberContext(row: Pick<MemberSearchRow, 'industries' | 'location'>): string {
  return [(row.industries ?? []).slice(0, 2).join(', '), row.location].filter(Boolean).join(' · ')
}
