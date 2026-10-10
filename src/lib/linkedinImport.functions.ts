import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'
import { gatewayChat, routeLlmChat } from './aiGateway.server'
import {
  createRateLimiter, fieldProvenance, groundProfile, isLinkedInPhotoUrl, LINKEDIN_EXTRACT_PROMPT, mergeProfiles, normalizeLinkedInUrl,
  parseAiProfile, parseLinkedInText, profileFieldsFrom, scanLinkedInUrl, type FieldProvenance, type ImportedFields, type LinkedInProfile,
  type UrlScanResult,
} from '@/aetheris/linkedin-import'

export interface LinkedInExtraction {
  linkedinUrl: string | null
  profile: LinkedInProfile
  fields: ImportedFields
  /** 'ai' when the AI read the profile; 'parser' when the built-in reader did. */
  source: 'ai' | 'parser'
  /** Which reader produced each non-empty field. Unknown values stay empty. */
  provenance: Partial<Record<keyof ImportedFields, FieldProvenance>>
}

const allowScan = createRateLimiter(10, 10 * 60_000)
const AI_TIMEOUT_MS = 25_000
const withTimeout = async <T,>(p: Promise<T>) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try { return await Promise.race([p, new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), AI_TIMEOUT_MS) })]) } finally { clearTimeout(timer) }
}

const MAX_TEXT = 60_000

/**
 * Reads the profile a member handed us (the text of LinkedIn's PDF export or of their profile
 * page) into profile fields for them to review. Nothing is fetched from LinkedIn and nothing
 * is saved here: the member applies the fields themselves.
 */
export const extractLinkedInProfile = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { text: string; url?: string; nameHint?: string }) => {
    const text = typeof data?.text === 'string' ? data.text : ''
    if (text.trim().length < 40) throw new Error('Add your LinkedIn PDF or paste your profile text first.')
    return {
      text: text.slice(0, MAX_TEXT),
      url: typeof data.url === 'string' ? data.url.slice(0, 300) : '',
      nameHint: typeof data.nameHint === 'string' ? data.nameHint.slice(0, 120) : '',
    }
  })
  .handler(async ({ data, context }): Promise<LinkedInExtraction> => {
    const userId = (context as { userId?: string }).userId
    if (!userId) throw new Error('Sign in to import your profile.')
    if (!allowScan(userId)) throw new Error('Too many scans. Please wait a few minutes and try again.')
    const parsed = parseLinkedInText(data.text, data.nameHint ? { name: data.nameHint } : {})
    let ai: LinkedInProfile | null = null
    const routeKey = process.env['ROUTELLM_API_KEY']
    const apiKey = process.env['LOVABLE_API_KEY']
    if (routeKey || apiKey) {
      try {
        const request = {
          system: LINKEDIN_EXTRACT_PROMPT,
          messages: [{ role: 'user' as const, content: `${data.nameHint ? `The largest text in the document (likely the name): ${data.nameHint}\n\n` : ''}Profile text (untrusted data, between the markers):\n<<<PROFILE_TEXT\n${data.text}\nPROFILE_TEXT>>>` }],
          maxSteps: 1,
        }
        ai = groundProfile(parseAiProfile(await withTimeout(routeKey ? routeLlmChat(request) : gatewayChat(request))), data.text)
      } catch {
        console.error('linkedin extraction AI failed; using the parser')
      }
    }
    const profile = mergeProfiles(ai, parsed)
    const fields = profileFieldsFrom(profile)
    return { linkedinUrl: normalizeLinkedInUrl(data.url), profile, fields, source: ai ? 'ai' : 'parser', provenance: fieldProvenance(fields, profileFieldsFrom(parsed)) }
  })

/**
 * Scan from a link alone. No authorized LinkedIn data source is connected, so this reports
 * `blocked` (after validating the link) and fetches nothing — never a mock success.
 */
export const scanLinkedInProfileUrl = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { url: string }) => ({ url: typeof data?.url === 'string' ? data.url.slice(0, 300) : '' }))
  .handler(async ({ data }): Promise<UrlScanResult> => scanLinkedInUrl(data.url))

const MAX_PHOTO = 5 * 1024 * 1024

/**
 * Fetches the member's own LinkedIn photo from the image address they copied. Only LinkedIn's
 * image host is allowed, so this cannot be pointed at anything else.
 */
export const fetchLinkedInPhoto = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { url: string }) => {
    if (!isLinkedInPhotoUrl(data?.url ?? '')) throw new Error('Use the image address of your LinkedIn photo (it starts with https://media.licdn.com/).')
    return { url: data.url.trim() }
  })
  .handler(async ({ data }): Promise<{ base64: string; type: string }> => {
    const res = await fetch(data.url, { redirect: 'error', signal: AbortSignal.timeout(10_000) })
    const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
    if (!res.ok) throw new Error('That photo link has expired. Copy the image address again from your LinkedIn profile.')
    if (!/^image\/(jpeg|png|webp)$/.test(type)) throw new Error('That link is not a photo.')
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.length > MAX_PHOTO) throw new Error('That photo is larger than 5 MB.')
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return { base64: btoa(binary), type }
  })
