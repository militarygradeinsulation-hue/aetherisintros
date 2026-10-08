/**
 * "Who has solved this?" on a Diagnose finding. Shows members whose own profiles state
 * relevant experience and lets the owner post an edited, de-identified ask. Nothing is
 * shared until the owner clicks Post, and the default visibility is private.
 */
import { useContext, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Send, Users } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { useGraph } from '../graph-store'
import { NavCtx } from '../nav'
import { useNetwork } from '../store'
import { Btn } from '../ui'
import { draftAsk, routeFinding } from './route'
import type { FindingRow } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export function RouteToNetwork({ f }: { f: FindingRow }) {
  const net = useNetwork()
  const graph = useGraph()
  const nav = useContext(NavCtx)
  const [open, setOpen] = useState(false)
  const draft = useMemo(() => draftAsk(f, { industry: net.profile.industries?.[0] }), [f, net.profile.industries])
  const [statement, setStatement] = useState(draft.statement)
  const [edited, setEdited] = useState(false)
  const [posting, setPosting] = useState(false)
  // The live profile hydrates after mount; keep the draft current until the owner edits it.
  useEffect(() => { if (!edited) setStatement(draft.statement) }, [draft.statement, edited])
  const [visibility, setVisibility] = useState<'private' | 'network'>('private')
  const [msg, setMsg] = useState('')
  const [posted, setPosted] = useState(false)
  const matches = useMemo(() => (open ? routeFinding(f, net.members, { excludeIds: graph.userId ? [graph.userId] : [] }) : []), [open, f, net.members, graph.userId])

  const post = async () => {
    const text = statement.trim()
    if (!text || posting) return
    if (!graph.signedIn) { setMsg('Sign in with a verified account to post this ask.'); return }
    setPosting(true)
    const res = await db.from('asks').insert({
      id: `ask-${crypto.randomUUID()}`, author_id: graph.userId, ask: text, detail: '', why_now: '', offer: '', industry: net.profile.industries?.[0] ?? '',
      location: '', urgency: f.severity === 'critical' || f.severity === 'high' ? 'high' : 'medium', posted: 'Just now', response_count: 0,
      visibility, category: draft.category, expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), status: 'active', reveal_identity: true,
    })
    if (res.error) { setMsg(res.error.message); setPosting(false); return }
    await graph.logEvent('capability_finding', f.id, 'routed_to_network', `Routed "${draft.area}" to the network as a ${visibility} ask`, { visibility })
    setPosted(true)
    setMsg(visibility === 'private' ? 'Saved privately. Only your own matching uses it.' : 'Live to verified members for 30 days.')
  }

  if (!open) return <button onClick={() => setOpen(true)}><Users size={12} /> Who has solved this?</button>

  return <div className="capws-route">
    <small>ROUTE TO THE NETWORK · {draft.area.toUpperCase()}</small>
    {matches.length ? <ul>{matches.map(m => <li key={m.member.id}>
      <span><b>{m.member.name}</b>{m.member.title ? ` · ${m.member.title}` : ''}{m.member.company ? `, ${m.member.company}` : ''}</span>
      <em>{m.reasons.join(' · ')}</em>
      {nav && <button onClick={() => nav.openIntro(m.member)}>Request introduction <ArrowRight size={12} /></button>}
    </li>)}</ul>
      : <p className="capws-muted">No member has stated this experience on their profile yet. Post an ask so the right person can find you.</p>}
    {!posted && <>
      <label>Ask (edit before posting — nothing from the finding is included)
        <textarea rows={3} maxLength={500} value={statement} onChange={e => { setEdited(true); setStatement(e.target.value) }} /></label>
      <div className="capws-route-vis">
        {(['private', 'network'] as const).map(v => <button key={v} className={visibility === v ? 'on' : ''} onClick={() => setVisibility(v)}>
          {v === 'private' ? 'Private — my matching only' : 'Network — verified members'}</button>)}
      </div>
      <Btn kind="secondary" disabled={posting} onClick={() => void post()}><Send size={13} /> Post ask</Btn>
    </>}
    {msg && <p className="capws-muted">{msg}</p>}
  </div>
}
