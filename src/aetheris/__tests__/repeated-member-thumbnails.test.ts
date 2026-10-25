import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { Face } from '../ui'
import { MemberThumbnail } from '../../intros-ui/components/shared/MemberThumbnail'

describe('repeated member thumbnails', () => {
  const person = { id: 'member-with-photo', name: 'Photo Member', initials: 'PM', avatarUrl: 'https://example.com/profile.jpg' }
  it('renders the profile photo for every occurrence in posts and member thumbnails', () => {
    const html = renderToStaticMarkup(createElement('div', null,
      createElement(Face, { person }),
      createElement(Face, { person }),
      createElement(MemberThumbnail, { name: person.name, source: person.avatarUrl }),
    ))
    expect(html.match(/<img /g)).toHaveLength(3)
    expect(html.match(/src="https:\/\/example.com\/profile.jpg"/g)).toHaveLength(3)
  })
  it('retains initials when no profile photo exists', () => {
    const html = renderToStaticMarkup(createElement(Face, { person: { ...person, avatarUrl: undefined } }))
    expect(html).toContain('PM')
    expect(html).not.toContain('<img ')
  })
  it('does not suppress repeated identities or shared photo sources at runtime', () => {
    expect(readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')).not.toContain('enforceUniquePortraits')
    expect(readFileSync(new URL('../styles.css', import.meta.url), 'utf8')).not.toContain('.portrait-repeat')
  })
})
