import { describe, expect, it } from 'vitest'
import { parseSearchConsoleDates, parseSearchConsoleQueries, readCsv, PUBLIC_DISCOVERY_ROUTES } from '../lib/search-visibility'

describe('Search Console evidence parser', () => {
  it('parses daily exports without inventing missing data', () => {
    const metrics = parseSearchConsoleDates('Date,Clicks,Impressions,CTR,Position\n2026-10-24,2,200,1%,8.2\n2026-10-25,3,100,3%,5.2\n')
    expect(metrics).toEqual({
      firstDate: '2026-10-24', lastDate: '2026-10-25', days: 2,
      clicks: 5, impressions: 300, ctr: 5 / 300, averagePosition: 7.2,
    })
  })
  it('explicitly withholds rate and position with no impressions', () => {
    const metrics = parseSearchConsoleDates('Date,Clicks,Impressions\n2026-10-24,0,0\n')
    expect(metrics.ctr).toBeNull()
    expect(metrics.averagePosition).toBeNull()
  })
  it('rejects an export with the wrong dimension, duplicate days, or invalid counts', () => {
    expect(() => parseSearchConsoleDates('Query,Clicks,Impressions\nask intros,4,20')).toThrow('Expected Google Search Console')
    expect(() => parseSearchConsoleDates('Date,Clicks,Impressions\n2026-10-24,1,20\n2026-10-24,2,30')).toThrow('Duplicate dates')
    expect(() => parseSearchConsoleDates('Date,Clicks,Impressions\n2026-10-24,15,2')).toThrow('Clicks cannot exceed')
    expect(() => parseSearchConsoleDates('Date,Clicks,Impressions\n2026-10-24,-1,2')).toThrow('Invalid Clicks')
  })
  it('handles quoted commas and embedded newlines in CSV', () => {
    expect(readCsv('Query,Clicks,Impressions\n"CEO, founders",2,10\n"intro\nideas",3,20')).toHaveLength(3)
    const queries = parseSearchConsoleQueries('Query,Clicks,Impressions\n"CEO, founders",2,10\nWarm intros,4,40\n')
    expect(queries.map(item => item.query)).toEqual(['Warm intros', 'CEO, founders'])
    expect(queries[0]?.ctr).toBe(.1)
  })
  it('does not silently accept unclosed quotes or oversized files', () => {
    expect(() => readCsv('Query,Clicks\n"unclosed')).toThrow('unclosed')
    expect(() => readCsv('x'.repeat(2_000_001))).toThrow('smaller than 2 MB')
  })
  it('lists the actual public routes, not authenticated records', () => {
    expect(PUBLIC_DISCOVERY_ROUTES).toContain('/social-business-views')
    expect(PUBLIC_DISCOVERY_ROUTES).not.toContain('/app')
    expect(PUBLIC_DISCOVERY_ROUTES).not.toContain('/admin/early-access')
  })
})
