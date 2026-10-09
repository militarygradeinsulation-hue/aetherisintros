/**
 * Agent Trust Gateway, member side (drizzle/migrations/0054_agent_gateway.sql):
 * - Settings → Connected apps → "AI assistants": keys for the member's own assistant + activity log
 * - Settings → Connected apps → "Agent policy": whether and how outside AI agents may reach them
 * - Agent Inbox page: screened requests from outside agents, to accept, decline or block
 */
import { Bot, Inbox, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { createAgentKey } from '@/lib/agent-gateway/agent.functions'
import { AGENT_SCOPES, SCOPE_LABELS, type AgentScope } from '@/lib/agent-gateway/keys'
import { Eyebrow, Head } from './ui'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
const when = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'never'
const errText = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message) || 'That did not work. Please try again.'

interface AgentKeyRow { id: string; name: string; key_prefix: string; scopes: AgentScope[]; rate_per_hour: number; intros_per_day: number; created_at: string; last_used_at: string | null; revoked_at: string | null }
interface AgentActionRow { id: string; key_id: string | null; action: string; target: string; result: string; detail: string; created_at: string }

const ACTION_LABELS: Record<string, string> = {
  read_profile_public: 'Read your profile', search_members: 'Searched members', create_ask: 'Posted an ask',
  request_intro: 'Requested an introduction', inbound_request: 'Sent a request to a member',
}

export function AgentAssistantsSettings() {
  const [keys, setKeys] = useState<AgentKeyRow[] | null>(null)
  const [actions, setActions] = useState<AgentActionRow[]>([])
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<AgentScope[]>(['read_profile_public', 'search_members'])
  const [fresh, setFresh] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const [k, a] = await Promise.all([
      db.from('agent_keys').select('id, name, key_prefix, scopes, rate_per_hour, intros_per_day, created_at, last_used_at, revoked_at').order('created_at', { ascending: false }),
      db.from('agent_actions').select('id, key_id, action, target, result, detail, created_at').order('created_at', { ascending: false }).limit(50),
    ])
    setKeys(k.data ?? [])
    setActions(a.data ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  const create = async () => {
    setBusy(true); setMsg(''); setFresh('')
    try {
      const { key } = await createAgentKey({ data: { name, scopes } })
      setFresh(key); setName('')
      await load()
    } catch (e) { setMsg(errText(e)) }
    setBusy(false)
  }
  const revoke = async (id: string) => {
    const { error } = await db.rpc('revoke_agent_key', { p_id: id })
    setMsg(error ? errText(error) : 'Key revoked. Any assistant using it stops working now.')
    await load()
  }
  const toggle = (s: AgentScope) => setScopes(cur => cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s])
  const keyName = (id: string | null) => keys?.find(k => k.id === id)?.name ?? 'Removed key'
  const manifest = typeof location === 'undefined' ? '/api/agent/manifest' : `${location.origin}/api/agent/manifest`

  return <div className="connected-app agent-app">
    <header><Bot size={18} aria-hidden /><div><b>AI assistants</b><small>Keys for your own assistant to act for you</small></div></header>
    <p>Give your AI assistant a key so it can work in Ask Intros as you, with only the permissions you choose. Everything it does is listed below, visible only to you. Revoke a key at any time. Assistants read the setup from <code>{manifest}</code>.</p>
    {keys === null ? <p className="connected-app-meta">Loading…</p> : <>
      {keys.length > 0 && <ul className="agent-keys">{keys.map(k => <li key={k.id} className={k.revoked_at ? 'revoked' : ''}>
        <div><b>{k.name}</b> <code>{k.key_prefix}…</code>
          <small>{k.scopes.map(s => SCOPE_LABELS[s] ?? s).join(' · ')} · {k.rate_per_hour}/hour · {k.intros_per_day} intros/day</small>
          <small>{k.revoked_at ? `Revoked ${when(k.revoked_at)}` : `Last used ${when(k.last_used_at)}`}</small></div>
        {!k.revoked_at && <button type="button" className="push-btn quiet" onClick={() => void revoke(k.id)}>Revoke</button>}
      </li>)}</ul>}
      {!keys.length && <p className="connected-app-meta">No assistant keys yet. Create one below to connect your assistant.</p>}
    </>}
    <fieldset className="agent-form">
      <label><span>Assistant name</span><input value={name} maxLength={60} placeholder="e.g. My desktop assistant" onChange={e => setName(e.target.value)} /></label>
      <div className="agent-scopes">{AGENT_SCOPES.map(s => <label key={s}><input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} /> {SCOPE_LABELS[s]}</label>)}</div>
      <div className="connected-app-actions"><button type="button" className="push-btn" disabled={busy || !name.trim() || !scopes.length} onClick={() => void create()}>{busy ? 'Creating…' : 'Create key'}</button></div>
    </fieldset>
    {fresh && <div className="agent-fresh" role="status"><b>Copy this key now. It will not be shown again.</b><code>{fresh}</code>
      <button type="button" className="push-btn quiet" onClick={() => void navigator.clipboard?.writeText(fresh)}>Copy</button></div>}
    {msg && <p className="push-msg">{msg}</p>}
    <p className="connected-app-meta">Only verified members can create keys. Each key is limited to 60 calls an hour and 10 introduction requests a day. Introductions stay double opt-in.</p>
    <details className="agent-log"><summary>Activity ({actions.length})</summary>
      {actions.length ? <ul>{actions.map(a => <li key={a.id}><span className={`agent-result ${a.result}`}>{a.result.replace('_', ' ')}</span>
        <span>{ACTION_LABELS[a.action] ?? a.action}{a.target ? `: ${a.target}` : ''}{a.detail ? ` (${a.detail})` : ''}</span>
        <small>{keyName(a.key_id)} · {when(a.created_at)}</small></li>)}</ul>
        : <p className="connected-app-meta">Nothing yet. Every call your assistant makes will show here.</p>}
    </details>
  </div>
}

