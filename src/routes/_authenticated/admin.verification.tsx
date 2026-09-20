import { ClientOnly, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BadgeCheck, ExternalLink, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAccess } from '@/aetheris/access'
import { claimableRoles, signedProofUrl } from '@/aetheris/verification'
import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/admin/verification')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Verification review — Ask Intros' },
      { name: 'description', content: 'Restricted review console for Ask Intros membership verification: evidence, checks, conflicts and decisions.' },
      { property: 'og:title', content: 'Verification review — Ask Intros' },
      { property: 'og:description', content: 'Confirm that every member truly runs the business they claim.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: () => <ClientOnly fallback={null}><ReviewConsole /></ClientOnly>,
})

interface Claim {
  id: string; user_id: string; legal_name: string; display_name: string; claimed_role: string
  verified_role: string | null; business_name: string; business_domain: string; work_email: string
  business_location: string; professional_url: string; registration_number: string
  registration_jurisdiction: string; status: string; risk_flags: unknown; reviewer_notes: string
  submitted_at: string | null; scanned_at: string | null
}
interface Evidence { id: string; evidence_type: string; source_url: string; private_storage_path: string | null; label: string; purged: boolean }
interface Check { id: string; check_type: string; result: string; confidence: number; evidence_summary: string; source_type: string }

const decisions = ['verified', 'needs_more_proof', 'manual_review', 'rejected', 'suspended'] as const

