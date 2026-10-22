import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveInsightsSnapshot, type InsightsGraph } from '../live-insights'
import { linkedInReadiness } from '../auth-provider-readiness'
import { checkMemberFeatures } from '../lib/member-feature-readiness'
import { isMemberWorkspace, MEMBER_WORKSPACE_IDS } from '../workspace-destinations'
import { setShowcaseMode } from '../showcase'

vi.mock('../pro-store', () => ({ usePro: () => ({ mode: 'local' }) }))
vi.mock('../CurrentUserTrackRecord', () => ({ CurrentUserTrackRecord: () => <p>Recorded track record</p> }))
import { ProfessionalDraftBoundary } from '../ProfessionalDraftBoundary'

const graph: InsightsGraph = {
  synced: true, feedError: false, networkLoadError: '', connections: ['one', 'one'], saved: ['two', 'two'],
  members: [
    { id: 'one', company: 'Example Works', introState: 'requested' },
    { id: 'two', company: ' example works ', introState: 'accepted' },
    { id: 'two', company: 'Example Works', introState: 'accepted' },
    { id: 'three', company: '', introState: 'recommended' },
  ],
  posts: [{ visibility: 'private' }, { visibility: 'network' }], asks: [], threads: [{ unread: true }],
}
afterEach(() => setShowcaseMode(false))

describe('live member insights', () => {
  it('deduplicates records and counts only confirmed current states, not sample trends', () => {
    const snapshot = liveInsightsSnapshot(graph)
    expect(snapshot.state).toBe('ready')
    if (snapshot.state !== 'ready') throw new Error('Expected a confirmed snapshot')
    expect(snapshot.companies).toBe(1)
    expect(snapshot.savedMembers).toBe(1)
    expect(snapshot.sharedPosts).toBe(1)
    expect(snapshot.introductions).toEqual([
      { label: 'Requested', count: 1 }, { label: 'Waiting', count: 0 },
      { label: 'Accepted', count: 1 }, { label: 'Introduced', count: 0 },
      { label: 'Conversing', count: 0 }, { label: 'Closed', count: 0 },
    ])
  })
  it('withholds counts when loading or any required network read fails', () => {
    expect(liveInsightsSnapshot({ ...graph, synced: false })).toEqual({ state: 'loading' })
    expect(liveInsightsSnapshot({ ...graph, feedError: true })).toEqual({ state: 'unavailable' })
  })
})

describe('provider and feature availability', () => {
  it('distinguishes explicit provider disablement from missing configuration evidence', () => {
    expect(linkedInReadiness({ external: { linkedin_oidc: true } })).toBe('enabled')
    expect(linkedInReadiness({ external: { linkedin_oidc: false } })).toBe('disabled')
    for (const value of [null, {}, { external: {} }, { external: { linkedin_oidc: 'true' } }]) expect(linkedInReadiness(value)).toBe('unverified')
  })
  it('classifies missing tables without exposing backend payloads and rejects returned member rows', async () => {
    const results = await checkMemberFeatures(async table => ({
      data: table === 'track_record_entries' ? null : table === 'proposals' ? [{ id: 'private-id' }] : [],
      error: table === 'track_record_entries' ? { code: 'PGRST205', message: 'private backend details' } : null,
    }))
    expect(results.find(row => row.id === 'track-record')?.state).toBe('missing_database')
    expect(results.find(row => row.id === 'proposals')?.state).toBe('invalid_response')
    expect(results.find(row => row.id === 'peer-groups')?.state).toBe('read_verified')
    expect(JSON.stringify(results)).not.toMatch(/private-id|private backend details/)
  })
})

describe('professional planner boundary', () => {
  it('keeps saved live drafts readable while preventing simulated shared actions', () => {
    const html = renderToStaticMarkup(<ProfessionalDraftBoundary page="capital" onNavigate={() => {}}><button>Approve another member</button></ProfessionalDraftBoundary>)
    expect(html).toContain('Private planning records')
    expect(html).toContain('<fieldset disabled=""')
    expect(html).toContain('Private deal workspaces')
  })
  it('preserves canonical member tools and the explicitly labelled showcase', () => {
    const child = <button>Real saved workflow</button>
    expect(renderToStaticMarkup(<ProfessionalDraftBoundary page="deals" onNavigate={() => {}}>{child}</ProfessionalDraftBoundary>)).toBe('<button>Real saved workflow</button>')
    setShowcaseMode(true)
    expect(renderToStaticMarkup(<ProfessionalDraftBoundary page="capital" onNavigate={() => {}}>{child}</ProfessionalDraftBoundary>)).toBe('<button>Real saved workflow</button>')
  })
})

describe('member deep links', () => {
  it('allows the shipped lobby, exchange, membership and member tools but rejects arbitrary routes', () => {
    for (const id of ['business-lobby', 'opportunity-exchange', 'membership', 'marketplace-pilot', 'passport', 'executivework']) expect(isMemberWorkspace(id)).toBe(true)
    for (const id of ['admin', 'https://example.com', '../profile', '__proto__', null]) expect(isMemberWorkspace(id)).toBe(false)
    expect(new Set(MEMBER_WORKSPACE_IDS).size).toBe(MEMBER_WORKSPACE_IDS.length)
  })
})
