/**
 * Network Impact Report surfaces: the report body (shared by the public /impact page and the
 * admin preview), the admin panel to preview, freeze and publish a quarter, and the member's
 * own impact card in Settings → Membership.
 */
import { Check, Copy, Eye, EyeOff, Sparkles, Trash2, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import {
  categoryRows, formatCount, formatDays, formatUsd, recentQuarters, slugify, suppressMetrics, type ImpactMetrics, type Quarter,
} from './impact'
import { Btn, Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export const IMPACT_NOTE = 'Numbers are counted from member-confirmed records: introductions both people accepted, meetings both people joined, outcomes participants reported and deals the other person did not dispute. Any figure below 3 is shown as “fewer than 3”, and no names are included.'

/* ── Report body ───────────────────────────────────────────────────────────────────────── */

export function ImpactReportBody({ metrics: m, headline }: { metrics: ImpactMetrics; headline?: string }) {
  const value = formatUsd(m.deals_value_usd_cents)
  const median = formatDays(m.median_days_intro_to_meeting)
  const cats = categoryRows(m.outcomes_by_category)
  const stat = (label: string, v: string, sub?: string) => <div><dt>{label}</dt><dd>{v}{sub && <small>{sub}</small>}</dd></div>
  return <div className="impact-body">
    <div className="impact-hero">
      {value
        ? <><strong>{value}</strong><span>in deals came from introductions{m.deals_won !== undefined ? ` · ${formatCount(m.deals_won).toLowerCase()} deals won` : ''}</span></>
        : <><strong>{formatCount(m.intros_accepted)}</strong><span>introductions accepted by both people</span></>}
      {headline && <p>{headline}</p>}
    </div>
    <section>
      <h3>Members</h3>
      <dl className="impact-grid">
        {stat('Verified members', formatCount(m.members_verified))}
        {stat('Active this period', formatCount(m.members_active))}
        {stat('New members', formatCount(m.members_new))}
      </dl>
    </section>
    <section>
      <h3>Asks and introductions</h3>
      <dl className="impact-grid">
        {stat('Asks posted', formatCount(m.asks_posted))}
        {stat('Asks answered', formatCount(m.asks_answered))}
        {stat('Introductions requested', formatCount(m.intros_requested))}
        {stat('Introductions accepted', formatCount(m.intros_accepted))}
        {stat('Meetings held', formatCount(m.meetings_held), m.meetings_from_intros !== undefined ? `${formatCount(m.meetings_from_intros)} from introductions` : undefined)}
        {median && stat('Median days to first meeting', median, 'from acceptance')}
      </dl>
    </section>
    <section>
      <h3>What came of it</h3>
      <dl className="impact-grid">
        {stat('Outcomes reported', formatCount(m.outcomes_reported))}
        {stat('Deals won', formatCount(m.deals_won))}
        {stat('Deal value (USD)', value ?? 'Not shown', value ? undefined : 'fewer than 3 deals')}
      </dl>
      {cats.length > 0 && <ul className="impact-cats">{cats.map(c => <li key={c.key}><span>{c.label}</span><b>{c.value}</b></li>)}</ul>}
    </section>
  </div>
}

/* ── Admin: preview, freeze, publish ───────────────────────────────────────────────────── */

interface Snapshot { id: string; slug: string; period_label: string; period_from: string; period_to: string; headline: string; published: boolean; published_at: string | null; frozen_at: string; metrics: ImpactMetrics }

export function AdminImpactPanel() {
  const quarters = useMemo(() => recentQuarters(new Date(), 8), [])
  const [qi, setQi] = useState(1) // last full quarter by default
  const q = (quarters[qi] ?? quarters[0]) as Quarter
  const [raw, setRaw] = useState<ImpactMetrics | null>(null)
  const [headline, setHeadline] = useState('')
  const [snaps, setSnaps] = useState<Snapshot[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')

  const loadSnaps = useCallback(async () => {
    const r = await db.from('impact_reports').select('id, slug, period_label, period_from, period_to, headline, published, published_at, frozen_at, metrics').order('period_from', { ascending: false })
    setSnaps(r.data ?? [])
  }, [])
  useEffect(() => { void loadSnaps() }, [loadSnaps])
  useEffect(() => {
    setRaw(null); setMsg('')
    void db.rpc('admin_impact_report', { p_from: q.from, p_to: q.to }).then((r: any) => {
      if (r.error) setMsg(r.error.message); else setRaw(r.data ?? null)
    })
  }, [q.from, q.to])
  const existing = snaps.find(s => s.slug === slugify(q.label))
  useEffect(() => { setHeadline(existing?.headline ?? '') }, [existing?.id, existing?.headline])

  const preview = raw ? suppressMetrics(raw) : null
  const link = (slug: string) => `${typeof location === 'undefined' ? '' : location.origin}/impact/${slug}`

  const freeze = async () => {
    setBusy(true); setMsg('')
    const r = await db.rpc('admin_save_impact_report', { p_from: q.from, p_to: q.to, p_label: q.label, p_headline: headline.trim() })
    setBusy(false)
    setMsg(r.error ? r.error.message : existing ? `${q.label} snapshot refreshed with today's numbers.` : `${q.label} snapshot saved. Publish it when you are ready.`)
    void loadSnaps()
  }
  const setPublished = async (s: Snapshot, on: boolean) => {
    const r = await db.rpc('admin_set_impact_report_published', { p_id: s.id, p_published: on })
    setMsg(r.error ? r.error.message : on ? `${s.period_label} is public at ${link(s.slug)}` : `${s.period_label} is no longer public.`)
    void loadSnaps()
  }
  const remove = async (s: Snapshot) => {
    if (!confirm(`Delete the ${s.period_label} snapshot? Its link stops working.`)) return
    const r = await db.rpc('admin_delete_impact_report', { p_id: s.id })
    setMsg(r.error ? r.error.message : `${s.period_label} snapshot deleted.`)
    void loadSnaps()
  }
  const copy = async (slug: string) => {
    try { await navigator.clipboard.writeText(link(slug)); setCopied(slug); setTimeout(() => setCopied(''), 1800) }
    catch { setMsg(link(slug)) }
  }

  return <section className="executive-section admin-health impact-admin">
    <Eyebrow><TrendingUp size={12} /> NETWORK IMPACT REPORT</Eyebrow>
    <h2>What the network produced, ready to share.</h2>
    <p className="og-note">Preview a quarter, write a headline, then save a snapshot. The snapshot freezes the numbers, shows anything below 3 as “fewer than 3”, and is only public once you publish it.</p>
    <div className="impact-admin-controls">
      <label>Quarter<select value={qi} onChange={e => setQi(Number(e.target.value))}>{quarters.map((x, i) => <option key={x.label} value={i}>{x.label}{i === 0 ? ' (in progress)' : ''}</option>)}</select></label>
      <label className="wide">Headline <small>({headline.length}/280)</small><textarea rows={2} maxLength={280} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Introductions between members led to $1.2M in signed work this quarter." /></label>
      <Btn disabled={busy || !raw} onClick={() => void freeze()}><Sparkles size={14} /> {busy ? 'Saving…' : existing ? 'Refresh snapshot' : 'Save snapshot'}</Btn>
    </div>
    {raw && <details className="impact-raw"><summary>Exact numbers (admins only)</summary>
      <dl className="oc-funnel">{Object.entries(raw).filter(([k, v]) => typeof v !== 'object' && k !== 'from' && k !== 'to').map(([k, v]) => <div key={k}><dt>{k.replace(/_/g, ' ')}</dt><dd>{k === 'deals_value_usd_cents' ? formatUsd(v) : String(v ?? '—')}</dd></div>)}</dl>
    </details>}
    {preview
      ? <div className="impact-preview"><Eyebrow>AS IT WILL BE PUBLISHED · {q.label}</Eyebrow><ImpactReportBody metrics={preview} headline={headline.trim()} /></div>
      : !msg && <p className="og-note">Counting {q.label}…</p>}
    {msg && <p className="og-note">{msg}</p>}

    <h3>Snapshots</h3>
    {snaps.length === 0
      ? <p className="og-note">No snapshots yet. Save one above to get a shareable link.</p>
      : <ul className="admin-list">{snaps.map(s => <li key={s.id}>
        <span><b>{s.period_label}</b> · {s.published ? 'Public' : 'Draft'} · frozen {new Date(s.frozen_at).toLocaleDateString()}</span>
        <small className="impact-actions">
          {s.published
            ? <button type="button" className="text-link" onClick={() => void setPublished(s, false)}><EyeOff size={12} /> Unpublish</button>
            : <button type="button" className="text-link" onClick={() => void setPublished(s, true)}><Eye size={12} /> Publish</button>}
          {s.published && <button type="button" className="text-link" onClick={() => void copy(s.slug)}>{copied === s.slug ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}</button>}
          {s.published && <a className="text-link" href={`/impact/${s.slug}`} target="_blank" rel="noreferrer">Open</a>}
          <button type="button" className="text-link" aria-label={`Delete ${s.period_label}`} onClick={() => void remove(s)}><Trash2 size={12} /></button>
        </small>
      </li>)}</ul>}
  </section>
}

/* ── Member: own impact card ───────────────────────────────────────────────────────────── */

interface Card { asks_posted: number; asks_answered: number; intros_requested: number; intros_received: number; intros_accepted: number; meetings_held: number; outcomes_reported: number; outcomes_by_category: Record<string, number>; deals_recorded: number; deals_won: number; deals_value_usd_cents: number }

export function MyImpactCard() {
  const [c, setC] = useState<Card | null | undefined>(undefined)
  useEffect(() => { void db.rpc('my_impact_card').then((r: any) => setC(r.error ? null : r.data ?? null)) }, [])
  if (c === undefined) return null
  if (c === null) return <p className="og-note">Your impact could not be loaded right now.</p>
  const empty = !c.intros_requested && !c.intros_received && !c.asks_posted && !c.asks_answered
  const value = Number(c.deals_value_usd_cents) > 0 ? formatUsd(Number(c.deals_value_usd_cents)) : null
  const cats = categoryRows(c.outcomes_by_category)
  return <article className="impact-card">
    <header><b><TrendingUp size={14} /> Your impact</b><small>Only you can see this.</small></header>
    {empty
      ? <p className="og-note">Nothing yet. Ask the network for something or request an introduction, and what comes of it will be counted here.</p>
      : <>
        <dl className="oc-funnel">
          <div><dt>Asks posted</dt><dd>{c.asks_posted}</dd></div>
          <div><dt>Asks you answered</dt><dd>{c.asks_answered}</dd></div>
          <div><dt>Intros you requested</dt><dd>{c.intros_requested}</dd></div>
          <div><dt>Intros asked of you</dt><dd>{c.intros_received}</dd></div>
          <div><dt>Accepted introductions</dt><dd>{c.intros_accepted}</dd></div>
          <div><dt>Meetings held</dt><dd>{c.meetings_held}</dd></div>
          <div><dt>Outcomes you reported</dt><dd>{c.outcomes_reported}</dd></div>
          <div><dt>Deals you recorded</dt><dd>{c.deals_recorded}{value && <small>{value} won</small>}</dd></div>
        </dl>
        {cats.length > 0 && <p className="og-note">Outcomes: {cats.map(x => `${x.label} ${x.value}`).join(' · ')}</p>}
        <p className="og-note">Deal value counts work marked won that the other person has not disputed. Your numbers appear in the network report only as part of totals, never by name.</p>
      </>}
  </article>
}
