/**
 * "Give & get" (the member's own reciprocity ledger plus ways to give this week) and
 * "Keep warm" (important relationships going quiet). Both read only the signed-in member's
 * own data and render nothing for visitors.
 */
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BellOff, HandHeart, MessageSquare, Snowflake, TimerReset } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'

import { ensureThread } from './live'
import {
  GIVE_LABEL, loadCooling, loadReciprocity, loadReciprocitySettings, loadWaysToGive, setReciprocitySettings, setRelationshipSnooze, spanLabel,
  type CoolingRelationship, type GiveKind, type GiverBand, type Reciprocity, type WayToGive,
} from './reciprocity'

const BAND_COPY: Record<GiverBand, string> = {
  Emerging: 'You are getting started. Answer an ask or accept an introduction to grow this.',
  Contributor: 'You help people across the network regularly.',
  Pillar: 'You help many people, and they confirm it made a difference.',
}

const kinds = Object.keys(GIVE_LABEL) as GiveKind[]

/** The member's own gives and gets over the last 12 months, and asks they could answer now. */
export function GiveGetCard({ onOpenAsks }: { onOpenAsks: () => void }) {
  const [data, setData] = useState<Reciprocity | null>(null)
  const [ways, setWays] = useState<WayToGive[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let stale = false
    void (async () => {
      const { data: auth } = await supabase.auth.getSession()
      if (!auth.session?.user.id) return
      const [r, w] = await Promise.all([loadReciprocity(), loadWaysToGive()])
      if (stale) return
      setData(r.data); setWays(w.data); setError(r.error || w.error)
    })()
    return () => { stale = true }
  }, [])
  if (!data) return error ? <p className="tw-error">Give &amp; get could not load: {error}</p> : null

  const toggleBand = async () => {
    setBusy(true)
    const r = await setReciprocitySettings({ showBand: !data.show_band })
    if (r.data) setData({ ...data, show_band: r.data.show_band }); else setError(r.error)
    setBusy(false)
  }
  const rows = kinds.filter(k => (data.gives[k] ?? 0) + (data.gets[k] ?? 0) > 0)

  return <section className="this-week rc-card" aria-label="Give and get">
    <header>
      <span className="home-board-label">Give &amp; get · last 12 months</span>
      <h2><HandHeart size={18} aria-hidden /> {data.band}</h2>
      <p>{BAND_COPY[data.band]}</p>
    </header>
    {rows.length ? <table className="rc-table">
      <thead><tr><th scope="col">What</th><th scope="col">You gave</th><th scope="col">You got</th></tr></thead>
      <tbody>{rows.map(k => <tr key={k}><td>{GIVE_LABEL[k]}</td><td>{data.gives[k] ?? 0}</td><td>{data.gets[k] ?? 0}</td></tr>)}</tbody>
    </table> : <p className="rc-note">Nothing yet. Answering an ask or accepting an introduction request counts here.</p>}
    {(data.helped.length > 0 || data.helped_you.length > 0) && <div className="rc-people">
      {data.helped.length > 0 && <div><b>You helped</b><span>{data.helped.map(p => p.name).join(', ')}</span></div>}
      {data.helped_you.length > 0 && <div><b>Helped you</b><span>{data.helped_you.map(p => p.name).join(', ')}</span></div>}
    </div>}
    <p className="rc-note">Counted from real activity. A meeting or outcome counts much more when the other person confirms it. Back-and-forth with the same person within 30 days counts once.</p>
    {ways.length > 0 && <>
      <span className="home-board-label">Ways to give this week</span>
      <ol>{ways.map(w => <li key={w.id}>
        <HandHeart size={16} aria-hidden />
        <div><b>{w.author} asked: “{w.ask.length > 90 ? `${w.ask.slice(0, 89).trimEnd()}…` : w.ask}”</b><span>No replies yet. Matches: {w.matched.join(', ')}.</span></div>
        <button type="button" onClick={onOpenAsks}>See the ask <ArrowRight size={13} /></button>
      </li>)}</ol>
    </>}
    <label className="tw-digest"><input type="checkbox" checked={data.show_band} disabled={busy} onChange={() => void toggleBand()} /> Show my giver band on my profile (members see the band only, never counts or names)</label>
    {error && <p className="tw-error">{error}</p>}
  </section>
}

