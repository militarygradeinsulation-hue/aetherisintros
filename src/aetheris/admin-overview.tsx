import { useEffect, useRef, useState } from 'react'
import { useAccess } from '@/aetheris/access'
import { parseAdminOverview, type AdminStats } from '@/aetheris/lib/admin-overview-contract'
import { supabase } from '@/integrations/supabase/client'

type Stats = AdminStats
const metrics: { key: keyof Omit<Stats, 'generated_at'>; label: string }[] = [
  { key: 'registered_accounts', label: 'Registered accounts' },
  { key: 'confirmed_accounts', label: 'Confirmed emails' },
  { key: 'approved_members', label: 'Approved members' },
  { key: 'pending_members', label: 'Pending / waitlisted' },
  { key: 'onboarded_profiles', label: 'Completed onboarding' },
  { key: 'introduction_requests', label: 'Introduction requests' },
  { key: 'messages', label: 'Messages sent' },
  { key: 'posts', label: 'Network posts' },
  { key: 'asks', label: 'Member asks' },
]
export function AdminOverview() {
  const { access } = useAccess()
  const [stats, setStats] = useState<Stats | null>(null)
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
      if (requestId === requestSequence.current) setStats(validated)
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
    if (!access.loading && access.isAdmin && access.emailConfirmed) void refresh()
    return () => { requestSequence.current += 1 }
  }, [access.loading, access.isAdmin, access.emailConfirmed])
  if (access.loading) return <main style={{ padding: 32 }}>Checking permissions…</main>
  if (!access.signedIn || !access.isAdmin || !access.emailConfirmed) return <main style={{ padding: 32 }}>Administrator access only.</main>
  return <main style={{ background: '#10151d', color: '#f5f7fb', minHeight: '100vh', padding: 'clamp(20px,4vw,56px)' }}>
    <div style={{ maxWidth: 1100, margin: 'auto' }}>
      <a href="/app" style={{ color: '#9ad6f8' }}>← Return to Ask Intros</a>
      <p style={{ color: '#FF5A5A', letterSpacing: 2, fontSize: 12, marginTop: 32 }}>ASK INTROS / OWNER OPERATIONS</p>
      <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700 }}>Platform overview</h1>
      <p style={{ color: '#ccd6e2' }}>Private aggregated platform statistics. Only server-authorized administrators can query the totals.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()} style={{ background: '#235777', color: 'white', padding: '12px 20px', borderRadius: 10, marginBlock: 20 }}>{busy ? 'Refreshing…' : 'Refresh counts'}</button>
      {error && <p role="alert" style={{ color: '#FFA7A7' }}>{error}</p>}
      {!stats && !error && <p>Loading statistics…</p>}
      {stats && <section aria-label="Platform statistics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 16 }}>
        {metrics.map(m => <article key={m.key} style={{ background: '#1c2938', border: '1px solid #52718b', borderRadius: 14, padding: 22, minWidth: 0 }}>
          <p style={{ color: '#d1dce7', fontSize: 14 }}>{m.label}</p>
          <strong style={{ color: 'white', fontSize: 35, fontVariantNumeric: 'tabular-nums' }}>{stats[m.key].toLocaleString()}</strong>
        </article>)}
      </section>}
      {stats && <p style={{ color: '#bdcbd8', marginTop: 20, fontSize: 13 }}>Updated {new Date(stats.generated_at).toLocaleString()}</p>}
    </div>
  </main>
}
