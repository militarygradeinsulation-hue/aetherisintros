/**
 * Trusted Providers: firms members recommend, endorsements from members who worked with them,
 * and help requests the Ask Intros team routes to 1–3 approved providers. Plus the admin
 * panel: approve nominations, route requests, set success fees, and the referral revenue view.
 * Data rules live in drizzle/migrations/0045_providers.sql.
 */
import { ArrowLeft, BadgeCheck, Briefcase, ExternalLink, HandHelping, Inbox, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import {
  BUDGETS, CLIENT_SIZES, PROVIDER_CATEGORIES, REQUEST_STATUS, URGENCIES,
  budgetLabel, categoryLabel, clientSizeLabel, dollarsToCents, endorsedBy, filterProviders,
  nominationError, normalizeWebsite, parseRegions, requestError, urgencyLabel,
  type DirectoryProvider, type RequestStatus,
} from './providers'
import { money } from './revenue-ui'
import { Btn, Eyebrow, Head } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

interface Match { provider_id: string; name: string; website: string | null; category: string; note: string }
interface MyRequest {
  id: string; category: string; need: string; budget_range: string | null; urgency: string; private_notes: string
  status: RequestStatus; engaged_provider_id: string | null; deal_value_cents: number | null; created_at: string; matches: Match[]
}
interface InboxItem {
  request_id: string; provider_id: string; provider: string; category: string; need: string; budget_range: string | null
  urgency: string; routed_at: string; status: RequestStatus | 'chose_another'; member: string | null
}

const errText = (e: any) => (e?.message ? String(e.message) : 'Something went wrong. Try again.')
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/* ── Member page ───────────────────────────────────────────────────────────────────────── */

export function ProvidersPage() {
  const [tab, setTab] = useState<'browse' | 'requests' | 'inbox'>('browse')
  const [providers, setProviders] = useState<DirectoryProvider[] | null>(null)
  const [requests, setRequests] = useState<MyRequest[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState<'nominate' | 'request' | null>(null)
  const [requestCategory, setRequestCategory] = useState('')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [d, r, i] = await Promise.all([db.rpc('provider_directory'), db.rpc('my_provider_requests'), db.rpc('provider_inbox')])
    if (d.error) setError(errText(d.error))
    setProviders(d.data ?? [])
    setRequests(r.data ?? [])
    setInbox(i.data ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  const shown = useMemo(() => filterProviders(providers ?? [], category, query), [providers, category, query])
  const open = providers?.find(p => p.id === openId) ?? null
  const askFor = (cat: string) => { setRequestCategory(cat); setForm('request') }

  return <div className="providers">
    <Head label="EXECUTIVE WORK" title="Trusted Providers"
      copy="Accountants, advisors, lawyers, agencies and fractional executives that members have worked with and vouch for. Ask for help and the Ask Intros team will match you with up to three."
      action={<><Btn onClick={() => askFor(category)}><HandHelping size={14} /> Request help</Btn><Btn kind="secondary" onClick={() => setForm('nominate')}><Plus size={14} /> Nominate a provider</Btn></>} />

    {form === 'nominate' && <NominateForm onDone={msg => { setForm(null); setError(msg); void load() }} onCancel={() => setForm(null)} />}
    {form === 'request' && <RequestForm initialCategory={requestCategory} onDone={() => { setForm(null); setTab('requests'); void load() }} onCancel={() => setForm(null)} />}

    <nav className="providers-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'browse'} className={tab === 'browse' ? 'on' : ''} onClick={() => setTab('browse')}>Browse</button>
      <button role="tab" aria-selected={tab === 'requests'} className={tab === 'requests' ? 'on' : ''} onClick={() => setTab('requests')}>My requests{requests.length ? ` · ${requests.length}` : ''}</button>
      {inbox.length > 0 && <button role="tab" aria-selected={tab === 'inbox'} className={tab === 'inbox' ? 'on' : ''} onClick={() => setTab('inbox')}><Inbox size={13} /> Routed to my firm · {inbox.length}</button>}
    </nav>
    {error && <p className="og-note">{error}</p>}

    {tab === 'browse' && (open
      ? <ProviderDetail provider={open} onBack={() => setOpenId(null)} onRequest={() => askFor(open.category)} onChanged={() => void load()} />
      : <>
        <div className="providers-filters">
          <label className="providers-search"><Search size={14} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search firms, regions or endorsers" /></label>
          <div className="providers-chips">
            <button className={!category ? 'on' : ''} onClick={() => setCategory('')}>All</button>
            {PROVIDER_CATEGORIES.map(([id, label]) => <button key={id} className={category === id ? 'on' : ''} onClick={() => setCategory(id)}>{label}</button>)}
          </div>
        </div>
        {providers === null
          ? <p className="og-note">Loading providers…</p>
          : shown.length
            ? <div className="providers-grid">{shown.map(p => <button key={p.id} type="button" className="provider-card" onClick={() => setOpenId(p.id)}>
              <Eyebrow>{categoryLabel(p.category).toUpperCase()}</Eyebrow>
              <h3>{p.name}</h3>
              <p>{p.description.length > 180 ? `${p.description.slice(0, 180)}…` : p.description}</p>
              <small><BadgeCheck size={12} /> {endorsedBy(p.endorsements.map(e => e.name))}</small>
            </button>)}</div>
            : <div className="providers-empty">
              <p>{providers.length ? 'No providers match that yet.' : 'No providers have been approved yet.'} Nominate a firm you have worked with, or request help and the team will find one.</p>
              <div><Btn onClick={() => askFor(category)}>Request help</Btn><Btn kind="secondary" onClick={() => setForm('nominate')}>Nominate a provider</Btn></div>
            </div>}
        <p className="og-note"><ShieldCheck size={12} /> Every provider is nominated by a member and approved by the Ask Intros team. Endorsements and endorsers’ names are visible to all members.</p>
      </>)}

    {tab === 'requests' && <MyRequests requests={requests} onChanged={() => void load()} onNew={() => askFor('')} />}
    {tab === 'inbox' && <ProviderInbox items={inbox} />}
  </div>
}

function ProviderDetail({ provider: p, onBack, onRequest, onChanged }: { provider: DirectoryProvider; onBack: () => void; onRequest: () => void; onChanged: () => void }) {
  const mine = p.endorsements.find(e => e.mine)
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(mine?.note ?? '')
  const [msg, setMsg] = useState('')
  useEffect(() => { setNote(mine?.note ?? ''); setEditing(false) }, [mine?.note])

  const save = async () => {
    if (note.trim().length < 10) { setMsg('Say briefly what they did for you (10+ characters).'); return }
    const r = mine
      ? await db.from('provider_endorsements').update({ note: note.trim() }).eq('id', mine.id)
      : await db.from('provider_endorsements').insert({ provider_id: p.id, note: note.trim() })
    if (r.error) { setMsg(errText(r.error)); return }
    setMsg(''); setEditing(false); onChanged()
  }
  const remove = async () => {
    if (!mine) return
    const r = await db.from('provider_endorsements').delete().eq('id', mine.id)
    if (r.error) { setMsg(errText(r.error)); return }
    setNote(''); onChanged()
  }

  return <article className="provider-detail">
    <button type="button" className="text-link" onClick={onBack}><ArrowLeft size={13} /> All providers</button>
    <Eyebrow>{categoryLabel(p.category).toUpperCase()}</Eyebrow>
    <h2>{p.name}</h2>
    <p className="provider-desc">{p.description}</p>
    <dl className="provider-facts">
      <div><dt>Typical clients</dt><dd>{clientSizeLabel(p.client_size) || 'Any size'}</dd></div>
      <div><dt>Regions</dt><dd>{p.regions.length ? p.regions.join(', ') : 'Not stated'}</dd></div>
      {p.contact_name && <div><dt>Member contact</dt><dd>{p.contact_name}</dd></div>}
      {p.website && <div><dt>Website</dt><dd><a href={p.website} target="_blank" rel="noopener noreferrer nofollow">{p.website.replace(/^https?:\/\//, '')} <ExternalLink size={11} /></a></dd></div>}
    </dl>
    <div className="provider-actions"><Btn onClick={onRequest}><HandHelping size={14} /> Request help in {categoryLabel(p.category)}</Btn></div>

    <section className="provider-endorsements">
      <h3>{p.endorsement_count} endorsement{Number(p.endorsement_count) === 1 ? '' : 's'}</h3>
      {p.endorsements.length
        ? <ul>{p.endorsements.map(e => <li key={e.id}><b>{e.name}</b>{e.company && <small> · {e.company}</small>}<p>“{e.note}”</p></li>)}</ul>
        : <p className="og-note">No member has endorsed them yet. If you have worked with them, be the first.</p>}
      {p.mine_contact
        ? <p className="og-note">You are this provider’s contact, so you cannot endorse it.</p>
        : mine && !editing
          ? <div className="provider-actions"><Btn kind="secondary" onClick={() => setEditing(true)}><Pencil size={13} /> Edit your endorsement</Btn><Btn kind="quiet" onClick={() => void remove()}><Trash2 size={13} /> Remove</Btn></div>
          : <div className="provider-endorse">
            <textarea rows={3} maxLength={400} value={note} onChange={e => setNote(e.target.value)} placeholder="Only if you have worked with them: what did they do for you?" />
            <small>All members see your name and this note.</small>
            <div className="provider-actions"><Btn onClick={() => void save()}>{mine ? 'Save' : 'Endorse'}</Btn>{mine && <Btn kind="quiet" onClick={() => setEditing(false)}>Cancel</Btn>}</div>
          </div>}
      {msg && <p className="og-note">{msg}</p>}
    </section>
  </article>
}

function NominateForm({ onDone, onCancel }: { onDone: (msg: string) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: '', category: '', description: '', website: '', regions: '', clientSize: 'any', note: '', contactIsMe: false })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const bad = nominationError(f)
    if (bad) { setMsg(bad); return }
    setBusy(true)
    const { data: auth } = await supabase.auth.getUser()
    const r = await db.from('service_providers').insert({
      name: f.name.trim(), category: f.category, description: f.description.trim(), website: normalizeWebsite(f.website) || null,
      regions: parseRegions(f.regions), client_size: f.clientSize, nomination_note: f.note.trim().slice(0, 600),
      contact_user_id: f.contactIsMe ? auth.user?.id ?? null : null,
    })
    setBusy(false)
    if (r.error) { setMsg(errText(r.error)); return }
    onDone(`Thanks. ${f.name.trim()} is with the Ask Intros team for review; it appears here once approved.`)
  }
  return <section className="providers-form">
    <h3>Nominate a provider</h3>
    <p className="og-note">The team reviews every nomination before members see it. Only you and the team see it while it waits.</p>
    <div className="providers-form-grid">
      <label>Firm name<input value={f.name} maxLength={120} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Category<select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}><option value="">Choose…</option>{PROVIDER_CATEGORIES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
      <label className="wide">What they do<textarea rows={3} maxLength={1200} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
      <label>Website<input value={f.website} onChange={e => setF({ ...f, website: e.target.value })} placeholder="firm.com" /></label>
      <label>Regions<input value={f.regions} onChange={e => setF({ ...f, regions: e.target.value })} placeholder="e.g. US, UK, Remote" /></label>
      <label>Typical client size<select value={f.clientSize} onChange={e => setF({ ...f, clientSize: e.target.value })}>{CLIENT_SIZES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
      <label className="wide">Note for the team (optional)<textarea rows={2} maxLength={600} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} placeholder="How you know them" /></label>
      <label className="wide providers-check"><input type="checkbox" checked={f.contactIsMe} onChange={e => setF({ ...f, contactIsMe: e.target.checked })} /> This is my firm: send me requests the team routes to it</label>
    </div>
    <div className="provider-actions"><Btn disabled={busy} onClick={() => void submit()}>{busy ? 'Sending…' : 'Send nomination'}</Btn><Btn kind="quiet" onClick={onCancel}>Cancel</Btn></div>
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

function RequestForm({ initialCategory, onDone, onCancel }: { initialCategory: string; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ category: initialCategory, need: '', budget: '', urgency: 'this_month', notes: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const bad = requestError(f)
    if (bad) { setMsg(bad); return }
    setBusy(true)
    const r = await db.from('provider_requests').insert({ category: f.category, need: f.need.trim(), budget_range: f.budget || null, urgency: f.urgency, private_notes: f.notes.trim().slice(0, 1000) })
    setBusy(false)
    if (r.error) { setMsg(errText(r.error)); return }
    onDone()
  }
  return <section className="providers-form">
    <h3>Request help</h3>
    <p className="og-note">The Ask Intros team reads your request and matches you with up to three approved providers. Matched providers’ contacts see the category, what you need, budget and urgency, not your name until you choose them, and never your private notes.</p>
    <div className="providers-form-grid">
      <label>Kind of help<select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}><option value="">Choose…</option>{PROVIDER_CATEGORIES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
      <label>How soon<select value={f.urgency} onChange={e => setF({ ...f, urgency: e.target.value })}>{URGENCIES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
      <label className="wide">What you need<textarea rows={3} maxLength={1500} value={f.need} onChange={e => setF({ ...f, need: e.target.value })} placeholder="e.g. Our sales team re-types every lead into three systems. We want it automated." /></label>
      <label>Budget (optional)<select value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })}><option value="">Prefer not to say</option>{BUDGETS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></label>
      <label className="wide">Private notes (only you and the team)<textarea rows={2} maxLength={1000} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></label>
    </div>
    <div className="provider-actions"><Btn disabled={busy} onClick={() => void submit()}>{busy ? 'Sending…' : 'Send request'}</Btn><Btn kind="quiet" onClick={onCancel}>Cancel</Btn></div>
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

function MyRequests({ requests, onChanged, onNew }: { requests: MyRequest[]; onChanged: () => void; onNew: () => void }) {
  if (!requests.length) return <div className="providers-empty"><p>You have not asked for help yet. Describe what you need and the team will match you with trusted providers.</p><div><Btn onClick={onNew}>Request help</Btn></div></div>
  return <ul className="provider-requests">{requests.map(r => <RequestRow key={r.id} r={r} onChanged={onChanged} />)}</ul>
}

function RequestRow({ r, onChanged }: { r: MyRequest; onChanged: () => void }) {
  const [value, setValue] = useState(r.deal_value_cents != null ? String(r.deal_value_cents / 100) : '')
  const [msg, setMsg] = useState('')
  const call = async (fn: string, args: Record<string, unknown>) => {
    const res = await db.rpc(fn, args)
    if (res.error) { setMsg(errText(res.error)); return }
    setMsg(''); onChanged()
  }
  const report = (status: 'engaged' | 'completed') => {
    const cents = value.trim() ? dollarsToCents(value) : null
    if (value.trim() && cents === null) { setMsg('Enter the value in dollars, e.g. 48000.'); return }
    void call('provider_request_update', { p_request: r.id, p_status: status, p_deal_value_cents: cents })
  }
  return <li className={`provider-request ${r.status}`}>
    <header><b>{categoryLabel(r.category)}</b><span className="provider-status">{REQUEST_STATUS[r.status]}</span></header>
    <p>{r.need}</p>
    <small>{day(r.created_at)} · {urgencyLabel(r.urgency)}{r.budget_range ? ` · ${budgetLabel(r.budget_range)}` : ''}</small>
    {r.status === 'open' && <p className="og-note">The team is finding the right providers. You will get a notification when you are matched.</p>}
    {r.matches.length > 0 && <ul className="provider-matches">{r.matches.map(m => <li key={m.provider_id} className={r.engaged_provider_id === m.provider_id ? 'on' : ''}>
      <span><b>{m.name}</b>{m.website && <a href={m.website} target="_blank" rel="noopener noreferrer nofollow"> <ExternalLink size={11} /></a>}{m.note && <small>{m.note}</small>}</span>
      {r.status === 'matched' && <Btn kind="secondary" onClick={() => void call('provider_request_engage', { p_request: r.id, p_provider: m.provider_id })}>We’re working together</Btn>}
      {r.engaged_provider_id === m.provider_id && <small className="provider-status">Engaged</small>}
    </li>)}</ul>}
    {(r.status === 'engaged' || r.status === 'completed') && <div className="provider-report">
      <label>Deal value (USD, optional)<input inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 48000" /></label>
      <Btn kind="secondary" onClick={() => report(r.status === 'completed' ? 'completed' : 'engaged')}>Save value</Btn>
      {r.status === 'engaged' && <Btn onClick={() => report('completed')}>Mark completed</Btn>}
      <small>Only you and the Ask Intros team see the value.</small>
    </div>}
    {['open', 'matched', 'engaged'].includes(r.status) && <button type="button" className="text-link" onClick={() => void call('provider_request_update', { p_request: r.id, p_status: 'closed' })}>Close this request</button>}
    {msg && <p className="og-note">{msg}</p>}
  </li>
}

function ProviderInbox({ items }: { items: InboxItem[] }) {
  return <>
    <p className="og-note">Requests the Ask Intros team routed to a firm you are the contact for. You see what they need, not their private notes; their name appears once they choose your firm.</p>
    <ul className="provider-requests">{items.map(i => <li key={`${i.request_id}-${i.provider_id}`} className="provider-request">
      <header><b>{i.provider} · {categoryLabel(i.category)}</b><span className="provider-status">{REQUEST_STATUS[i.status]}</span></header>
      <p>{i.need}</p>
      <small>Routed {day(i.routed_at)} · {urgencyLabel(i.urgency)}{i.budget_range ? ` · ${budgetLabel(i.budget_range)}` : ''}{i.member ? ` · ${i.member} chose you` : ''}</small>
    </li>)}</ul>
  </>
}

/* ── Admin panel ───────────────────────────────────────────────────────────────────────── */

interface AdminRequest {
  id: string; user_id: string; member: string; category: string; need: string; budget_range: string | null; urgency: string
  private_notes: string; status: RequestStatus; engaged_provider_id: string | null; deal_value_cents: number | null; created_at: string
  matches: Array<{ provider_id: string; name: string }>
}
interface Summary {
  by_status: Record<RequestStatus, number>; pending_nominations: number; approved_providers: number
  engaged_value_cents: number; expected_fee_cents: number
  by_provider: Array<{ provider_id: string; name: string; fee_pct: number | null; engaged: number; value_cents: number; expected_fee_cents: number }>
}

export function AdminProvidersPanel() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [providers, setProviders] = useState<DirectoryProvider[]>([])
  const [requests, setRequests] = useState<AdminRequest[]>([])
  const [routing, setRouting] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const [s, d, r] = await Promise.all([db.rpc('admin_provider_summary'), db.rpc('provider_directory'), db.rpc('admin_provider_requests')])
    setSummary(s.data ?? null); setProviders(d.data ?? []); setRequests(r.data ?? [])
  }, [])
  useEffect(() => { void load() }, [load])
  if (!summary) return null

  const setStatus = async (p: DirectoryProvider, status: DirectoryProvider['status']) => {
    const r = await db.from('service_providers').update({ status }).eq('id', p.id)
    setMsg(r.error ? errText(r.error) : `${p.name} ${status === 'approved' ? 'approved' : status === 'suspended' ? 'suspended' : 'updated'}.`); void load()
  }
  const reject = async (p: DirectoryProvider) => {
    const r = await db.from('service_providers').delete().eq('id', p.id)
    setMsg(r.error ? errText(r.error) : `${p.name} removed.`); void load()
  }
  const setFee = async (p: DirectoryProvider, raw: string) => {
    const pct = raw.trim() === '' ? null : Number(raw)
    if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 50)) { setMsg('Fee must be between 0 and 50 percent.'); return }
    const r = await db.rpc('admin_set_provider_fee', { p_provider: p.id, p_pct: pct })
    setMsg(r.error ? errText(r.error) : `Fee for ${p.name} ${pct ? `set to ${pct}%` : 'removed'}.`); void load()
  }
  const updateRequest = async (req: AdminRequest, status: RequestStatus, value: string) => {
    const cents = value.trim() ? dollarsToCents(value) : null
    if (value.trim() && cents === null) { setMsg('Enter the value in dollars.'); return }
    const r = await db.rpc('provider_request_update', { p_request: req.id, p_status: status, p_deal_value_cents: cents })
    setMsg(r.error ? errText(r.error) : 'Request updated.'); void load()
  }

  const pending = providers.filter(p => p.status === 'pending')
  const listed = providers.filter(p => p.status !== 'pending')
  const s = summary.by_status
  return <section className="executive-section admin-health admin-providers">
    <Eyebrow><Briefcase size={12} /> TRUSTED PROVIDERS</Eyebrow>
    <h2>{summary.approved_providers} approved · {summary.pending_nominations} waiting · {money(Number(summary.expected_fee_cents))} expected fees</h2>
    <dl className="oc-funnel">
      <div><dt>Open</dt><dd>{s.open}</dd></div>
      <div><dt>Matched</dt><dd>{s.matched}</dd></div>
      <div><dt>Engaged</dt><dd>{s.engaged}</dd></div>
      <div><dt>Completed</dt><dd>{s.completed}</dd></div>
      <div><dt>Closed</dt><dd>{s.closed}</dd></div>
      <div><dt>Engaged value</dt><dd>{money(Number(summary.engaged_value_cents))}</dd></div>
      <div><dt>Expected fees</dt><dd>{money(Number(summary.expected_fee_cents))}</dd></div>
    </dl>
    {summary.by_provider.length > 0 && <ul className="admin-list">{summary.by_provider.map(b => <li key={b.provider_id}>
      <span><b>{b.name}</b></span><small>{b.engaged} engaged · {money(Number(b.value_cents))}</small><small>{b.fee_pct ? `${Number(b.fee_pct)}% → ${money(Number(b.expected_fee_cents))}` : 'No fee'}</small>
    </li>)}</ul>}

    <h3>Nominations</h3>
    <ul className="admin-list">
      {pending.map(p => <li key={p.id}>
        <span><b>{p.name}</b> · {categoryLabel(p.category)}<small className="admin-providers-sub">{p.description}{p.nomination_note ? ` — “${p.nomination_note}”` : ''} · by {p.nominated_by_name ?? 'a member'}{p.contact_name ? ` · contact ${p.contact_name}` : ''}</small></span>
        <span className="admin-actions"><Btn onClick={() => void setStatus(p, 'approved')}>Approve</Btn><Btn kind="quiet" onClick={() => void reject(p)}>Decline</Btn></span>
      </li>)}
      {!pending.length && <li><span>No nominations waiting.</span></li>}
    </ul>

    <h3>Providers and fees</h3>
    <ul className="admin-list">
      {listed.map(p => <ProviderAdminRow key={p.id} p={p} onStatus={st => void setStatus(p, st)} onFee={v => void setFee(p, v)} />)}
      {!listed.length && <li><span>No approved providers yet. Approve a nomination above.</span></li>}
    </ul>

    <h3>Requests</h3>
    <ul className="admin-list admin-provider-requests">
      {requests.map(req => <li key={req.id}>
        <span><b>{req.member}</b> · {categoryLabel(req.category)} · {REQUEST_STATUS[req.status]}
          <small className="admin-providers-sub">{req.need}{req.private_notes ? ` — private: “${req.private_notes}”` : ''} · {urgencyLabel(req.urgency)}{req.budget_range ? ` · ${budgetLabel(req.budget_range)}` : ''}
            {req.matches.length ? ` · matched: ${req.matches.map(m => m.name).join(', ')}` : ''}{req.deal_value_cents != null ? ` · ${money(Number(req.deal_value_cents))}` : ''}</small></span>
        <span className="admin-actions">
          {(req.status === 'open' || (req.status === 'matched' && req.matches.length < 3)) && <Btn kind="secondary" onClick={() => setRouting(routing === req.id ? null : req.id)}>{routing === req.id ? 'Close' : 'Route'}</Btn>}
          {['open', 'matched', 'engaged'].includes(req.status) && <Btn kind="quiet" onClick={() => void updateRequest(req, 'closed', '')}>Close</Btn>}
        </span>
        {routing === req.id && <RouteForm req={req} providers={providers.filter(p => p.status === 'approved')} onDone={m => { setRouting(null); setMsg(m); void load() }} />}
        {(req.status === 'engaged' || req.status === 'completed') && <DealValueForm req={req} onSave={(st, v) => void updateRequest(req, st, v)} />}
      </li>)}
      {!requests.length && <li><span>No help requests yet. Members ask from Trusted Providers.</span></li>}
    </ul>
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

function ProviderAdminRow({ p, onStatus, onFee }: { p: DirectoryProvider; onStatus: (s: DirectoryProvider['status']) => void; onFee: (v: string) => void }) {
  const [fee, setFee] = useState(p.fee_pct != null ? String(Number(p.fee_pct)) : '')
  useEffect(() => setFee(p.fee_pct != null ? String(Number(p.fee_pct)) : ''), [p.fee_pct])
  return <li>
    <span><b>{p.name}</b> · {categoryLabel(p.category)} · {p.status === 'approved' ? 'Approved' : 'Suspended'}<small className="admin-providers-sub">{p.endorsement_count} endorsement{Number(p.endorsement_count) === 1 ? '' : 's'}{p.contact_name ? ` · contact ${p.contact_name}` : ' · no member contact'}</small></span>
    <label className="admin-fee">Fee %<input inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)} placeholder="none" /><Btn kind="quiet" onClick={() => onFee(fee)}>Save</Btn></label>
    <span className="admin-actions">{p.status === 'approved'
      ? <Btn kind="quiet" onClick={() => onStatus('suspended')}>Suspend</Btn>
      : <Btn kind="secondary" onClick={() => onStatus('approved')}>Reinstate</Btn>}</span>
  </li>
}

