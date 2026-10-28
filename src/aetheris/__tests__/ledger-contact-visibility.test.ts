import { describe, expect, it } from 'vitest'
import { hasLedgerContactDetails } from '../ledger/contact-visibility'

describe('Full CRM contacts on mobile', () => {
  it('hides name-only and blank contacts, ignoring generated ledger defaults', () => {
    expect(hasLedgerContactDetails({email:'',phone:'',title:''})).toBe(false)
    expect(hasLedgerContactDetails({email:'  ',phone:' ',title:''})).toBe(false)
  })
  it('keeps contacts with any supplied email, phone or title', () => {
    expect(hasLedgerContactDetails({email:'person@example.com',phone:'',title:''})).toBe(true)
    expect(hasLedgerContactDetails({email:'',phone:'555-0100',title:''})).toBe(true)
    expect(hasLedgerContactDetails({email:'',phone:'',title:'VP of Engineering'})).toBe(true)
  })
})
