import { describe, expect, it } from 'vitest'
import { AdditionalEvidenceSchema, containsCompleteClaim } from '../professional-evidence'
import { checkedPatch, buildReviewRows, emptyScan, groundScan, parseAuthorizedScan, parseScanText, PROFILE_KEYS, scanValues } from '../linkedin-scan'

const profile = `Ada Example
Founder at Example Labs
Austin, Texas
About
I build tools for small teams.
Experience
Founder
Example Labs
Jan 2021 - Present
Education
Example University
Skills
Operations
Industries
Manufacturing
Services
Process design
Seeking
Distribution partners
Projects
Factory planning toolkit
Licenses & Certifications
Safety certificate
Languages
English
Volunteering
Mentor at Local Workshop
Honors & Awards
Community award
Websites
https://example.org/work`;

describe('authorized professional evidence', () => {
  it('extracts all explicit professional sections without blending sections', () => {
    const { scan, claims } = parseScanText(profile)
    expect(scan).toMatchObject({ name: 'Ada Example', title: 'Founder', company: 'Example Labs', industries: ['Manufacturing'], expertise: ['Operations'],
      can_help_with: 'Process design', looking_for: 'Distribution partners', projects: ['Factory planning toolkit'], credentials: ['Safety certificate'],
      languages: ['English'], volunteering: ['Mentor at Local Workshop'], achievements: ['Community award'], websites: ['https://example.org/work'] })
    expect(scan.education).toEqual(['Example University'])
    expect(claims?.find(item => item.field === 'projects')).toMatchObject({ source: 'Supplied LinkedIn profile', quote: 'Factory planning toolkit', kind: 'self_reported' })
  })
  it('keeps missing facts empty and never infers communication style from a role', () => {
    const { scan, claims } = parseScanText('Ada Example\nFounder at Example Labs\nAustin, Texas\nAbout\nI build tools.')
    expect(scan.credentials).toEqual([])
    expect(scan.industries).toEqual([])
    expect(claims?.filter(item => item.kind === 'hypothesis')).toEqual([])
  })
  it('supplements sections only with permission, preserving profile identity and provenance', () => {
    const result = parseAuthorizedScan(profile, [{ label: 'My project brief', authorized: true, text: 'Another Person\nProjects\nWarehouse planner\nAbout\nI prefer written messages.' }])
    expect(result.scan.name).toBe('Ada Example')
    expect(result.scan.projects).toEqual(['Factory planning toolkit', 'Warehouse planner'])
    expect(result.claims?.find(item => item.value === 'Warehouse planner')).toMatchObject({ source: 'My project brief' })
    expect(result.claims?.find(item => item.field === 'communication_preference')).toMatchObject({ kind: 'hypothesis', confidence: 'low', quote: 'I prefer written messages.' })
    expect(() => AdditionalEvidenceSchema.parse({ label: 'x', text: 'x', authorized: false })).toThrow()
    expect(() => AdditionalEvidenceSchema.parse({ label: 'x', text: 'x'.repeat(20001), authorized: true })).toThrow()
    expect(() => parseAuthorizedScan(profile, Array.from({ length: 4 }, () => ({ label: 'x', text: 'x', authorized: true })))).toThrow()
  })
  it('labels strengths and opportunities as hypotheses, not verification or real matching', () => {
    const claims = parseScanText(profile).claims ?? []
    expect(claims.find(item => item.field === 'professional_strength')).toMatchObject({ kind: 'hypothesis', confidence: 'low', quote: 'Operations' })
    expect(claims.find(item => item.field === 'networking_opportunity')).toMatchObject({ kind: 'hypothesis', confidence: 'low', quote: 'Distribution partners' })
    expect(claims.every(item => Boolean(item.source && item.quote))).toBe(true)
  })
  it('rejects invented long suffixes and invented role dates', () => {
    const real = 'I build reliable tools for small manufacturing teams every day.'
    expect(containsCompleteClaim(`${real} I won a Nobel prize.`, real)).toBe(false)
    const scan = groundScan({ ...emptyScan(), about: `${real} I won a Nobel prize.`, experience: [{ title: 'Founder', company: 'Example Labs', start: '1900', end: 'Present' }] }, profile)
    expect(scan.about).toBe('')
    expect(scan.experience).toEqual([])
  })
  it('strips other people and unsafe website schemes; review-only fields cannot enter a public patch', () => {
    const result = parseScanText(`${profile}\njavascript:alert(1)\nhttp://127.0.0.1/admin\nPeople also viewed\nMallory\nCEO at Fake Labs`)
    expect(result.scan.websites).toEqual(['https://example.org/work'])
    expect(JSON.stringify(result)).not.toContain('Mallory')
    const rows = buildReviewRows(PROFILE_KEYS, scanValues(result.scan), {})
    expect(checkedPatch(rows, new Set(['projects', 'credentials', 'name']))).toEqual({ name: 'Ada Example' })
  })
})