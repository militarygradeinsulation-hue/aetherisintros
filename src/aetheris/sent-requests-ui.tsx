/**
 * "Your requests": introduction requests the member sent that are still unanswered, with how
 * long each has waited, one reminder after five days, and withdrawal. After two weeks it
 * points the member to another path instead of letting the request die quietly.
 */
import { useCallback, useEffect, useState } from 'react'
import { BellRing, Hourglass, Undo2 } from 'lucide-react'

import { useGraph } from './graph-store'
import { useNav } from './nav'
import { loadSentRequests, nudgeRequest, sentStage, stageLine, withdrawRequest, type SentRequest } from './sent-requests'
import { useNetwork } from './store'
import { Btn, Eyebrow } from './ui'

export function SentIntroRequests() {
  const graph = useGraph()
  const net = useNetwork()
  const nav = useNav()
  const [rows, setRows] = useState<SentRequest[]>([])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    if (!graph.signedIn) return
    const r = await loadSentRequests()
    setRows(r.data)
    if (r.error) setMsg(r.error)
  }, [graph.signedIn])
  useEffect(() => { void load() }, [load])

  const nudge = async (r: SentRequest) => {
    setBusy(r.id); setMsg('')
    const err = await nudgeRequest(r.id)
    setBusy('')
    setMsg(err || `Reminder sent. ${r.targetName} sees it in their notifications.`)
    await load()
  }

  const withdraw = async (r: SentRequest) => {
    setBusy(r.id); setMsg('')
    const err = await withdrawRequest(r.id)
    setBusy('')
    if (err) { setMsg(err); await load(); return }
    net.withdrawIntro(r.targetId)
    setMsg(`Withdrawn. ${r.targetName} will no longer see the request.`)
    await load()
  }

  if (!graph.signedIn || !rows.length) return msg ? <p className="og-note">{msg}</p> : null

  return <section className="executive-section sent-requests">
    <Eyebrow><Hourglass size={12} /> YOUR REQUESTS</Eyebrow>
    <h2>{rows.length} introduction request{rows.length === 1 ? '' : 's'} waiting on an answer.</h2>
    {rows.map(r => {
      const stage = sentStage(r)
      const member = net.members.find(m => m.id === r.targetId)
      return <article key={r.id} className={`oc-card sent-${stage}`}>
        <p><b>{r.targetName}</b>{r.reason && <> · {r.reason}</>}</p>
        <p className="og-note">{stageLine(r)}</p>
        <div className="og-inline">
          {stage === 'nudge' && <Btn disabled={busy === r.id} onClick={() => void nudge(r)}><BellRing size={14} /> Send one reminder</Btn>}
          <Btn kind="quiet" disabled={busy === r.id} onClick={() => void withdraw(r)}><Undo2 size={14} /> Withdraw</Btn>
          {stage === 'stale' && <Btn kind="quiet" onClick={() => nav.setPage('needs')}>Post it as an ask</Btn>}
          {member && <Btn kind="quiet" onClick={() => nav.openMember(member)}>Open profile</Btn>}
        </div>
      </article>
    })}
    {msg && <p className="og-note">{msg}</p>}
  </section>
}