function ReviewConsole() {
  const { access } = useAccess()
  const navigate = useNavigate()
  const [claims, setClaims] = useState<Claim[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [checks, setChecks] = useState<Check[]>([])
  const [role, setRole] = useState('ceo')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [notice, setNotice] = useState('')

  const reload = useCallback(async () => {
    // Identity review only — no CRM, Grid or business data is loaded here.
    const { data } = await supabase.from('member_verifications')
      .select('id, user_id, legal_name, display_name, claimed_role, verified_role, business_name, business_domain, work_email, business_location, professional_url, registration_number, registration_jurisdiction, status, risk_flags, reviewer_notes, submitted_at, scanned_at')
      .order('created_at', { ascending: false }).limit(200)
    setClaims((data ?? []) as Claim[])
  }, [])

  useEffect(() => {
    if (access.loading) return
    if (!access.isAdmin) { void navigate({ to: '/app', replace: true }); return }
    void reload()
  }, [access, navigate, reload])

  const open = async (claim: Claim) => {
    setOpenId(claim.id); setReason(''); setNotes(claim.reviewer_notes ?? '')
    const [ev, ch] = await Promise.all([
      supabase.from('verification_evidence').select('id, evidence_type, source_url, private_storage_path, label, purged').eq('verification_id', claim.id),
      supabase.from('verification_checks').select('id, check_type, result, confidence, evidence_summary, source_type').eq('verification_id', claim.id).order('checked_at'),
    ])
    setEvidence((ev.data ?? []) as Evidence[])
    setChecks((ch.data ?? []) as Check[])
  }

  const openProof = async (claim: Claim, path: string) => {
    try {
      const url = await signedProofUrl(path)
      await supabase.from('verification_events').insert({
        verification_id: claim.id, user_id: claim.user_id, actor_id: access.userId,
        event: 'proof_accessed', summary: 'Reviewer opened a proof document through a short-lived link.',
      })
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch { setNotice('That document could not be opened.') }
  }

  const decide = async (claim: Claim, status: string) => {
    const args: { p_user_id: string; p_status: string; p_verified_role: string; p_reason: string; p_notes: string; p_public_summary?: string } = {
      p_user_id: claim.user_id, p_status: status,
      p_verified_role: status === 'verified' ? role : '',
      p_reason: reason, p_notes: notes,
    }
    if (status === 'verified') args.p_public_summary = `${claim.claimed_role}, ${claim.business_name}`
    const { error } = await supabase.rpc('review_member_verification', args)
    if (error) { setNotice(error.message); return }
    setNotice(`Membership set to ${status.replace(/_/g, ' ')}.`)
    setOpenId(null)
    void reload()
  }

  if (access.loading || !access.isAdmin) return null

  const queue = claims.filter(c => c.status !== 'verified' && c.status !== 'rejected')
  const flags = (value: unknown) => Array.isArray(value) ? value as Array<{ note?: string }> : []

  return <main className="admin-page">
    <header className="admin-head">
      <span className="folio">VERIFICATION REVIEW / RESTRICTED</span>
      <h1>Confirm who actually <em>runs it.</em></h1>
      <p>{queue.length} claim{queue.length === 1 ? '' : 's'} awaiting a decision · {claims.filter(c => c.status === 'verified').length} verified.</p>
      {notice && <p className="auth-notice">{notice}</p>}
    </header>

    {claims.map(claim => <section key={claim.id} className="admin-panel">
      <div className="review-row">
        <div>
          <h2>{claim.display_name || claim.legal_name || claim.user_id}</h2>
          <p>{claim.claimed_role} · {claim.business_name} · {claim.business_domain || 'no domain'}</p>
          <small className="folio">{claim.status.replace(/_/g, ' ').toUpperCase()}{claim.scanned_at ? ` · CHECKED ${new Date(claim.scanned_at).toLocaleDateString()}` : ''}</small>
        </div>
        <button className="chip" type="button" onClick={() => void (openId === claim.id ? setOpenId(null) : open(claim))}>
          {openId === claim.id ? 'Close' : 'Review'}
        </button>
      </div>

      {openId === claim.id && <div className="review-detail">
        <h3>Claim</h3>
        <ul className="admin-list">
          <li><span>Legal name</span><small>{claim.legal_name || '—'}</small></li>
          <li><span>Work email</span><small>{claim.work_email || '—'}</small></li>
          <li><span>Location</span><small>{claim.business_location || '—'}</small></li>
          <li><span>Registration</span><small>{claim.registration_number || '—'} {claim.registration_jurisdiction}</small></li>
          <li><span>Professional profile</span><small>{claim.professional_url || '—'}</small></li>
        </ul>

        <h3>Evidence</h3>
        <ul className="admin-list">
          {evidence.map(item => <li key={item.id}>
            <span>{item.evidence_type.replace(/_/g, ' ')}{item.label ? ` · ${item.label}` : ''}</span>
            {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="chip">Open source <ExternalLink size={12} /></a>}
            {item.private_storage_path && !item.purged && <button type="button" className="chip" onClick={() => void openProof(claim, item.private_storage_path!)}>Open document</button>}
            {item.purged && <small>document purged</small>}
          </li>)}
          {!evidence.length && <li><span>No evidence supplied yet.</span></li>}
        </ul>

        <h3>Automated public-source checks</h3>
        <ul className="admin-list">
          {checks.map(item => <li key={item.id} className={`check-${item.result}`}>
            <span>{item.check_type.replace(/_/g, ' ')}</span>
            <small>{item.result} · {item.confidence}% · {item.evidence_summary}</small>
          </li>)}
          {!checks.length && <li><span>The member has not run the consistency check yet.</span></li>}
        </ul>

        {flags(claim.risk_flags).length > 0 && <div className="review-flags">
          <ShieldAlert size={15} />
          <ul>{flags(claim.risk_flags).map((flag, index) => <li key={index}>{flag.note ?? 'Conflict flagged'}</li>)}</ul>
        </div>}

        <h3>Decision</h3>
        <div className="verify-grid">
          <label><span>VERIFIED ROLE</span>
            <select value={role} onChange={e => setRole(e.target.value)}>
              {claimableRoles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label><span>REASON SHOWN TO THE MEMBER</span><input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Leadership page confirms the role" /></label>
        </div>
        <label className="access-field"><span>INTERNAL REVIEWER NOTES (NEVER SHOWN TO THE MEMBER)</span>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </label>
        <div className="review-actions">
          {decisions.map(status => <button key={status} type="button"
            className={status === 'verified' ? 'btn primary' : 'chip'}
            onClick={() => void decide(claim, status)}>
            {status === 'verified' ? <><BadgeCheck size={14} /> Approve role</> : status.replace(/_/g, ' ')}
          </button>)}
        </div>
      </div>}
    </section>)}

    {!claims.length && <p className="empty-note">No verification claims yet.</p>}
  </main>
}
