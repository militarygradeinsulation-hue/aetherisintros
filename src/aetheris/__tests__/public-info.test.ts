import { describe, expect, it } from 'vitest'

import { describeLinkHandling, emptyExtraction, extractionFromProfile, emptyLinkedInProfile, scanLinkedInUrl, type LinkedInUrlProvider } from '../linkedin-import'
import {
  belongsToMember, boundSearchInput, buildSearchQuery, groundSuggestions, isCurrentResult, isSafeSourceUrl, mergeSuggestionsIntoDraft, selectSources,
  type PublicSource,
} from '../public-info'

const NAME = 'Jane Example'
const HEADLINE = 'Founder at Acme Robotics'
const mine: PublicSource = { url: 'https://news.example.test/jane', title: 'Jane Example', text: 'Jane Example is the founder of Acme Robotics, based in Leeds, United Kingdom.' }
const namesake: PublicSource = { url: 'https://club.example.test/jane', title: 'Jane Example', text: 'Jane Example won the regional chess final and enjoys gardening.' }

describe('link handling', () => {
  it('treats a valid link as a non-error that needs a document', () => {
    const r = describeLinkHandling('linkedin.com/in/jane-example')
    expect(r.kind).toBe('needs-document')
    if (r.kind === 'needs-document') { expect(r.url).toBe('https://www.linkedin.com/in/jane-example'); expect(r.message).toMatch(/PDF/) }
  })
  it('flags invalid links and ignores empty input', () => {
    expect(describeLinkHandling('https://evil.test/in/jane').kind).toBe('invalid')
    expect(describeLinkHandling('  ').kind).toBe('none')
  })
  it('the url-ok branch never throws and feeds the review draft', async () => {
    const profile = { ...emptyLinkedInProfile(), name: NAME, headline: HEADLINE }
    const provider: LinkedInUrlProvider = { id: 't', available: true, unavailableReason: 'x', fetchProfile: async () => profile }
    const res = await scanLinkedInUrl('linkedin.com/in/jane-example', provider)
    expect(res.status).toBe('ok')
    if (res.status === 'ok') expect(extractionFromProfile(res.profile, null).fields.name).toBe(NAME)
    const failing: LinkedInUrlProvider = { ...provider, fetchProfile: async () => { throw new Error('boom') } }
    await expect(scanLinkedInUrl('linkedin.com/in/jane-example', failing)).resolves.toMatchObject({ status: 'blocked' })
    expect(emptyExtraction().fields.name).toBe('')
  })
})

describe('search input bounds', () => {
  it('requires a full own name and bounds lengths', () => {
    expect(boundSearchInput('Jane', 'x')).toBeNull()
    expect(boundSearchInput(undefined, 'x')).toBeNull()
    const b = boundSearchInput(`  Jane "Example"\n${'z'.repeat(500)}`, 'h'.repeat(900))!
    expect(b.name.length).toBeLessThanOrEqual(120)
    expect(b.headline.length).toBeLessThanOrEqual(220)
    expect(b.name).not.toMatch(/["\n]/)
  })
  it('queries only name and headline', () => {
    expect(buildSearchQuery(NAME, HEADLINE)).toBe('"Jane Example" Founder at Acme Robotics')
  })
  it('rejects LinkedIn, private and non-https sources', () => {
    for (const u of ['https://www.linkedin.com/in/jane', 'https://media.licdn.com/x', 'http://a.example.test/x', 'https://127.0.0.1/x', 'https://localhost/x', 'https://' + 'user' + ':' + 'pw' + '@a.example.test/', 'https://a.example.test:8443/', 'https://db.internal/x'])
      expect(isSafeSourceUrl(u)).toBe(false)
    expect(isSafeSourceUrl('https://news.example.test/jane')).toBe(true)
  })
})

describe('disambiguation', () => {
  it('keeps a page that names the member next to headline words', () => expect(belongsToMember(mine, NAME, HEADLINE)).toBe(true))
  it('discards a namesake page', () => expect(belongsToMember(namesake, NAME, HEADLINE)).toBe(false))
  it('discards partial-name matches and headline-less members', () => {
    expect(belongsToMember({ title: '', text: 'Jane Examples founded Acme Robotics' }, NAME, HEADLINE)).toBe(false)
    expect(belongsToMember(mine, NAME, '')).toBe(false)
  })
  it('selectSources drops namesakes, duplicates, unsafe urls and counts them', () => {
    const r = selectSources([mine, mine, namesake, { ...mine, url: 'https://www.linkedin.com/in/jane' }], NAME, HEADLINE)
    expect(r.kept).toHaveLength(1)
    expect(r.discarded).toBe(3)
  })
})

describe('quote grounding', () => {
  const sources = [mine]
  const answer = (s: unknown[]) => `Here: ${JSON.stringify({ suggestions: s })}`
  it('keeps values stated verbatim in a quote found in the cited source', () => {
    const r = groundSuggestions(answer([{ field: 'company', value: 'Acme Robotics', quote: 'Jane Example is the founder of Acme Robotics', source: 1 }]), sources)
    expect(r).toEqual([{ field: 'company', value: 'Acme Robotics', quote: 'Jane Example is the founder of Acme Robotics', sourceUrl: mine.url, sourceTitle: 'Jane Example' }])
  })
  it('drops invented quotes, values outside the quote, bad fields, bad sources and duplicates', () => {
    const r = groundSuggestions(answer([
      { field: 'company', value: 'Globex', quote: 'Jane Example is the founder of Globex', source: 1 },
      { field: 'location', value: 'Paris', quote: 'based in Leeds, United Kingdom', source: 1 },
      { field: 'email', value: 'a@b.test', quote: 'Jane Example', source: 1 },
      { field: 'location', value: 'Leeds', quote: 'based in Leeds', source: 2 },
      { field: 'location', value: 'Leeds', quote: 'based in Leeds', source: 1 },
      { field: 'location', value: 'United Kingdom', quote: 'based in Leeds, United Kingdom', source: 1 },
    ]), sources)
    expect(r.map(x => x.value)).toEqual(['Leeds'])
  })
  it('returns nothing for malformed answers', () => {
    expect(groundSuggestions('no json', sources)).toEqual([])
    expect(groundSuggestions('{"suggestions": 4}', sources)).toEqual([])
    expect(groundSuggestions('{bad', sources)).toEqual([])
  })
})

describe('edit preservation and staleness', () => {
  it('keeps edited fields and offers the suggestion as a conflict', () => {
    const r = mergeSuggestionsIntoDraft({ title: 'My own title', company: '' }, new Set(['title']), [{ field: 'title', value: 'CEO' }, { field: 'company', value: 'Acme' }])
    expect(r.values).toEqual({ company: 'Acme' })
    expect(r.conflicts).toEqual({ title: 'CEO' })
  })
  it('replaces untouched fields', () => {
    expect(mergeSuggestionsIntoDraft({ title: 'Old' }, new Set(), [{ field: 'title', value: 'CEO' }]).values).toEqual({ title: 'CEO' })
  })
  it('ignores results from older requests or another member', () => {
    expect(isCurrentResult(2, 2, 'u1', 'u1')).toBe(true)
    expect(isCurrentResult(1, 2, 'u1', 'u1')).toBe(false)
    expect(isCurrentResult(2, 2, 'u1', 'u2')).toBe(false)
    expect(isCurrentResult(2, 2, '', '')).toBe(false)
  })
})
