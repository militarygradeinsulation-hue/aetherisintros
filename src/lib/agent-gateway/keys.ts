/**
 * Assistant keys a member issues to their own AI assistant. The secret is shown once; only its
 * SHA-256 hash is stored (agent_keys.key_hash, drizzle/migrations/0054).
 */

export const AGENT_SCOPES = ['read_profile_public', 'search_members', 'create_ask', 'request_intro'] as const
export type AgentScope = typeof AGENT_SCOPES[number]

export const SCOPE_LABELS: Record<AgentScope, string> = {
  read_profile_public: 'Read your public profile',
  search_members: 'Search members',
  create_ask: 'Post asks for you',
  request_intro: 'Request introductions for you',
}

const KEY_RE = /^ai_[A-Za-z0-9_-]{43}$/

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** A new secret: `ai_` + 32 random bytes, base64url (43 characters). */
export function generateAgentKey(): string {
  return `ai_${b64url(crypto.getRandomValues(new Uint8Array(32)))}`
}

export function isAgentKey(value: string): boolean {
  return KEY_RE.test(value)
}

/** The part of a key that is safe to show later, so a member can tell keys apart. */
export function keyPrefix(key: string): string {
  return key.slice(0, 11)
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export const hashAgentKey = sha256Hex

/** The key from `Authorization: Bearer ai_…`, or null when absent or malformed. */
export function bearerKey(header: string | null): string | null {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(header ?? '')
  return m && isAgentKey(m[1]!) ? m[1]! : null
}

/** Known scopes only, each once, in a stable order. */
export function normalizeScopes(input: unknown): AgentScope[] {
  const given = new Set(Array.isArray(input) ? input.filter((s): s is string => typeof s === 'string') : [])
  return AGENT_SCOPES.filter(s => given.has(s))
}
