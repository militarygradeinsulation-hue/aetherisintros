/**
 * Admin-only network health: member funnel, incomplete profiles and how long since those
 * members signed in, likely duplicate accounts, suspicious field values, isolated members,
 * stalled verifications and marketplace activity. Reads admin_network_health() (0035).
 */
import { useEffect, useRef, useState } from 'react'
import { Activity } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { Eyebrow } from './ui'
import { parseNetworkHealth, parseAdminErrorReports, type NetworkHealth, type AdminErrorReport } from './lib/network-health-contract'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Health = NetworkHealth

export function AdminNetworkHealthPanel() {
  const [h, setH] = useState<Health | null>(null)
  const requestId = useRef(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const reload = async () => {
    const request = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const r = await (supabase as any).rpc('admin_network_health')
      if (r.error) throw new Error(r.error.message || 'Unable to load network health.')
      const health = parseNetworkHealth(r.data)
      if (request === requestId.current) setH(health)
    } catch (cause) {
      if (request === requestId.current) {
        setH(null)
        setError(cause instanceof Error ? cause.message : 'Unable to reach network health reporting.')
      }
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }
  useEffect(() => { void reload(); return () => { requestId.current++ } }, [])
  if (error) return <section className="executive-section" role="alert"><Eyebrow><Activity size={12} /> NETWORK HEALTH</Eyebrow><p className="og-note">{error}</p><button type="button" onClick={() => void reload()}>Retry</button></section>
  if (loading && !h) return <section className="executive-section" aria-busy="true"><Eyebrow><Activity size={12} /> NETWORK HEALTH</Eyebrow><p>Loading network health…</p></section>
  if (!h) return null
  const m = h.members
  return <section className="executive-section admin-health">
    <Eyebrow><Activity size={12} /> NETWORK HEALTH</Eyebrow>
    <h2>Who is stuck, and where.</h2>
    <dl className="oc-funnel">
      <div><dt>Members</dt><dd>{m.total}</dd></div>
      <div><dt>Onboarded</dt><dd>{m.onboarded}</dd></div>
      <div><dt>Verified</dt><dd>{m.verified}</dd></div>
      <div><dt>Not yet verified</dt><dd>{m.blocked}</dd></div>
    </dl>
    <dl className="oc-funnel">
      <div><dt>Live asks</dt><dd>{h.marketplace.live_asks}</dd></div>
      <div><dt>Open introductions</dt><dd>{h.marketplace.open_intros}</dd></div>
      <div><dt>Isolated members</dt><dd>{h.isolated_members.length}</dd></div>
      <div><dt>Demo rows left</dt><dd>{h.marketplace.demo_rows_still_present}</dd></div>
    </dl>
    {(h.incomplete_profiles ?? []).length > 0 && <>
      <h3>Incomplete profiles</h3>
      <table className="admin-health-table"><thead><tr><th>Member</th><th>Strength</th><th>Joined</th><th>Last sign-in</th></tr></thead>
        <tbody>{h.incomplete_profiles.map((p: any, i: number) => <tr key={i}><td>{p.name || '—'}<small>{p.email}</small></td><td>{p.strength == null ? 'unknown' : `${p.strength}%`}</td><td>{p.joined}</td><td>{p.last_sign_in ? `${p.days_since_sign_in} days ago` : 'never'}</td></tr>)}</tbody></table>
    </>}
    {(h.stalled_verifications ?? []).length > 0 && <><h3>Verifications waiting</h3><ul>{h.stalled_verifications.map((v: any, i: number) => <li key={i}>{v.name} · {v.status.replace(/_/g, ' ')} · {v.days ?? 0} days</li>)}</ul></>}
    {(h.likely_duplicates ?? []).length > 0 && <><h3>Possible duplicate accounts</h3><ul>{h.likely_duplicates.map((d: any, i: number) => <li key={i}>{d.name}: {(d.accounts ?? []).map((a: any) => a.email).join(', ')}</li>)}</ul></>}
    {(h.suspect_field_values ?? []).length > 0 && <><h3>Profile values to check</h3><ul>{h.suspect_field_values.map((s: any, i: number) => <li key={i}>{s.name}: {s.field} “{s.value}” ({s.issue})</li>)}</ul></>}
    {(h.isolated_members ?? []).length > 0 && <><h3>Members with no connections</h3><p className="og-note">{h.isolated_members.join(', ')}</p></>}
    <p className="og-note">Checked {h.checked_at ? new Date(h.checked_at).toLocaleString() : 'just now'}. Admins only; it includes member emails.</p>
  </section>
}

type AppError = AdminErrorReport

/** Errors members and the server hit in the last two weeks, grouped by message (newest first). */
export function AdminErrorsPanel() {
  const [rows, setRows] = useState<AppError[] | null>(null)
  const requestId = useRef(0)
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const reload = async () => {
    const request = ++requestId.current
    setLoading(true)
    setError('')
    // Keep the time window aligned with the panel title, and cap expensive reads.
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    try {
      const r = await (supabase as any).from('app_errors')
        .select('id, created_at, source, message, stack, url, user_agent')
        .gte('created_at', since)
        .order('created_at', { ascending: false }).limit(300)
      if (r.error) throw new Error(r.error.message || 'Unable to load error reports.')
      const reports = parseAdminErrorReports(r.data)
      if (request === requestId.current) setRows(reports)
    } catch (cause) {
      if (request === requestId.current) {
        setRows(null)
        setError(cause instanceof Error ? cause.message : 'Unable to reach the error reporting service.')
      }
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }
  useEffect(() => { void reload(); return () => { requestId.current++ } }, [])
  if (loading && !rows) return <section className="executive-section admin-health" aria-busy="true"><h2>Loading error reports…</h2></section>
  if (error) return <section className="executive-section admin-health" role="alert"><h2>Error reporting unavailable</h2><p className="og-note">{error}</p><button type="button" onClick={() => void reload()}>Retry</button></section>
  if (!rows) return null
  const groups = new Map<string, { latest: AppError; count: number; pages: Set<string> }>()
  for (const e of rows) {
    const g = groups.get(e.message)
    if (g) { g.count++; g.pages.add(e.url) } else groups.set(e.message, { latest: e, count: 1, pages: new Set([e.url]) })
  }
  return <section className="executive-section admin-health">
    <Eyebrow><Activity size={12} /> ERRORS · LAST 14 DAYS</Eyebrow>
    <h2>{rows.length ? `${groups.size} distinct error${groups.size === 1 ? '' : 's'}, ${rows.length} reports.` : 'No errors reported.'}</h2>
    <ul className="admin-list">
      {[...groups.values()].slice(0, 30).map(({ latest, count, pages }) => <li key={latest.id}>
        <span><b>{latest.source === 'server' ? 'Server' : 'Browser'}</b> · {latest.message}</span>
        <small>{count}× · last {new Date(latest.created_at).toLocaleString()} · {[...pages].filter(Boolean).slice(0, 3).join(', ') || 'no page'}
          {latest.stack && <> · <button type="button" className="text-link" onClick={() => setOpen(open === latest.id ? null : latest.id)}>{open === latest.id ? 'hide' : 'stack'}</button></>}</small>
        {open === latest.id && <pre className="admin-error-stack">{latest.stack}</pre>}
      </li>)}
    </ul>
  </section>
}
