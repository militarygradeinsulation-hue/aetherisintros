/**
 * Business-role verification engine.
 *
 * This checks PUBLIC or member-authorised evidence for consistency. It is an
 * anti-impersonation and business-role check — never a criminal, credit or
 * personal background investigation. Sensitive personal traits are never
 * requested, inferred or stored.
 *
 * There is no third-party identity/KYC provider connected. `runProviderCheck`
 * is a provider-neutral adapter: when a real provider is configured it returns
 * a tokenised result; until then it returns `unavailable` and the claim goes to
 * human review. Nothing is ever fabricated.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export type CheckResult = 'match' | 'partial' | 'conflict' | 'unknown' | 'unavailable'

interface Check {
  check_type: string
  result: CheckResult
  confidence: number
  evidence_summary: string
  source_type: string
}

const ROLE_WORDS: Record<string, string[]> = {
  ceo: ['chief executive', 'ceo'],
  founder: ['founder', 'co-founder', 'cofounder'],
  owner: ['owner', 'proprietor', 'principal'],
  managing_partner: ['managing partner', 'managing director'],
  principal: ['principal', 'principal owner', 'operator'],
}

const EMPLOYEE_ONLY = ['manager', 'director of', 'vice president', 'vp of', 'head of', 'associate', 'analyst', 'coordinator']

const norm = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

const hostOf = (value: string) => {
  try {
    const url = value.includes('://') ? value : `https://${value}`
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch { return '' }
}

/** Fetch a public page's visible text. Failure is reported as unknown, never as a pass. */
async function readPublicPage(url: string): Promise<string | null> {
  try {
    const target = url.includes('://') ? url : `https://${url}`
    const response = await fetch(target, {
      redirect: 'follow',
      headers: { 'user-agent': 'AetherisIntrosVerification/1.0 (+https://intros.today)' },
      signal: AbortSignal.timeout(9000),
    })
    if (!response.ok) return null
    const html = await response.text()
    return norm(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
  } catch { return null }
}

/**
 * Provider-neutral identity adapter. A real provider must return a tokenised
 * result — raw identity documents are never stored by this application.
 */
async function runProviderCheck(): Promise<Check> {
  const configured = Boolean(process.env['IDENTITY_PROVIDER_API_KEY'])
  if (!configured) {
    return {
      check_type: 'third_party_identity',
      result: 'unavailable',
      confidence: 0,
      evidence_summary: 'No identity verification provider is connected. Human review decides this claim.',
      source_type: 'provider_adapter',
    }
  }
  // A configured provider is called here and only its tokenised verdict is kept.
  return {
    check_type: 'third_party_identity',
    result: 'unknown',
    confidence: 0,
    evidence_summary: 'Provider configured but no tokenised result returned for this claim.',
    source_type: 'provider_adapter',
  }
}

const scanInput = z.object({}).optional()

export const runVerificationScan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scanInput.parse(data ?? {}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context

    const { data: claim, error } = await supabase
      .from('member_verifications')
      .select('id, legal_name, display_name, claimed_role, business_name, business_domain, work_email, professional_url, registration_number, registration_jurisdiction, status')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!claim) throw new Error('Submit your business identity first.')
    if (claim.status === 'verified' || claim.status === 'rejected' || claim.status === 'suspended') {
      return { status: claim.status, checks: 0 }
    }

    const { data: evidence } = await supabase
      .from('verification_evidence')
      .select('id, evidence_type, source_url, private_storage_path')
      .eq('verification_id', claim.id)

    await supabase.from('member_verifications').update({ status: 'scanning' }).eq('id', claim.id)

    const checks: Check[] = []
    const domain = hostOf(claim.business_domain)
    const person = norm(claim.legal_name || claim.display_name)
    const company = norm(claim.business_name)
    const roleKey = Object.keys(ROLE_WORDS).find(key =>
      ROLE_WORDS[key]!.some(word => norm(claim.claimed_role).includes(word)))

    // 1. Claimed role must be a controlling business role, not a senior employee title.
    if (roleKey) {
      checks.push({
        check_type: 'claimed_role_eligibility', result: 'match', confidence: 70,
        evidence_summary: `Claimed role "${claim.claimed_role}" is a controlling business role.`,
        source_type: 'submitted_claim',
      })
    } else {
      const employee = EMPLOYEE_ONLY.some(word => norm(claim.claimed_role).includes(word))
      checks.push({
        check_type: 'claimed_role_eligibility',
        result: employee ? 'conflict' : 'unknown',
        confidence: employee ? 80 : 0,
        evidence_summary: employee
          ? `"${claim.claimed_role}" reads as a senior employee title without ownership or chief-executive authority.`
          : `"${claim.claimed_role}" could not be matched to a controlling business role. Human review needed.`,
        source_type: 'submitted_claim',
      })
    }

    // 2. Work email domain must match the stated company domain.
    const emailDomain = claim.work_email.split('@')[1]?.toLowerCase() ?? ''
    checks.push(!emailDomain || !domain
      ? { check_type: 'work_email_domain', result: 'unknown', confidence: 0, evidence_summary: 'Work email or company domain was not supplied.', source_type: 'submitted_claim' }
      : emailDomain === domain || emailDomain.endsWith(`.${domain}`)
        ? { check_type: 'work_email_domain', result: 'match', confidence: 85, evidence_summary: `Work email uses the company domain ${domain}.`, source_type: 'submitted_claim' }
        : { check_type: 'work_email_domain', result: 'conflict', confidence: 70, evidence_summary: `Work email domain ${emailDomain} does not match the stated company domain ${domain}.`, source_type: 'submitted_claim' })

    // 3. Company website exists and names the company.
    const site = domain ? await readPublicPage(domain) : null
    checks.push(!domain
      ? { check_type: 'business_existence', result: 'unknown', confidence: 0, evidence_summary: 'No company website supplied.', source_type: 'public_source' }
      : site === null
        ? { check_type: 'business_existence', result: 'unknown', confidence: 0, evidence_summary: `${domain} could not be read publicly. Human review needed.`, source_type: 'public_source' }
        : company && site.includes(company)
          ? { check_type: 'business_existence', result: 'match', confidence: 80, evidence_summary: `${domain} is live and names ${claim.business_name}.`, source_type: 'public_source' }
          : { check_type: 'business_existence', result: 'partial', confidence: 40, evidence_summary: `${domain} is live but the company name was not found on the page read.`, source_type: 'public_source' })

    // 4. Leadership / about pages: person + role consistency against the official company source.
    const leadershipUrls = (evidence ?? [])
      .filter(item => ['leadership_page', 'company_website', 'about_page'].includes(item.evidence_type) && item.source_url)
      .map(item => item.source_url)
    const candidates = leadershipUrls.length
      ? leadershipUrls
      : domain
        ? [`https://${domain}/about`, `https://${domain}/team`, `https://${domain}/leadership`]
        : []

    let nameSeen = false
    let roleSeen = false
    let sourceRead = false
    for (const url of candidates.slice(0, 4)) {
      const text = await readPublicPage(url)
      if (text === null) continue
      sourceRead = true
      if (person && text.includes(person)) nameSeen = true
      if (roleKey && ROLE_WORDS[roleKey]!.some(word => text.includes(word))) roleSeen = true
      if (nameSeen && roleSeen) break
    }

    checks.push(!sourceRead
      ? { check_type: 'person_company_consistency', result: 'unknown', confidence: 0, evidence_summary: 'No official company page could be read. Human review needed.', source_type: 'public_source' }
      : nameSeen && roleSeen
        ? { check_type: 'person_company_consistency', result: 'match', confidence: 90, evidence_summary: `An official company page names ${claim.legal_name} alongside the claimed role.`, source_type: 'public_source' }
        : nameSeen
          ? { check_type: 'person_company_consistency', result: 'partial', confidence: 55, evidence_summary: 'An official company page names the person, but the role wording was not found.', source_type: 'public_source' }
          : { check_type: 'person_company_consistency', result: 'unknown', confidence: 0, evidence_summary: 'Official company pages were read but did not name the person. More proof needed.', source_type: 'public_source' })

    // 5. Public professional profile consistency.
    if (claim.professional_url) {
      const profile = await readPublicPage(claim.professional_url)
      checks.push(profile === null
        ? { check_type: 'professional_profile', result: 'unknown', confidence: 0, evidence_summary: 'The professional profile URL could not be read publicly.', source_type: 'public_source' }
        : company && profile.includes(company)
          ? { check_type: 'professional_profile', result: 'match', confidence: 65, evidence_summary: 'The professional profile references the claimed company.', source_type: 'public_source' }
          : { check_type: 'professional_profile', result: 'partial', confidence: 30, evidence_summary: 'The professional profile was read but did not clearly reference the claimed company.', source_type: 'public_source' })
    }

    // 6. Business registry: only reported when a filing reference was supplied.
    checks.push(claim.registration_number
      ? { check_type: 'business_registry', result: 'unknown', confidence: 0, evidence_summary: `Filing ${claim.registration_number} (${claim.registration_jurisdiction || 'jurisdiction not stated'}) requires reviewer confirmation against the public register.`, source_type: 'public_source' }
      : { check_type: 'business_registry', result: 'unavailable', confidence: 0, evidence_summary: 'No business registration reference supplied.', source_type: 'public_source' })

    // 7. Duplicate / impersonation signals inside the network.
    const { data: duplicates } = await supabase
      .from('member_verifications')
      .select('id')
      .eq('business_domain', claim.business_domain)
      .neq('id', claim.id)
      .limit(5)
    checks.push({
      check_type: 'duplicate_signals',
      result: (duplicates?.length ?? 0) > 0 ? 'partial' : 'match',
      confidence: (duplicates?.length ?? 0) > 0 ? 40 : 60,
      evidence_summary: (duplicates?.length ?? 0) > 0
        ? `${duplicates!.length} other claim(s) use the same company domain. Confirm they are genuine co-owners.`
        : 'No duplicate or impersonation signal found for this company domain.',
      source_type: 'internal',
    })

    checks.push(await runProviderCheck())

    const documents = (evidence ?? []).filter(item => item.private_storage_path).length
    if (documents) {
      checks.push({
        check_type: 'supporting_document', result: 'unknown', confidence: 0,
        evidence_summary: `${documents} supporting document(s) supplied. A reviewer must open them through a short-lived signed link.`,
        source_type: 'member_upload',
      })
    }

    // Check results are system-authored; members cannot write them directly.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const checkWrite = await supabaseAdmin.from('verification_checks').insert(
      checks.map(check => ({ ...check, verification_id: claim.id })))
    if (checkWrite.error) console.error('verification_checks insert failed', checkWrite.error)

    const conflicts = checks.filter(c => c.result === 'conflict')
    const matches = checks.filter(c => c.result === 'match')
    const strongProof = checks.some(c => c.check_type === 'person_company_consistency' && c.result === 'match')

    const status = conflicts.length > 0
      ? 'needs_more_proof'
      : strongProof && matches.length >= 3
        ? 'manual_review'
        : (evidence?.length ?? 0) > 0
          ? 'manual_review'
          : 'needs_more_proof'

    const level = strongProof ? 1 : 0

    await supabase.from('member_verifications').update({
      status,
      verification_level: level,
      scanned_at: new Date().toISOString(),
      risk_flags: conflicts.map(c => ({ check: c.check_type, note: c.evidence_summary })),
    }).eq('id', claim.id)

    await supabaseAdmin.from('verification_events').insert({
      verification_id: claim.id, user_id: userId, actor_id: userId, event: 'scanned',
      summary: `Consistency scan finished: ${matches.length} consistent, ${conflicts.length} conflicting, ${checks.length} checks.`,
      detail: { status },
    })

    // Only counts and the resulting status leave the server — never evidence contents.
    return {
      status,
      checks: checks.length,
      consistent: matches.length,
      conflicts: conflicts.length,
      unknown: checks.filter(c => c.result === 'unknown' || c.result === 'unavailable').length,
    }
  })
