import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Eyebrow } from '../ui'
import { rpc, SignInRequired, useSessionUser } from './useSessionUser'

type Application = { userId: string; name: string; title: string; company: string; profileUrl: string; reason: string; status: string }
type Form = { name: string; title: string; company: string; profileUrl: string; reason: string }

export function validateExecutiveApplication(f: Form): string | null {
  if (!f.name.trim() || !f.title.trim() || !f.company.trim()) return 'Name, title and company are required.'
  if (!/^https:\/\/\S+$/i.test(f.profileUrl.trim())) return 'Profile URL must start with https://'
  const r = f.reason.trim().length
  if (r < 30 || r > 2000) return 'Reason must be 30–2000 characters.'
  return null
}

export function MembershipPage() {
  const { userId, ready } = useSessionUser()
  if (!ready) return <p className="og-note">Loading…</p>
  if (!userId) return <SignInRequired what="membership" />
  return <MembershipPanel />
}

function MembershipPanel() {
  const [tier, setTier] = useState<'basic' | 'executive' | null>(null)
  const [status, setStatus] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [apps, setApps] = useState<Application[]>([])
  const [form, setForm] = useState<Form>({ name: '', title: '', company: '', profileUrl: '', reason: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [t, a, adm] = await Promise.all([rpc('my_membership_tier'), rpc('my_executive_application'), rpc('is_admin')])
    if (t.error) setError('Your membership could not be loaded.')
    setTier(t.data === 'executive' ? 'executive' : 'basic')
    setStatus(a.data?.status ?? '')
    const admin = adm.data === true
    setIsAdmin(admin)
    if (admin) {
      const q = await rpc('admin_executive_applications')
      setApps(!q.error && Array.isArray(q.data) ? q.data.filter((x: Application) => x.status === 'pending') : [])
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const submit = async () => {
    const problem = validateExecutiveApplication(form)
    if (problem) { setError(problem); return }
    setBusy(true); setError('')
    const r = await rpc('apply_for_executive', { p_name: form.name.trim(), p_title: form.title.trim(), p_company: form.company.trim(), p_profile_url: form.profileUrl.trim(), p_reason: form.reason.trim() })
    setBusy(false)
    if (r.error) { setError(r.error.message); return }
    await load()
  }
  const review = async (user: string, approve: boolean) => {
    setBusy(true)
    const r = await rpc('review_executive_application', { p_user: user, p_approve: approve })
    setBusy(false)
    if (r.error) setError(r.error.message)
    await load()
  }
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }))

  return <section className="executive-section" aria-label="Membership">
    <Eyebrow>MEMBERSHIP</Eyebrow>
    <h2>Your access, and how to go further.</h2>
    {error && <p role="alert" className="og-note">{error}</p>}

    <article className="module">
      <Eyebrow>MY TIER</Eyebrow>
      {tier === null ? <p className="og-note">Checking…</p>
        : tier === 'executive' ? <h3><CheckCircle2 size={18} style={{ display: 'inline' }} /> Executive Member</h3>
        : <Badge variant="outline">Basic</Badge>}
    </article>

    {tier === 'basic' && <article className="module">
      <Eyebrow>EXECUTIVE APPLICATION</Eyebrow>
      {status === 'pending' ? <p>Your application is under review.</p> : <>
        {status === 'declined' && <p className="og-note">Application not approved. You may submit again.</p>}
        <form style={{ display: 'grid', gap: 10 }} onSubmit={e => { e.preventDefault(); void submit() }}>
          <label>Full name<Input value={form.name} onChange={set('name')} required /></label>
          <label>Title<Input value={form.title} onChange={set('title')} required /></label>
          <label>Company<Input value={form.company} onChange={set('company')} required /></label>
          <label>Professional profile URL<Input type="url" value={form.profileUrl} onChange={set('profileUrl')} placeholder="https://" required /></label>
          <label>Why Executive?<Textarea value={form.reason} maxLength={2000} onChange={set('reason')} required /></label>
          <small className="og-note">{form.reason.trim().length}/2000 (minimum 30)</small>
          <Button type="submit" disabled={busy}>Submit application</Button>
        </form>
      </>}
    </article>}

    {isAdmin && <article className="module">
      <Eyebrow signal={apps.length > 0}>PENDING APPLICATIONS</Eyebrow>
      {!apps.length && <p className="og-note">No pending applications.</p>}
      {apps.map(a => <div key={a.userId} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <strong>{a.name}</strong> · {a.title} · {a.company}<br />
        <a href={a.profileUrl} target="_blank" rel="noopener noreferrer">Profile</a>
        <p className="og-note">{a.reason}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" disabled={busy} onClick={() => void review(a.userId, true)}>Approve</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void review(a.userId, false)}>Decline</Button>
        </div>
      </div>)}
    </article>}
  </section>
}
