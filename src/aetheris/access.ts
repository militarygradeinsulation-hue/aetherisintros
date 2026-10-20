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
  /** A failed authorization lookup is not evidence of membership or sign-out. */
  error: string | null
  signedIn: boolean
  emailConfirmed: boolean
  userId: string | null
  email: string
  name: string
  status: AccessStatus
  foundingNumber: number | null
  mode: LaunchMode
  isAdmin: boolean
  tier: 'basic' | 'executive'
  onboarded: boolean
  /** Separately earned business-role verification; approval and onboarding grant membership. */
  verification: VerificationStatus
}

export const noAccess: AccessState = {
  loading: true, error: null, signedIn: false, emailConfirmed: false, userId: null, email: '', name: '',
  status: 'none', foundingNumber: null, mode: 'invite_only', isAdmin: false, tier: 'basic', onboarded: false,
  verification: 'none',
}

/** The single guard every network-facing surface must respect. */
export const isLiveMember = (access: AccessState) =>
  access.signedIn && access.emailConfirmed && access.status === 'approved' && access.onboarded
    && access.verification !== 'rejected' && access.verification !== 'suspended'

export interface FoundingStats { approved: number; capacity: number; mode: LaunchMode }

/** Treat malformed or unavailable public launch metrics as restricted, never open. */
export function normalizeFoundingStats(raw: unknown): FoundingStats {
  const fallback: FoundingStats = { approved: 0, capacity: 1000, mode: 'invite_only' }
  if (!raw || typeof raw !== 'object') return fallback
  const row = raw as Record<string, unknown>
  const validMode = row.mode === 'first_1000' || row.mode === 'invite_only' || row.mode === 'closed'
  const approved = Number(row.approved)
  const capacity = Number(row.capacity)
  if (!validMode || !Number.isSafeInteger(approved) || approved < 0 ||
      !Number.isSafeInteger(capacity) || capacity < 1 || approved > capacity) return fallback
  return { approved, capacity, mode: row.mode as LaunchMode }
}

export async function foundingStats(): Promise<FoundingStats> {
  try {
    const { data, error } = await supabase.rpc('founding_stats')
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return { approved: 0, capacity: 1000, mode: 'invite_only' }
    return normalizeFoundingStats(row)
  } catch {
    return { approved: 0, capacity: 1000, mode: 'invite_only' }
  }
}

export async function joinWaitlist(email: string, name = '') {
  const { error } = await supabase.rpc('join_waitlist', { p_email: email, p_name: name })
  if (error) throw error
}

/** Atomically claim (or re-check) this account's place in the launch. */
export async function claimAccess(inviteCode?: string): Promise<{ status: AccessStatus; foundingNumber: number | null }> {
  // Guard every caller, including the manual Founding Member form: an unconfirmed
  // account must not consume a founding slot even if a UI gate is bypassed.
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Sign in before requesting membership.')
  if (!auth.user.email_confirmed_at) throw new Error('Confirm your email address before claiming a founding place.')
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
  const { data: userData, error: authError } = await supabase.auth.getUser()
  // A visitor without a session is a legitimate guest, not a database outage.
  // All other auth failures remain hard errors and never grant membership.
  if (authError?.name === 'AuthSessionMissingError') return { ...noAccess, loading: false }
  if (authError) throw authError
  const user = userData.user
  if (!user) return { ...noAccess, loading: false }

  // Every confirmed account can enter Basic. Invitation claims still run first,
  // preserving existing founding invitations and whitelist grants.
  const existing = await supabase.from('early_access_members').select('status').eq('user_id', user.id).maybeSingle()
  if (existing.error) throw existing.error
  if (user.email_confirmed_at && (!existing.data || existing.data.status === 'pending' || existing.data.status === 'waitlisted')) {
    const code = storedInvite()
    let approvedByInvite = false
    if (code) {
      try {
        const result = await claimAccess(code)
        approvedByInvite = result.status === 'approved'
        if (approvedByInvite) clearInvite()
      } catch { /* invalid invite never blocks the free Basic path */ }
    }
    if (!approvedByInvite) {
      const { error } = await (supabase as any).rpc('claim_basic_membership') // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error) throw error
    }
  }

  const [membership, roles, profile, stats, verification, tierResult] = await Promise.all([
    supabase.from('early_access_members').select('status, founding_member_number').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('profiles').select('onboarded, name').eq('id', user.id).maybeSingle(),
    foundingStats(),
    fetchVerification(),
    (supabase as any).rpc('my_membership_tier'), // eslint-disable-line @typescript-eslint/no-explicit-any
  ])

  if (membership.error) throw membership.error
  if (roles.error) throw roles.error
  if (profile.error) throw profile.error
  if (tierResult.error) throw tierResult.error

  return {
    loading: false,
    error: null,
    signedIn: true,
    emailConfirmed: Boolean(user.email_confirmed_at),
    userId: user.id,
    email: user.email ?? '',
    name: profile.data?.name ?? (user.user_metadata?.['name'] as string | undefined) ?? '',
    status: (membership.data?.status ?? 'none') as AccessStatus,
    foundingNumber: membership.data?.founding_member_number ?? null,
    mode: stats.mode,
    isAdmin: (roles.data ?? []).some(r => r.role === 'admin'),
    tier: tierResult.data === 'executive' ? 'executive' : 'basic',
    onboarded: profile.data?.onboarded ?? false,
    verification: verification.status,
  }
}

const ACCESS_READ_ERROR = 'We could not verify your membership right now. Your account has not been changed. Please retry.'

export function useAccess() {
  const [access, setAccess] = useState<AccessState>(noAccess)

  const refresh = useCallback(async (): Promise<AccessState | null> => {
    setAccess(prev => ({ ...prev, loading: true, error: null }))
    try {
      const latest = await fetchAccess()
      setAccess(latest)
      return latest
    } catch {
      // Fail closed; callers must not treat a failed read as confirmed approval.
      setAccess({ ...noAccess, loading: false, error: ACCESS_READ_ERROR })
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void fetchAccess()
        .then(next => { if (!cancelled) setAccess(next) })
        .catch(() => {
          if (!cancelled) setAccess({ ...noAccess, loading: false, error: ACCESS_READ_ERROR })
        })
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(event => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return
      // Auth callbacks run under the client session lock; read after it is released.
      setTimeout(() => { if (!cancelled) load() }, 0)
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [])

  return { access, refresh, live: isLiveMember(access) }
}

export const foundingLabel = (n: number | null, capacity = 1000) =>
  n == null ? '' : `Founding Member ${String(n).padStart(3, '0')} / ${capacity}`

const INVITE_KEY = 'aetheris.invite'
/** Remember an invite code across sign-up / email confirmation. */
export function rememberInvite(code: string) {
  const c = code.trim()
  try { if (c) localStorage.setItem(INVITE_KEY, c); else localStorage.removeItem(INVITE_KEY) } catch { /* storage blocked */ }
}
export function storedInvite(): string {
  try { return localStorage.getItem(INVITE_KEY) ?? '' } catch { return '' }
}
export function clearInvite() { try { localStorage.removeItem(INVITE_KEY) } catch { /* noop */ } }

export async function myInviteCode(): Promise<string> {
  const { data, error } = await supabase.rpc('my_invite_code')
  if (error) throw error
  return data as string
}

export async function previewInvite(code: string): Promise<{ valid: boolean; inviter: string }> {
  const { data } = await supabase.rpc('invite_preview', { p_code: code.trim() })
  const row = Array.isArray(data) ? data[0] : data
  return { valid: !!row?.valid, inviter: row?.inviter_name ?? '' }
}
