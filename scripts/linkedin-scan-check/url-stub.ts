/** Isolated browser test adapter: no network calls, real shape and consent semantics. */
import type { LinkedInUrlLookupResult } from '../../src/lib/linkedinUrlLookup.functions'
import { emptyScan } from '../../src/aetheris/linkedin-scan'

type Lookup = { url: string; consent: boolean }
const w = window as unknown as { __publicLookups: Lookup[] }
w.__publicLookups = []

export async function scanIndexedLinkedInUrl({ data }: { data: Lookup }): Promise<LinkedInUrlLookupResult> {
  w.__publicLookups.push(data)
  if (!data.consent || !/linkedin\.com\/in\/maya-okafor\/?$/i.test(data.url)) {
    return { status: 'none', reason: 'No trustworthy public index source for that LinkedIn profile.' }
  }
  const url = 'https://www.linkedin.com/in/maya-okafor'
  const scan = {
    ...emptyScan(), name: 'Maya Okafor', headline: 'Chief Executive Officer at Harbor Freight Labs',
    title: 'Chief Executive Officer', company: 'Harbor Freight Labs', linkedin_url: url,
  }
  return {
    status: 'ok', result: { scan, source: 'parser', truncated: false },
    sources: [{ kind: 'linkedin-index', url, title: 'Maya Okafor - Chief Executive Officer - Harbor Freight Labs | LinkedIn',
      snippet: 'Maya Okafor is Chief Executive Officer at Harbor Freight Labs.' }],
    lookup: 'public-index',
  }
}
