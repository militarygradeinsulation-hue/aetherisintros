import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from '../auth-gate'
import { generateAgentKey, hashAgentKey, keyPrefix, normalizeScopes } from './keys'

/**
 * Create an assistant key for the signed-in member. The secret is returned once and never
 * stored; the database keeps only its SHA-256 hash.
 */
export const createAgentKey = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator((data: { name: string; scopes: string[] }) => {
    const name = String(data?.name ?? '').trim()
    if (name.length < 1 || name.length > 60) throw new Error('Give the assistant a name (up to 60 characters).')
    const scopes = normalizeScopes(data?.scopes)
    if (!scopes.length) throw new Error('Choose at least one permission.')
    return { name, scopes }
  })
  .handler(async ({ data, context }): Promise<{ key: string; id: string }> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const key = generateAgentKey()
    const { data: id, error } = await (supabaseAdmin as any).rpc('create_agent_key', { // eslint-disable-line @typescript-eslint/no-explicit-any
      p_user: context.userId, p_name: data.name, p_scopes: data.scopes, p_key_hash: await hashAgentKey(key), p_key_prefix: keyPrefix(key),
    })
    if (error) throw new Error(error.message)
    return { key, id: id as string }
  })
