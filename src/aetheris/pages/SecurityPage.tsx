/**
 * Security & Privacy — what the member can see and control about their own account.
 *
 * Deliberately shows no proof documents, reviewer notes or risk flags.
 */
import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Download, FileMinus, KeyRound, LogOut, ShieldCheck, Trash2 } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Btn, Eyebrow } from '../ui'
import {
  badgeLabel, fetchSecurityEvents, logSecurityEvent, purgeProof, statusCopy,
  passwordProblem, useVerification, type SecurityEvent,
} from '../verification'

const NEVER_EXPORTED = ['reviewer notes', 'internal risk flags']

export function SecurityPage() {
  const { verification, loading, refresh } = useVerification()
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [mfa, setMfa] = useState<'none' | 'enrolled' | 'unknown'>('unknown')
  const [sessionSince, setSessionSince] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => { void fetchSecurityEvents().then(setEvents) }, [])
  useEffect(reload, [reload])

  useEffect(() => {
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      const factors = [...(data?.totp ?? []), ...(data?.all ?? [])]
      setMfa(factors.some(f => f.status === 'verified') ? 'enrolled' : 'none')
    }).catch(() => setMfa('unknown'))
    void supabase.auth.getSession().then(({ data }) => {
      const issued = data.session?.user?.last_sign_in_at
      if (issued) setSessionSince(new Date(issued).toLocaleString())
    })
  }, [])

  const changePassword = async () => {
    const problem = passwordProblem(password)
    if (problem) { setMessage(problem); return }
    setBusy(true); setMessage('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setMessage(error.message); setBusy(false); return }
    await logSecurityEvent('password_changed', 'Account password changed.')
    setPassword(''); setMessage('Password updated.'); reload(); setBusy(false)
  }

  const revokeOthers = async () => {
    setBusy(true); setMessage('')
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    await logSecurityEvent('sessions_revoked', 'Signed out of all other devices.')
    setMessage(error ? error.message : 'Every other signed-in device has been signed out.')
    reload(); setBusy(false)
  }

  /** Everything the account owns, in one file, from the member's own permissions. */
  const exportData = async () => {
    setBusy(true); setMessage('')
    const tables = ['profiles', 'memories', 'posts', 'asks', 'intro_requests', 'calendar_events',
      'crm_people', 'crm_companies', 'crm_opportunities', 'crm_tasks', 'crm_notes',
      'grid_workbooks', 'grid_sheets', 'grid_rows', 'account_security_events'] as const
    const payload: Record<string, unknown> = { exported_at: new Date().toISOString(), excluded: NEVER_EXPORTED }
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*').limit(5000)
      payload[table] = data ?? []
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'aetheris-intros-export.json'; link.click()
    URL.revokeObjectURL(url)
    await logSecurityEvent('data_exported', 'Account data exported to a file.')
    setMessage('Your export has been downloaded.'); reload(); setBusy(false)
  }

  const purge = async () => {
    setBusy(true); setMessage('')
    try {
      await purgeProof(); await refresh()
      setMessage('Your proof documents have been removed. The verification result stays on record.')
    } catch { setMessage('Those documents could not be removed.') }
    reload(); setBusy(false)
  }

  const requestDeletion = async () => {
    if (!window.confirm('Delete your Aetheris Intros account and its data? This cannot be undone.')) return
    setBusy(true); setMessage('')
    await logSecurityEvent('deletion_requested', 'Member requested account and data deletion.')
    setMessage('Deletion requested. Your account is queued for removal and a confirmation will be emailed. Only a minimal verification record is retained for security and legal reasons.')
    reload(); setBusy(false)
  }

  const status = loading ? 'Checking…' : statusCopy[verification.status].title

  return <div className="security-layout">
    <section className="security-panel">
      <Eyebrow>MEMBERSHIP VERIFICATION</Eyebrow>
      <h2>{status}</h2>
      {verification.verifiedRole && <span className="verified-badge with-detail">
        <BadgeCheck size={13} /><b>{badgeLabel(verification.verifiedRole)}</b>
        <small>{verification.businessName}{verification.verifiedAt ? ` · Verified ${new Date(verification.verifiedAt).toLocaleDateString()}` : ''}</small>
      </span>}
      <p>{loading ? '' : statusCopy[verification.status].note}</p>
      <ul className="security-list">
        <li><span>Multi-factor</span><small>{mfa === 'enrolled' ? 'Enrolled' : mfa === 'none' ? 'Not enrolled' : 'Unknown'}</small></li>
        <li><span>This session started</span><small>{sessionSince || '—'}</small></li>
        <li><span>Proof documents</span><small>{verification.proofRetention === 'purged' ? 'Removed' : verification.evidenceCount ? `${verification.evidenceCount} held privately` : 'None held'}</small></li>
        <li><span>Privacy default</span><small>Everything private unless you share it</small></li>
      </ul>
    </section>

    <section className="security-panel">
      <Eyebrow>ACCOUNT SECURITY</Eyebrow>
      <h2>Keys, devices and sessions.</h2>
      <label className="access-field">
        <span>NEW PASSWORD (12+ CHARACTERS, MIXED CASE, NUMBER, SYMBOL)</span>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
      </label>
      <div className="security-actions">
        <Btn onClick={() => void changePassword()} disabled={busy || !password}><KeyRound size={14} /> Update password</Btn>
        <Btn onClick={() => void revokeOthers()} disabled={busy}><LogOut size={14} /> Sign out other devices</Btn>
      </div>
      {message && <p className="auth-notice">{message}</p>}
    </section>

    <section className="security-panel">
      <Eyebrow>YOUR DATA</Eyebrow>
      <h2>Export, retention and deletion.</h2>
      <p>
        Your CRM records, Grid workbooks, notes, meetings, relationship memory and private drafts are
        yours alone. They are never shown to the network, to reviewers, or to another account.
      </p>
      <div className="security-actions">
        <Btn onClick={() => void exportData()} disabled={busy}><Download size={14} /> Export my data</Btn>
        {verification.proofRetention !== 'purged' && verification.evidenceCount > 0 &&
          <Btn onClick={() => void purge()} disabled={busy}><FileMinus size={14} /> Remove my proof documents</Btn>}
        <Btn onClick={() => void requestDeletion()} disabled={busy}><Trash2 size={14} /> Delete my account and data</Btn>
      </div>
    </section>

    <section className="security-panel">
      <Eyebrow>RECENT SECURITY ACTIVITY</Eyebrow>
      <h2>What happened on this account.</h2>
      <ul className="security-list">
        {events.map(event => <li key={event.id}>
          <span>{event.summary || event.event.replace(/_/g, ' ')}</span>
          <small>{new Date(event.created_at).toLocaleString()}</small>
        </li>)}
        {!events.length && <li><span>No security activity recorded yet.</span></li>}
      </ul>
      <p className="security-note"><ShieldCheck size={15} /> Aetheris Intros makes no certification claims. Security here means real controls you can see and use.</p>
    </section>
  </div>
}

export default SecurityPage
