import { describe, expect, it } from 'vitest'

import {
  isLinkedInPhotoUrl, mergeProfiles, normalizeLinkedInUrl, parseAiProfile, parseLinkedInText, profileFieldsFrom,
} from '../linkedin-import'

// The order PDF.js reads a LinkedIn "Save to PDF" export: sidebar first, then the main column.
const EXPORT = `Contact
adrian@northline.example
www.linkedin.com/in/adrian-north (LinkedIn)
northline.example (Company)
Top Skills
Brand Strategy
Lead Generation
Marketing Automation
Languages
English (Native or Bilingual)
Spanish (Professional Working Proficiency)
Certifications
HubSpot Inbound Certified
Adrian North
Founder & CEO at Northline Growth | Fixing the leaks that cost growing businesses revenue
Austin, Texas, United States
Summary
I help established businesses find where they lose time, leads and revenue. Then we build
the systems that fix it: lead response, follow-up and automation.
Experience
Northline Growth
Founder & CEO
January 2019 - Present (5 years 10 months)
Austin, Texas, United States
Built a consultancy that rebuilds lead flow and sales follow-up for 60+ companies.
Acme Corp
VP Marketing
March 2014 - December 2018 (4 years 10 months)
Led a team of 12 across brand, demand generation and marketing operations.
Page 1 of 2
Education
University of Texas at Austin
Bachelor of Business Administration, Marketing · (2006 - 2010)`

describe('LinkedIn links', () => {
  it('accepts profile links in any common form', () => {
    expect(normalizeLinkedInUrl('linkedin.com/in/adrian-north')).toBe('https://www.linkedin.com/in/adrian-north')
    expect(normalizeLinkedInUrl('https://uk.linkedin.com/in/adrian-north/?originalSubdomain=uk')).toBe('https://www.linkedin.com/in/adrian-north')
    expect(normalizeLinkedInUrl('http://www.linkedin.com/in/jos%C3%A9-p')).toBe('https://www.linkedin.com/in/jos%C3%A9-p')
  })
  it('rejects anything that is not a LinkedIn profile', () => {
    for (const bad of ['', 'https://evil.example/in/x', 'https://linkedin.com.evil.example/in/x', 'https://www.linkedin.com/company/acme', 'https://www.linkedin.com/in/a', 'javascript:alert(1)']) {
      expect(normalizeLinkedInUrl(bad)).toBeNull()
    }
  })
  it('only fetches photos from LinkedIn image hosting', () => {
    expect(isLinkedInPhotoUrl('https://media.licdn.com/dms/image/v2/D4E03AQ/profile-displayphoto-shrink_400_400/0/1?e=1&v=beta&t=x')).toBe(true)
    expect(isLinkedInPhotoUrl('http://media.licdn.com/dms/image/x')).toBe(false)
    expect(isLinkedInPhotoUrl('https://media.licdn.com.evil.example/dms/image/x')).toBe(false)
    expect(isLinkedInPhotoUrl('https://169.254.169.254/dms/image/x')).toBe(false)
  })
})

describe('reading a LinkedIn export', () => {
  const li = parseLinkedInText(EXPORT, { name: 'Adrian North' })

  it('finds the name, headline and location', () => {
    expect(li.name).toBe('Adrian North')
    expect(li.headline).toMatch(/^Founder & CEO at Northline Growth/)
    expect(li.location).toBe('Austin, Texas, United States')
  })
  it('reads the about section, skills, languages and certifications', () => {
    expect(li.about).toMatch(/^I help established businesses .* automation\.$/)
    expect(li.skills).toEqual(['Brand Strategy', 'Lead Generation', 'Marketing Automation'])
    expect(li.languages).toEqual(['English', 'Spanish'])
    expect(li.certifications).toEqual(['HubSpot Inbound Certified'])
  })
  it('reads each role with its company, dates and description', () => {
    expect(li.experience).toHaveLength(2)
    expect(li.experience[0]).toMatchObject({ company: 'Northline Growth', title: 'Founder & CEO', location: 'Austin, Texas, United States' })
    expect(li.experience[0]!.description).toMatch(/^Built a consultancy/)
    expect(li.experience[1]).toMatchObject({ company: 'Acme Corp', title: 'VP Marketing' })
    expect(li.experience[1]!.description).toMatch(/marketing operations\.$/)
  })
  it('fills the profile from the current role and the member’s own words', () => {
    const f = profileFieldsFrom(li)
    expect(f).toMatchObject({ name: 'Adrian North', title: 'Founder & CEO', company: 'Northline Growth', location: 'Austin, Texas, United States' })
    expect(f.whatIDo).toMatch(/^I help established businesses/)
    expect(f.building).toMatch(/^Built a consultancy/)
    expect(f.expertise).toEqual(['Brand Strategy', 'Lead Generation', 'Marketing Automation'])
    expect(f.canHelpWith).toBe('Brand Strategy, Lead Generation, Marketing Automation')
    expect(f.industries).toEqual([])
  })
})

describe('AI extraction', () => {
  it('keeps only well-typed fields and drops junk', () => {
    const ai = parseAiProfile('Sure! {"name":"Adrian North","headline":7,"skills":["A","a","B",3],"experience":[{"title":"CEO","company":"X"},{"foo":1}]}')
    expect(ai).toMatchObject({ name: 'Adrian North', headline: '', skills: ['a', 'B'] })
    expect(ai!.experience).toEqual([{ title: 'CEO', company: 'X', dates: '', location: '', description: '' }])
    expect(parseAiProfile('no json here')).toBeNull()
  })
  it('falls back to the parser for anything the AI left empty', () => {
    const parsed = parseLinkedInText(EXPORT, { name: 'Adrian North' })
    const merged = mergeProfiles(parseAiProfile('{"name":"Adrian North","headline":"Founder"}'), parsed)
    expect(merged.headline).toBe('Founder')
    expect(merged.skills).toEqual(parsed.skills)
    expect(merged.experience).toHaveLength(2)
  })
})
