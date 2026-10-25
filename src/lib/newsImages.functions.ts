import { z } from 'zod'
import { publicDocument } from './public-fetch.server'
import { parseReaderResponse } from '@/features/specter-detect/investigation'
import { createServerFn } from '@tanstack/react-start'

async function leadImage(link: string): Promise<string | null> {
  try {
    const result = parseReaderResponse(await publicDocument(link, true), link)
    return result.images[0]?.src ?? null
  } catch { return null }
}

/** Resolves lead images for article links that arrived without one. */
export const fetchNewsImages = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ links: z.array(z.string().max(2000)).max(12) }).parse(input))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const found: Record<string, string> = {}
    const results = await Promise.allSettled(data.links.map(async link => [link, await leadImage(link)] as const))
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value[1]) found[result.value[0]] = result.value[1]
    }
    return found
  })
