import type { LedgerContact } from './types'
/** The ledger fills in default company and last-touch data; these are not user-supplied details. */
export function hasLedgerContactDetails(contact: Pick<LedgerContact, 'email' | 'phone' | 'title'>): boolean {
  return [contact.email, contact.phone, contact.title].some(value => typeof value === 'string' && value.trim().length > 0)
}
