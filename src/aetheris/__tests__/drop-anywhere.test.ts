import { describe, expect, it } from 'vitest'
import { classifyFile, classifyText, kindForFiles, suggestionsFor } from '../drop-anywhere'

describe('drop anywhere', () => {
  it('sends spreadsheets to the CRM people import first', () => {
    expect(classifyFile({ name: 'contacts.csv', type: '' })).toBe('contacts')
    expect(suggestionsFor('contacts')[0].action).toBe('crm-import')
  })
  it('suggests a reviewed post draft for photos', () => {
    expect(classifyFile({ name: 'a.JPG', type: '' })).toBe('image')
    expect(suggestionsFor('image')[0].action).toBe('butler-post')
  })
  it('hands documents to Butler to read', () => {
    expect(classifyFile({ name: 'deck.pdf', type: 'application/pdf' })).toBe('document')
    expect(suggestionsFor('document').map(s => s.action)).toEqual(['butler-read'])
  })
  it('tells links from plain text', () => {
    expect(classifyText(' https://example.com/x ')).toBe('link')
    expect(classifyText('met Dana at the summit')).toBe('text')
  })
  it('a sheet in a mixed drop wins', () => {
    expect(kindForFiles([{ name: 'p.png', type: 'image/png' }, { name: 'c.csv', type: '' }])).toBe('contacts')
  })
})
