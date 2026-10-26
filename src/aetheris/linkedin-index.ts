/**
 * Mindprint-style indexed public LinkedIn lookup: pure identity and evidence checks.
 * No LinkedIn session cookies, private pages, credentials or live page scraping.
 * Every proposed field is reviewed by the member before owner-scoped saving.
 */
import { normalizeLinkedInUrl } from './linkedin-import'
import { emptyScan, type ScannedProfile } from './linkedin-scan'
import { isSafeSourceUrl, belongsToMember } from './public-info'

export interface IndexedHit {
  url: string
  title: string
  snippet: string
}
export interface IndexedSource extends IndexedHit {
  kind: 'linkedin-index' | 'public-professional'
}

const clean = (s: unknown, max = 800): string => typeof s === 'string'
  ? s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
const norm = (s: string): string => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Public-index links must identify the same exact member slug as the submitted URL. */
export function sameIndexedLinkedInProfile(hitUrl: string, memberUrl: string): boolean {
  const wanted = normalizeLinkedInUrl(memberUrl)
  const found = normalizeLinkedInUrl(hitUrl)
  return Boolean(wanted && found && wanted.toLowerCase() === found.toLowerCase())
}

export function indexedProfileName(title: string): string {
  const name = clean(title, 240).replace(/\s+[|–-]\s+LinkedIn.*$/i, '').split(/\s+[-–|]\s+/)[0]?.trim() ?? ''
  if (name.length < 4 || name.length > 120 || name.split(/\s+/).length < 2 ||
      /\b(?:jobs|search|profile|linkedin)\b/i.test(name)) return ''
  return name
}

/** Conservative alias check, allowing Joe/Joseph with the same surname but not another surname. */
export function isMatchingOwnerName(savedName: string, resultName: string): boolean {
  const own = norm(savedName).split(' ').filter(Boolean)
  const scanned = norm(resultName).split(' ').filter(Boolean)
  if (!own.length || /^(member|demo|your)\b/i.test(savedName.trim())) return true
  if (own.length < 2 || scanned.length < 2) return false
  if (own[own.length - 1] !== scanned[scanned.length - 1]) return false
  if (own.join(' ') === scanned.join(' ')) return true
  const first = own[0] ?? '', candidate = scanned[0] ?? ''
  const knownNicknames = [
    ['joe', 'joseph'], ['bob', 'robert'], ['bill', 'william'],
    ['mike', 'michael'], ['liz', 'elizabeth'], ['kate', 'katherine'],
  ]
  return knownNicknames.some(aliases => aliases.includes(first) && aliases.includes(candidate))
}

export function selectIndexedMemberSources(hits: readonly IndexedHit[], url: string, savedName: string): IndexedSource[] {
  const linkedIn = hits.find(hit => sameIndexedLinkedInProfile(hit.url, url) && !!indexedProfileName(hit.title) &&
    isMatchingOwnerName(savedName, indexedProfileName(hit.title)))
  if (!linkedIn) return []

  const name = indexedProfileName(linkedIn.title)
  const parts = linkedIn.title.replace(/\s*[|–-]\s*LinkedIn.*$/i, '').split(/\s+[-–|]\s+/)
  const headline = (parts[1] ?? '').slice(0, 120)
  const kept: IndexedSource[] = [{ url: normalizeLinkedInUrl(url)!, title: clean(linkedIn.title, 220),
    snippet: clean(linkedIn.snippet, 1500), kind: 'linkedin-index' }]
  const seen = new Set([kept[0]!.url])
  // Outside LinkedIn: only public professional pages naming both this person
  // AND a term in their headline, never arbitrary same-name search hits.
  for (const hit of hits) {
    if (kept.length >= 5) break
    if (!isSafeSourceUrl(hit.url) || seen.has(hit.url)) continue
    const source = { title: clean(hit.title, 220), text: clean(hit.snippet, 1500) }
    if (!belongsToMember(source, name, headline)) continue
    seen.add(hit.url)
    kept.push({ url: hit.url, title: source.title, snippet: source.text, kind: 'public-professional' })
  }
  return kept
}

/** A safe, intentionally modest fallback when the independent AI provider is unavailable. */
export function previewFromIndexedTitle(hit: IndexedSource, url: string): ScannedProfile {
  const scan = emptyScan()
  if (hit.kind !== 'linkedin-index' || !sameIndexedLinkedInProfile(hit.url, url)) return scan
  const title = clean(hit.title, 300).replace(/\s+\|\s*LinkedIn.*$/i, '').trim()
  const parts = title.split(/\s+[-–|]\s+/).filter(Boolean)
  scan.name = indexedProfileName(hit.title)
  const main = parts[1] ?? ''
  if (main.length >= 3) {
    scan.headline = main.slice(0, 220)
    const at = /^(.{2,130}?)\s+at\s+(.{2,130})$/i.exec(main)
    if (at) { scan.title = at[1]!.trim(); scan.company = at[2]!.trim() }
    else { scan.title = main.slice(0, 140); scan.company = (parts[2] ?? '').slice(0, 140) }
  }
  scan.linkedin_url = normalizeLinkedInUrl(url) ?? ''
  return scan
}

export function indexedSourcesText(sources: readonly IndexedSource[]): string {
  return sources.map((source, i) => [
    `SOURCE ${i + 1} (${source.kind})`, `URL: ${source.url}`, `TITLE: ${source.title}`,
    `INDEXED PUBLIC EXCERPT: ${source.snippet}`, 'END SOURCE',
  ].join('\n')).join('\n\n').slice(0, 11000)
}
