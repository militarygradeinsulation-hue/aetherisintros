import { describe, expect, it } from 'vitest'
import { autoMapColumns } from '../ledger/contact-automap'

describe('contact auto-match', () => {
  it('maps a HubSpot export', () => {
    const m = autoMapColumns(['Record ID', 'First Name', 'Last Name', 'Email', 'Phone Number', 'Job Title', 'Company Name', 'City'], 'people')
    expect(m).toEqual({ firstName: 1, lastName: 2, email: 3, phone: 4, title: 5, companyName: 6, location: 7 })
  })
  it('maps a LinkedIn connections export without stealing name columns', () => {
    const m = autoMapColumns(['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position', 'Connected On'], 'people')
    expect(m).toEqual({ firstName: 0, lastName: 1, linkedinUrl: 2, email: 3, companyName: 4, title: 5 })
  })
  it('maps a simple sheet with odd casing and underscores', () => {
    const m = autoMapColumns(['NAME', 'e-mail', 'mobile_phone', 'organization'], 'people')
    expect(m).toEqual({ fullName: 0, email: 1, phone: 2, companyName: 3 })
  })
  it('maps a Google Contacts export', () => {
    const m = autoMapColumns(['Name', 'Given Name', 'Family Name', 'E-mail 1 - Value', 'Phone 1 - Value', 'Organization 1 - Name', 'Organization 1 - Title'], 'people')
    expect(m).toMatchObject({ fullName: 0, firstName: 1, lastName: 2, email: 3, phone: 4, companyName: 5, title: 6 })
  })
})
