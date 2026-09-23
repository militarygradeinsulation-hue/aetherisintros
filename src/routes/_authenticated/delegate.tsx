import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import '@/aetheris/styles.css'

export const Route = createFileRoute('/_authenticated/delegate')({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: 'Delegate workspace — Ask Intros' },
      { name: 'description', content: 'A limited workspace for authorised delegates of verified Ask Intros members.' },
      { property: 'og:title', content: 'Delegate workspace — Ask Intros' },
      { property: 'og:description', content: 'Least-privilege access granted by a verified member.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: DelegateWorkspace,
})

interface Invite { id: string; principal_name: string; role_label: string; permissions: string[]; status: string }
const LABELS: Record<string, string> = { calendar: 'Calendar & meeting prep', crm: 'CRM / Work', draft_messages: 'Draft messages (never sent)', relationship_notes: 'Relationship notes', scheduling: 'Scheduling', opportunity_updates: 'Opportunity updates' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function DelegateWorkspace() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [principalId, setPrincipalId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const reload = useCallback(async () => {
    const r = await db.rpc('my_delegate_invites')
    setInvites(r.data ?? [])
    const g = await db.from('delegates').select('principal_id').eq('status', 'active').limit(1).maybeSingle()
    setPrincipalId(g.data?.principal_id ?? null)
  }, [])
  useEffect(() => { void reload() }, [reload])
  const act = async (fn: string, id: string) => {
    const r = await db.rpc(fn, { p_id: id })
    setNote(r.error ? r.error.message : fn === 'accept_delegate_invite' ? 'Access accepted.' : 'Access removed.')
    void reload()
  }
  const active = invites.find(i => i.status === 'active')
  return <main className="verify-page delegate-page">
    <section className="verify-panel">
      <div className="auth-index"><span className="folio">DELEGATE WORKSPACE</span><span>LIMITED ACCESS</span></div>
      <h1>Work on their behalf.<br /><em>Only where they allow.</em></h1>
      <p className="auth-lede">A delegate is not a network member. You cannot browse the network, see Signals, open Executive Pages or send introductions or messages.</p>
      {note && <p className="executive-form-note">{note}</p>}
      {!invites.length && <p className="auth-lede">No invitations for this email. Ask the member to invite the exact email you signed in with.</p>}
      {invites.map(i => <article key={i.id} className="delegate-invite">
        <b>{i.principal_name}</b> <span>· {i.role_label} · {i.status.toUpperCase()}</span>
        <p>{i.permissions.map(p => LABELS[p] ?? p).join(' · ') || 'No modules'}</p>
        {i.status === 'invited' && <button className="btn btn-primary" onClick={() => void act('accept_delegate_invite', i.id)}>Accept</button>}
        <button className="btn btn-quiet" onClick={() => void act('decline_delegate_invite', i.id)}>{i.status === 'invited' ? 'Decline' : 'Leave'}</button>
      </article>)}
      {active && principalId && <Modules perms={active.permissions} principal={principalId} />}
      <Link to="/" className="btn btn-quiet">Back</Link>
    </section>
  </main>
}

function Modules({ perms, principal }: { perms: string[]; principal: string }) {
  const has = (p: string) => perms.includes(p)
  const [events, setEvents] = useState<Array<{ id: string; title: string; starts_at: string }>>([])
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string }>>([])
  const [people, setPeople] = useState<Array<{ id: string; full_name: string; company_name: string }>>([])
  const [opps, setOpps] = useState<Array<{ id: string; name: string; next_action: string }>>([])
  const [notes, setNotes] = useState<Array<{ id: string; body: string }>>([])
  const [drafts, setDrafts] = useState<Array<{ id: string; recipient_label: string; body: string }>>([])
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    if (has('calendar') || has('scheduling')) setEvents((await db.from('calendar_events').select('id,title,starts_at').eq('user_id', principal).order('starts_at').limit(20)).data ?? [])
    if (has('crm')) {
      setTasks((await db.from('crm_tasks').select('id,title,status').eq('owner_id', principal).limit(20)).data ?? [])
      setPeople((await db.from('crm_people').select('id,full_name,company_name').eq('owner_id', principal).eq('archived', false).limit(30)).data ?? [])
    }
    if (has('crm') || has('opportunity_updates')) setOpps((await db.from('crm_opportunities').select('id,name,next_action').eq('owner_id', principal).eq('archived', false).limit(20)).data ?? [])
    if (has('relationship_notes')) setNotes((await db.from('crm_notes').select('id,body').eq('owner_id', principal).limit(20)).data ?? [])
    if (has('draft_messages')) setDrafts((await db.from('delegate_message_drafts').select('id,recipient_label,body').eq('principal_id', principal).limit(20)).data ?? [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principal, perms.join()])
  useEffect(() => { void load() }, [load])
  const done = (e: { message: string } | null) => { setMsg(e ? e.message : 'Saved.'); setText(''); void load() }
  const ok = text.trim().length > 0
  return <div className="delegate-modules">
    <label>Entry<textarea value={text} onChange={e => setText(e.target.value)} placeholder="Task, note, draft or event title" /></label>
    {msg && <p className="executive-form-note">{msg}</p>}
    {(has('calendar') || has('scheduling')) && <section><h3>Calendar</h3>
      <ul>{events.map(e => <li key={e.id}>{new Date(e.starts_at).toLocaleString()} — {e.title}</li>)}</ul>
      {has('scheduling') && <button className="btn btn-quiet" disabled={!ok} onClick={async () => { const s = new Date(Date.now() + 86400000); done((await db.from('calendar_events').insert({ user_id: principal, title: text.trim(), starts_at: s.toISOString(), ends_at: new Date(s.getTime() + 1800000).toISOString(), kind: 'meeting' })).error) }}>Add tentative meeting tomorrow</button>}
    </section>}
    {has('crm') && <section><h3>CRM</h3>
      <ul>{people.map(p => <li key={p.id}>{p.full_name}{p.company_name ? ` · ${p.company_name}` : ''}</li>)}</ul>
      <ul>{tasks.map(t => <li key={t.id}>{t.status} — {t.title}</li>)}</ul>
      <button className="btn btn-quiet" disabled={!ok} onClick={async () => done((await db.from('crm_tasks').insert({ owner_id: principal, title: text.trim() })).error)}>Add task</button>
    </section>}
    {(has('crm') || has('opportunity_updates')) && <section><h3>Opportunities</h3>
      <ul>{opps.map(o => <li key={o.id}>{o.name} — next: {o.next_action || '—'} <button className="btn btn-quiet" disabled={!ok} onClick={async () => done((await db.from('crm_opportunities').update({ next_action: text.trim() }).eq('id', o.id)).error)}>Set next action</button></li>)}</ul>
    </section>}
    {has('relationship_notes') && <section><h3>Relationship notes</h3>
      <ul>{notes.map(n => <li key={n.id}>{n.body}</li>)}</ul>
      {people[0] && <button className="btn btn-quiet" disabled={!ok} onClick={async () => done((await db.from('crm_notes').insert({ owner_id: principal, entity_type: 'person', entity_id: people[0]!.id, body: text.trim() })).error)}>Add note to {people[0].full_name}</button>}
    </section>}
    {has('draft_messages') && <section><h3>Drafts (never sent — the member reviews and sends)</h3>
      <ul>{drafts.map(d => <li key={d.id}>{d.body}</li>)}</ul>
      <button className="btn btn-quiet" disabled={!ok} onClick={async () => done((await db.from('delegate_message_drafts').insert({ principal_id: principal, body: text.trim() })).error)}>Save draft</button>
    </section>}
  </div>
}
