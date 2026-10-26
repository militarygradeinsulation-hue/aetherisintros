import { describe, expect, it } from 'vitest'
import {
  indexedProfileName, isMatchingOwnerName, sameIndexedLinkedInProfile,
  previewFromIndexedTitle, selectIndexedMemberSources, indexedSourcesText,
  type IndexedHit,
} from './linkedin-index'

const own = 'https://www.linkedin.com/in/jane-doe-123'
const hits: IndexedHit[] = [
  {
    url: 'https://www.linkedin.com/in/jane-doe-123/',
    title: 'Jane Doe - Director of Operations - Acme Services | LinkedIn',
    snippet: 'Jane Doe · Director of Operations at Acme Services. Leading field teams.',
  },
  {
    url: 'https://acmeservices.example/team/jane',
    title: 'Jane Doe | Acme Services',
    snippet: 'Jane Doe serves as Director of Operations for Acme Services.',
  },
]
describe('Mindprint-inspired indexed LinkedIn self-import safeguards', () => {
  it('normalizes exactly one LinkedIn member slug and rejects lookalike domains', () => {
    expect(sameIndexedLinkedInProfile('https://linkedin.com/in/jane-doe-123?trk=people', own)).toBe(true)
    expect(sameIndexedLinkedInProfile('https://linkedin.com/in/jane-doe-456', own)).toBe(false)
    expect(sameIndexedLinkedInProfile('https://linkedin.com.evil.test/in/jane-doe-123', own)).toBe(false)
    expect(sameIndexedLinkedInProfile('http://localhost/in/jane-doe-123', own)).toBe(false)
    expect(sameIndexedLinkedInProfile('https://linkedin.com@evil.test/in/jane-doe-123', own)).toBe(false)
  })
  it('requires the same account name to suppress unrelated same-name or different-person matches', () => {
    expect(isMatchingOwnerName('Jane Doe','Jane Doe')).toBe(true)
    expect(isMatchingOwnerName('Joe Toney','Joseph Toney')).toBe(true)
    expect(isMatchingOwnerName('Jane Doe','Jane Smith')).toBe(false)
    expect(isMatchingOwnerName('Jane Doe','John Doe')).toBe(false)
    expect(indexedProfileName(hits[0]!.title)).toBe('Jane Doe')
  })
  it('does not fall back to a different LinkedIn person when the exact URL is absent', () => {
    const unrelated=[{...hits[0]!,url:'https://www.linkedin.com/in/jane-other'}]
    expect(selectIndexedMemberSources(unrelated,own,'Jane Doe')).toEqual([])
    expect(selectIndexedMemberSources(hits,own,'John Smith')).toEqual([])
  })
  it('allows only the exact indexed match and corroborating public professional snippets', () => {
    const malicious: IndexedHit[] = [
      { url: 'https://linkedin.com.evil.test/in/jane-doe-123',title:'Jane Doe',snippet:'fake' },
      { url: 'https://acmeservices.example/random',title:'Jane Doe at another business',snippet:'Another Jane Doe is an executive somewhere else.' },
    ]
    const result=selectIndexedMemberSources([...hits,...malicious],own,'Jane Doe')
    expect(result.map(x=>x.url)).toEqual([own,'https://acmeservices.example/team/jane'])
    expect(result.every(x=>x.kind==='linkedin-index'||x.kind==='public-professional')).toBe(true)
    expect(indexedSourcesText(result)).toContain('INDEXED PUBLIC EXCERPT')
  })
  it('builds a conservative fallback from the verified indexed title, not imagined career facts',()=>{
    const source=selectIndexedMemberSources(hits,own,'Jane Doe')[0]!
    const preview=previewFromIndexedTitle(source,own)
    expect(preview).toMatchObject({
      name:'Jane Doe',headline:'Director of Operations',title:'Director of Operations',
      company:'Acme Services',linkedin_url:own,education:[],experience:[],about:'',
    })
  })
})
