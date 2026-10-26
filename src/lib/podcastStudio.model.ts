import { z } from 'zod'

export const podcastFormats = ['Solo insight', 'Interview', 'Case study'] as const
export type PodcastFormat = typeof podcastFormats[number]
const permittedMinutes = [5, 10, 15, 20, 30, 45] as const

export const podcastEpisodeInput = z.object({
  id: z.string().uuid().optional(),
  version: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(180),
  angle: z.string().trim().max(2000),
  script: z.string().trim().min(1).max(42000),
  format: z.enum(podcastFormats),
  minutes: z.number().int().refine(value => (permittedMinutes as readonly number[]).includes(value)),
  audience: z.string().trim().max(400),
  focus: z.string().trim().max(400),
})
export const podcastAiInput = podcastEpisodeInput.pick({
  title: true, angle: true, format: true, minutes: true, audience: true, focus: true,
}).extend({ specialty: z.string().trim().max(400), host: z.string().trim().max(150) })
export const podcastIdeaInput = podcastAiInput.pick({
  audience: true, focus: true, specialty: true, host: true,
})
export const podcastRevisionRequest = z.object({ episodeId: z.string().uuid() })
export const podcastArchiveRequest = z.object({ id: z.string().uuid(), version: z.number().int().positive() })
export const podcastClipRequest = z.object({
  episodeId: z.string().uuid(),
  storagePath: z.string().min(30).max(300),
  mimeType: z.enum(['audio/webm', 'audio/mp4', 'audio/ogg']),
  bytes: z.number().int().positive().max(30 * 1024 * 1024),
})

export interface PodcastEpisode {
  id: string
  title: string
  angle: string
  script: string
  format: PodcastFormat
  minutes: number
  audience: string
  focus: string
  version: number
  updated_at: string
}
export interface PodcastRevision {
  episode_id: string
  version: number
  script: string
  recorded_at: string
}
export interface PodcastRecording {
  id: string
  episode_id: string
  storage_path: string
  mime_type: string
  byte_size: number
  created_at: string
}

export function isMissingPodcastStorage(error: { code?: string; message?: string } | null | undefined) {
  return !!error && (error.code === 'PGRST205' || error.code === '42P01' ||
    /(?:schema cache|relation .* does not exist)/i.test(error.message || ''))
}

/** Audio path format is always owner/episode/uuid.ext. No caller-controlled
 * filename or path outside the member's own saved episode is accepted. */
export function isOwnPodcastAudioPath(
  path: string, owner: string, episode: string, mimeType: string,
): boolean {
  const extension = mimeType === 'audio/mp4' ? 'mp4' : mimeType === 'audio/ogg' ? 'ogg' : mimeType === 'audio/webm' ? 'webm' : ''
  if (!extension) return false
  const parts = path.split('/')
  return parts.length === 3 && parts[0] === owner && parts[1] === episode &&
    new RegExp('^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.' + extension + '$', 'i').test(parts[2] ?? '')
}

export function parsePodcastIdeas(value: string): Array<{ title: string; angle: string }> {
  const source = value.trim().replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}$/, '')
  let data: unknown
  try { data = JSON.parse(source) } catch { throw new Error('The AI did not return structured topic ideas. Try again.') }
  if (!Array.isArray(data)) throw new Error('The AI did not return a list of topics. Try again.')
  const valid = data.filter((item): item is { title: string; angle: string } =>
    !!item && typeof item === 'object' && typeof item.title === 'string' &&
    typeof item.angle === 'string' && item.title.trim().length >= 5 && item.title.length <= 180 &&
    item.angle.trim().length >= 8 && item.angle.length <= 350)
    .slice(0, 8)
  if (valid.length < 3) throw new Error('The AI returned too few usable topics. Try again.')
  return valid.map(item => ({ title: item.title.trim(), angle: item.angle.trim() }))
}
