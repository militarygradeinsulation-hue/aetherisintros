/** Browser harness deliberately does not retrieve live public index results or invoke auth. */
import type { LinkedInUrlLookupResult } from '../../src/lib/linkedinUrlLookup.functions'
export async function scanIndexedLinkedInUrl(): Promise<LinkedInUrlLookupResult> {
  return { status: 'none', reason: 'Public profile lookup is not activated inside the isolated browser harness.' }
}
