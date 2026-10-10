import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'
import { gatewayChat, routeLlmChat } from './aiGateway.server'
import {
  isLinkedInPhotoUrl, LINKEDIN_EXTRACT_PROMPT, mergeProfiles, normalizeLinkedInUrl, parseAiProfile, parseLinkedInText,
  profileFieldsFrom, type ImportedFields, type LinkedInProfile,
} from '@/aetheris/linkedin-import'
import {
  cleanProfileText, groundScan, LINKEDIN_SCAN_PROMPT, MAX_RAW_INPUT, mergeScans, MIN_SCAN_TEXT, parseScanJson, parseScanText,
  validateScan, type ScannedProfile, type ScanResult,
} from '@/aetheris/linkedin-scan'

export interface LinkedInExtraction {
  linkedinUrl: string | null
  profile: LinkedInProfile
  fields: ImportedFields
  /** 'ai' when the AI read the profile; 'parser' when the built-in reader did. */
  source: 'ai' | 'parser'
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
  .handler(async ({ data }): Promise<LinkedInExtraction> => {
    const parsed = parseLinkedInText(data.text, data.nameHint ? { name: data.nameHint } : {})
    let ai: LinkedInProfile | null = null
    const routeKey = process.env['ROUTELLM_API_KEY']
    const apiKey = process.env['LOVABLE_API_KEY']
    if (routeKey || apiKey) {
      try {
        const request = {
          system: LINKEDIN_EXTRACT_PROMPT,
          messages: [{ role: 'user' as const, content: `${data.nameHint ? `The largest text in the document (likely the name): ${data.nameHint}\n\n` : ''}Profile text:\n${data.text}` }],
          maxSteps: 1,
        }
        ai = parseAiProfile(routeKey ? await routeLlmChat(request) : await gatewayChat(request))
      } catch (error) {
        console.error('linkedin extraction AI failed; using the parser', error)
      }
    }
    const profile = mergeProfiles(ai, parsed)
    return { linkedinUrl: normalizeLinkedInUrl(data.url), profile, fields: profileFieldsFrom(profile), source: ai ? 'ai' : 'parser' }
  })

/**
 * "Scan LinkedIn profile": reads profile text the member pasted (or the text of LinkedIn's PDF
 * export, read in their browser) into one strict shape for review. Nothing is fetched from
 * LinkedIn and nothing is saved here. AI values the text does not state are dropped.
 */
export const scanLinkedInProfile = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { text: string; url?: string; nameHint?: string }) => {
    const text = typeof data?.text === 'string' ? data.text.slice(0, MAX_RAW_INPUT) : ''
    if (text.trim().length < MIN_SCAN_TEXT) throw new Error('Paste the profile text or add the LinkedIn PDF first.')
    const url = typeof data.url === 'string' ? data.url.trim().slice(0, 300) : ''
    if (url && !normalizeLinkedInUrl(url)) throw new Error('That is not a LinkedIn profile link. It looks like linkedin.com/in/name.')
    return { text, url, nameHint: typeof data.nameHint === 'string' ? data.nameHint.slice(0, 120) : '' }
  })
  .handler(async ({ data }): Promise<ScanResult> => {
    const parsed = parseScanText(data.text, { nameHint: data.nameHint, url: data.url })
    const cleaned = cleanProfileText(data.text)
    let ai: ScannedProfile | null = null
    const routeKey = process.env['ROUTELLM_API_KEY']
    const apiKey = process.env['LOVABLE_API_KEY']
    if (routeKey || apiKey) {
      try {
        const request = {
          system: LINKEDIN_SCAN_PROMPT,
          messages: [{ role: 'user' as const, content: `${data.nameHint ? `The largest text in the document (likely the name): ${data.nameHint}\n\n` : ''}Profile text:\n${cleaned.text}` }],
          maxSteps: 1,
        }
        const answer = parseScanJson(routeKey ? await routeLlmChat(request) : await gatewayChat(request))
        if (answer) ai = groundScan(answer, cleaned.text)
      } catch (error) {
        console.error('linkedin scan AI failed; using the built-in reader', error)
      }
    }
    const scan = validateScan(mergeScans(ai, parsed.scan)) ?? parsed.scan
    return { scan, source: ai ? 'ai' : 'parser', truncated: cleaned.truncated }
  })

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
