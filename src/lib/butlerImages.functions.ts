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
}

function wikimediaImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && url.hostname === 'upload.wikimedia.org' && !url.username && !url.password
      ? url.href : null
  } catch { return null }
}

/** Fixed-origin Wikimedia Commons search only. No caller-supplied fetch targets,
 * scraping arbitrary sites, or server-side proxying of external image URLs. */
export const findButlerReferenceImages = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => referenceRequest.parse(data))
  .handler(async ({ data }): Promise<{ results: ButlerReferenceImage[] }> => {
    const endpoint = new URL('https://commons.wikimedia.org/w/api.php')
    endpoint.search = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2',
      generator: 'search', gsrsearch: data.query, gsrnamespace: '6', gsrlimit: '6',
      prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '480',
    }).toString()
    let response: Response
    try {
      response = await fetch(endpoint.href, {
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: { accept: 'application/json', 'user-agent': 'AskIntrosButler/1.0 (https://askintros.vip)' },
      })
    } catch { throw new Error('Reference image search is unavailable right now.') }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {})
      throw new Error('Reference image search is unavailable right now.')
    }
    const payload = JSON.parse(new TextDecoder().decode(await boundedBody(response, 350000))) as {
      query?: { pages?: Array<{ title?: unknown; imageinfo?: Array<{
        thumburl?: unknown; mime?: unknown; extmetadata?: { LicenseShortName?: { value?: unknown } }
      }> }> }
    }
    const results = (payload.query?.pages ?? []).flatMap(page => {
      const info = page.imageinfo?.[0]
      const thumbnail = wikimediaImageUrl(info?.thumburl)
      if (!thumbnail || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(String(info?.mime))) return []
      const title = String(page.title ?? '').slice(0, 200)
      if (!title.startsWith('File:')) return []
      const rawLicense = info?.extmetadata?.LicenseShortName?.value
      const license = typeof rawLicense === 'string'
        ? rawLicense.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)
        : ''
      return [{ title: title.slice(5).replace(/_/g, ' '), thumbnail,
        source: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')),
        license: license || 'Check reuse rights at source' }]
    })
    return { results: results.slice(0, 6) }
  })
