import { useEffect, useRef, useState } from 'react'
import { useAccess } from './access'
import { supabase } from '@/integrations/supabase/client'
import { checkMemberFeatures, MEMBER_FEATURE_READS } from './lib/member-feature-readiness'
import type { ConnectionResult, ReadRpc } from './lib/connection-preflight'
import { checkLinkedInReadiness, type ProviderReadiness } from './auth-provider-readiness'

const read: ReadRpc = (table, signal) => {
  const feature = MEMBER_FEATURE_READS.find(item => item.table === table)
  if (!feature) throw new Error('Unsupported readiness read')
  const db = supabase as unknown as { from(name: string): { select(columns: string): { limit(count: number): { abortSignal(value: AbortSignal): ReturnType<ReadRpc> } } } }
  return db.from(table).select(feature.columns).limit(0).abortSignal(signal)
}

export function MemberFeatureReadinessPanel() {
  const { access } = useAccess()
  const account = access.userId
  const allowed = !access.loading && access.signedIn && access.isAdmin && access.emailConfirmed && !!account
  const [report, setReport] = useState<{ account: string; rows: ConnectionResult[]; provider: ProviderReadiness } | null>(null)
  const [busy, setBusy] = useState(false)
  const run = useRef<AbortController | null>(null)
  useEffect(() => {
    run.current?.abort(); run.current = null; setReport(null); setBusy(false)
    return () => { run.current?.abort() }
  }, [account, allowed])
  if (!allowed) return null
  const check = async () => {
    if (!account || run.current) return
    const controller = new AbortController()
    run.current = controller; setBusy(true); setReport(null)
    const [rows, provider] = await Promise.all([checkMemberFeatures(read, controller.signal), checkLinkedInReadiness(controller.signal)])
    if (run.current !== controller || controller.signal.aborted) return
    setReport({ account, rows, provider }); setBusy(false); run.current = null
  }
  const visible = report?.account === account ? report : null
  return <section aria-label="Member feature availability" className="admin-connection-checks">
    <h2>Member feature availability</h2>
    <p>Check the database API used by this account without reading member records or changing data. A successful read does not prove that a full workflow or another member's access works.</p>
    <button type="button" disabled={busy} onClick={() => void check()}>{busy ? 'Checking feature storage…' : 'Check member feature storage'}</button>
    {busy && <p role="status">Checking {MEMBER_FEATURE_READS.length} feature reads and LinkedIn provider settings…</p>}
    {visible && <>
      <p role="status">{visible.rows.filter(row => row.state === 'read_verified').length} of {visible.rows.length} feature reads verified.</p>
      <p>LinkedIn: {visible.provider === 'enabled' ? 'provider enabled; real sign-in still needs verification' : visible.provider === 'disabled' ? 'provider disabled; configure the LinkedIn OIDC application in the production authentication settings' : 'provider configuration could not be verified'}</p>
      <ul>{visible.rows.map(row => <li key={row.id} data-state={row.state}><h3>{row.label}</h3><strong>{row.state === 'read_verified' ? 'Read verified' : row.state === 'schema_mismatch' ? 'Schema mismatch' : row.state === 'missing_database' ? 'Database setup needed' : row.state === 'access_denied' ? 'Access denied' : 'Check incomplete'}</strong><p>{row.detail}</p></li>)}</ul>
    </>}
  </section>
}
