import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/routes/news.tsx', 'utf8')
const page = readFileSync('src/aetheris/pages/NewsPage.tsx', 'utf8')
const css = readFileSync('src/aetheris/public-news.css', 'utf8')

describe('public news visual parity', () => {
  it('reuses the exact signed-in NewsPage component rather than separate text cards', () => {
    expect(route).toContain("import { NewsPage } from '@/aetheris/pages/NewsPage'")
    expect(route).toContain('<NewsPage publicMode />')
  })
  it('preserves featured and grid thumbnail components and direct story navigation', () => {
    expect(page).toContain('className="news-featured"')
    expect(page).toContain('className="news-grid"')
    expect(page).toContain('<NewsThumbnail item={featured} />')
    expect(page).toContain('<NewsThumbnail item={item} />')
    expect(page).toContain('href={newsStoryPath(item)}')
    expect(page).toContain('href={newsStoryPath(featured)}')
  })
  it('does not expose private library or network actions on public pages', () => {
    expect(page).toContain('{!publicMode && <NewsActions item={item} compact />}')
    expect(page).toContain('{!publicMode && <NewsActions item={featured} compact />}')
    expect(page).toContain('...(!publicMode ? [')
  })
  it('does not override the original editorial controls with global public button styling', () => {
    expect(css).not.toMatch(/\.public-news button\s*[,\{]/)
    expect(css).toContain('.public-news .news-thumb')
  })
})