interface PolicyRow { handle: string | null; mode: 'off' | 'verified_only' | 'everyone'; welcome_topics: string[]; refuse_topics: string[]; min_context: number; daily_cap: number }
const EMPTY_POLICY: PolicyRow = { handle: '', mode: 'off', welcome_topics: [], refuse_topics: [], min_context: 120, daily_cap: 5 }
const topics = (s: string) => [...new Set(s.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20).map(t => t.slice(0, 40))

export function AgentPolicySettings() {
  const [policy, setPolicy] = useState<PolicyRow | null>(null)
  const [exists, setExists] = useState(false)
  const [welcome, setWelcome] = useState('')
  const [refuse, setRefuse] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    void db.from('agent_policies').select('handle, mode, welcome_topics, refuse_topics, min_context, daily_cap').maybeSingle()
      .then((r: { data: PolicyRow | null }) => {
        const p = r.data ?? EMPTY_POLICY
        setExists(!!r.data); setPolicy({ ...p, handle: p.handle ?? '' })
        setWelcome(p.welcome_topics.join(', ')); setRefuse(p.refuse_topics.join(', '))
      })
  }, [])
  if (!policy) return null
  const set = <K extends keyof PolicyRow>(k: K, v: PolicyRow[K]) => setPolicy({ ...policy, [k]: v })

  const save = async () => {
    setBusy(true); setMsg('')
    const { data: auth } = await supabase.auth.getUser()
    const handle = (policy.handle ?? '').trim().toLowerCase().replace(/^@/, '')
    const row = {
      handle: handle || null, mode: policy.mode, welcome_topics: topics(welcome), refuse_topics: topics(refuse),
      min_context: Math.min(1000, Math.max(40, Math.round(policy.min_context))), daily_cap: Math.min(50, Math.max(1, Math.round(policy.daily_cap))),
    }
    if (row.mode !== 'off' && !row.handle) { setMsg('Choose a public handle before accepting agent requests.'); setBusy(false); return }
    if (row.handle && !/^[a-z0-9][a-z0-9-]{2,39}$/.test(row.handle)) { setMsg('Handles are 3–40 lowercase letters, digits or hyphens.'); setBusy(false); return }
    const { error } = exists
      ? await db.from('agent_policies').update(row).eq('user_id', auth.user?.id)
      : await db.from('agent_policies').insert({ ...row, user_id: auth.user?.id })
    if (error) setMsg(error.code === '23505' ? 'That handle is taken. Try another.' : errText(error))
    else { setExists(true); setMsg('Saved.') }
    setBusy(false)
  }

  const origin = typeof location === 'undefined' ? '' : location.origin
  return <div className="connected-app agent-app">
    <header><ShieldCheck size={18} aria-hidden /><div><b>Agent policy</b><small>Who may reach you through an AI agent</small></div></header>
    <p>Outside AI agents can ask to reach you by your public handle. Each request is screened against these rules first. Rejected requests never reach you, and when this is off nobody can tell whether you are a member.</p>
    <fieldset className="agent-form">
      <label><span>Accept agent requests</span><select value={policy.mode} onChange={e => set('mode', e.target.value as PolicyRow['mode'])}>
        <option value="off">Off</option><option value="verified_only">Only from assistants of verified members</option><option value="everyone">From anyone, screened</option></select></label>
      <label><span>Public handle</span><input value={policy.handle ?? ''} maxLength={41} placeholder="e.g. jane-doe" onChange={e => set('handle', e.target.value)} /></label>
      <label><span>Topics you welcome (comma separated)</span><input value={welcome} placeholder="e.g. logistics, board roles" onChange={e => setWelcome(e.target.value)} /></label>
      <label><span>Topics you refuse (comma separated)</span><input value={refuse} placeholder="e.g. crypto, lead generation" onChange={e => setRefuse(e.target.value)} /></label>
      <label><span>Minimum context (characters)</span><input type="number" min={40} max={1000} value={policy.min_context} onChange={e => set('min_context', Number(e.target.value))} /></label>
      <label><span>Most requests per day</span><input type="number" min={1} max={50} value={policy.daily_cap} onChange={e => set('daily_cap', Number(e.target.value))} /></label>
      <div className="connected-app-actions"><button type="button" className="push-btn" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save policy'}</button></div>
    </fieldset>
    {msg && <p className="push-msg">{msg}</p>}
    {policy.mode !== 'off' && policy.handle && <p className="connected-app-meta">Agents send requests to <code>{origin}/api/agent/inbound</code> with <code>"to": "{policy.handle}"</code>. Only verified members can be reached. Requesters' emails stay hidden until you accept.</p>}
  </div>
}

