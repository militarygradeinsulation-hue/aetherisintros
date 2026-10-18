/**
 * "Scan LinkedIn profile": the member hands us a profile as LinkedIn itself shows it (the
 * text of the profile page, or LinkedIn's "Save to PDF" export) plus, optionally, its link.
 * Nothing is fetched from LinkedIn. This module cleans that text, reads it into one strict
 * shape, and turns it into reviewable field changes. It never invents a value: anything the
 * text does not state stays empty.
 *
 * Pure and browser-safe: used by the server function, by the demo (which reads on the
 * device), and by the review step.
 */
import { z } from 'zod'

import { normalizeLinkedInUrl, parseLinkedInText } from './linkedin-import'

/** Raw text accepted from the member before cleaning. */
export const MAX_RAW_INPUT = 120_000
/** Cleaned text passed on to the reader. */
export const MAX_SCAN_TEXT = 40_000
export const MIN_SCAN_TEXT = 40

export interface ScannedRole { title: string; company: string; start: string; end: string }

/** The one shape every reader (AI, built-in reader, demo) returns. */
export interface ScannedProfile {
  name: string
  headline: string
  /** Current role title (from the current role, or the role part of the headline). */
  title: string
  company: string
  location: string
  about: string
  industries: string[]
  expertise: string[]
  can_help_with: string
  looking_for: string
  experience: ScannedRole[]
  education: string[]
  linkedin_url: string
}

export type ScanSource = 'ai' | 'parser' | 'demo'

export interface ScanResult {
  scan: ScannedProfile
  source: ScanSource
  /** True when the pasted text was longer than we read. */
  truncated: boolean
}

export const emptyScan = (): ScannedProfile => ({
  name: '', headline: '', title: '', company: '', location: '', about: '', industries: [], expertise: [],
  can_help_with: '', looking_for: '', experience: [], education: [], linkedin_url: '',
})

/* ------------------------------------------------------------------ clean */

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Sections whose content is about other people or other pages: dropped up to the next kept section. */
const DROP_SECTION = /^(people also viewed|people you may know|you might like|more profiles for you|explore premium profiles|explore collaborative articles|other similar profiles|activity|featured|interests|analytics|causes|recommendations|pages for you|suggested for you|promoted|ad options|similar pages|groups)$/i
const KEEP_SECTION = /^(contact|top skills|skills|languages|certifications|licenses & certifications|honors-awards|honors & awards|publications|patents|summary|about|experience|education|volunteer experience|volunteering|projects|providing services|services)$/i
/** Single lines of LinkedIn page furniture. */
const NOISE_LINE = new RegExp([
  '^(skip to (main content|search)|home|my network|jobs|messaging|notifications|me|for business|work|search|learning|post|start a post)$',
  '^(try premium.*|reactivate premium.*|retry premium.*|get hired faster.*|unlock .*premium.*)$',
  '^(background image|profile photo|cover photo|edit (intro|profile|about)|add profile section|enhance profile|resources|more|more actions|open to|message|connect|follow|following|pending|save to pdf|share profile via message|view in sales navigator|report \\/ block|about this profile)$',
  '^(contact info|show all.*|see all.*|show more|show less|…\\s*see more|\\.\\.\\.\\s*see more|see more|see less|show credential|show project|show publication|view (\\d+ )?more.*)$',
  '^\\d[\\d,+]* (connections?|followers?|profile views?|post impressions?|search appearances?|mutual connections?)$',
  '^(·\\s*)?(1st|2nd|3rd\\+?|3rd)$',
  '^(he\\/him|she\\/her|they\\/them|he\\/they|she\\/they)$',
  '^private to you$', '^(discover who.s viewed your profile|see how often you appear in search results|check out who.s engaging with your posts).*$',
  '^endorsed by .*$', '^\\d+ endorsements?$', '^.{1,80} logo$', '^verified$', '^(premium|promoted|ad)$',
  '^(status is (online|reachable|offline)).*$', '^\\d+ notifications?( total)?$',
  '^(visit my website|view my (newsletter|services)|book an appointment)$',
].join('|'), 'i')
/** LinkedIn's page footer: everything from here on is dropped. */
const FOOTER_START = /^(linkedin corporation ©.*|© \d{4} linkedin.*|accessibility|talent solutions|community guidelines|privacy & terms.*|ad choices)$/i

export interface CleanedText { text: string; truncated: boolean; removed: number }

/**
 * Strips page furniture from a copied profile page or PDF text: navigation, buttons, counts,
 * other people's profiles ("People also viewed"…), posts, the footer and repeated lines.
 */
