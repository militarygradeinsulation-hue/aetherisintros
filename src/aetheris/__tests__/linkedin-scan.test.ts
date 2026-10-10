import { describe, expect, it } from 'vitest'

import {
  buildReviewRows, checkedPatch, cleanProfileText, CONTACT_KEYS, defaultChecked, emptyScan, groundScan, MAX_SCAN_TEXT, mergeScans,
  parseScanJson, parseScanText, profileColumns, PROFILE_KEYS, scanValues, splitDates, statedIn, validateScan,
} from '../linkedin-scan'

// What Ctrl+A / Ctrl+C on a LinkedIn profile page gives: navigation, repeated screen-reader
// text, buttons, counts, other people's profiles and the footer around the real content.
const PASTED = `Skip to main content
Home
My Network
Jobs
Messaging
Notifications
Me
For Business
Try Premium for $0
Background Image
Maya Okafor
Maya Okafor
She/Her
CEO at Harbor Freight Labs | Building cold-chain logistics software
Lagos, Lagos State, Nigeria · Contact info
500+ connections
Open to
Add profile section
More
Analytics
Private to you
1,204 profile views
Discover who's viewed your profile.
About
I run Harbor Freight Labs. We build software that keeps vaccines and food cold from port to clinic.
Activity
2,310 followers
Maya Okafor posted this • 2w
Great week at the port authority summit with Tunde Bello.
Show all posts
Experience
Chief Executive Officer
Harbor Freight Labs · Full-time
Jan 2020 - Present · 4 yrs 10 mos
Lagos, Nigeria · Hybrid
Built the company from 3 to 120 people.
Head of Operations
Maersk · Full-time
Mar 2014 - Dec 2019 · 5 yrs 10 mos
Copenhagen, Denmark
Show all 6 experiences
Education
University of Lagos
BSc, Civil Engineering
2006 - 2010
Skills
Supply Chain Management
Supply Chain Management
Endorsed by 14 colleagues
Logistics
Cold Chain
Show all 25 skills
People also viewed
Tunde Bello
· 2nd
COO at Port Systems
Connect
Ngozi Eze
· 3rd+
Founder at FreshBox
About
Accessibility
Talent Solutions
Community Guidelines
LinkedIn Corporation © 2026`

describe('cleaning pasted profile text', () => {
  const cleaned = cleanProfileText(PASTED).text

  it('removes navigation, buttons, counts and repeated lines', () => {
    for (const noise of ['Skip to main content', 'My Network', 'Try Premium for $0', 'Add profile section', '500+ connections', 'She/Her', 'Show all 25 skills', 'Endorsed by 14 colleagues', '1,204 profile views']) {
      expect(cleaned).not.toContain(noise)
    }
    expect(cleaned.match(/^Maya Okafor$/gm)).toHaveLength(1)
    expect(cleaned).toContain('Lagos, Lagos State, Nigeria')
    expect(cleaned).not.toContain('Contact info')
  })

  it('drops other people, posts and the footer', () => {
    for (const noise of ['People also viewed', 'Tunde Bello', 'Ngozi Eze', 'FreshBox', 'port authority summit', 'Accessibility', 'LinkedIn Corporation']) {
      expect(cleaned).not.toContain(noise)
    }
  })

  it('caps the length it reads', () => {
    const long = Array.from({ length: 5000 }, (_, i) => `Line number ${i} of a very long pasted profile`).join('\n')
    const out = cleanProfileText(long)
    expect(out.truncated).toBe(true)
    expect(out.text.length).toBeLessThanOrEqual(MAX_SCAN_TEXT)
  })

  it('handles empty or non-string input', () => {
    expect(cleanProfileText('').text).toBe('')
    expect(cleanProfileText(undefined as unknown as string).text).toBe('')
  })
})

