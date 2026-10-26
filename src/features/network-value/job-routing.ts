/** Safe, deliberately narrow adapters over the existing verified Capacity Exchange.
 * No private customer data is shared and no customer handoff, payout or alert is implied.
 */
export type JobRoutingMode = 'standard' | 'overflow' | 'urgent'
export type JobPostInput = {
  mode: JobRoutingMode
  kind: 'available' | 'needed'
  title: string
  details: string
  starts: string
  expires: string
  radius: number
  privacyReviewed: boolean
}
const TWO_HOURS = 2 * 60 * 60 * 1000
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
const CONTACT = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)|(?:\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b)|(?:\b\d{1,6}\s+(?:[\w'-]+\s+){0,4}(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?)\b)/i

export function prepareJobPost(input: JobPostInput, now = new Date()) {
  const title = input.title.trim()
  const details = input.details.trim()
  if (!title || !details) throw new Error('Add a job type and high-level service description.')
  if (!Number.isInteger(input.radius) || input.radius < 5 || input.radius > 100)
    throw new Error('Choose a supported search radius.')
  if (input.mode !== 'standard' && !input.privacyReviewed)
    throw new Error('Confirm that your public summary contains no customer identity or contact details.')
  if (input.mode !== 'standard' && CONTACT.test(title + ' ' + details))
    throw new Error('Remove phone numbers, emails and street addresses. Share customer details privately only after their approval.')
  const actualNow = now.getTime()
  if (!Number.isFinite(actualNow)) throw new Error('Could not read the current time.')
  const urgent = input.mode === 'urgent'
  const start = urgent ? new Date(actualNow) : new Date(input.starts)
  const expire = urgent ? new Date(actualNow + TWO_HOURS) : new Date(input.expires)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(expire.getTime()) ||
      expire.getTime() <= actualNow || expire.getTime() <= start.getTime() ||
      expire.getTime() - actualNow > THIRTY_DAYS || start.getTime() < actualNow - 60_000)
    throw new Error('Choose a valid start and expiry within the next 30 days.')
  const label = input.mode === 'overflow' ? 'Overflow job: ' : urgent ? 'Urgent capacity: ' : ''
  if (label.length + title.length > 120 || details.length > 2000)
    throw new Error('Shorten your title or details to fit the capacity exchange.')
  return {
    kind: urgent || input.mode === 'overflow' ? 'needed' as const : input.kind,
    title: label + title,
    details,
    starts_at: start.toISOString(),
    expires_at: expire.toISOString(),
    radius: input.radius,
  }
}
