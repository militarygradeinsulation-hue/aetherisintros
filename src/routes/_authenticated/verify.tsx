import logoAsset from '@/assets/aetheris-logo.jpg.asset.json'
import { ClientOnly, createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck, Building2, FileUp, Globe, LockKeyhole, ScanSearch, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAccess } from '@/aetheris/access'
import {
  addEvidence, claimableRoles, evidenceTypes, fetchVerificationHistory, statusCopy,
  submitClaim, uploadProof, useVerification, type VerificationEvent,
} from '@/aetheris/verification'
import { runVerificationScan } from '@/lib/verification.functions'
import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/verify')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Membership verification — Ask Intros' },
      {
        name: 'description',
        content: 'A network built for people who actually run companies. Every Ask Intros member is verified before they reach the network.',
      },
      { property: 'og:title', content: 'Membership verification — Ask Intros' },
      { property: 'og:description', content: 'Every member is verified. Every relationship starts with a real person.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: () => <ClientOnly fallback={null}><VerifyPortal /></ClientOnly>,
})

const emptyForm = {
  legalName: '', displayName: '', claimedRole: 'ceo', roleTitle: '',
  businessName: '', businessDba: '', businessDomain: '', workEmail: '',
  businessLocation: '', professionalUrl: '', registrationNumber: '', registrationJurisdiction: '',
}