function RouteForm({ req, providers, onDone }: { req: AdminRequest; providers: DirectoryProvider[]; onDone: (msg: string) => void }) {
  const already = new Set(req.matches.map(m => m.provider_id))
  const room = 3 - already.size
  const [pick, setPick] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  // Same-category providers first, then by endorsements.
  const ranked = providers.filter(p => !already.has(p.id))
    .sort((a, b) => Number(b.category === req.category) - Number(a.category === req.category) || Number(b.endorsement_count) - Number(a.endorsement_count))
  const toggle = (id: string) => setPick(cur => cur.includes(id) ? cur.filter(x => x !== id) : cur.length < room ? [...cur, id] : cur)
  const send = async () => {
    if (!pick.length) { setMsg('Pick at least one provider.'); return }
    const r = await db.rpc('provider_request_route', { p_request: req.id, p_providers: pick, p_note: note.trim() })
    if (r.error) { setMsg(errText(r.error)); return }
    onDone(`Routed to ${pick.length} provider${pick.length === 1 ? '' : 's'}. ${req.member} has been notified.`)
  }
  return <div className="concierge-form">
    {ranked.length ? <div className="meetings-invitees">{ranked.map(p => <button type="button" key={p.id} className={pick.includes(p.id) ? 'on' : ''} aria-pressed={pick.includes(p.id)} onClick={() => toggle(p.id)}>
      {p.name}<small>{categoryLabel(p.category)} · {p.endorsement_count} endorsement{Number(p.endorsement_count) === 1 ? '' : 's'}</small></button>)}</div>
      : <p className="og-note">No approved providers to route to yet.</p>}
    <small className="og-note">Pick up to {room}. The member sees this note with their matches.</small>
    <textarea rows={2} maxLength={600} value={note} onChange={e => setNote(e.target.value)} placeholder="Why these providers (optional)" />
    <Btn onClick={() => void send()}>Send matches</Btn>
    {msg && <p className="og-note">{msg}</p>}
  </div>
}

function DealValueForm({ req, onSave }: { req: AdminRequest; onSave: (status: RequestStatus, value: string) => void }) {
  const [value, setValue] = useState(req.deal_value_cents != null ? String(req.deal_value_cents / 100) : '')
  return <div className="concierge-form admin-deal">
    <label>Deal value (USD)<input inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="as reported" /></label>
    <Btn kind="secondary" onClick={() => onSave(req.status, value)}>Save value</Btn>
    {req.status === 'engaged' && <Btn kind="quiet" onClick={() => onSave('completed', value)}>Mark completed</Btn>}
  </div>
}
