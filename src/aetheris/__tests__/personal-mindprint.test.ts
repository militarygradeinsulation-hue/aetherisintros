import { describe, expect, it } from 'vitest'
import { emptyScan } from '../linkedin-scan'
import { buildPersonalMindprint, mindprintButlerContext } from '../personal-mindprint'

describe('member-approved personal Mindprint', () => {
  it('retains professional history and separates unverified evidence from unknowns', () => {
    const scan = { ...emptyScan(), name: 'Ada Example', title: 'Founder', company: 'Example Works',
      experience: [{ title: 'Founder', company: 'Example Works', start: '2022', end: 'Present', description: 'Built scheduling tools' }],
      education: ['Example University'], expertise: ['Operations'], projects: ['Scheduling tools'], looking_for: 'Distribution partners',
      can_help_with: 'Process improvement', linkedin_url: 'https://www.linkedin.com/in/ada-example' }
    const dossier = buildPersonalMindprint(scan, 'supplied_profile', '2026-10-29T00:00:00.000Z')
    expect(dossier.identity.name).toBe('Ada Example')
    expect(dossier.career[0]?.company).toBe('Example Works')
    expect(dossier.education).toEqual(['Example University'])
    expect(dossier.signals.every(item => item.confidence === 'self_reported')).toBe(true)
    expect(dossier.unknowns.some(line => line.includes('not been independently verified'))).toBe(true)
    expect(JSON.stringify(dossier)).not.toMatch(/MBTI|psychological diagnosis/)
    expect(mindprintButlerContext(dossier)).toMatchObject({ unverified: true, needs: 'Distribution partners' })
  })
  it('warns that an indexed URL alone cannot provide a complete dossier', () => {
    const dossier = buildPersonalMindprint({ ...emptyScan(), name: 'Ada Example', title: 'Founder' }, 'public_index')
    expect(dossier.unknowns[0]).toMatch(/Public search snippets/)
    expect(dossier.career).toEqual([])
  })
})
