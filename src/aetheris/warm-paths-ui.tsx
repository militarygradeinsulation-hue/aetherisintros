/**
 * Warm Path Finder: "who can get me to this person or company, and how warm is each path?"
 * A panel on a member's profile and the Warm Paths page. Ranking runs in the database
 * (find_warm_paths); the helpers in warm-paths.ts explain it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Flame, MessageSquareText, Route as RouteIcon, Search, X } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { useGraph } from './graph-store'
import { useNav } from './nav'
import { IntroWorkflow, type IntroPrefill } from './opportunity-ui'
import type { Member } from './social'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'
import {
  companyFromQuery, firstName, fromRow, matchPeople, mergePaths, meterWidth, warmthLabel, type WarmPath,
} from './warm-paths'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any
const isUuid = (v: string | null | undefined) => !!v && /^[0-9a-f-]{36}$/i.test(v)

async function fetchPaths(target: string | null, company: string | null, limit: number): Promise<{ data: WarmPath[]; error: string }> {
  const r = await db.rpc('find_warm_paths', { p_target_member: target, p_company: company, p_limit: limit })
  if (r.error) return { data: [], error: 'Warm paths could not be loaded. Please try again.' }
  return { data: (r.data ?? []).map(fromRow), error: '' }
}

const PRIVACY_NOTE = 'Paths use your own meetings, introductions and calendar, plus what members can already see. Nobody is told you searched, and other members’ private data is never used.'

function WarmthMeter({ path }: { path: WarmPath }) {
  return <div className={`warm-meter ${path.band}`} aria-label={`${warmthLabel[path.band]} path, score ${path.score} of 100`}>
    <span><Flame size={12} /> {warmthLabel[path.band]}</span>
    <i><b style={{ width: `${meterWidth(path.score)}%` }} /></i>
  </div>
}

function PathCard({ path, onAsk }: { path: WarmPath; onAsk: (p: WarmPath) => void }) {
  const nav = useNav()
  const net = useNetwork()
  const target = path.targetId ? net.members.find(m => m.id === path.targetId) : undefined
  const role = [path.targetTitle, path.targetCompany].filter(Boolean).join(' · ')
  return <article className="warm-path">
    <header>
      <ol className="warm-hops">
        <li>You</li>
        {path.kind === 'via' && <li><ArrowRight size={12} /><b>{path.connectorName}</b></li>}
        <li><ArrowRight size={12} />{target ? <button type="button" className="text-link" onClick={() => nav.openMember(target)}>{path.targetName}</button> : <b>{path.targetName}</b>}</li>
      </ol>
      <WarmthMeter path={path} />
    </header>
    {role && <small className="warm-role">{role}</small>}
    {path.kind === 'own_contact' && <p className="og-note">Someone you already know at this company, from your own CRM.</p>}
    <div className="warm-reasons">
      {path.reasons.length > 0 && <div><span>{path.kind === 'via' ? `You and ${firstName(path.connectorName)}` : 'You'}</span><ul>{path.reasons.map(r => <li key={r}>{r}</li>)}</ul></div>}
      {path.connectorReasons.length > 0 && <div><span>{firstName(path.connectorName)}</span><ul>{path.connectorReasons.map(r => <li key={r}>{r}</li>)}</ul></div>}
    </div>
    <div className="og-inline">
      {path.kind === 'via' && <Btn onClick={() => onAsk(path)}>Ask {firstName(path.connectorName)} for an intro</Btn>}
      {path.kind === 'direct' && path.targetId && <Btn kind="secondary" onClick={() => nav.messageMember(path.targetId!)}><MessageSquareText size={14} /> Message {firstName(path.targetName)} directly</Btn>}
    </div>
  </article>
}

/** Opens the existing introduction-request flow addressed to the connector, pre-filled. */
function AskConnectorModal({ path, onClose }: { path: WarmPath; onClose: () => void }) {
  const net = useNetwork()
  const connector = net.members.find(m => m.id === path.connectorId)
  const role = [path.targetTitle, path.targetCompany].filter(Boolean).join(' at ')
  const prefill: IntroPrefill = {
    why_exists: `I’d like an introduction to ${path.targetName}${role ? ` (${role})` : ''}. You’re connected to them, and a word from you would mean more than a cold note.`,
    why_target: `${path.targetName} would hear from someone they already know.`,
    first_goal: `A short introduction to ${path.targetName}, if you think it makes sense.`,
  }
  return <div className="modal-wrap" onMouseDown={onClose}>
    <section className="modal warm-ask" onMouseDown={e => e.stopPropagation()}>
      <header><div><Eyebrow>WARM PATH</Eyebrow><h2>Ask {path.connectorName} to introduce you to {path.targetName}</h2>
        <p>{firstName(path.connectorName)} sees only what you write below and decides whether to help. {path.targetName} is not contacted unless {firstName(path.connectorName)} agrees.</p></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
      {connector ? <IntroWorkflow member={connector} prefill={prefill} /> : <p className="og-note">{path.connectorName} is not in your member directory right now, so a request cannot be sent from here.</p>}
    </section>
  </div>
}

function PathList({ paths, loading, error, empty }: { paths: WarmPath[]; loading: boolean; error: string; empty: string }) {
  const [asking, setAsking] = useState<WarmPath | null>(null)
  if (loading) return <p className="og-note">Finding paths…</p>
  if (error) return <p className="og-note">{error}</p>
  return <>
    {paths.length ? <div className="warm-paths">{paths.map(p => <PathCard key={`${p.kind}-${p.targetId ?? p.targetName}-${p.connectorId ?? ''}`} path={p} onAsk={setAsking} />)}</div>
      : <p className="og-note">{empty}</p>}
    {asking && <AskConnectorModal path={asking} onClose={() => setAsking(null)} />}
  </>
}

