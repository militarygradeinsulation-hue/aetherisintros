/**
 * Minimal, first party acquisition hints for email signups.
 *
 * Only public landing paths and broad traffic categories are kept. Never store
 * full referring URLs, search queries, UTM terms/content, or identifiers. These
 * hints are client supplied and MUST NOT be used for permissions, billing,
 * claims of proven conversion or security decisions.
 */
export type AcquisitionHint = {
  version: 1
  source: string
  medium: string
  landing_path: string
  campaign?: string
}

export const ACQUISITION_SESSION_KEY = 'ask-intros:initial-acquisition:v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const ENTRY_PATHS = new Set([
  '/', '/how-it-works', '/warm-introductions', '/active-memory',
  '/executive-networking', '/relationship-intelligence', '/ai-networking-assistant',
  '/business-relationship-crm', '/social-business-views', '/early-access',
  '/founder-story', '/warm-introduction-playbook', '/auth',
])

const SOURCES = new Set([
  'google', 'bing', 'chatgpt', 'perplexity', 'gemini',
  'linkedin', 'facebook', 'instagram', 'x', 'youtube',
  'email', 'newsletter', 'partner', 'referral',
])
const MEDIUMS = new Set(['organic', 'cpc', 'paid', 'social', 'email', 'referral', 'campaign'])

const normalizeToken = (value: string | null): string => {
  const token = (value || '').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(token) ? token : ''
}
const isHost = (hostname: string, domain: string) =>
  hostname === domain || hostname.endsWith('.' + domain)

function referrerCategory(referrer: string, hostname: string): { source: string; medium: string } {
  if (!referrer) return { source: 'direct', medium: 'none' }
  try {
    const url = new URL(referrer)
    if (!['https:', 'http:'].includes(url.protocol)) return { source: 'direct', medium: 'none' }
    if (url.hostname === hostname) return { source: 'direct', medium: 'none' }
    const host = url.hostname.toLowerCase()
    if (isHost(host, 'google.com') || isHost(host, 'google.co.uk') ||
        isHost(host, 'google.ca')) return { source: 'google', medium: 'organic' }
    if (isHost(host, 'bing.com')) return { source: 'bing', medium: 'organic' }
    if (isHost(host, 'chatgpt.com') || isHost(host, 'chat.openai.com')) return { source: 'chatgpt', medium: 'referral' }
    if (isHost(host, 'perplexity.ai')) return { source: 'perplexity', medium: 'referral' }
    if (isHost(host, 'gemini.google.com')) return { source: 'gemini', medium: 'referral' }
    if (isHost(host, 'linkedin.com')) return { source: 'linkedin', medium: 'social' }
    if (isHost(host, 'facebook.com') || isHost(host, 'instagram.com')) return { source: 'social', medium: 'social' }
    return { source: 'other-referral', medium: 'referral' }
  } catch {
    return { source: 'direct', medium: 'none' }
  }
}

function validHint(value: unknown): value is AcquisitionHint {
  if (!value || typeof value !== 'object') return false
  const hint = value as Record<string, unknown>
  return hint['version'] === 1 &&
    typeof hint['source'] === 'string' &&
    (SOURCES.has(hint['source']) || ['direct', 'social', 'other-referral', 'other-campaign'].includes(hint['source'])) &&
    typeof hint['medium'] === 'string' &&
    (MEDIUMS.has(hint['medium']) || hint['medium'] === 'none') &&
    typeof hint['landing_path'] === 'string' && ENTRY_PATHS.has(hint['landing_path']) &&
    (hint['campaign'] === undefined || (typeof hint['campaign'] === 'string' && Boolean(normalizeToken(hint['campaign']))))
}

export function readInitialAcquisition(store: StorageLike): AcquisitionHint | null {
  try {
    const raw = store.getItem(ACQUISITION_SESSION_KEY)
    if (!raw || raw.length > 600) return null
    const parsed: unknown = JSON.parse(raw)
    return validHint(parsed) ? parsed : null
  } catch { return null }
}

export function captureInitialAcquisition(
  location: { pathname: string; search: string; hostname: string },
  referrer: string,
  store: StorageLike,
): AcquisitionHint | null {
  const existing = readInitialAcquisition(store)
  if (existing) return existing
  // The first entry page must be part of the publicly documented experience.
  if (!ENTRY_PATHS.has(location.pathname)) return null
  const referral = referrerCategory(referrer, location.hostname)
  const query = new URLSearchParams(location.search)
  const taggedSource = normalizeToken(query.get('utm_source'))
  const source = SOURCES.has(taggedSource) ? taggedSource : taggedSource ? 'other-campaign' : referral.source
  const taggedMedium = normalizeToken(query.get('utm_medium'))
  const medium = taggedSource
    ? MEDIUMS.has(taggedMedium) ? taggedMedium : 'campaign'
    : referral.medium
  const campaign = normalizeToken(query.get('utm_campaign'))
  const hint: AcquisitionHint = {
    version: 1,
    source, medium, landing_path: location.pathname,
    ...(taggedSource && campaign ? { campaign } : {}),
  }
  try { store.setItem(ACQUISITION_SESSION_KEY, JSON.stringify(hint)) } catch { /* storage blocked */ }
  return hint
}

/** Untrusted source hints for opt-in email registration metadata only. */
export function acquisitionSignupMetadata(store: StorageLike): Record<string, string> {
  const hint = readInitialAcquisition(store)
  if (!hint) return {}
  return {
    acquisition_source: hint.source,
    acquisition_medium: hint.medium,
    acquisition_landing_page: hint.landing_path,
    ...(hint.campaign ? { acquisition_campaign: hint.campaign } : {}),
  }
}
