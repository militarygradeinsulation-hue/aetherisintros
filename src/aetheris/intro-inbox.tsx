/**
 * Introduction requests waiting on the signed-in member. Until now a live member could only
 * accept by happening to open the requester's profile; this inbox lists every pending
 * request with the context the requester wrote, and accepts or declines in place using the
 * same server-guarded writes as the profile flow (only the target can set their opt-in).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Inbox, X } from 'lucide-react'

import { supabase } from '@/integrations/supabase/client'
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
  const decisionPending = useRef(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    if (!graph.signedIn || !graph.userId) { setRows([]); return }
    try {
      const r = await db.from('intro_requests').select('id, user_id, reason, mutual_value, created_at, status')
        .eq('target_user_id', graph.userId).eq('member_opt_in', false)
        .neq('status', 'declined').order('created_at', { ascending: true }).limit(50)
      if (r.error) throw new Error('Unable to read introduction requests.')
      const reqs = r.data ?? []
      const ids = reqs.map((x: any) => x.id)
      const [caps, names] = await Promise.all([
        ids.length ? db.from('intro_context_capsules')
          .select('id, intro_request_id, why_exists, why_target, why_now, first_goal')
          .in('intro_request_id', ids) : { data: [], error: null },
        ids.length ? db.rpc('my_intro_participant_names', { p_intro_ids: ids }) : { data: [], error: null },
      ])
      // Capsules enrich context but are optional: a capsule read error must not hide the
      // underlying introduction from its intended recipient.
      if (names.error) throw new Error('Introduction names are temporarily unavailable.')
      const capBy = new Map<string, any>((caps.data ?? []).map((c: any) => [c.intro_request_id, c]))
      const nameBy = new Map<string, string>((names.data ?? []).map((p: any) => [p.intro_request_id, p.other_name as string]))
      setRows(reqs.map((x: any): Incoming => {
        const c: any = capBy.get(x.id)
        return {
          id: x.id, requesterId: x.user_id, requesterName: nameBy.get(x.id) || 'A member',
          createdAt: x.created_at, capsuleId: c?.id ?? null,
          whyExists: c?.why_exists || x.reason || '', whyTarget: c?.why_target || x.mutual_value || '',
          whyNow: c?.why_now || '', firstGoal: c?.first_goal || '',
        }
      }))
    } catch {
      setRows([])
      setMsg('Could not refresh your introduction inbox. Retry after checking your connection.')
    }
  }, [graph.signedIn, graph.userId])
  useEffect(() => { void load() }, [load])

  const respond = async (row: Incoming, accept: boolean) => {
    if (decisionPending.current) return
    decisionPending.current = true
    setBusy(row.id)
    setMsg('')
    try {
      if (accept && row.capsuleId) {
        const c = await db.from('intro_context_capsules').update({ target_approved: true })
          .eq('id', row.capsuleId).select('id')
        if (c.error || !(c.data ?? []).length) {
          throw new Error('The introduction context approval was not confirmed.')
        }
      }
      const u = await db.from('intro_requests')
        .update(accept ? { member_opt_in: true, status: 'accepted' } : { status: 'declined' })
        .eq('id', row.id).select('id')
      if (u.error) throw new Error('The introduction response was not confirmed.')
      if (!(u.data ?? []).length) {
        setMsg('This request was withdrawn or already answered. Refresh to see its current state.')
        await load()
        return
      }
      // The response is durable before any auxiliary activity record is attempted.
      try {
        await graph.logEvent('intro_request', row.id, accept ? 'accepted' : 'declined',
          `Introduction ${accept ? 'accepted' : 'declined'} with ${row.requesterName}`)
      } catch { /* the confirmed decision must remain usable if activity logging is delayed */ }
      setMsg(accept
        ? `Accepted. You and ${row.requesterName} can now open a Relationship Room.`
        : `Declined. ${row.requesterName} is not told why.`)
      await load()
    } catch {
      setMsg('Could not confirm this decision. Refresh the inbox to check its state before retrying.')
    } finally {
      decisionPending.current = false
      setBusy('')
    }
  }

  if (!graph.signedIn) return null
  if (!rows.length) return msg
    ? <div className="og-note"><p role="alert">{msg}</p><Btn kind="quiet" onClick={() => { setMsg(''); void load() }}>Retry inbox</Btn></div>
    : null

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
    {msg && <p className="og-note" role="status">{msg}</p>}
  </section>
}