function VerifyPortal() {
  const { access } = useAccess()
  const { verification, loading, refresh } = useVerification()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [evidenceType, setEvidenceType] = useState<string>('leadership_page')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [history, setHistory] = useState<VerificationEvent[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const set = (key: keyof typeof emptyForm, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const reloadHistory = useCallback(() => { void fetchVerificationHistory().then(setHistory) }, [])
  useEffect(reloadHistory, [reloadHistory])

  useEffect(() => {
    if (loading || access.loading) return
    if (verification.status === 'verified') {
      void navigate({ to: access.onboarded ? '/app' : '/onboarding', replace: true })
    }
  }, [loading, access, verification.status, navigate])

  useEffect(() => {
    if (access.name && !form.legalName) setForm(prev => ({ ...prev, legalName: access.name, displayName: access.name }))
    if (access.email && !form.workEmail) setForm(prev => ({ ...prev, workEmail: access.email }))
  }, [access.name, access.email, form.legalName, form.workEmail])

  const submit = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      if (!form.legalName.trim() || !form.businessName.trim()) {
        throw new Error('Your legal name and business name are both needed.')
      }
      const roleLabel = claimableRoles.find(r => r.value === form.claimedRole)?.label ?? form.claimedRole
      await submitClaim({
        legalName: form.legalName.trim(),
        displayName: (form.displayName || form.legalName).trim(),
        claimedRole: form.roleTitle.trim() || roleLabel,
        businessName: form.businessName.trim(), businessDba: form.businessDba.trim(),
        businessDomain: form.businessDomain.trim(), workEmail: form.workEmail.trim(),
        businessLocation: form.businessLocation.trim(), professionalUrl: form.professionalUrl.trim(),
        registrationNumber: form.registrationNumber.trim(),
        registrationJurisdiction: form.registrationJurisdiction.trim(),
      })
      await refresh(); reloadHistory()
      setNotice('Claim saved. Add your evidence, then run the check.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That claim could not be saved.')
    } finally { setBusy(false) }
  }

  const attachUrl = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      if (!evidenceUrl.trim()) throw new Error('Add the link to your evidence first.')
      await addEvidence(evidenceType, evidenceUrl.trim())
      setEvidenceUrl(''); await refresh(); reloadHistory()
      setNotice('Evidence added.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That evidence could not be added.')
    } finally { setBusy(false) }
  }

  const attachFile = async (file: File | null) => {
    if (!file || !access.userId) return
    setBusy(true); setError(''); setNotice('')
    try {
      const path = await uploadProof(access.userId, file)
      await addEvidence('ownership_document', '', path, file.name)
      await refresh(); reloadHistory()
      setNotice('Document uploaded privately. Only an authorised reviewer can open it.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That document could not be uploaded.')
    } finally { setBusy(false) }
  }

  const scan = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await runVerificationScan({ data: {} })
      await refresh(); reloadHistory()
      setNotice(`Check finished: ${result.consistent ?? 0} consistent, ${result.conflicts ?? 0} conflicting, ${result.unknown ?? 0} could not be confirmed.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The check could not be run. Try again shortly.')
    } finally { setBusy(false) }
  }

  const copy = statusCopy[verification.status]
  const claimed = verification.status !== 'none'

  return <main className="verify-page">
    <section className="verify-panel">
      <Link to="/" className="auth-brand">
        <img className="brand-logo" src={logoAsset.url} alt="Ask Intros logo" />
        <span className="brand-name">Ask<em>Intros</em></span>
      </Link>
      <div className="auth-index"><span className="folio">MEMBERSHIP VERIFICATION / 2026</span><span>01 / REAL OPERATORS ONLY</span></div>
      <h1>A network built for people who<br /><em>actually run companies.</em></h1>
      <p className="auth-lede">
        Every member is verified. Every relationship starts with a real person. Verification protects
        executive attention, prevents impersonation, and keeps the network worth the time it asks for.
      </p>

      <div className={`verify-status verify-${verification.status}`}>
        <span className="folio">{verification.status === 'none' ? 'NOT STARTED' : verification.status.replace(/_/g, ' ').toUpperCase()}</span>
        <h2>{copy.title}</h2>
        <p>{copy.note}</p>
        {verification.decisionReason && <p className="verify-reason">{verification.decisionReason}</p>}
        <small>{verification.evidenceCount} piece{verification.evidenceCount === 1 ? '' : 's'} of evidence on file</small>
      </div>

      {error && <p className="auth-error"><ShieldAlert size={13} /> {error}</p>}
      {notice && <p className="auth-notice">{notice}</p>}

      <section className="verify-step">
        <span className="folio">STEP 01 / BUSINESS IDENTITY</span>
        <h3>Claim what you run.</h3>
        <p className="verify-help">Only what a reviewer needs. No personal or sensitive information is asked for at any point.</p>
        <div className="verify-grid">
          <label><span>LEGAL / FULL NAME</span><input value={form.legalName} onChange={e => set('legalName', e.target.value)} placeholder="As it appears on business filings" /></label>
          <label><span>PROFESSIONAL DISPLAY NAME</span><input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="How members see you" /></label>
          <label><span>YOUR ROLE</span>
            <select value={form.claimedRole} onChange={e => set('claimedRole', e.target.value)}>
              {claimableRoles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </label>
          <label><span>EXACT TITLE (OPTIONAL)</span><input value={form.roleTitle} onChange={e => set('roleTitle', e.target.value)} placeholder="e.g. Managing Partner & Principal" /></label>
          <label><span>LEGAL BUSINESS NAME</span><input value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Registered entity name" /></label>
          <label><span>PUBLIC NAME / DBA</span><input value={form.businessDba} onChange={e => set('businessDba', e.target.value)} placeholder="If different from the legal name" /></label>
          <label><span>COMPANY WEBSITE</span><input value={form.businessDomain} onChange={e => set('businessDomain', e.target.value)} placeholder="yourcompany.com" /></label>
          <label><span>WORK EMAIL</span><input type="email" value={form.workEmail} onChange={e => set('workEmail', e.target.value)} placeholder="you@yourcompany.com" /></label>
          <label><span>BUSINESS LOCATION</span><input value={form.businessLocation} onChange={e => set('businessLocation', e.target.value)} placeholder="City, State, Country" /></label>
          <label><span>PROFESSIONAL PROFILE (OPTIONAL)</span><input value={form.professionalUrl} onChange={e => set('professionalUrl', e.target.value)} placeholder="A public profile that matches your business" /></label>
          <label><span>REGISTRATION NUMBER (OPTIONAL)</span><input value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} placeholder="Only if you choose to provide it" /></label>
          <label><span>JURISDICTION (OPTIONAL)</span><input value={form.registrationJurisdiction} onChange={e => set('registrationJurisdiction', e.target.value)} placeholder="e.g. North Carolina, USA" /></label>
        </div>
        <button className="btn primary" type="button" onClick={() => void submit()} disabled={busy}>
          <Building2 size={15} /> {claimed ? 'Update my claim' : 'Submit my claim'}
        </button>
      </section>

      <section className="verify-step">
        <span className="folio">STEP 02 / PROOF OF ROLE</span>
        <h3>Show that the role is real.</h3>
        <p className="verify-help">One strong source is usually enough. More than one is faster.</p>
        <ul className="verify-evidence-list">
          {evidenceTypes.map(item => <li key={item.value}><b>{item.label}</b><small>{item.hint}</small></li>)}
        </ul>
        <div className="verify-grid">
          <label><span>EVIDENCE TYPE</span>
            <select value={evidenceType} onChange={e => setEvidenceType(e.target.value)}>
              {evidenceTypes.filter(t => t.value !== 'ownership_document').map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label><span>LINK</span><input value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://yourcompany.com/leadership" /></label>
        </div>
        <button className="btn ghost" type="button" onClick={() => void attachUrl()} disabled={busy || !claimed}>
          <Globe size={15} /> Add this evidence
        </button>
        <label className="verify-upload">
          <span>OWNERSHIP OR FILING DOCUMENT (OPTIONAL)</span>
          <input type="file" accept="application/pdf,image/*" onChange={e => void attachFile(e.target.files?.[0] ?? null)} disabled={busy || !claimed} />
          <small><FileUp size={12} /> Stored privately. Never public, never readable by other members, and removable once verified.</small>
        </label>
      </section>

      <section className="verify-step">
        <span className="folio">STEP 03 / CONSISTENCY CHECK</span>
        <h3>Run the business check.</h3>
        <p className="verify-help">
          Aetheris compares your claim against public or authorised business sources: company site,
          leadership pages, work-email domain, professional profile and duplicate signals. It is a
          business-role check — never a criminal, credit or personal background check. Anything that
          cannot be confirmed is marked unknown, never assumed.
        </p>
        <button className="btn primary" type="button" onClick={() => void scan()} disabled={busy || !claimed}>
          <ScanSearch size={15} /> {busy ? 'Checking…' : 'Run the check'} <ArrowRight size={14} />
        </button>
      </section>

      {history.length > 0 && <section className="verify-step">
        <span className="folio">YOUR VERIFICATION HISTORY</span>
        <ul className="verify-history">
          {history.map(item => <li key={item.id}>
            <b>{item.event.replace(/_/g, ' ')}</b>
            <span>{item.summary}</span>
            <small>{new Date(item.created_at).toLocaleString()}</small>
          </li>)}
        </ul>
      </section>}

      <div className="verify-foot">
        <span><LockHint /> Verified members carry a badge — never their proof documents.</span>
        <button className="auth-switch" type="button" onClick={() => void supabase.auth.signOut().then(() => navigate({ to: '/auth', replace: true }))}>
          Sign out
        </button>
      </div>
    </section>

    <aside className="auth-visual auth-visual-type" aria-label="Ask Intros verification principles">
      <span className="auth-visual-mark" aria-hidden="true">+</span>
      <div className="auth-visual-statement" aria-hidden="true">
        <span>REAL IDENTITY</span><i>×</i><span>REAL CONTEXT</span><i>×</i><span>TRUST</span>
      </div>
      <div className="portrait-caption">
        <span><BadgeCheck size={13} /> CEO VERIFIED · FOUNDER VERIFIED · OWNER VERIFIED</span>
        <p>Every member is verified. Every relationship starts with a real person.</p>
      </div>
    </aside>
  </main>
}

const LockHint = () => <LockKeyhole size={12} />
