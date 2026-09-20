/**
 * Membership verification — client layer.
 *
 * Ask Intros is a private network for people who actually run companies.
 * Creating an account does not grant network access: the member must claim a
 * business identity and have a controlling business role verified.
 */
import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'

export type VerificationStatus =
  | 'none' | 'pending' | 'scanning' | 'manual_review' | 'needs_more_proof'
  | 'verified' | 'rejected' | 'suspended'

export type VerifiedRole = 'ceo' | 'founder' | 'owner' | 'managing_partner' | 'principal' | 'other'

export interface VerificationView {
  status: VerificationStatus
  claimedRole: string
  verifiedRole: VerifiedRole | null
  businessName: string
  businessDomain: string
  level: number
  publicSummary: string
  decisionReason: string
  proofRetention: string
  submittedAt: string | null
  verifiedAt: string | null
  evidenceCount: number
}

export const emptyVerification: VerificationView = {
  status: 'none', claimedRole: '', verifiedRole: null, businessName: '', businessDomain: '',
  level: 0, publicSummary: '', decisionReason: '', proofRetention: 'retained',
  submittedAt: null, verifiedAt: null, evidenceCount: 0,
}

/** Roles that carry controlling authority over a business. */
export const claimableRoles: Array<{ value: VerifiedRole; label: string; note: string }> = [
  { value: 'ceo', label: 'Chief Executive Officer', note: 'You hold chief-executive authority.' },
  { value: 'founder', label: 'Founder / Co-founder', note: 'You founded the company and still hold a stake.' },
  { value: 'owner', label: 'Owner / Operator', note: 'You own and run the business.' },
  { value: 'managing_partner', label: 'Managing Partner', note: 'You are a partner with management authority.' },
  { value: 'principal', label: 'Principal Owner', note: 'You are a principal owner of the business.' },
]

export const badgeLabel = (role: VerifiedRole | null) =>
  role === 'ceo' ? 'CEO VERIFIED'
    : role === 'founder' ? 'FOUNDER VERIFIED'
      : role === 'owner' ? 'OWNER VERIFIED'
        : role === 'managing_partner' ? 'MANAGING PARTNER VERIFIED'
          : role === 'principal' ? 'OWNER VERIFIED'
            : role ? 'MEMBER VERIFIED' : ''

export const statusCopy: Record<VerificationStatus, { title: string; note: string }> = {
  none: { title: 'Claim your business identity', note: 'Tell us who you are and what you run. Verification protects every member from impersonation.' },
  pending: { title: 'Ready for the consistency check', note: 'Add your evidence, then run the check on your public business sources.' },
  scanning: { title: 'Checking your public business sources', note: 'This takes a moment. Nothing personal or sensitive is examined.' },
  manual_review: { title: 'With the Aetheris review team', note: 'Your evidence is consistent. A reviewer confirms the role before you enter the network.' },
  needs_more_proof: { title: 'More proof needed', note: 'Something did not line up, or a source could not be read. Add another piece of evidence and run the check again.' },
  verified: { title: 'Verified member', note: 'Your badge is live and the network is open to you.' },
  rejected: { title: 'Not approved', note: 'This claim was not approved. You can reply to the decision to appeal.' },
  suspended: { title: 'Membership suspended', note: 'Network access is paused on this account.' },
}

export const evidenceTypes = [
  { value: 'leadership_page', label: 'Company leadership / about page', hint: 'A page on your own site naming you in your role.' },
  { value: 'business_registry', label: 'Business registry filing', hint: 'A public Secretary of State or equivalent filing.' },
  { value: 'company_email', label: 'Company-domain email', hint: 'An email address on your company domain.' },
  { value: 'professional_profile', label: 'Public professional profile', hint: 'A profile that matches your name and business.' },
  { value: 'ownership_document', label: 'Ownership or filing document', hint: 'Uploaded privately. Only reviewers can open it.' },
] as const