export function cleanProfileText(raw: string): CleanedText {
  const input = (typeof raw === 'string' ? raw : '').slice(0, MAX_RAW_INPUT)
  // Invisible characters LinkedIn inserts, and Windows line ends.
  const lines = input.replace(/[​-‏⁠﻿]/g, '').split(/\r?\n/).map(squash)
  const kept: string[] = []
  let removed = 0
  let dropping = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (!line) continue
    // The footer begins with "About" followed by "Accessibility" — not the member's About.
    if (FOOTER_START.test(line) || (/^about$/i.test(line) && /^accessibility$/i.test(lines.slice(i + 1).find(Boolean) ?? ''))) {
      removed += lines.slice(i).filter(Boolean).length
      break
    }
    if (DROP_SECTION.test(line)) { dropping = true; removed++; continue }
    if (KEEP_SECTION.test(line)) dropping = false
    if (dropping || NOISE_LINE.test(line)) { removed++; continue }
    // The page repeats visible text for screen readers: keep one copy.
    if (kept[kept.length - 1] === line) { removed++; continue }
    // "San Francisco Bay Area · Contact info" → the location.
    kept.push(line.replace(/\s*·\s*contact info$/i, ''))
  }
  const text = kept.join('\n')
  if (text.length <= MAX_SCAN_TEXT) return { text, truncated: false, removed }
  const cut = text.slice(0, MAX_SCAN_TEXT)
  return { text: cut.slice(0, Math.max(cut.lastIndexOf('\n'), MAX_SCAN_TEXT - 200)), truncated: true, removed }
}

/* ------------------------------------------------------------------ dates */

/** "Jan 2020 - Present · 4 yrs" → { start: 'Jan 2020', end: 'Present' }. */
export function splitDates(dates: string): { start: string; end: string } {
  const plain = squash(dates.replace(/\(.*?\)/g, '').replace(/\s·\s.*$/, ''))
  const [start, end] = plain.split(/\s*[-–—]\s*/)
  return { start: squash(start ?? ''), end: squash(end ?? '') }
}

/* --------------------------------------------------------- built-in reader */

const currentRole = (experience: ScannedRole[]) => experience.find(r => /present|now|current/i.test(r.end)) ?? experience[0]
const headlineRole = (headline: string) => squash(headline.split(/\s+(?:at|@)\s+|\s*[|·•]\s*/)[0] ?? '')

/** The built-in reader: used when AI extraction is unavailable, and in the demo. */
export function parseScanText(rawText: string, hints: { nameHint?: string | undefined; url?: string | undefined } = {}): ScanResult {
  const cleaned = cleanProfileText(rawText)
  const li = parseLinkedInText(cleaned.text, hints.nameHint ? { name: hints.nameHint } : {})
  const experience = li.experience.slice(0, 20).map(r => ({ title: r.title, company: r.company, ...splitDates(r.dates) }))
  const now = currentRole(experience)
  const services = sectionLines(cleaned.text, /^(providing services|services)$/i)
  const scan: ScannedProfile = {
    ...emptyScan(),
    name: li.name,
    headline: li.headline,
    title: now?.title || headlineRole(li.headline),
    company: now?.company ?? '',
    location: li.location,
    about: li.about,
    expertise: li.skills.slice(0, 20),
    can_help_with: services.join(', ').slice(0, 600),
    experience,
    education: li.education,
    linkedin_url: linkedInUrlFrom(hints.url, cleaned.text),
  }
  return { scan: validateScan(scan) ?? emptyScan(), source: 'parser', truncated: cleaned.truncated }
}

function sectionLines(text: string, heading: RegExp): string[] {
  const lines = text.split('\n')
  const at = lines.findIndex(l => heading.test(l))
  if (at < 0) return []
  const out: string[] = []
  for (const line of lines.slice(at + 1)) {
    if (KEEP_SECTION.test(line)) break
    for (const part of line.split(/\s+•\s+|\s+·\s+/)) if (part.length <= 80) out.push(part)
  }
  return [...new Set(out)].slice(0, 12)
}

/** The member's link wins; otherwise a profile link stated in the text (the PDF's Contact section). */
export function linkedInUrlFrom(url: string | undefined, text: string): string {
  const given = url?.trim() ? normalizeLinkedInUrl(url) : null
  if (given) return given
  const found = text.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[^\s)]+/i)?.[0]
  return found ? normalizeLinkedInUrl(found) ?? '' : ''
}

/* --------------------------------------------------------- strict validation */

const str = (max: number) => z.preprocess(v => (typeof v === 'string' ? squash(v).slice(0, max) : ''), z.string())
const list = (max: number, each = 120) => z.preprocess(v => {
  if (!Array.isArray(v)) return []
  const seen = new Map<string, string>()
  for (const item of v) {
    const t = typeof item === 'string' ? squash(item).slice(0, each) : ''
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t)
  }
  return [...seen.values()].slice(0, max)
}, z.array(z.string()))

const RoleSchema = z.preprocess(v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}), z.object({
  title: str(140), company: str(140), start: str(40), end: str(40),
}).strip())

