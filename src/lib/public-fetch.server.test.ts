import { afterEach, describe, expect, it, vi } from 'vitest'
import { boundedBody, publicDocument, publisherImage, publisherImageUrl } from './public-fetch.server'

afterEach(() => vi.unstubAllGlobals())
describe('public reader network boundary', () => {
  it.each(['http://127.0.0.1/a', 'http://169.254.169.254/latest', 'http://[::1]/', 'https://localhost/a', 'https://foo.internal/a', 'https://name:password@techcrunch.com/', 'https://techcrunch.com:8443/'])('rejects unsafe target %s without a fetch', async url => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(publicDocument(url)).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('only connects to the fixed reader origin for a public target', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('Public article text'))
    vi.stubGlobal('fetch', fetch)
    expect(await publicDocument('https://news.example.org/article')).toBe('Public article text')
    expect(fetch.mock.calls[0]?.[0]).toBe('https://r.jina.ai/https://news.example.org/article')
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
  })
  it('never follows reader redirects', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(publicDocument('https://techcrunch.com/article')).rejects.toThrow()
    expect(fetch).toHaveBeenCalledOnce()
  })
  it('stops buffering and cancels a response at the size limit', async () => {
    const cancel = vi.fn()
    const response = new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(20)); }, cancel }))
    await expect(boundedBody(response, 10)).rejects.toThrow('too large')
    expect(cancel).toHaveBeenCalledOnce()
  })
})
describe('publisher image proxy', () => {
  it.each(['http://techcrunch.com/x', 'https://techcrunch.com.evil.org/x', 'https://127.0.0.1/x', 'https://untrusted.example.org/x'])('rejects untrusted image origin %s', url => {
    expect(() => publisherImageUrl(url)).toThrow()
  })
  it('rejects a redirect out of the publisher allowlist before following it', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(publisherImage('https://techcrunch.com/image.jpg')).rejects.toThrow()
    expect(fetch).toHaveBeenCalledOnce()
  })
})