/** Important relationships going quiet, each with a real reason to reach out. */
export function KeepWarmPanel({ onMessage }: { onMessage: () => void }) {
  const [items, setItems] = useState<CoolingRelationship[] | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession()
    const id = auth.session?.user.id ?? null
    setUid(id)
    if (!id) return
    const r = await loadCooling(5)
    setItems(r.data); setError(r.error)
  }, [])
  useEffect(() => { void load() }, [load])
  if (!uid || items === null || (!items.length && !error)) return null

  const act = async (item: CoolingRelationship, mode: 'snooze' | 'dismiss') => {
    setItems(list => (list ?? []).filter(x => !(x.id === item.id && x.kind === item.kind)))
    const r = await setRelationshipSnooze(item.kind, item.id, mode)
    if (r.error) { setError(r.error); void load() }
  }
  const message = async (item: CoolingRelationship) => {
    await ensureThread(uid, item.id)
    onMessage()
  }

  return <section className="this-week rc-warm" aria-label="Keep warm">
    <header>
      <span className="home-board-label">Keep warm</span>
      <h2>{items.length} relationship{items.length === 1 ? '' : 's'} going quiet.</h2>
      <p>From your own messages, meetings, introductions and CRM. Only you see this.</p>
    </header>
    <ol>{items.map(item => <li key={`${item.kind}-${item.id}`}>
      <Snowflake size={16} aria-hidden />
      <div>
        <b>{item.name}</b>
        <span>Usually every {spanLabel(item.cadence_days)}; quiet for {spanLabel(item.quiet_days)}. {item.reason_kind === 'cadence' ? '' : item.reason}</span>
      </div>
      <div className="rc-actions">
        {item.kind === 'member' && <button type="button" onClick={() => void message(item)}><MessageSquare size={13} /> Message</button>}
        <button type="button" onClick={() => void act(item, 'snooze')}><TimerReset size={13} /> Snooze 30 days</button>
        <button type="button" onClick={() => void act(item, 'dismiss')}><BellOff size={13} /> Not important</button>
      </div>
    </li>)}</ol>
    {error && <p className="tw-error">{error}</p>}
  </section>
}

/** Settings → Notifications: the weekly "going quiet" nudge (on by default). */
export function CoolingNudgeSetting() {
  const [on, setOn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let stale = false
    void loadReciprocitySettings().then(s => { if (!stale && s) setOn(s.cooling_nudges) })
    return () => { stale = true }
  }, [])
  if (on === null) return null
  const toggle = async () => {
    setBusy(true)
    const r = await setReciprocitySettings({ coolingNudges: !on })
    if (r.data) setOn(r.data.cooling_nudges); else setError(r.error)
    setBusy(false)
  }
  return <>
    <button type="button" role="switch" aria-checked={on} disabled={busy} className={`control-toggle ${on ? 'active' : ''}`} onClick={() => void toggle()}><span /><b>Weekly nudge when an important relationship goes quiet</b></button>
    {error && <p className="tw-error">{error}</p>}
  </>
}

/** A member's giver band on their profile, only when they chose to show it. */
export function GiverBandBadge({ memberId }: { memberId: string }) {
  const [band, setBand] = useState<GiverBand | null>(null)
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(memberId)) return
    let stale = false
    void (supabase as any).rpc('member_giver_band', { p_member: memberId }).then((r: { data: GiverBand | null }) => { if (!stale) setBand(r.data ?? null) }) // eslint-disable-line @typescript-eslint/no-explicit-any
    return () => { stale = true }
  }, [memberId])
  if (!band) return null
  return <p className="rc-badge"><HandHeart size={13} aria-hidden /> Giver: <b>{band}</b></p>
}