describe('the built-in reader', () => {
  it('reads a pasted profile page', () => {
    const { scan, source } = parseScanText(PASTED, { url: 'linkedin.com/in/maya-okafor/' })
    expect(source).toBe('parser')
    expect(scan).toMatchObject({
      name: 'Maya Okafor',
      headline: 'CEO at Harbor Freight Labs | Building cold-chain logistics software',
      title: 'Chief Executive Officer',
      company: 'Harbor Freight Labs',
      location: 'Lagos, Lagos State, Nigeria',
      linkedin_url: 'https://www.linkedin.com/in/maya-okafor',
    })
    expect(scan.about).toMatch(/^I run Harbor Freight Labs/)
    expect(scan.expertise).toEqual(['Supply Chain Management', 'Logistics', 'Cold Chain'])
    expect(scan.experience).toEqual([
      { title: 'Chief Executive Officer', company: 'Harbor Freight Labs', start: 'Jan 2020', end: 'Present' },
      { title: 'Head of Operations', company: 'Maersk', start: 'Mar 2014', end: 'Dec 2019' },
    ])
    expect(scan.education[0]).toBe('University of Lagos')
  })

  it('never invents: industries, help and needs stay empty when not stated', () => {
    const { scan } = parseScanText(PASTED)
    expect(scan.industries).toEqual([])
    expect(scan.can_help_with).toBe('')
    expect(scan.looking_for).toBe('')
    expect(scan.linkedin_url).toBe('')
  })

  it('takes the profile link from a PDF contact section when none is given', () => {
    const { scan } = parseScanText('Contact\nwww.linkedin.com/in/adrian-north (LinkedIn)\nAdrian North\nFounder at Northline\nAustin, Texas, United States', { nameHint: 'Adrian North' })
    expect(scan.linkedin_url).toBe('https://www.linkedin.com/in/adrian-north')
    expect(scan.name).toBe('Adrian North')
  })

  it('splits LinkedIn date ranges', () => {
    expect(splitDates('January 2019 - Present (5 years 10 months)')).toEqual({ start: 'January 2019', end: 'Present' })
    expect(splitDates('Mar 2014 – Dec 2019 · 5 yrs')).toEqual({ start: 'Mar 2014', end: 'Dec 2019' })
    expect(splitDates('2006 - 2010')).toEqual({ start: '2006', end: '2010' })
  })
})

describe('strict JSON validation', () => {
  it('accepts the shape, trims, caps, de-duplicates and drops unknown keys', () => {
    const scan = parseScanJson(`Here you go:\n${JSON.stringify({
      name: '  Maya   Okafor ', headline: 'CEO', company: 'Harbor', location: 'Lagos', about: 'x'.repeat(5000),
      industries: ['Logistics', 'logistics', 7, ''], expertise: ['Cold Chain'], can_help_with: '', looking_for: '',
      experience: [{ title: 'CEO', company: 'Harbor', start: 'Jan 2020', end: 'Present', salary: 1 }, { foo: 'bar' }, 'nope'],
      education: ['Unilag'], linkedin_url: 'https://evil.example/in/x', email: 'maya@example.com',
    })}`)!
    expect(scan.name).toBe('Maya Okafor')
    expect(scan.about).toHaveLength(2600)
    expect(scan.industries).toEqual(['Logistics'])
    expect(scan.experience).toEqual([{ title: 'CEO', company: 'Harbor', start: 'Jan 2020', end: 'Present' }])
    expect(scan.linkedin_url).toBe('')
    expect('email' in scan).toBe(false)
    expect(scan.title).toBe('')
  })

  it('rejects non-JSON and non-objects', () => {
    expect(parseScanJson('no json here')).toBeNull()
    expect(parseScanJson('{not: valid}')).toBeNull()
    expect(validateScan(['a'])).toBeNull()
    expect(validateScan(null)).toBeNull()
  })

  it('turns wrong types into empty values instead of failing', () => {
    expect(validateScan({ name: 42, industries: 'Logistics', experience: {} })).toEqual(emptyScan())
  })
})

