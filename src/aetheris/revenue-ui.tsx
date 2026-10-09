/**
 * Revenue surfaces: the member's Membership settings (plans, Stripe Checkout, billing portal),
 * deals recorded on an introduction, and the admin Revenue and Concierge panels.
 */
import { BadgeCheck, CreditCard, Handshake, LifeBuoy, Plus, Trash2, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { billingStatus, openBillingPortal, startMembershipCheckout } from '@/lib/billing.functions'
import { Btn, Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface Plan { id: string; name: string; description: string; amount_cents: number; currency: string; billing_interval: 'month' | 'year'; active: boolean; sort: number }
interface Membership { plan_id: string | null; status: string; amount_cents: number; currency: string; billing_interval: string; current_period_end: string | null; cancel_at_period_end: boolean }

export const money = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)

const STATUS_COPY: Record<string, string> = {
  active: 'Active', trialing: 'Trial', past_due: 'Payment due', unpaid: 'Unpaid', canceled: 'Ended',
  incomplete: 'Payment not finished', incomplete_expired: 'Payment not finished', paused: 'Paused',
}

/* ── Member: Settings → Membership ─────────────────────────────────────────────────────── */

export function MembershipBilling() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [mine, setMine] = useState<Membership | null>(null)
  const [configured, setConfigured] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => {
    void db.from('membership_plans').select('*').eq('active', true).order('sort').then((r: any) => setPlans(r.data ?? []))
    void db.from('memberships').select('plan_id, status, amount_cents, currency, billing_interval, current_period_end, cancel_at_period_end').maybeSingle().then((r: any) => setMine(r.data ?? null))
    void billingStatus().then(r => setConfigured(r.configured)).catch(() => setConfigured(false))
    const back = new URLSearchParams(location.search).get('membership')
    if (back === 'welcome') setMsg('Thank you. Your membership is being confirmed and will show here in a moment.')
    if (back === 'cancelled') setMsg('Checkout was cancelled. Nothing was charged.')
  }, [])

  const join = async (planId: string) => {
    setBusy(planId); setMsg('')
    try { const { url } = await startMembershipCheckout({ data: { planId } }); location.assign(url) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Checkout could not start.'); setBusy('') }
  }
  const manage = async () => {
    setBusy('portal'); setMsg('')
    try { const { url } = await openBillingPortal(); location.assign(url) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Billing could not open.'); setBusy('') }
  }

  const current = mine && ['active', 'trialing', 'past_due', 'unpaid'].includes(mine.status) ? mine : null
  const planName = (id: string | null) => plans.find(p => p.id === id)?.name ?? 'Membership'
  return <div className="billing">
    {current
      ? <article className="billing-current">
        <BadgeCheck size={18} aria-hidden />
        <div>
          <b>{planName(current.plan_id)} · {STATUS_COPY[current.status] ?? current.status}</b>
          <p>{money(current.amount_cents, current.currency)} per {current.billing_interval}
            {current.current_period_end ? ` · ${current.cancel_at_period_end ? 'ends' : 'renews'} ${new Date(current.current_period_end).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</p>
          {current.status === 'past_due' && <p className="billing-warn">Your last payment did not go through. Update your card to keep your membership.</p>}
        </div>
        <Btn kind="secondary" disabled={busy === 'portal'} onClick={() => void manage()}><CreditCard size={14} /> {busy === 'portal' ? 'Opening…' : 'Manage billing'}</Btn>
      </article>
      : plans.length
        ? <div className="billing-plans">{plans.map(p => <article key={p.id} className="billing-plan">
          <Eyebrow>{p.name.toUpperCase()}</Eyebrow>
          <h3>{money(p.amount_cents, p.currency)}<small> / {p.billing_interval}</small></h3>
          {p.description && <p>{p.description}</p>}
          <Btn disabled={!configured || !!busy} onClick={() => void join(p.id)}>{busy === p.id ? 'Opening checkout…' : 'Become a member'}</Btn>
        </article>)}</div>
        : <p className="og-note">Membership plans are not open yet.</p>}
    {!configured && plans.length > 0 && !current && <p className="og-note">Payments are being set up. Check back shortly.</p>}
    {msg && <p className="og-note">{msg}</p>}
  </div>
}

/* ── Member: deals on an accepted introduction ─────────────────────────────────────────── */

interface Deal { id: string; title: string; value_cents: number; currency: string; status: 'in_progress' | 'won' | 'lost'; disputed: boolean; recorded_by: string; created_at: string }

export function IntroDeals({ introRequestId, myId }: { introRequestId: string; myId: string | null }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<Deal['status']>('won')
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const r = await db.from('intro_deals').select('id, title, value_cents, currency, status, disputed, recorded_by, created_at').eq('intro_request_id', introRequestId).order('created_at')
    setDeals(r.data ?? [])
  }, [introRequestId])
  useEffect(() => { void load() }, [load])

  const save = async () => {
    const cents = Math.round(Number(value.replace(/[^0-9.]/g, '')) * 100)
    if (title.trim().length < 3 || !Number.isFinite(cents)) { setMsg('Add a short description and the value.'); return }
    const r = await db.from('intro_deals').insert({ intro_request_id: introRequestId, title: title.trim(), value_cents: cents, status })
    if (r.error) { setMsg(r.error.message); return }
    setAdding(false); setTitle(''); setValue(''); setMsg(''); void load()
  }
  const total = deals.filter(d => d.status === 'won' && !d.disputed).reduce((n, d) => n + d.value_cents, 0)

  return <section className="intro-deals">
    <header><b><Handshake size={14} /> Business from this introduction</b>{total > 0 && <span>{money(total)}</span>}</header>
    {deals.length > 0 && <ul>{deals.map(d => <li key={d.id} className={d.disputed ? 'disputed' : ''}>
      <span>{d.title}</span>
      <small>{money(d.value_cents, d.currency)} · {d.status === 'won' ? 'Won' : d.status === 'lost' ? 'Did not happen' : 'In progress'}{d.disputed ? ' · disputed' : ''} · {d.recorded_by === myId ? 'you' : 'the other person'}</small>
      {d.recorded_by === myId
        ? <button type="button" aria-label="Remove" onClick={() => void db.from('intro_deals').delete().eq('id', d.id).then(load)}><Trash2 size={12} /></button>
        : <button type="button" className="text-link" onClick={() => void db.from('intro_deals').update({ disputed: !d.disputed }).eq('id', d.id).then(load)}>{d.disputed ? 'Confirm' : 'Dispute'}</button>}
    </li>)}</ul>}
    {adding
      ? <div className="intro-deals-form">
        <input value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fractional CFO engagement" />
        <input value={value} inputMode="decimal" onChange={e => setValue(e.target.value)} placeholder="Value in USD, e.g. 48000" />
        <select value={status} onChange={e => setStatus(e.target.value as Deal['status'])}><option value="won">Won</option><option value="in_progress">In progress</option><option value="lost">Did not happen</option></select>
        <Btn onClick={() => void save()}>Save</Btn><Btn kind="quiet" onClick={() => setAdding(false)}>Cancel</Btn>
      </div>
      : <button type="button" className="text-link" onClick={() => setAdding(true)}><Plus size={12} /> Record paid work that came from this</button>}
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

/* ── Admin: revenue and plans ──────────────────────────────────────────────────────────── */

export function AdminRevenuePanel() {
  const [s, setS] = useState<any>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const [sum, p] = await Promise.all([db.rpc('admin_revenue_summary'), db.from('membership_plans').select('*').order('sort')])
    setS(sum.data ?? null); setPlans(p.data ?? [])
  }, [])
  useEffect(() => { void load() }, [load])
  const savePlan = async (p: Plan) => {
    const r = await db.from('membership_plans').update({ name: p.name, description: p.description, amount_cents: p.amount_cents, billing_interval: p.billing_interval, active: p.active, updated_at: new Date().toISOString() }).eq('id', p.id)
    setMsg(r.error ? r.error.message : `${p.name} saved.`); void load()
  }
  if (!s) return null
  return <section className="executive-section admin-health">
    <Eyebrow><TrendingUp size={12} /> REVENUE</Eyebrow>
    <h2>{s.paying} paying member{s.paying === 1 ? '' : 's'} · {money(Number(s.arr_cents))} a year</h2>
    <dl className="oc-funnel">
      <div><dt>Paying</dt><dd>{s.paying}</dd></div>
      <div><dt>Payment due</dt><dd>{s.past_due}</dd></div>
      <div><dt>Cancelling</dt><dd>{s.canceling}</dd></div>
      <div><dt>Deals from intros</dt><dd>{s.deals_won}</dd></div>
      <div><dt>Deal value</dt><dd>{money(Number(s.deals_value_cents))}</dd></div>
    </dl>
    <h3>Plans</h3>
    <div className="admin-plans">{plans.map(p => <PlanEditor key={p.id} plan={p} onSave={savePlan} />)}</div>
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

function PlanEditor({ plan, onSave }: { plan: Plan; onSave: (p: Plan) => void }) {
  const [d, setD] = useState(plan)
  useEffect(() => setD(plan), [plan])
  return <div className="admin-plan">
    <label>Name<input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></label>
    <label>Price (USD)<input inputMode="decimal" value={String(d.amount_cents / 100)} onChange={e => setD({ ...d, amount_cents: Math.round(Number(e.target.value || 0) * 100) })} /></label>
    <label>Every<select value={d.billing_interval} onChange={e => setD({ ...d, billing_interval: e.target.value as Plan['billing_interval'] })}><option value="year">year</option><option value="month">month</option></select></label>
    <label className="wide">Description<textarea rows={2} value={d.description} onChange={e => setD({ ...d, description: e.target.value })} /></label>
    <label className="admin-plan-active"><input type="checkbox" checked={d.active} onChange={e => setD({ ...d, active: e.target.checked })} /> Offered to members</label>
    <Btn kind="secondary" onClick={() => onSave(d)}>Save plan</Btn>
  </div>
}

/* ── Admin: concierge desk ─────────────────────────────────────────────────────────────── */

interface QueueAsk { id: string; ask: string; author_id: string; author: string; created_at: string; suggested: number }
interface QueueIntro { id: string; requester: string; target: string; reason: string; created_at: string }

export function AdminConciergePanel() {
  const [q, setQ] = useState<{ unanswered_asks: QueueAsk[]; stalled_intros: QueueIntro[] } | null>(null)
  const [members, setMembers] = useState<Array<{ id: string; name: string; company: string; can_help_with: string }>>([])
  const [open, setOpen] = useState<string | null>(null)
  const load = useCallback(async () => {
    const [r, m] = await Promise.all([db.rpc('admin_concierge_queue'), db.from('profiles').select('id, name, company, can_help_with').order('name').limit(500)])
    setQ(r.data ?? null); setMembers((m.data ?? []).filter((x: any) => x.name))
  }, [])
  useEffect(() => { void load() }, [load])
  if (!q) return null
  const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return <section className="executive-section admin-health">
    <Eyebrow><LifeBuoy size={12} /> CONCIERGE DESK</Eyebrow>
    <h2>{q.unanswered_asks.length} unanswered ask{q.unanswered_asks.length === 1 ? '' : 's'} · {q.stalled_intros.length} stalled introduction{q.stalled_intros.length === 1 ? '' : 's'}</h2>
    <ul className="admin-list">
      {q.unanswered_asks.map(a => <li key={a.id}>
        <span><b>{a.author}</b> · {a.ask}</span>
        <small>{days(a.created_at)} days, no replies{a.suggested ? ` · ${a.suggested} suggested` : ''} · <button type="button" className="text-link" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'Close' : 'Suggest a member'}</button></small>
        {open === a.id && <SuggestForm ask={a} members={members.filter(m => m.id !== a.author_id)} onDone={() => { setOpen(null); void load() }} />}
      </li>)}
      {q.stalled_intros.map(i => <li key={i.id}>
        <span><b>{i.requester}</b> → {i.target}</span>
        <small>Waiting {days(i.created_at)} days{i.reason ? ` · “${i.reason.slice(0, 120)}”` : ''}</small>
      </li>)}
      {!q.unanswered_asks.length && !q.stalled_intros.length && <li><span>Nothing waiting. Every ask has replies and every introduction has an answer.</span></li>}
    </ul>
  </section>
}

function SuggestForm({ ask, members, onDone }: { ask: QueueAsk; members: Array<{ id: string; name: string; company: string; can_help_with: string }>; onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const words = useMemo(() => ask.ask.toLowerCase().split(/\W+/).filter(w => w.length > 3), [ask.ask])
  // Members whose "can help with" shares words with the ask come first.
  const ranked = useMemo(() => members
    .map(m => ({ m, score: words.filter(w => `${m.can_help_with} ${m.company}`.toLowerCase().includes(w)).length }))
    .filter(({ m }) => !query.trim() || `${m.name} ${m.company}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name)).slice(0, 8), [members, words, query])
  const send = async () => {
    if (!pick || note.trim().length < 10) { setMsg('Pick a member and write a short reason (10+ characters).'); return }
    const r = await db.rpc('concierge_suggest', { p_for: ask.author_id, p_suggested: pick, p_note: note.trim(), p_ask: ask.id })
    if (r.error) { setMsg(r.error.message); return }
    onDone()
  }
  return <div className="concierge-form">
    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search members" />
    <div className="meetings-invitees">{ranked.map(({ m, score }) => <button type="button" key={m.id} className={pick === m.id ? 'on' : ''} aria-pressed={pick === m.id} onClick={() => setPick(m.id)}>
      {m.name}<small>{m.company}{score ? ` · ${score} match${score === 1 ? '' : 'es'}` : ''}</small></button>)}</div>
    <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Why they should talk (both people see this)" />
    <Btn onClick={() => void send()}>Send suggestion to both</Btn>
    {msg && <p className="og-note">{msg}</p>}
  </div>
}
