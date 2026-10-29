import { createHash } from 'node:crypto'
import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'

import { requireAuthContract } from './auth-gate'
import { normalizeLinkedInUrl } from '@/aetheris/linkedin-import'
import { validateScan } from '@/aetheris/linkedin-scan'
import { buildPersonalMindprint, type PersonalMindprint } from '@/aetheris/personal-mindprint'

export const MINDPRINT_CATEGORY = 'Personal Mindprint'
export const MINDPRINT_SOURCE = 'Member-confirmed LinkedIn professional baseline'

/** One stable identifier per member avoids duplicate snapshots on double-click or retry. */
export function personalMindprintId(owner: string): string {
  const hex = createHash('sha256').update('askintros:personal-mindprint:v1:' + owner).digest('hex')
  return [hex.slice(0, 8), hex.slice(8, 12), '5' + hex.slice(13, 16), 'a' + hex.slice(17, 20), hex.slice(20, 32)].join('-')
}

const input = z.object({
  scan: z.unknown(),
  confirmed: z.literal(true),
  provenance: z.enum(['public_index', 'supplied_profile']),
}).strict()

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase().replace(/\s+/g, ' ') === b.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export function matchesOwnProfessionalIdentity(
  member: { name: string | null; linkedin_url: string | null },
  scan: { name: string; linkedin_url: string },
): boolean {
  const savedUrl = normalizeLinkedInUrl(member.linkedin_url || '')
  const incomingUrl = normalizeLinkedInUrl(scan.linkedin_url || '')
  if (savedUrl && incomingUrl && savedUrl !== incomingUrl) return false
  if (!member.name?.trim()) return true
  return sameName(member.name, scan.name) || Boolean(savedUrl && incomingUrl && savedUrl === incomingUrl)
}

export const saveMyPersonalMindprint = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const scan = validateScan(data.scan)
    if (!scan?.name || (!scan.headline && !scan.title && !scan.experience.length)) {
      throw new Error('The scan needs your name and professional history before it can become a Mindprint.')
    }
    const { data: owner, error: readError } = await context.supabase.from('profiles')
      .select('name,linkedin_url').eq('id', context.userId).maybeSingle()
    if (readError || !owner) throw new Error('Your member profile could not be verified.')
    if (!matchesOwnProfessionalIdentity(owner, scan)) {
      throw new Error('The scanned identity does not match your member profile. Review the name and LinkedIn link before saving.')
    }

    const mindprint = buildPersonalMindprint(scan, data.provenance)
    // We only keep the structured professional evidence; never persist pasted raw pages,
    // LinkedIn credentials, email, phone, other people's details, or unreviewed psychology.
    const record = {
      id: personalMindprintId(context.userId), user_id: context.userId,
      kind: 'note', category: MINDPRINT_CATEGORY, scope: 'private' as const,
      source: MINDPRINT_SOURCE, confidence: 65, when_label: mindprint.updatedAt,
      text: JSON.stringify(mindprint),
    }
    const { data: receipt, error } = await context.supabase.from('memories')
      .upsert(record, { onConflict: 'id' }).select('id,user_id,scope').single()
    if (error || receipt?.id !== record.id || receipt.user_id !== context.userId || receipt.scope !== 'private') {
      throw new Error('Your private Mindprint could not be saved. No success was confirmed.')
    }
    return { mindprint, saved: true }
  })

export const loadMyPersonalMindprint = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .handler(async ({ context }): Promise<{ mindprint: PersonalMindprint | null }> => {
    const { data, error } = await context.supabase.from('memories').select('text')
      .eq('id', personalMindprintId(context.userId)).eq('user_id', context.userId)
      .eq('category', MINDPRINT_CATEGORY).eq('scope', 'private').maybeSingle()
    if (error) throw new Error('Private Mindprint could not be loaded.')
    if (!data) return { mindprint: null }
    try {
      const value = JSON.parse(data.text) as PersonalMindprint
      if (value.version !== 1 || value.status !== 'member_confirmed') throw new Error('Invalid version')
      return { mindprint: value }
    } catch { throw new Error('Your saved Mindprint needs to be regenerated from a new scan.') }
  })

export const deleteMyPersonalMindprint = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .inputValidator(z.object({ confirmed: z.literal(true) }))
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from('memories').delete()
      .eq('id', personalMindprintId(context.userId)).eq('user_id', context.userId)
      .eq('scope', 'private').eq('category', MINDPRINT_CATEGORY)
    if (error) throw new Error('The private Mindprint could not be removed.')
    return { removed: true }
  })
