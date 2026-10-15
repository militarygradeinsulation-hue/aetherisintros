/**
 * LinkedIn profile import: a member pastes their LinkedIn link and gives us their profile in
 * a form LinkedIn itself provides (the "Save to PDF" export, or the text of their profile
 * page). We read only what they hand us — nothing is fetched from LinkedIn — and turn it into
 * Ask Intros profile fields for them to review before anything is saved.
 *
 * Pure: the parser is the fallback when AI extraction is unavailable, and the shared shape
 * both paths produce.
 */

export interface LinkedInRole {
  title: string
  company: string
  dates: string
  location: string
  description: string
}

export interface LinkedInProfile {
  name: string
  headline: string
  location: string
  about: string
  experience: LinkedInRole[]
  education: string[]
  skills: string[]
  languages: string[]
  certifications: string[]
}

/** The Ask Intros profile fields an import can fill. */
export interface ImportedFields {
  name: string
  title: string
  company: string
  location: string
  thesis: string
  whatIDo: string
  building: string
  canHelpWith: string
  expertise: string[]
  industries: string[]
}

export const IMPORT_FIELD_LABELS: Record<keyof ImportedFields, string> = {
  name: 'Name',
  title: 'Headline / title',
  company: 'Company',
  location: 'Location',
  thesis: 'Professional headline',
  whatIDo: 'What I actually do',
  building: 'What I’m building',
  canHelpWith: 'Can help with',
  expertise: 'Expertise',
  industries: 'Industries',
}

export const emptyLinkedInProfile = (): LinkedInProfile => ({
  name: '', headline: '', location: '', about: '', experience: [], education: [], skills: [], languages: [], certifications: [],
})

/** Canonical https://www.linkedin.com/in/<handle> for a pasted profile link, or null. */
export function normalizeLinkedInUrl(input: string): string | null {
  let value = input.trim()
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`
  let url: URL
  if (value.length > 300 || /[\s\\]/.test(value)) return null
  try { url = new URL(value) } catch { return null }
  if (url.username || url.password || url.port) return null
  if (!/^(www|[a-z]{2})\.linkedin\.com$|^linkedin\.com$/i.test(url.hostname)) return null
  const match = url.pathname.match(/^\/in\/([^/?#]+)\/?/i)
  if (!match) return null
  let handle: string
  try { handle = decodeURIComponent(match[1]!) } catch { return null }
  if (!/^[\p{L}\p{N}\-_.]{3,100}$/u.test(handle)) return null
  const encoded = encodeURIComponent(handle)
  return encoded.length <= 200 ? `https://www.linkedin.com/in/${encoded}` : null
}

/** Only LinkedIn's own image host may be fetched for a profile photo. */
export function isLinkedInPhotoUrl(input: string): boolean {
  try {
    const url = new URL(input.trim())
    return url.protocol === 'https:' && /^media(-exp\d+)?\.licdn\.com$/i.test(url.hostname) && url.pathname.startsWith('/dms/image/')
  } catch { return false }
}

