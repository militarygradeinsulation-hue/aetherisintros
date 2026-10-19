import { describe, expect, it } from 'vitest'
import { newsStoryPath, newsStoryUrl, validNewsSource } from '../news-links'

const story = { link: 'https://example.com/business/story?a=1&b=2', title: 'A CEO story', source: 'Example', summary: 'What happened today.' }

describe('public Ask Intros news deep links', () => {
  it('provides a shareable HTTPS link that opens the exact source URL', () => {
    const url = new URL(newsStoryUrl(story))
    expect(url.origin).toBe('https://askintros.vip')
    expect(url.pathname).toBe('/news/story')
    expect(url.searchParams.get('url')).toBe(story.link)
    expect(url.searchParams.get('title')).toBe(story.title)
    expect(newsStoryPath(story)).toContain('summary=')
  })
  it('keeps shared headlines and summaries when a feed item ages out', () => {
    const url = new URL(newsStoryUrl(story))
    expect(url.searchParams.get('summary')).toBe(story.summary)
    expect(url.searchParams.get('source')).toBe(story.source)
  })
  it('rejects local, non-HTTPS, credentialed, and malformed source URLs', () => {
    for (const url of ['http://example.com', 'javascript:alert(1)', 'https://localhost/a', 'https://127.0.0.1/', 'https://169.254.169.254/', 'https://user:pass@example.com/', 'invalid']) {
      expect(validNewsSource(url)).toBeNull()
    }
    expect(validNewsSource(story.link)).toBe(story.link)
  })
})
