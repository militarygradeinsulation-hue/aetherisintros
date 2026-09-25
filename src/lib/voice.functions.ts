import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requireAuthContract } from './auth-gate'

const speechInput = z.object({
  text: z.string().trim().min(1).max(1800),
})

const sleep = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

function safeProviderMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as { detail?: { message?: string } | string; message?: string }
    if (typeof parsed.detail === 'object' && typeof parsed.detail?.message === 'string') return parsed.detail.message
    if (typeof parsed.detail === 'string') return parsed.detail
    if (typeof parsed.message === 'string') return parsed.message
  } catch { /* provider returned plain text */ }
  return body.trim().slice(0, 240) || `Voice service returned ${status}.`
}

/** Creates one private spoken passage for the signed-in member. */
export const speakWithIntrosVoice = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: unknown) => speechInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env['ELEVENLABS_API_KEY']
    const voiceId = process.env['ELEVENLABS_VOICE_ID']
    if (!apiKey || !voiceId) throw new Error('The Intros voice is not configured.')

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`
    let lastMessage = 'The Intros voice is temporarily unavailable.'

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: data.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.34,
            similarity_boost: 0.75,
            style: 0.91,
            use_speaker_boost: true,
            speed: 1,
          },
        }),
      })

      if (response.ok) {
        const bytes = await response.arrayBuffer()
        return { audio: Buffer.from(bytes).toString('base64'), contentType: 'audio/mpeg' }
      }

      const body = await response.text()
      lastMessage = safeProviderMessage(body, response.status)
      const retryable = response.status === 429 || response.status >= 500
      if (!retryable || attempt === 2) throw new Error(lastMessage)

      const retryAfter = Number(response.headers.get('retry-after'))
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 5000)
        : Math.min(600 * (2 ** attempt) + Math.random() * 250, 5000)
      await sleep(delay)
    }

    throw new Error(lastMessage)
  })