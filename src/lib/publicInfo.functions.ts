import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'
import { gatewayChat, routeLlmChat } from './aiGateway.server'
import { createRateLimiter } from '@/aetheris/linkedin-import'
import {
  boundSearchInput, buildSearchQuery, groundSuggestions, PUBLIC_INFO_PROMPT, renderSourcesForAi, selectSources, type PublicInfoResult,
} from '@/aetheris/public-info'

const allowSearch = createRateLimiter(3, 10 * 60_000)
const TIMEOUT_MS = 25_000
const withTimeout = async <T,>(p: Promise<T>) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try { return await Promise.race([p, new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS) })]) } finally { clearTimeout(timer) }
}

/**
 * Own-profile "Find public information". The member confirms the search; the name and headline
 * searched are read from THEIR OWN saved profile on the server, never taken from the request, so
 * this cannot look up anyone else. Uses the existing search integration (`searchWeb`) and AI
 * gateway only when the gateway is configured. Reads search-result titles and snippets only (no
 * pages are fetched), discards sources that may be another person, and returns quote-grounded
 * suggestions. Nothing is saved, and request/result payloads are never logged.
 */
export const findPublicInformation = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { confirmed: boolean }) => {
    if (data?.confirmed !== true) throw new Error('Confirm that you want to search the public web for your own name and headline.')
    return { confirmed: true as const }
  })
  .handler(async ({ context }): Promise<PublicInfoResult> => {
    const { userId, supabase: db } = context as unknown as { userId?: string; supabase: { from: (t: string) => any } } // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!userId) throw new Error('Sign in to search for your own public information.')
    const routeKey = process.env['ROUTELLM_API_KEY']
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!routeKey && !apiKey) return { status: 'unavailable', reason: 'Public information search is not set up for this workspace.' }
    if (!allowSearch(userId)) throw new Error('Too many searches. Please wait a few minutes and try again.')
    const { data: row, error } = await db.from('profiles').select('name,title').eq('id', userId).maybeSingle()
    if (error) throw new Error('Your profile could not be read. Try again.')
    const input = boundSearchInput(row?.name, row?.title)
    if (!input) return { status: 'none', reason: 'Add your full name and headline to your profile first, so we can tell you apart from other people.' }
    try {
      const { searchWeb } = await import('./webSearch.server')
      const results = await withTimeout(searchWeb(buildSearchQuery(input.name, input.headline), 6))
      const { kept, discarded } = selectSources(results.map(r => ({ url: r.url, title: r.title, text: `${r.title}. ${r.snippet}` })), input.name, input.headline)
      if (!kept.length) return { status: 'none', reason: 'No public page clearly about you was found. Nothing was suggested.' }
      const request = { system: PUBLIC_INFO_PROMPT, messages: [{ role: 'user' as const, content: renderSourcesForAi(input.name, input.headline, kept) }], maxSteps: 1 }
      const answer = await withTimeout(routeKey ? routeLlmChat(request) : gatewayChat(request))
      const suggestions = groundSuggestions(answer, kept)
      if (!suggestions.length) return { status: 'none', reason: 'Nothing could be confirmed from the public sources found.' }
      return { status: 'ok', suggestions, sourcesConsidered: kept.length + discarded, sourcesDiscarded: discarded }
    } catch {
      console.error('public information search failed')
      return { status: 'unavailable', reason: 'The public search could not be completed. Try again later.' }
    }
  })
