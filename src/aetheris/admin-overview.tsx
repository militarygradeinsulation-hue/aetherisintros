import { AdminMetricBento } from './AdminMetricBento'
import { useEffect, useRef, useState } from 'react'
import { useAccess } from '@/aetheris/access'
import { parseAdminOverview, type AdminStats } from '@/aetheris/lib/admin-overview-contract'
import { supabase } from '@/integrations/supabase/client'

type Stats = AdminStats
export function AdminOverview() {
  const { access } = useAccess()
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsAccount, setStatsAccount] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const requestSequence = useRef(0)
  const refresh = async () => {
    const requestId = ++requestSequence.current
    setBusy(true)
    setError('')
    try {
      const { data, error: fault } = await (supabase as unknown as { rpc: (name: string) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc('admin_platform_overview')
      if (fault) throw new Error(fault.message)
      const validated = parseAdminOverview(data)
      if (requestId === requestSequence.current) { setStats(validated); setStatsAccount(access.userId ?? null) }
    } catch (cause) {
      if (requestId === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : 'Could not load administrator analytics. Try again.')
        setStats(null)
      }
    } finally {
      if (requestId === requestSequence.current) setBusy(false)
    }
  }
  useEffect(() => {
    setStats(null); setStatsAccount(null); setError(''); setBusy(false)
    if (!access.loading && access.signedIn && access.isAdmin && access.emailConfirmed) void refresh()
    return () => { requestSequence.current += 1 }
  }, [access.loading, access.signedIn, access.isAdmin, access.emailConfirmed, access.userId])
  if (access.loading) return <main style={{ padding: 32 }}>Checking permissions…</main>
  if (!access.signedIn || !access.isAdmin || !access.emailConfirmed) return <main style={{ padding: 32 }}>Administrator access only.</main>
  const visibleStats = statsAccount === access.userId ? stats : null
  return <main style={{ background: '#10151d', color: '#f5f7fb', minHeight: '100vh', padding: 'clamp(20px,4vw,56px)' }}>
    <div style={{ maxWidth: 1100, margin: 'auto' }}>
      <a href="/app" style={{ color: '#9ad6f8' }}>← Return to Ask Intros</a>
      <p style={{ color: '#FF5A5A', letterSpacing: 2, fontSize: 12, marginTop: 32 }}>ASK INTROS / OWNER OPERATIONS</p>
      <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700 }}>Platform overview</h1>
      <p style={{ color: '#ccd6e2' }}>Private aggregated platform statistics. Only server-authorized administrators can query the totals.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()} style={{ background: '#235777', color: 'white', padding: '12px 20px', borderRadius: 10, marginBlock: 20 }}>{busy ? 'Refreshing…' : 'Refresh counts'}</button>
      {error && <p role="alert" style={{ color: '#FFA7A7' }}>{error}</p>}
      {!visibleStats && !error && <p>Loading statistics…</p>}
      {visibleStats && <AdminMetricBento stats={visibleStats} />}
    </div>
  </main>
}
