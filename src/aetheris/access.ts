/**
 * Early-access gate for the Founding 1,000.
 *
 * A signed-in account is only a *member* of the live network once it holds an
 * approved `early_access_members` row. Everything network-facing in the app
 * goes through `isLiveMember()` so a new page cannot accidentally admit an
 * unapproved account or read quarantined demo data.
 */
import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { fetchVerification, type VerificationStatus } from './verification'

export type AccessStatus = 'approved' | 'waitlisted' | 'pending' | 'suspended' | 'denied' | 'none'
export type LaunchMode = 'first_1000' | 'invite_only' | 'closed'

export interface AccessState {
  loading: boolean
  signedIn: boolean
  userId: string | null
  email: string
  name: string
  status: AccessStatus
  foundingNumber: number | null
  mode: LaunchMode
  isAdmin: boolean
  onboarded: boolean
  /** Membership verification decides network access; the database enforces it too. */
  verification: VerificationStatus
}

export const noAccess: AccessState = {
  loading: true, signedIn: false, userId: null, email: '', name: '',
  status: 'none', foundingNumber: null, mode: 'first_1000', isAdmin: false, onboarded: false,
  verification: 'none',
}

/** The single guard every network-facing surface must respect. */
export const isLiveMember = (access: AccessState) =>
  access.signedIn && access.status === 'approved' && access.verification === 'verified'

export interface FoundingStats { approved: number; capacity: number; mode: LaunchMode }

export async function foundingStats(): Promise<FoundingStats> {
  try {
    const { data } = await supabase.rpc('founding_stats')
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return { approved: 0, capacity: 1000, mode: 'first_1000' }
    return {
      approved: Number(row.approved ?? 0),
      capacity: Number(row.capacity ?? 1000),
      mode: (row.mode ?? 'first_1000') as LaunchMode,
    }
  } catch {
    return { approved: 0, capacity: 1000, mode: 'first_1000' }
  }
}

export async function joinWaitlist(email: string, name = '') {
  await supabase.rpc('join_waitlist', { p_email: email, p_name: name })
}

/** Atomically claim (or re-check) this account's place in the launch. */
export async function claimAccess(inviteCode?: string): Promise<{ status: AccessStatus; foundingNumber: number | null }> {
  const trimmed = inviteCode?.trim()
  const args: { p_invite_code?: string } = {}
  if (trimmed) args.p_invite_code = trimmed
  const { data, error } = await supabase.rpc('claim_early_access', args)
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    status: (row?.status ?? 'pending') as AccessStatus,
    foundingNumber: row?.founding_member_number ?? null,
  }
}

export async function fetchAccess(): Promise<AccessState> {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return { ...noAccess, loading: false }

  // A confirmed account with no membership row yet claims its place automatically:
  // in FIRST_1000 the founding place is granted, otherwise the row records the
  // waitlisted / pending / denied outcome so the member always sees a real state.
  const existing = await supabase
    .from('early_access_members')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!existing.data) {
    try { await claimAccess() } catch { /* the page surfaces the state below */ }
  }

  const [membership, roles, profile, stats] = await Promise.all([
    supabase.from('early_access_members').select('status, founding_member_number').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('profiles').select('onboarded, name').eq('id', user.id).maybeSingle(),
    foundingStats(),
  ])

  return {
    loading: false,
    signedIn: true,
    userId: user.id,
    email: user.email ?? '',
    name: profile.data?.name ?? (user.user_metadata?.['name'] as string | undefined) ?? '',
    status: (membership.data?.status ?? 'none') as AccessStatus,
    foundingNumber: membership.data?.founding_member_number ?? null,
    mode: stats.mode,
    isAdmin: (roles.data ?? []).some(r => r.role === 'admin'),
    onboarded: profile.data?.onboarded ?? false,
  }
}

export function useAccess() {
  const [access, setAccess] = useState<AccessState>(noAccess)

  const refresh = useCallback(async () => {
    setAccess(await fetchAccess())
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchAccess().then(next => { if (!cancelled) setAccess(next) })
    const { data: sub } = supabase.auth.onAuthStateChange(event => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return
      void fetchAccess().then(next => { if (!cancelled) setAccess(next) })
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [])

  return { access, refresh, live: isLiveMember(access) }
}

export const foundingLabel = (n: number | null, capacity = 1000) =>
  n == null ? '' : `Founding Member ${String(n).padStart(3, '0')} / ${capacity}`