/** Profile panel: ranked paths to this member. */
export function WarmPathPanel({ target }: { target: Member }) {
  const graph = useGraph()
  const [paths, setPaths] = useState<WarmPath[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const live = graph.signedIn && isUuid(target.id) && target.id !== graph.userId

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetchPaths(target.id, null, 5)
    setPaths(r.data); setError(r.error); setLoading(false)
  }, [target.id])
  useEffect(() => { if (live && open) void load() }, [live, open, load])

  if (!live) return null
  return <section className="executive-section warm-panel">
    <div className="executive-section-head"><div><Eyebrow><RouteIcon size={12} /> FIND A WARM PATH</Eyebrow><h2>Who can introduce you to {firstName(target.name)}?</h2></div>
      {!open && <Btn kind="secondary" onClick={() => setOpen(true)}><Search size={14} /> Find a warm path</Btn>}</div>
    {open && <>
      <PathList paths={paths} loading={loading} error={error} empty={`No warm path to ${firstName(target.name)} yet. Meet or connect with people who know them, or request an introduction directly.`} />
      <p className="og-note">{PRIVACY_NOTE}</p>
    </>}
  </section>
}

function ConnectorOptOut() {
  const graph = useGraph()
  const [optedOut, setOptedOut] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!graph.signedIn) return
    void db.from('warm_path_optouts').select('user_id').maybeSingle().then((r: { data: unknown }) => setOptedOut(!!r.data))
  }, [graph.signedIn])
  if (optedOut === null || !graph.userId) return null
  const toggle = async () => {
    setBusy(true)
    const r = optedOut
      ? await db.from('warm_path_optouts').delete().eq('user_id', graph.userId)
      : await db.from('warm_path_optouts').insert({ user_id: graph.userId })
    if (!r.error) setOptedOut(!optedOut)
    setBusy(false)
  }
  return <label className="warm-optout"><input type="checkbox" checked={!optedOut} disabled={busy} onChange={() => void toggle()} />
    <span>Suggest me as a connector to members who know me. They still ask you first, and you decide.</span></label>
}

type Mode = 'describe' | 'company'

/** The Warm Paths page: search by member, company or a plain description. */
export function WarmPathsPage() {
  const graph = useGraph()
  const net = useNetwork()
  const [mode, setMode] = useState<Mode>('describe')
  const [query, setQuery] = useState('')
  const [paths, setPaths] = useState<WarmPath[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState('')
  const people = useMemo(() => net.members.filter(m => isUuid(m.id) && m.id !== graph.userId), [net.members, graph.userId])

  const run = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true); setError(''); setSearched(q)
    const exact = people.find(p => p.name.toLowerCase() === q.toLowerCase())
    const company = mode === 'company' ? q : exact ? null : companyFromQuery(q, people)
    let results: { data: WarmPath[]; error: string }[]
    if (exact) results = [await fetchPaths(exact.id, null, 10)]
    else if (company) results = [await fetchPaths(null, company, 10)]
    else {
      const targets = matchPeople(q, people, 5)
      results = await Promise.all(targets.map(t => fetchPaths(t.id, null, 5)))
    }
    setPaths(mergePaths(results.map(r => r.data), 10))
    setError(results.find(r => r.error)?.error ?? '')
    setLoading(false)
  }

  if (!graph.signedIn) {
    return <section className="warm-page"><Eyebrow>WARM PATHS</Eyebrow><h1>Who can get you to them?</h1><p className="og-note">Sign in to find warm paths to members and companies.</p></section>
  }

  return <section className="warm-page">
    <header>
      <Eyebrow><RouteIcon size={12} /> RELATIONSHIP INTELLIGENCE</Eyebrow>
      <h1>Who can get you to them, and how warm is each path?</h1>
      <p className="og-note">Name a member, a company, or describe who you need (“CFO at a logistics company in Texas”). Paths are ranked Hot, Warm or Cool, with the reasons shown.</p>
    </header>
    <form className="warm-search" onSubmit={e => { e.preventDefault(); void run() }}>
      <div className="warm-modes" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'describe'} className={mode === 'describe' ? 'active' : ''} onClick={() => setMode('describe')}>Person or description</button>
        <button type="button" role="tab" aria-selected={mode === 'company'} className={mode === 'company' ? 'active' : ''} onClick={() => setMode('company')}>Company</button>
      </div>
      <input list="warm-people" value={query} maxLength={200} onChange={e => setQuery(e.target.value)}
        placeholder={mode === 'company' ? 'Company name, e.g. Acme Inc.' : 'A member’s name, or who you need'} aria-label="Who are you trying to reach?" />
      {mode === 'describe' && <datalist id="warm-people">{people.slice(0, 200).map(p => <option key={p.id} value={p.name}>{[p.title, p.company].filter(Boolean).join(' · ')}</option>)}</datalist>}
      <Btn disabled={!query.trim() || loading} onClick={() => void run()}><Search size={14} /> Find paths</Btn>
    </form>
    {searched && <PathList paths={paths} loading={loading} error={error}
      empty={mode === 'company' ? `No member or contact at “${searched}” yet. Try another spelling, or add the people you know there to your CRM.` : `No one matched “${searched}”. Try a member’s name, a title, an industry or a company.`} />}
    <footer className="warm-foot"><p className="og-note">{PRIVACY_NOTE}</p><ConnectorOptOut /></footer>
  </section>
}