interface InboundRow { id: string; status: string; score: number; reasons: string[]; requester_name: string; requester_company: string; requester_domain: string; requester_member: string | null; on_behalf_of: string; reason: string; offer: string; links: string[]; created_at: string; decided_at: string | null }

/** Requests waiting for the member (delivered or held), for the menu count. */
export function useAgentInboxCount(refresh: unknown = null): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (refresh === false) return
    void db.from('agent_inbound_requests').select('id', { count: 'exact', head: true }).in('status', ['delivered', 'held'])
      .then((r: { count: number | null }) => setN(r.count ?? 0))
  }, [refresh])
  return n
}

export function AgentInboxPage() {
  const [rows, setRows] = useState<InboundRow[] | null>(null)
  const [tab, setTab] = useState<'delivered' | 'held' | 'decided'>('delivered')
  const [emails, setEmails] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const r = await db.from('agent_inbound_requests')
      .select('id, status, score, reasons, requester_name, requester_company, requester_domain, requester_member, on_behalf_of, reason, offer, links, created_at, decided_at')
      .order('created_at', { ascending: false }).limit(200)
    setRows(r.data ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  const decide = async (row: InboundRow, decision: 'accept' | 'decline' | 'block') => {
    setMsg('')
    const { data, error } = await db.rpc('decide_agent_request', { p_id: row.id, p_decision: decision })
    if (error) { setMsg(errText(error)); return }
    if (data?.email) setEmails(e => ({ ...e, [row.id]: data.email }))
    setMsg(decision === 'accept' ? `Accepted. ${row.requester_name} was added to your CRM; their email is shown below. They were not notified, so reach out when you are ready.`
      : decision === 'block' ? `Blocked @${row.requester_domain}. Requests from that domain are now rejected.` : 'Declined. The requester is not told.')
    await load()
  }
  const reveal = async (id: string) => {
    const { data } = await db.rpc('agent_request_contact', { p_id: id })
    if (data) setEmails(e => ({ ...e, [id]: data as string }))
  }

  const list = (rows ?? []).filter(r => tab === 'decided' ? !['delivered', 'held'].includes(r.status) : r.status === tab)
  const count = (s: string) => (rows ?? []).filter(r => r.status === s).length

  return <>
    <Head label="AGENT INBOX" title="Requests from AI agents, screened by your rules."
      copy="Outside AI agents ask to reach you through your public handle. Only requests that pass your Agent policy appear here. Only you can see them; requesters learn nothing unless you accept and reach out."
      {...(rows ? { proof: `${count('delivered')} new · ${count('held')} held for review` } : {})} />
    <div className="agent-tabs" role="tablist">
      {([['delivered', `New (${count('delivered')})`], ['held', `Held (${count('held')})`], ['decided', 'Decided']] as const).map(([k, l]) =>
        <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}
    </div>
    {msg && <p className="push-msg">{msg}</p>}
    {rows === null && <p className="connected-app-meta">Loading…</p>}
    {rows !== null && !list.length && <section className="module agent-empty"><Inbox size={18} aria-hidden />
      <p>{tab === 'decided' ? 'Nothing decided yet.' : rows.length ? 'Nothing here right now.' : 'No agent requests yet. Turn on your Agent policy and share your handle in Settings → Connected apps.'}</p></section>}
    <div className="agent-inbox">{list.map(r => <article key={r.id} className="module agent-request">
      <header><div><Eyebrow signal={r.status === 'delivered'}>{r.status === 'held' ? 'HELD FOR REVIEW' : r.status.toUpperCase()}</Eyebrow>
        <h3>{r.requester_name}{r.requester_company ? ` · ${r.requester_company}` : ''}</h3>
        <small>@{r.requester_domain}{r.requester_member ? ' · sent by a verified member’s assistant' : ''} · {when(r.created_at)} · quality {r.score}</small></div></header>
      {r.on_behalf_of && <p><b>On behalf of:</b> {r.on_behalf_of}</p>}
      <p><b>Why:</b> {r.reason}</p>
      {r.offer && <p><b>What you get:</b> {r.offer}</p>}
      {r.links.length > 0 && <p className="agent-links">{r.links.map(l => <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow">{l}</a>)}</p>}
      {r.reasons.length > 0 && <p className="connected-app-meta">Screening: {r.reasons.join(' · ')}</p>}
      {['delivered', 'held'].includes(r.status) && <div className="connected-app-actions">
        <button type="button" className="push-btn" onClick={() => void decide(r, 'accept')}>Accept and see email</button>
        <button type="button" className="push-btn quiet" onClick={() => void decide(r, 'decline')}>Decline</button>
        <button type="button" className="push-btn quiet" onClick={() => void decide(r, 'block')}>Block @{r.requester_domain}</button>
      </div>}
      {r.status === 'accepted' && (emails[r.id]
        ? <p><b>Email:</b> <a href={`mailto:${emails[r.id]}`}>{emails[r.id]}</a> · added to your CRM</p>
        : <button type="button" className="push-btn quiet" onClick={() => void reveal(r.id)}>Show email</button>)}
    </article>)}</div>
  </>
}
