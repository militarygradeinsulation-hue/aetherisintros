import { describe, it, expect } from 'vitest'
import { hasContactDetails, initialHideEmptyContacts } from '../crm/contact-visibility'

const empty = {companyName:'', title:'', email:'', phone:'', location:'', linkedinUrl:'', notes:''}

describe('CRM hide incomplete rows for mobile', () => {
  it('defaults to hiding empty rows on mobile, while preserving explicit preferences', () => {
    expect(initialHideEmptyContacts(null,true)).toBe(true)
    expect(initialHideEmptyContacts(null,false)).toBe(false)
    expect(initialHideEmptyContacts('0',true)).toBe(false)
    expect(initialHideEmptyContacts('1',false)).toBe(true)
  })
  it('hides genuinely empty rows, including whitespace-only imports', () => {
    expect(hasContactDetails(empty)).toBe(false)
    expect(hasContactDetails({...empty, email:'  '})).toBe(false)
  })
  it('keeps valid contacts with location, LinkedIn or notes even when email is blank', () => {
    expect(hasContactDetails({...empty,location:'Fishers'})).toBe(true)
    expect(hasContactDetails({...empty,linkedinUrl:'https://linkedin.com/in/test'})).toBe(true)
    expect(hasContactDetails({...empty,notes:'Follow up in November'})).toBe(true)
  })
})
