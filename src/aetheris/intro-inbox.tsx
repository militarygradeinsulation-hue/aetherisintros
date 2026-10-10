/**
 * Introduction requests waiting on the signed-in member. Until now a live member could only
 * accept by happening to open the requester's profile; this inbox lists every pending
 * request with the context the requester wrote, and accepts or declines in place using the
 * same server-guarded writes as the profile flow (only the target can set their opt-in).
 */
import { useCallback, useEffect, useState } from 'react'
import { Check, Inbox, X } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
import { ghostSyncIntroAccepted } from './crm/ghost-sync'
import { useGraph } from './graph-store'
import { useNav } from './nav'
import { waitingLabel } from './sent-requests'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

interface Incoming {
  id: string
  requesterId: string
  requesterName: string
  createdAt: string
  capsuleId: string | null
  whyExists: string
  whyTarget: string
  whyNow: string
  firstGoal: string
}

export function IntroRequestInbox() {
  const graph = useGraph()
  const net = useNetwork()
  const nav = useNav()
  const [rows, setRows] = useState<Incoming[]>([])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [retry, setRetry] = useState<{ row: Incoming; accept: boolean } | null>(null)

  const load = useCallback(async () => {
    if (!graph.signedIn || !graph.userId) return
    const r = await db.from('intro_requests').select('id, user_id, reason, mutual_value, created_at, status')
      .eq('target_user_id', graph.userId).eq('member_opt_in', false).neq('status', 'declined').order('created_at', { ascending: true }).limit(50)
    if (r.error) { setMsg(r.error.message); return }
    const reqs = r.data ?? []
    const ids = reqs.map((x: any) => x.id)
    const userIds = [...new Set(reqs.map((x: any) => x.user_id))]
    const [caps, names] = await Promise.all([
      ids.length ? db.from('intro_context_capsules').select('id, intro_request_id, why_exists, why_target, why_now, first_goal').in('intro_request_id', ids) : { data: [] },
      userIds.length ? db.from('profiles').select('id, name').in('id', userIds) : { data: [] },
    ])
    const capBy = new Map<string, any>((caps.data ?? []).map((c: any) => [c.intro_request_id, c]))
    const nameBy = new Map<string, string>((names.data ?? []).map((p: any) => [p.id, p.name as string]))
    setRows(reqs.map((x: any): Incoming => {
      const c: any = capBy.get(x.id)
      return {
        id: x.id, requesterId: x.user_id, requesterName: nameBy.get(x.user_id) || 'A member', createdAt: x.created_at, capsuleId: c?.id ?? null,
        whyExists: c?.why_exists || x.reason || '', whyTarget: c?.why_target || x.mutual_value || '', whyNow: c?.why_now || '', firstGoal: c?.first_goal || '',
      }
    }))
  }, [graph.signedIn, graph.userId])
  useEffect(() => { void load() }, [load])

  const respond = async (row: Incoming, accept: boolean) => {
    setBusy(row.id); setMsg('')
    // One server transaction: checks you are the target and the request is still pending,
    // then updates the request and approves the context capsule together (or neither).
    let u: { error: { message: string; code?: string } | null }
    try { u = await db.rpc('respond_to_intro_request', { p_intro_request_id: row.id, p_accept: accept }) }
    catch (e) { u = { error: { message: e instanceof Error ? e.message : 'Network error' } } }
    setBusy('')
    if (u.error) {
      const gone = u.error.code === 'P0002' || u.error.code === '55000'
      setMsg(gone ? `This request from ${row.requesterName} was withdrawn or already answered.` : `Your response was not saved: ${u.error.message}`)
      if (!gone) setRetry({ row, accept })
      else { setRetry(null); await load() }
      return
    }
    setRetry(null)
    if (accept) {
      // Ghost CRM: the requester becomes (or refreshes) a contact with an intro on their timeline. Never blocks.
      const m = net.members.find(x => x.id === row.requesterId)
      void ghostSyncIntroAccepted({ theirProfile: { id: row.requesterId, name: row.requesterName, title: m?.title ?? '', company: m?.company ?? '', location: m?.location ?? '' }, introId: row.id })
    }
    await graph.logEvent('intro_request', row.id, accept ? 'accepted' : 'declined', `Introduction ${accept ? 'accepted' : 'declined'} with ${row.requesterName}`)
    setMsg(accept ? `Accepted. You and ${row.requesterName} can now open a Relationship Room.` : `Declined. ${row.requesterName} is not told why.`)
    await load()
  }

  if (!graph.signedIn || !rows.length) return msg ? <p className="og-note">{msg}</p> : null

  return <section className="executive-section intro-inbox">
    <Eyebrow signal><Inbox size={12} /> WAITING ON YOU</Eyebrow>
    <h2>{rows.length} introduction request{rows.length === 1 ? '' : 's'} for you.</h2>
    <p className="og-note">Nothing happens until you accept. Read the context the requester wrote, then decide.</p>
    {rows.map(r => {
      const member = net.members.find(m => m.id === r.requesterId)
      return <article key={r.id} className="oc-card">
        <p><b>{r.requesterName}</b> · {waitingLabel(r.createdAt)}</p>
        <dl className="intro-inbox-why">
          {r.whyExists && <div><dt>WHY THIS INTRODUCTION</dt><dd>{r.whyExists}</dd></div>}
          {r.whyTarget && <div><dt>WHY YOU MAY CARE</dt><dd>{r.whyTarget}</dd></div>}
          {r.whyNow && <div><dt>WHY NOW</dt><dd>{r.whyNow}</dd></div>}
          {r.firstGoal && <div><dt>FIRST CONVERSATION</dt><dd>{r.firstGoal}</dd></div>}
        </dl>
        <div className="og-inline">
          <Btn disabled={busy === r.id} onClick={() => void respond(r, true)}><Check size={14} /> Accept</Btn>
          <Btn kind="quiet" disabled={busy === r.id} onClick={() => void respond(r, false)}><X size={14} /> Decline</Btn>
          {member && <Btn kind="quiet" onClick={() => nav.openMember(member)}>Open profile</Btn>}
        </div>
      </article>
    })}
    {msg && <div className="og-note">
      <p>{msg}</p>
      {retry && <Btn kind="quiet" disabled={!!busy} onClick={() => { const r = retry; setRetry(null); void respond(r.row, r.accept) }}>Retry</Btn>}
    </div>}
  </section>
}