/** Unknown keys are dropped, every value is trimmed and capped, wrong types become empty. */
export const ScanSchema = z.object({
  name: str(120),
  headline: str(220),
  title: str(140),
  company: str(140),
  location: str(140),
  about: str(2600),
  industries: list(8, 60),
  expertise: list(20, 60),
  can_help_with: str(600),
  looking_for: str(600),
  experience: z.preprocess(v => (Array.isArray(v) ? v.slice(0, 20) : []), z.array(RoleSchema)),
  education: list(8, 160),
  linkedin_url: z.preprocess(v => (typeof v === 'string' ? normalizeLinkedInUrl(v) ?? '' : ''), z.string()),
}).strip()

export function validateScan(value: unknown): ScannedProfile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const parsed = ScanSchema.safeParse(value)
  if (!parsed.success) return null
  return { ...parsed.data, experience: parsed.data.experience.filter(r => r.title || r.company) }
}

/** Reads the AI's answer: the first JSON object in it, validated. Anything else → null. */
export function parseScanJson(answer: string): ScannedProfile | null {
  const json = answer.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return null
  try { return validateScan(JSON.parse(json)) } catch { return null }
}

/* ------------------------------------------------------- never invent */

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** True when the value (or, for long text, its opening) appears in the source text. */
export function statedIn(value: string, source: string): boolean {
  const v = norm(value)
  if (!v) return false
  const s = ` ${norm(source)} `
  if (v.length <= 60) return s.includes(` ${v} `)
  return s.includes(v.slice(0, 40))
}

/** Drops any AI value the source text does not state. */
export function groundScan(scan: ScannedProfile, source: string): ScannedProfile {
  const keep = (v: string) => (statedIn(v, source) ? v : '')
  const keepAll = (items: string[]) => items.filter(i => statedIn(i, source))
  return {
    name: keep(scan.name),
    headline: keep(scan.headline),
    title: keep(scan.title),
    company: keep(scan.company),
    location: keep(scan.location),
    about: keep(scan.about),
    industries: keepAll(scan.industries),
    expertise: keepAll(scan.expertise),
    can_help_with: keep(scan.can_help_with),
    looking_for: keep(scan.looking_for),
    experience: scan.experience.filter(r => (!r.title || statedIn(r.title, source)) && (!r.company || statedIn(r.company, source))),
    education: keepAll(scan.education),
    linkedin_url: scan.linkedin_url,
  }
}

/** AI values win where present; the built-in reader fills any gaps. */
export function mergeScans(ai: ScannedProfile | null, parsed: ScannedProfile): ScannedProfile {
  if (!ai) return parsed
  const pick = <K extends keyof ScannedProfile>(k: K): ScannedProfile[K] => {
    const a = ai[k]
    return (Array.isArray(a) ? a.length : a) ? a : parsed[k]
  }
  return {
    name: pick('name'), headline: pick('headline'), title: pick('title'), company: pick('company'), location: pick('location'),
    about: pick('about'), industries: pick('industries'), expertise: pick('expertise'), can_help_with: pick('can_help_with'),
    looking_for: pick('looking_for'), experience: pick('experience'), education: pick('education'), linkedin_url: parsed.linkedin_url || ai.linkedin_url,
  }
}

export const LINKEDIN_SCAN_PROMPT = `You read one person's LinkedIn profile, given as the text of their profile page or of LinkedIn's "Save to PDF" export, and return their details as JSON.

Rules:
- Use only what the text states, copied as written. Never guess, infer, summarise or invent. Leave a field empty ("" or []) when the text does not state it.
- Ignore page furniture and other people: navigation, buttons, ads, "People also viewed", "People you may know", posts and activity, endorsements, contact details, page numbers.
- "title" and "company" are the current role. "headline" is the line under the name.
- "industries" only when the text names industries. "expertise" is the listed skills.
- "can_help_with" only from a stated services section or an explicit "I help…" sentence. "looking_for" only from an explicit statement of what they are looking for or hiring. Otherwise "".
- "experience" is newest first; "start" and "end" as written (e.g. "Jan 2020", "Present").
- Answer with the JSON object only.

Shape:
{"name":"","headline":"","title":"","company":"","location":"","about":"","industries":[],"expertise":[],"can_help_with":"","looking_for":"","experience":[{"title":"","company":"","start":"","end":""}],"education":[],"linkedin_url":""}`

/* ----------------------------------------------------------- review step */

/** Every field a scan can fill, across the profile, onboarding and contact forms. */
export type ScanKey =
  | 'name' | 'title' | 'company' | 'location' | 'headline' | 'about' | 'focus'
  | 'industries' | 'expertise' | 'can_help_with' | 'looking_for' | 'linkedin_url'

