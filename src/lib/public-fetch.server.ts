import { isPublisherImageHost } from '@/aetheris/news-image-policy'
import { publicTarget } from '@/features/specter-detect/investigation'

export async function boundedBody(response: Response, limit: number): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Empty upstream response')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > limit) throw new Error('Upstream response is too large')
      chunks.push(part.value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  const output = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength }
  return output
}

/** Arbitrary public pages are read through the existing fixed reader origin.
 * The application server never connects to a caller-supplied host or redirect. */
export async function publicDocument(target: string, json = false): Promise<string> {
  const url = publicTarget(target)
  const response = await fetch(`https://r.jina.ai/${url}`, {
    redirect: 'manual', signal: AbortSignal.timeout(15_000),
    headers: { accept: json ? 'application/json' : 'text/plain', ...(json ? { 'x-with-images-summary': 'true' } : {}) },
  })
  if (!response.ok || response.status >= 300) {
    await response.body?.cancel().catch(() => {})
    throw new Error('Public reader unavailable')
  }
  return new TextDecoder().decode(await boundedBody(response, 512_000))
}

// Publisher/CDN origins used by the configured news sources. Unknown sources use
// their ordinary browser image URL instead of turning this endpoint into a proxy.

export function publisherImageUrl(raw: string): string {
  const url = new URL(publicTarget(raw))
  if (url.protocol !== 'https:' || !isPublisherImageHost(url.hostname)) {
    throw new Error('Unsupported publisher image origin')
  }
  return url.href
}

export async function publisherImage(target: string): Promise<Response> {
  let url = publisherImageUrl(target)
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(8_000),
      headers: { accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif' },
    })
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel().catch(() => {})
      const location = response.headers.get('location')
      if (!location) throw new Error('Missing image redirect')
      url = publisherImageUrl(new URL(location, url).href)
      continue
    }
    return response
  }
  throw new Error('Too many image redirects')
}
