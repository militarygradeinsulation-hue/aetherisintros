import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

type Allowance = { tier: 'basic' | 'executive'; used: number; limit: number | null; remaining: number | null; resetsAt: string }
type Application = { userId: string; name: string; title: string; company: string; profileUrl: string; reason: string; status: string; createdAt: string }
const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase as any).rpc(name, args) as Promise<{ data: any; error: { message: string } | null }> // eslint-disable-line @typescript-eslint/no-explicit-any

/** Basic and Executive share the same identity and privacy rules. Only an admin
 * can grant Executive; the application never writes tier rows from the browser. */
export function ExecutiveUpgrade({ tier, isAdmin }: { tier: 'basic' | 'executive'; isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [allowance, setAllowance] = useState<Allowance | null>(null)
  const [fields, setFields] = useState({ name: '', title: '', company: '', profileUrl: '', reason: '' })
  const load = async () => {
    const own = await rpc('my_executive_application')
    if (!own.error) setStatus(own.data?.status || '')
    // Optional existing server-owned RPC; never estimate or persist another member's quota.
    // If the deployment does not expose it, keep the application usable without a false count.
    if (tier === 'basic') {
      const { data, error: quotaError } = await rpc('my_intro_allowance')
      const q = data as Partial<Allowance> | null
      if (!quotaError && q && (q.tier === 'basic' || q.tier === 'executive') &&
          Number.isInteger(q.used) && Number(q.used) >= 0 &&
          (q.remaining === null || (Number.isInteger(q.remaining) && Number(q.remaining) >= 0)) &&
          typeof q.resetsAt === 'string' && !Number.isNaN(Date.parse(q.resetsAt))) {
        setAllowance(q as Allowance)
      } else {
        setAllowance(null)
      }
    }
    if (isAdmin) {
      const queue = await rpc('admin_executive_applications')
      if (!queue.error) setApplications(Array.isArray(queue.data) ? queue.data : [])
    }
  }
  useEffect(() => { if (open) void load() }, [open, isAdmin])
  if (tier === 'executive' && !isAdmin) return null
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    const { data, error: failure } = await rpc('apply_for_executive', {
      p_name: fields.name, p_title: fields.title, p_company: fields.company,
      p_profile_url: fields.profileUrl, p_reason: fields.reason,
    })
    setBusy(false)
    if (failure) setError(failure.message)
    else setStatus(data || 'pending')
  }
  const review = async (userId: string, approve: boolean) => {
    setBusy(true); setError('')
    const { error: failure } = await rpc('review_executive_application', { p_user: userId, p_approve: approve })
    if (failure) setError(failure.message)
    else await load()
    setBusy(false)
  }
  return <>
    <button type="button" className="executive-upgrade-trigger" onClick={() => setOpen(true)}>
      {isAdmin ? 'Executive applications' : 'Basic member · Apply for Executive'}
    </button>
    {open && <div className="executive-upgrade-overlay" role="presentation" onClick={() => setOpen(false)}>
      <section className="executive-upgrade-dialog" role="dialog" aria-modal="true" aria-label={isAdmin ? 'Executive applications' : 'Apply for Executive'} onClick={e => e.stopPropagation()}>
        <button className="executive-upgrade-close" type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
        <span className="folio">ASK INTROS / MEMBERSHIP</span>
        <h2>{isAdmin ? 'Executive review' : 'Apply for Executive access'}</h2>
        {isAdmin ? <>
          <p>Approve only after verifying professional identity and executive responsibilities. No automatic title-based upgrades.</p>
          {applications.filter(a => a.status === 'pending').length === 0 && <p>No pending applications.</p>}
          {applications.filter(a => a.status === 'pending').map(a => <article key={a.userId} className="executive-application">
            <strong>{a.name} · {a.title}</strong><p>{a.company}</p>
            <a href={a.profileUrl} target="_blank" rel="noopener noreferrer">Review professional profile</a>
            <p>{a.reason}</p>
            <div className="executive-upgrade-actions">
              <button type="button" disabled={busy} onClick={() => void review(a.userId, true)}>Approve</button>
              <button type="button" disabled={busy} onClick={() => void review(a.userId, false)}>Decline</button>
            </div>
          </article>)}
        </> : <>
          <p>Basic includes your profile, network discovery, messages, and up to three introduction requests each month. Executive unlocks unrestricted introduction requests and opportunity publishing after review.</p>
          {allowance?.tier === 'basic' && allowance.remaining !== null && <p role="status" className="executive-upgrade-allowance">
            <strong>{allowance.remaining} of {allowance.limit ?? 3} introduction requests remaining this month.</strong>{' '}
            Resets {new Date(allowance.resetsAt).toLocaleDateString()}.
          </p>}
          {status === 'pending' && <p role="status">Your application is under review. Basic access remains active.</p>}
          {status === 'declined' && <p role="status">Your previous application was declined. You may submit updated information.</p>}
          {status !== 'pending' && <form onSubmit={e => void submit(e)} className="executive-upgrade-form">
            <label>Full name<input required minLength={2} maxLength={120} value={fields.name} onChange={e => setFields(v => ({ ...v, name: e.target.value }))} /></label>
            <label>Executive title<input required minLength={2} maxLength={120} value={fields.title} onChange={e => setFields(v => ({ ...v, title: e.target.value }))} /></label>
            <label>Company<input required minLength={2} maxLength={160} value={fields.company} onChange={e => setFields(v => ({ ...v, company: e.target.value }))} /></label>
            <label>Professional profile URL<input required type="url" pattern="https://.*" maxLength={400} placeholder="https://www.linkedin.com/in/…" value={fields.profileUrl} onChange={e => setFields(v => ({ ...v, profileUrl: e.target.value }))} /></label>
            <label>Why do you need Executive access?<textarea required minLength={30} maxLength={2000} rows={5} value={fields.reason} onChange={e => setFields(v => ({ ...v, reason: e.target.value }))} /></label>
            <button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
          </form>}
        </>}
        {error && <p role="alert" className="auth-error">{error}</p>}
      </section>
    </div>}
  </>
}