const rowToView = (row: Record<string, unknown> | null | undefined): VerificationView => row ? {
  status: (row['status'] as VerificationStatus) ?? 'none',
  claimedRole: (row['claimed_role'] as string) ?? '',
  verifiedRole: (row['verified_role'] as VerifiedRole | null) ?? null,
  businessName: (row['business_name'] as string) ?? '',
  businessDomain: (row['business_domain'] as string) ?? '',
  level: Number(row['verification_level'] ?? 0),
  publicSummary: (row['public_summary'] as string) ?? '',
  decisionReason: (row['decision_reason'] as string) ?? '',
  proofRetention: (row['proof_retention'] as string) ?? 'retained',
  submittedAt: (row['submitted_at'] as string | null) ?? null,
  verifiedAt: (row['verified_at'] as string | null) ?? null,
  evidenceCount: Number(row['evidence_count'] ?? 0),
} : emptyVerification

/** Reads only what the member is allowed to see — never reviewer notes or risk flags. */
export async function fetchVerification(): Promise<VerificationView> {
  const { data } = await supabase.rpc('my_verification')
  const row = Array.isArray(data) ? data[0] : data
  return rowToView(row as Record<string, unknown> | null)
}

export interface ClaimInput {
  legalName: string; displayName: string; claimedRole: string
  businessName: string; businessDba: string; businessDomain: string
  workEmail: string; businessLocation: string; professionalUrl: string
  registrationNumber: string; registrationJurisdiction: string
}

export async function submitClaim(input: ClaimInput) {
  const { error } = await supabase.rpc('submit_member_verification', {
    p_legal_name: input.legalName, p_display_name: input.displayName,
    p_claimed_role: input.claimedRole, p_business_name: input.businessName,
    p_business_dba: input.businessDba, p_business_domain: input.businessDomain,
    p_work_email: input.workEmail, p_business_location: input.businessLocation,
    p_professional_url: input.professionalUrl,
    p_registration_number: input.registrationNumber,
    p_registration_jurisdiction: input.registrationJurisdiction,
  })
  if (error) throw error
}

export async function addEvidence(evidenceType: string, sourceUrl = '', storagePath: string | null = null, label = '') {
  const args: { p_evidence_type: string; p_source_url: string; p_label: string; p_storage_path?: string } =
    { p_evidence_type: evidenceType, p_source_url: sourceUrl, p_label: label }
  if (storagePath) args.p_storage_path = storagePath
  const { error } = await supabase.rpc('add_verification_evidence', args)
  if (error) throw error
}

const MAX_PROOF = 25 * 1024 * 1024

/** Uploads a proof document into the member's own private folder. */
export async function uploadProof(userId: string, file: File) {
  if (file.size > MAX_PROOF) throw new Error('Documents must be 25 MB or smaller.')
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80)
  const path = `${userId}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('verification-proof').upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

/** Short-lived signed link, only ever issued to the owner or an authorised reviewer. */
export async function signedProofUrl(path: string, seconds = 120) {
  const { data, error } = await supabase.storage.from('verification-proof').createSignedUrl(path, seconds)
  if (error) throw error
  return data.signedUrl
}

export async function purgeProof() {
  const { error } = await supabase.rpc('purge_verification_proof')
  if (error) throw error
}

export interface SecurityEvent { id: string; event: string; summary: string; created_at: string }

export async function fetchSecurityEvents(limit = 20): Promise<SecurityEvent[]> {
  const { data } = await supabase.from('account_security_events')
    .select('id, event, summary, created_at')
    .order('created_at', { ascending: false }).limit(limit)
  return (data ?? []) as SecurityEvent[]
}

export async function logSecurityEvent(event: string, summary: string) {
  // Deliberately records no IP, document contents or other personal detail.
  await supabase.from('account_security_events').insert({ event, summary })
}

export interface VerificationEvent { id: string; event: string; summary: string; created_at: string }

export async function fetchVerificationHistory(): Promise<VerificationEvent[]> {
  const { data } = await supabase.from('verification_events')
    .select('id, event, summary, created_at')
    .order('created_at', { ascending: false }).limit(30)
  return (data ?? []) as VerificationEvent[]
}

export function useVerification() {
  const [verification, setVerification] = useState<VerificationView>(emptyVerification)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try { setVerification(await fetchVerification()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { verification, loading, refresh, verified: verification.status === 'verified' }
}

/** Password strength required for a network of this kind. */
export function passwordProblem(password: string): string {
  if (password.length < 12) return 'Use at least 12 characters.'
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return 'Mix upper and lower case letters.'
  if (!/[0-9]/.test(password)) return 'Include at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include at least one symbol.'
  return ''
}