describe('never inventing values', () => {
  const source = cleanProfileText(PASTED).text

  it('keeps only values the text states', () => {
    expect(statedIn('Harbor Freight Labs', source)).toBe(true)
    expect(statedIn('Harbor', source)).toBe(true)
    expect(statedIn('Goldman Sachs', source)).toBe(false)
    const grounded = groundScan({
      ...emptyScan(), name: 'Maya Okafor', company: 'Goldman Sachs', industries: ['Logistics', 'Fintech'], expertise: ['Cold Chain', 'Python'],
      looking_for: 'Series B investors in Europe who back logistics infrastructure', experience: [{ title: 'Chief Executive Officer', company: 'Harbor Freight Labs', start: '', end: '' }, { title: 'Partner', company: 'McKinsey', start: '', end: '' }],
    }, source)
    expect(grounded.name).toBe('Maya Okafor')
    expect(grounded.company).toBe('')
    expect(grounded.industries).toEqual(['Logistics']) // stated (as a skill); Fintech is not
    expect(grounded.expertise).toEqual(['Cold Chain'])
    expect(grounded.looking_for).toBe('')
    expect(grounded.experience).toHaveLength(1)
  })

  it('lets AI values win, with the reader filling gaps and the member’s link kept', () => {
    const parsed = { ...emptyScan(), name: 'Parser Name', location: 'Lagos', linkedin_url: 'https://www.linkedin.com/in/maya' }
    const merged = mergeScans({ ...emptyScan(), name: 'Maya Okafor', linkedin_url: 'https://www.linkedin.com/in/other' }, parsed)
    expect(merged).toMatchObject({ name: 'Maya Okafor', location: 'Lagos', linkedin_url: 'https://www.linkedin.com/in/maya' })
  })
})

describe('the review step', () => {
  const { scan } = parseScanText(PASTED, { url: 'https://www.linkedin.com/in/maya-okafor' })
  const current = { name: 'Maya Okafor', title: 'Founder', company: '', location: 'Lagos, Lagos State, Nigeria' }
  const rows = buildReviewRows(PROFILE_KEYS, scanValues(scan), current)

  it('shows the current value next to the scanned one', () => {
    const title = rows.find(r => r.key === 'title')!
    expect(title).toMatchObject({ current: 'Founder', incoming: 'Chief Executive Officer', differs: true })
  })

  it('pre-ticks only fields the profile states that differ', () => {
    const ticked = defaultChecked(rows)
    expect(ticked.has('title')).toBe(true)
    expect(ticked.has('company')).toBe(true)
    expect(ticked.has('name')).toBe(false) // same as now
    expect(ticked.has('location')).toBe(false)
    expect(ticked.has('industries')).toBe(false) // not on the profile
  })

  it('applies only ticked fields, with the member’s edits', () => {
    const patch = checkedPatch(rows, new Set(['title', 'expertise', 'industries']), { title: 'CEO' })
    expect(patch).toEqual({ title: 'CEO', expertise: 'Supply Chain Management, Logistics, Cold Chain' })
  })

  it('maps a patch to public.profiles columns', () => {
    expect(profileColumns({ name: 'Maya Okafor', headline: 'CEO at Harbor', about: 'I run Harbor.', expertise: 'A, B, a', linkedin_url: 'linkedin.com/in/maya-okafor' })).toEqual({
      name: 'Maya Okafor', initials: 'MO', thesis: 'CEO at Harbor', bio: 'I run Harbor.', what_i_do: 'I run Harbor.',
      expertise: ['A', 'B', 'a'], linkedin_url: 'https://www.linkedin.com/in/maya-okafor',
    })
    expect(profileColumns({ linkedin_url: 'https://example.com/in/x' })).toEqual({})
    expect(profileColumns({})).toEqual({})
  })

  it('offers the contact fields for the CRM form', () => {
    const contact = buildReviewRows(CONTACT_KEYS, scanValues(scan), {})
    expect(contact.map(r => r.key)).toEqual(['name', 'title', 'company', 'location', 'linkedin_url', 'about', 'expertise'])
    expect(contact.every(r => r.differs)).toBe(true)
  })
})
