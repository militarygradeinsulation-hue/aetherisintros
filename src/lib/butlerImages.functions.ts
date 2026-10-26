import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthContract } from './auth-gate'
import { boundedBody } from './public-fetch.server'

const imageBrief = z.object({
  prompt: z.string().trim().min(12).max(1400),
  owner: z.string().uuid(),
})
const referenceRequest = z.object({ query: z.string().trim().min(2).max(120) })

/** Best-effort cost throttle within each running server instance; external provider
 * quotas remain the authority across parallel edge instances. */
const recentGenerations = new Map<string, number[]>()
function reserveGeneration(owner: string) {
  const now = Date.now()
  const times = (recentGenerations.get(owner) ?? []).filter(t => now - t < 3600000)
  if (times.length >= 10 || (times.length && now - times[times.length - 1]! < 30000)) {
    recentGenerations.set(owner, times)
    throw new Error('Please give image generation a moment before requesting another image.')
  }
  recentGenerations.set(owner, [...times, now])
}

/** Image creation is an explicit, authenticated, non-publishing member operation.
 * Reuse the existing image provider configuration, not Lovable build credits. */
export const createButlerImage = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => imageBrief.parse(data))
  .handler(async ({ data, context }) => {
    if (data.owner !== context.userId) throw new Error('Your account changed. Try again in the active account.')
    reserveGeneration(context.userId)
    const { generateBusinessImage } = await import('./businessTools.images.server')
    const image = await generateBusinessImage(
      'Create one image for a signed-in Ask Intros member, not application UI. ' +
      'The user requests: ' + data.prompt +
      '. Do not imply the result is a real documentary photo, certification, or verified event.'
    )
    return { image, label: 'AI generated image', prompt: data.prompt }
  })

export interface ButlerReferenceImage {
  title: string
  thumbnail: string
  source: string
  license: string
  provider: 'Wikimedia Commons' | 'Wikipedia'
}

function wikimediaImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && url.hostname === 'upload.wikimedia.org' &&
      !url.username && !url.password && !url.port ? url.href : null
  } catch { return null }
}

interface ReferencePage {
  title?: unknown
  imageinfo?: Array<{
    thumburl?: unknown
    mime?: unknown
    extmetadata?: { LicenseShortName?: { value?: unknown } }
  }>
  thumbnail?: { source?: unknown }
}
type ReferenceApiResponse = { query?: { pages?: ReferencePage[] } }

/** No remote image URL is accepted from the caller. Only a fixed official
 * Wikimedia/Wikipedia API is fetched, with bounded response sizes and a
 * strict allowlist for displayed image hosts. */
async function referencePages(base: 'https://commons.wikimedia.org/w/api.php' | 'https://en.wikipedia.org/w/api.php', query: string, commons: boolean): Promise<ReferencePage[]> {
  const endpoint = new URL(base)
  endpoint.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: commons ? '6' : '0',
    gsrlimit: '6',
    ...(commons
      ? { prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '480' }
      : { prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '480' }),
  }).toString()
  const response = await fetch(endpoint.href, {
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { accept: 'application/json', 'user-agent': 'AskIntrosButler/1.0 (https://askintros.lovable.app)' },
  })
  if (!response.ok) {
    await response.body?.cancel().catch(() => {})
    throw new Error('Reference search returned ' + response.status)
  }
  const body = JSON.parse(new TextDecoder().decode(await boundedBody(response, 350000))) as ReferenceApiResponse
  return Array.isArray(body.query?.pages) ? body.query.pages.slice(0, 6) : []
}

function commonsReferences(pages: ReferencePage[]): ButlerReferenceImage[] {
  return pages.flatMap(page => {
    const info = page.imageinfo?.[0]
    const thumbnail = wikimediaImageUrl(info?.thumburl)
    if (!thumbnail || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(String(info?.mime))) return []
    const title = typeof page.title === 'string' ? page.title.slice(0, 200) : ''
    if (!title.startsWith('File:')) return []
    const rawLicense = info?.extmetadata?.LicenseShortName?.value
    const license = typeof rawLicense === 'string'
      ? rawLicense.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
      : ''
    return [{
      title: title.slice(5).replace(/_/g, ' '), thumbnail,
      source: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')),
      license: license || 'Check reuse rights at source',
      provider: 'Wikimedia Commons' as const,
    }]
  })
}

function wikipediaReferences(pages: ReferencePage[]): ButlerReferenceImage[] {
  return pages.flatMap(page => {
    const title = typeof page.title === 'string' ? page.title.trim().slice(0, 200) : ''
    const thumbnail = wikimediaImageUrl(page.thumbnail?.source)
    if (!title || !thumbnail) return []
    return [{
      title, thumbnail,
      source: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')),
      license: 'Reference only — check original image rights',
      provider: 'Wikipedia' as const,
    }]
  })
}

/** Source-linked previews are for visual reference, not licensing grants.
 * Parallel independent official sources increase the likelihood of a visual
 * for specific topics that have no freely-licensed photo in Commons. */
export const findButlerReferenceImages = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => referenceRequest.parse(data))
  .handler(async ({ data }): Promise<{ results: ButlerReferenceImage[] }> => {
    const providers = await Promise.allSettled([
      referencePages('https://commons.wikimedia.org/w/api.php', data.query, true),
      referencePages('https://en.wikipedia.org/w/api.php', data.query, false),
    ])
    if (providers.every(result => result.status === 'rejected')) {
      throw new Error('Reference picture services are unavailable right now. Try again shortly.')
    }
    const commons = providers[0]?.status === 'fulfilled' ? commonsReferences(providers[0].value) : []
    const wikipedia = providers[1]?.status === 'fulfilled' ? wikipediaReferences(providers[1].value) : []
    const seen = new Set<string>()
    const results = [...commons, ...wikipedia].filter(item => {
      if (seen.has(item.thumbnail)) return false
      seen.add(item.thumbnail)
      return true
    }).slice(0, 6)
    return { results }
  })