export const SCAN_LABELS: Record<ScanKey, string> = {
  name: 'Name',
  title: 'Title',
  company: 'Company',
  location: 'Location',
  headline: 'Headline',
  about: 'About',
  focus: 'Current focus',
  industries: 'Industries',
  expertise: 'Expertise',
  can_help_with: 'Can help with',
  looking_for: 'Looking for',
  linkedin_url: 'LinkedIn link',
}

export const LIST_KEYS: ScanKey[] = ['industries', 'expertise']
export const LONG_KEYS: ScanKey[] = ['about', 'focus', 'can_help_with', 'looking_for', 'headline']

export const PROFILE_KEYS: ScanKey[] = ['name', 'title', 'company', 'location', 'headline', 'about', 'industries', 'expertise', 'can_help_with', 'looking_for', 'linkedin_url']
export const ONBOARDING_KEYS: ScanKey[] = ['name', 'title', 'company', 'location', 'looking_for', 'can_help_with', 'industries', 'expertise', 'linkedin_url']
export const CONTACT_KEYS: ScanKey[] = ['name', 'title', 'company', 'location', 'linkedin_url', 'about', 'expertise']

const sentence = (s: string, max: number) => {
  const t = squash(s)
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return (end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`).trim()
}

/** A scan as plain strings per field (lists comma-separated). Empty when the profile did not say. */
export function scanValues(scan: ScannedProfile, focusText = ''): Record<ScanKey, string> {
  return {
    name: scan.name,
    title: scan.title || headlineRole(scan.headline),
    company: scan.company,
    location: scan.location,
    headline: scan.headline,
    about: scan.about,
    focus: sentence(focusText, 400),
    industries: scan.industries.join(', '),
    expertise: scan.expertise.join(', '),
    can_help_with: scan.can_help_with,
    looking_for: scan.looking_for,
    linkedin_url: scan.linkedin_url,
  }
}

export interface ReviewRow { key: ScanKey; label: string; current: string; incoming: string; differs: boolean }

const same = (a: string, b: string) => norm(a) === norm(b)

/** One row per field: what is there now, what the profile says, and whether they differ. */
export function buildReviewRows(keys: ScanKey[], incoming: Partial<Record<ScanKey, string>>, current: Partial<Record<ScanKey, string>>, labels: Partial<Record<ScanKey, string>> = {}): ReviewRow[] {
  return keys.map(key => {
    const next = squash(incoming[key] ?? '')
    const now = squash(current[key] ?? '')
    return { key, label: labels[key] ?? SCAN_LABELS[key], current: now, incoming: next, differs: Boolean(next) && !same(next, now) }
  })
}

/** Ticked by default: only fields the profile states that differ from what is there. */
export const defaultChecked = (rows: ReviewRow[]) => new Set(rows.filter(r => r.differs).map(r => r.key))

/** Only ticked, non-empty fields, with the member's edits. Nothing else is written. */
export function checkedPatch(rows: ReviewRow[], checked: Set<ScanKey>, edits: Partial<Record<ScanKey, string>> = {}): Partial<Record<ScanKey, string>> {
  const out: Partial<Record<ScanKey, string>> = {}
  for (const row of rows) {
    if (!checked.has(row.key)) continue
    const value = squash(edits[row.key] ?? row.incoming)
    if (value) out[row.key] = value
  }
  return out
}

export const splitList = (v: string) => [...new Set(v.split(/[,;\n]+/).map(squash).filter(Boolean))].slice(0, 20)

/** public.profiles columns for a checked patch. */
export function profileColumns(patch: Partial<Record<ScanKey, string>>): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  if (patch.name) {
    out['name'] = patch.name
    out['initials'] = patch.name.split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase() || 'M'
  }
  if (patch.title) out['title'] = patch.title
  if (patch.company) out['company'] = patch.company
  if (patch.location) out['location'] = patch.location
  if (patch.headline) out['thesis'] = patch.headline
  if (patch.about) { out['bio'] = patch.about; out['what_i_do'] = patch.about }
  if (patch.focus) { out['focus'] = patch.focus; out['building'] = patch.focus }
  if (patch.industries) out['industries'] = splitList(patch.industries)
  if (patch.expertise) out['expertise'] = splitList(patch.expertise)
  if (patch.can_help_with) out['can_help_with'] = patch.can_help_with
  if (patch.looking_for) out['looking_for'] = patch.looking_for
  if (patch.linkedin_url) {
    const url = normalizeLinkedInUrl(patch.linkedin_url)
    if (url) out['linkedin_url'] = url
  }
  return out
}

/** Where the review came from, in plain words. */
export function sourceLabel(source: ScanSource): string {
  if (source === 'demo') return 'Demo: read on this device by the built-in reader. No AI, and nothing leaves your browser.'
  if (source === 'parser') return 'Read by the built-in reader (AI reading is not set up). Check each field.'
  return 'Read by AI from the text you added. Values the text does not state were left empty.'
}
