/**
 * Verified membership badge.
 *
 * Reads only the public badge fields a verified member chose to expose —
 * role, business name and verification date. Proof documents, evidence,
 * reviewer notes and risk flags are never readable here.
 */
import { BadgeCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { badgeLabel, type VerifiedRole } from './verification'

export interface PublicBadge {
  role: VerifiedRole | null
  business: string
  verifiedAt: string | null
  summary: string
}

const cache = new Map<string, PublicBadge>()
const listeners = new Set<() => void>()
let pending: string[] = []
let timer: number | null = null

/** Batches badge lookups so a member list does not fire one request per row. */
function queue(id: string) {
  if (cache.has(id) || pending.includes(id)) return
  pending.push(id)
  if (timer != null) return
  timer = window.setTimeout(() => {
    const ids = pending
    pending = []; timer = null
    void supabase.from('profiles')
      .select('id, verified_role, verified_at, verified_business, verification_public_summary')
      .in('id', ids)
      .then(({ data }) => {
        for (const id of ids) cache.set(id, { role: null, business: '', verifiedAt: null, summary: '' })
        for (const row of data ?? []) {
          cache.set(row.id, {
            role: (row.verified_role as VerifiedRole | null) ?? null,
            business: row.verified_business ?? '',
            verifiedAt: row.verified_at ?? null,
            summary: row.verification_public_summary ?? '',
          })
        }
        listeners.forEach(fn => fn())
      })
  }, 40)
}

export function usePublicBadge(memberId: string | null | undefined): PublicBadge | null {
  const [, bump] = useState(0)
  useEffect(() => {
    if (!memberId) return
    const notify = () => bump(n => n + 1)
    listeners.add(notify)
    queue(memberId)
    return () => { listeners.delete(notify) }
  }, [memberId])
  if (!memberId) return null
  return cache.get(memberId) ?? null
}

/** Editorial badge — restrained type and a cobalt seal, never a generic green tick. */
export function VerifiedBadge({ memberId, detail = false }: { memberId: string | null | undefined; detail?: boolean }) {
  const badge = usePublicBadge(memberId)
  if (!badge?.role) return null
  const date = badge.verifiedAt ? new Date(badge.verifiedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''
  const title = `${badgeLabel(badge.role)}${badge.business ? ` · ${badge.business}` : ''}${date ? ` · verified ${date}` : ''}`
  return <span className={`verified-badge${detail ? ' with-detail' : ''}`} title={title}>
    <BadgeCheck size={13} aria-hidden="true" />
    <b>{badgeLabel(badge.role)}</b>
    {detail && <small>{badge.business}{date ? ` · Verified ${date}` : ''}</small>}
  </span>
}
