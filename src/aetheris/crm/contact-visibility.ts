import type { CrmPerson } from './types'

/** Only user-provided contact details count. Names, lifecycle and import metadata do not. */
export function hasContactDetails(person: Pick<CrmPerson, 'companyName' | 'title' | 'email' | 'phone' | 'location' | 'linkedinUrl' | 'notes'>): boolean {
  return [person.companyName, person.title, person.email, person.phone,
    person.location, person.linkedinUrl, person.notes].some(value => typeof value === 'string' && value.trim().length > 0)
}

/** First visit on a narrow screen hides incomplete contacts; explicit user choice always wins. */
export function initialHideEmptyContacts(savedPreference: string | null, isMobile: boolean): boolean {
  if (savedPreference === '1') return true
  if (savedPreference === '0') return false
  return isMobile
}
