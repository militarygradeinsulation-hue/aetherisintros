/**
 * Admin-only network health: member funnel, incomplete profiles and how long since those
 * members signed in, likely duplicate accounts, suspicious field values, isolated members,
 * stalled verifications and marketplace activity. Reads admin_network_health() (0035).
 */
import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Health = any

export function AdminNetworkHealthPanel() {
  const [h, setH] = useState<Health | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void (supabase as any).rpc('admin_network_health').then((r: any) => { if (r.error) setError(r.error.message); else setH(r.data) })
  }, [])
  if (error) return <section className="executive-section"><Eyebrow><Activity size={12} /> NETWORK HEALTH</Eyebrow><p className="og-note">{error}</p></section>
  if (!h) return null
  const m = h.members ?? {}
  return <section className="executive-section admin-health">
    <Eyebrow><Activity size={12} /> NETWORK HEALTH</Eyebrow>
    <h2>Who is stuck, and where.</h2>
    <dl className="oc-funnel">
      <div><dt>Members</dt><dd>{m.total ?? 0}</dd></div>
      <div><dt>Onboarded</dt><dd>{m.onboarded ?? 0}</dd></div>
      <div><dt>Verified</dt><dd>{m.verified ?? 0}</dd></div>
      <div><dt>Not yet verified</dt><dd>{m.blocked ?? 0}</dd></div>
    </dl>
    <dl className="oc-funnel">
      <div><dt>Live asks</dt><dd>{h.marketplace?.live_asks ?? 0}</dd></div>
      <div><dt>Open introductions</dt><dd>{h.marketplace?.open_intros ?? 0}</dd></div>
      <div><dt>Isolated members</dt><dd>{(h.isolated_members ?? []).length}</dd></div>
      <div><dt>Demo rows left</dt><dd>{h.marketplace?.demo_rows_still_present ?? 0}</dd></div>
    </dl>
    {(h.incomplete_profiles ?? []).length > 0 && <>
      <h3>Incomplete profiles</h3>
      <table className="admin-health-table"><thead><tr><th>Member</th><th>Strength</th><th>Joined</th><th>Last sign-in</th></tr></thead>
        <tbody>{h.incomplete_profiles.map((p: any, i: number) => <tr key={i}><td>{p.name || '—'}<small>{p.email}</small></td><td>{p.strength}%</td><td>{p.joined}</td><td>{p.last_sign_in ? `${p.days_since_sign_in} days ago` : 'never'}</td></tr>)}</tbody></table>
    </>}
    {(h.stalled_verifications ?? []).length > 0 && <><h3>Verifications waiting</h3><ul>{h.stalled_verifications.map((v: any, i: number) => <li key={i}>{v.name} · {v.status.replace(/_/g, ' ')} · {v.days ?? 0} days</li>)}</ul></>}
    {(h.likely_duplicates ?? []).length > 0 && <><h3>Possible duplicate accounts</h3><ul>{h.likely_duplicates.map((d: any, i: number) => <li key={i}>{d.name}: {(d.accounts ?? []).map((a: any) => a.email).join(', ')}</li>)}</ul></>}
    {(h.suspect_field_values ?? []).length > 0 && <><h3>Profile values to check</h3><ul>{h.suspect_field_values.map((s: any, i: number) => <li key={i}>{s.name}: {s.field} “{s.value}” ({s.issue})</li>)}</ul></>}
    {(h.isolated_members ?? []).length > 0 && <><h3>Members with no connections</h3><p className="og-note">{h.isolated_members.join(', ')}</p></>}
    <p className="og-note">Checked {h.checked_at ? new Date(h.checked_at).toLocaleString() : 'just now'}. Admins only; it includes member emails.</p>
  </section>
}