const SECTION = /^(contact|top skills|skills|languages|certifications|honors-awards|honors & awards|publications|patents|summary|about|experience|education|volunteer experience|projects|recommendations|interests|activity|licenses & certifications)$/i
const DATE_LINE = /^((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}\s*[-–—]\s*(present|((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4})(\s*[(·].*)?$/i
const PAGE_FOOTER = /^page \d+ of \d+$/i
const EMPLOYMENT = 'full-time|part-time|self-employed|freelance|contract|internship|apprenticeship|seasonal'
const EMPLOYER_LINE = new RegExp(`^(.{1,100}?)\\s+·\\s+(${EMPLOYMENT})$`, 'i')
const TENURE_LINE = new RegExp(`^((${EMPLOYMENT})\\s+·\\s+)?\\d+\\s+yrs?\\b.*$|^(${EMPLOYMENT})\\s+·\\s+\\d+\\s+mos?\\b.*$`, 'i')
const NOISE = /(www\.linkedin\.com\/in\/|^\(linkedin\)$|@|^\+?\d[\d\s().-]{6,}$|\(mobile\)|\(work\)|\(home\)|\(personal\)|\(company\))/i

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
const unique = (items: string[]) => [...new Map(items.map(i => [i.toLowerCase(), i])).values()]

/**
 * Best-effort reading of LinkedIn's "Save to PDF" text (or a copied profile page): section
 * headings split the document; the name is the largest text when the PDF reader knows it.
 */
export function parseLinkedInText(text: string, hints: { name?: string } = {}): LinkedInProfile {
  const lines = text.split(/\r?\n/).map(clean).filter(l => l && !PAGE_FOOTER.test(l))
  const out = emptyLinkedInProfile()
  const sections = new Map<string, string[]>()
  const lead: string[] = []
  let current: string | null = null
  for (const line of lines) {
    if (SECTION.test(line)) { current = line.toLowerCase(); if (!sections.has(current)) sections.set(current, []); continue }
    if (current) sections.get(current)!.push(line)
    else lead.push(line)
  }
  const take = (...names: string[]) => names.flatMap(n => sections.get(n) ?? [])

  // In LinkedIn's PDF the sidebar (contact, skills…) comes first and the name, headline and
  // location open the main column, which reads as the tail of the last sidebar section.
  const name = clean(hints.name ?? '')
  let mainStart: string[] = []
  if (name) {
    for (const [key, body] of sections) {
      const at = body.findIndex(l => l === name)
      if (at >= 0) { mainStart = body.slice(at); sections.set(key, body.slice(0, at)); break }
    }
    if (!mainStart.length) {
      const at = lead.findIndex(l => l === name)
      if (at >= 0) mainStart = lead.slice(at)
    }
  } else {
    mainStart = lead.filter(l => !NOISE.test(l))
  }
  out.name = mainStart[0] ?? name
  out.headline = mainStart[1] ?? ''
  out.location = mainStart.slice(2).find(l => l.length < 80 && /,|area|remote|united|kingdom|states/i.test(l)) ?? mainStart[2] ?? ''

  out.about = take('summary', 'about').join(' ').slice(0, 2600)
  out.skills = unique(take('top skills', 'skills').filter(l => l.length <= 60 && !NOISE.test(l)))
  out.languages = unique(take('languages').map(l => l.replace(/\s*\(.*\)$/, '')).filter(Boolean))
  out.certifications = unique(take('certifications', 'licenses & certifications').filter(l => l.length <= 120))
  out.education = take('education').filter(l => !DATE_LINE.test(l) && !/^\(?\d{4}/.test(l)).slice(0, 6)
  out.experience = parseExperience(take('experience'))
  return out
}

/** Experience reads company, then title, then a date line, then location and description. */
function parseExperience(lines: string[]): LinkedInRole[] {
  const roles: LinkedInRole[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!DATE_LINE.test(lines[i]!)) continue
    let title = lines[i - 1] ?? ''
    let above = lines[i - 2] ?? ''
    // A copied profile page reads "Title" then "Company · Full-time" (the PDF reads company, then title).
    const typed = title.match(EMPLOYER_LINE)
    if (typed) { title = above; above = typed[1]! }
    // Several roles at one company: "Company" then "Full-time · 6 yrs" above the first title.
    else if (TENURE_LINE.test(above)) above = lines[i - 3] ?? ''
    // "Company" sits above the title unless the line above is another role's text.
    const company = above && !DATE_LINE.test(above) && above.length < 80 ? above : (roles[roles.length - 1]?.company ?? '')
    const rest: string[] = []
    let j = i + 1
    for (; j < lines.length; j++) {
      if (lines[j + 1] !== undefined && DATE_LINE.test(lines[j + 1]!)) break
      if (lines[j + 2] !== undefined && DATE_LINE.test(lines[j + 2]!) && lines[j]!.length < 80) break
      if (lines[j + 3] !== undefined && DATE_LINE.test(lines[j + 3]!) && TENURE_LINE.test(lines[j + 1] ?? '')) break
      rest.push(lines[j]!)
    }
    const location = rest[0] && rest[0].length < 70 && /,|remote|area|united|kingdom|states/i.test(rest[0]) ? rest.shift()! : ''
    roles.push({ title, company, dates: lines[i]!, location, description: rest.join(' ').slice(0, 1200) })
    i = j - 1
  }
  return roles
}

const sentence = (s: string, max: number) => {
  const t = clean(s)
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return (end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`).trim()
}

/** Turn a LinkedIn profile into Ask Intros profile fields. Only what the profile states. */
export function profileFieldsFrom(li: LinkedInProfile): ImportedFields {
  const current = li.experience.find(r => /present/i.test(r.dates)) ?? li.experience[0]
  const headlineRole = li.headline.split(/\s+(?:at|@)\s+|\s*[|·]\s*/)[0] ?? ''
  return {
    name: clean(li.name),
    title: clean(current?.title || headlineRole).slice(0, 140),
    company: clean(current?.company ?? '').slice(0, 140),
    location: clean(li.location).slice(0, 140),
    thesis: clean(li.headline).slice(0, 220),
    whatIDo: sentence(li.about || li.headline, 600),
    building: sentence(current?.description || '', 600),
    canHelpWith: li.skills.slice(0, 8).join(', '),
    expertise: li.skills.slice(0, 12),
    industries: [],
  }
}

/** Accepts the AI's JSON answer, keeping only well-typed fields. */
export function parseAiProfile(answer: string): LinkedInProfile | null {
  const json = answer.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return null
  let raw: Record<string, unknown>
  try { raw = JSON.parse(json) as Record<string, unknown> } catch { return null }
  const str = (v: unknown, max = 3000) => (typeof v === 'string' ? clean(v).slice(0, max) : '')
  const list = (v: unknown, max = 30) => (Array.isArray(v) ? unique(v.map(x => str(x, 120)).filter(Boolean)).slice(0, max) : [])
  const roles = Array.isArray(raw['experience']) ? raw['experience'] : []
  return {
    name: str(raw['name'], 120),
    headline: str(raw['headline'], 220),
    location: str(raw['location'], 140),
    about: str(raw['about'], 2600),
    experience: roles.slice(0, 20).map(r => {
      const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>
      return { title: str(o['title'], 140), company: str(o['company'], 140), dates: str(o['dates'], 80), location: str(o['location'], 140), description: str(o['description'], 1200) }
    }).filter(r => r.title || r.company),
    education: list(raw['education'], 8),
    skills: list(raw['skills'], 30),
    languages: list(raw['languages'], 10),
    certifications: list(raw['certifications'], 15),
  }
}

/** AI fields win where present; the parser fills any gaps. */
export function mergeProfiles(ai: LinkedInProfile | null, parsed: LinkedInProfile): LinkedInProfile {
  if (!ai) return parsed
  return {
    name: ai.name || parsed.name,
    headline: ai.headline || parsed.headline,
    location: ai.location || parsed.location,
    about: ai.about || parsed.about,
    experience: ai.experience.length ? ai.experience : parsed.experience,
    education: ai.education.length ? ai.education : parsed.education,
    skills: ai.skills.length ? ai.skills : parsed.skills,
    languages: ai.languages.length ? ai.languages : parsed.languages,
    certifications: ai.certifications.length ? ai.certifications : parsed.certifications,
  }
}

export const LINKEDIN_EXTRACT_PROMPT = `You read a person's LinkedIn profile, given as the text of LinkedIn's "Save to PDF" export or of their profile page, and return their details as JSON.

Rules:
- Use only what the text states. Never guess, infer or invent anything. Leave a field empty ("" or []) when the text does not state it.
- Ignore page furniture: navigation, ads, "People also viewed", other people's names, contact details, page numbers.
- "experience" is newest first. "dates" as written (e.g. "Jan 2020 - Present · 4 yrs").
- "skills" are the listed skills (Top Skills / Skills), not words from descriptions.
- Answer with the JSON object only.

Shape:
{"name":"","headline":"","location":"","about":"","experience":[{"title":"","company":"","dates":"","location":"","description":""}],"education":[""],"skills":[""],"languages":[""],"certifications":[""]}`


/* ------------------------------------------------------------------ reviewed URL/public-info bridge */

/** What a licensed LinkedIn URL provider may return. No provider is connected by default. */
export type UrlScanResult =
  | { status: 'blocked'; reason: string }
  | { status: 'ok'; profile: LinkedInProfile }

export interface LinkedInUrlProvider {
  id: string
  available: boolean
  unavailableReason: string
  fetchProfile: (canonicalUrl: string) => Promise<LinkedInProfile>
}

export const URL_SCAN_BLOCKED_REASON =
  'Scanning from a link is not available yet: no authorized LinkedIn data source is connected. Paste your profile text or add your LinkedIn PDF instead.'

export const NO_URL_PROVIDER: LinkedInUrlProvider = {
  id: 'none',
  available: false,
  unavailableReason: URL_SCAN_BLOCKED_REASON,
  fetchProfile: async () => { throw new Error(URL_SCAN_BLOCKED_REASON) },
}

export async function scanLinkedInUrl(input: string, provider: LinkedInUrlProvider = NO_URL_PROVIDER): Promise<UrlScanResult> {
  const url = normalizeLinkedInUrl(input)
  if (!url) return { status: 'blocked', reason: 'That is not a LinkedIn personal profile link. It looks like linkedin.com/in/your-name.' }
  if (!provider.available) return { status: 'blocked', reason: provider.unavailableReason }
  try {
    return { status: 'ok', profile: await provider.fetchProfile(url) }
  } catch {
    return { status: 'blocked', reason: provider.unavailableReason }
  }
}

export type FieldProvenance = 'ai' | 'parser' | 'public'

export interface LinkedInExtraction {
  linkedinUrl: string | null
  profile: LinkedInProfile
  fields: ImportedFields
  source: 'ai' | 'parser'
  provenance: Partial<Record<keyof ImportedFields, FieldProvenance>>
}

export const emptyImportedFields = (): ImportedFields => ({
  name: '', title: '', company: '', location: '', thesis: '', whatIDo: '', building: '',
  canHelpWith: '', expertise: [], industries: [],
})

export function fieldProvenance(merged: ImportedFields, parsed: ImportedFields): Partial<Record<keyof ImportedFields, FieldProvenance>> {
  const out: Partial<Record<keyof ImportedFields, FieldProvenance>> = {}
  for (const key of Object.keys(merged) as (keyof ImportedFields)[]) {
    const mergedValue = merged[key]
    const parsedValue = parsed[key]
    const empty = Array.isArray(mergedValue) ? mergedValue.length === 0 : !mergedValue
    if (!empty) out[key] = JSON.stringify(mergedValue) === JSON.stringify(parsedValue) ? 'parser' : 'ai'
  }
  return out
}

export function extractionFromProfile(profile: LinkedInProfile, linkedinUrl: string | null): LinkedInExtraction {
  const fields = profileFieldsFrom(profile)
  return { linkedinUrl, profile, fields, source: 'parser', provenance: fieldProvenance(fields, fields) }
}

export const emptyExtraction = (): LinkedInExtraction => extractionFromProfile(emptyLinkedInProfile(), null)

export type LinkHandling =
  | { kind: 'none' }
  | { kind: 'invalid'; message: string }
  | { kind: 'needs-document'; url: string; message: string }

export function describeLinkHandling(input: string): LinkHandling {
  if (!input.trim()) return { kind: 'none' }
  const url = normalizeLinkedInUrl(input)
  if (!url) return { kind: 'invalid', message: 'That is not a LinkedIn personal profile link. It looks like linkedin.com/in/your-name.' }
  return {
    kind: 'needs-document',
    url,
    message: 'Link saved for your profile. We can’t read a profile from a link alone, because LinkedIn doesn’t allow it. Upload your LinkedIn PDF or paste your profile text to fill in the rest.',
  }
}

export function createRateLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>()
  return (key: string): boolean => {
    const t = now()
    const recent = (hits.get(key) ?? []).filter(x => t - x < windowMs)
    if (recent.length >= max) { hits.set(key, recent); return false }
    recent.push(t)
    hits.set(key, recent)
    if (hits.size > 5000) {
      for (const [storedKey, values] of hits) if (!values.some(x => t - x < windowMs)) hits.delete(storedKey)
    }
    return true
  }
}
