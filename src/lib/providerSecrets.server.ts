/**
 * Validates secret presence without exposing its value to frontend code.
 * These are server-runtime settings, never VITE_ values or source constants.
 */
const PLACEHOLDER = /^(?:your[_\s-]*(?:(?:openai|elevenlabs|firecrawl|rocketreach)[_\s-]*)?(?:api[_\s-]*)?(?:key|token|secret)(?:[_\s-]*(?:here|value))?|replace[_\s-]*(?:me|this|with.*)|placeholder|example|undefined|null|none|not[_\s-]*set|<[^>]+>|\$\{[^}]+\})$/i

export function configuredSecret(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.length < 12 || /[\r\n\0]/.test(trimmed) || PLACEHOLDER.test(trimmed)) return undefined
  return trimmed
}

export function readProviderSecret(
  name: 'OPENAI_API_KEY' | 'FIRECRAWL_API_KEY' | 'FIRECRAWL_API_KEY_1' |
    'FIRECRAWL_API_KEY_2' | 'ELEVENLABS_API_KEY' | 'ELEVENLABS_VOICE_ID',
): string | undefined {
  return configuredSecret(process.env[name])
}
