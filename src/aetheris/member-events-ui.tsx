/**
 * Member events: the live Events page (upcoming / past, replies, waitlist, attendee list,
 * "Add to calendar", "Met someone here?") and the admin Events panel (create, edit, publish,
 * cancel, invites, attendee CSV export). Rules are enforced in the database (0050).
 */
import { CalendarDays, CalendarPlus, Download, Globe, Lock, MapPin, Pencil, Users, Video } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { contactExportIsDenied } from '@/lib/contact-export'
import {
  buildEventIcs, eventWhen, icsFileName, isValidTimeZone, toCsv, utcToZonedLocal, zonedLocalToUtc,
} from './event-format'
import { useNav } from './nav'
import { useNetwork } from './store'
import { Btn, Eyebrow, Head } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export type EventFormat = 'in_person' | 'virtual' | 'hybrid'
export interface MemberEvent {
  id: string; title: string; description: string; starts_at: string; ends_at: string; timezone: string
  format: EventFormat; city: string | null; capacity: number | null; visibility: 'all_members' | 'invite_only'
  status: 'draft' | 'published' | 'cancelled'; host_id: string | null; host_name: string | null; is_host: boolean
  going_count: number; waitlist_count: number; my_status: 'going' | 'waitlist' | 'declined' | null
  waitlist_position: number | null; venue: string | null; join_url: string | null; invite_count: number | null
}
interface Attendee { user_id: string; name: string; company?: string | null; email?: string | null; status?: string; replied_at?: string }

const FORMAT_LABEL: Record<EventFormat, string> = { in_person: 'In person', virtual: 'Virtual', hybrid: 'Hybrid' }

async function loadEvents(): Promise<MemberEvent[]> {
  const r = await db.rpc('list_member_events')
  if (r.error) throw new Error(r.error.message)
  return (r.data ?? []) as MemberEvent[]
}

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function addToCalendar(e: MemberEvent) {
  const location = e.venue ? [e.venue, e.city].filter(Boolean).join(', ') : e.join_url ?? (e.format === 'virtual' ? 'Online' : e.city)
  download(icsFileName(e.title), 'text/calendar;charset=utf-8', buildEventIcs({
    id: e.id, title: e.title, description: e.description, startsAt: e.starts_at, endsAt: e.ends_at,
    location, url: e.join_url, cancelled: e.status === 'cancelled',
  }))
}

const placesLine = (e: MemberEvent) => e.capacity == null
  ? `${e.going_count} going`
  : `${Math.min(e.going_count, e.capacity)} of ${e.capacity} places taken${e.waitlist_count ? ` · ${e.waitlist_count} on the waitlist` : ''}`

/* ── Member: Events page ──────────────────────────────────────────────────────────────── */

export function LiveEventsPage() {
  const [events, setEvents] = useState<MemberEvent[] | null>(null)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [error, setError] = useState('')
  const [me, setMe] = useState<string | null>(null)
  const reload = useCallback(async () => {
    try { setEvents(await loadEvents()); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'Events could not load.'); setEvents([]) }
  }, [])
  useEffect(() => {
    void reload()
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null))
  }, [reload])

  const now = Date.now()
  const shown = useMemo(() => (events ?? [])
    .filter(e => e.status !== 'draft')
    .filter(e => (tab === 'upcoming' ? new Date(e.ends_at).getTime() >= now : new Date(e.ends_at).getTime() < now))
    .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())), [events, tab, now])
  const going = (events ?? []).filter(e => e.my_status === 'going' && e.status === 'published' && new Date(e.ends_at).getTime() >= now).length

  return <>
    <Head
      label="EVENTS / MEMBER ROOMS"
      title="Dinners, roundtables and virtual sessions."
      copy="Small rooms run by the Ask Intros team. Reply going to hold a place; when a room is full you join the waitlist and move up automatically if someone drops out."
      {...(events ? { proof: `${going} upcoming event${going === 1 ? '' : 's'} on your list` } : {})}
    />
    <p className="mev-privacy"><Lock size={12} aria-hidden /> The address and join link are shown once you are going. People going can see each other's names. Invite-only events are visible only to invitees.</p>
    <div className="state-filters" role="tablist">
      {(['upcoming', 'past'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'upcoming' ? 'Upcoming' : 'Past'}</button>)}
    </div>
    {error && <p className="og-note">{error}</p>}
    {events === null
      ? <p className="empty-state">Loading events…</p>
      : !shown.length
        ? <p className="empty-state">{tab === 'upcoming'
          ? 'No upcoming events yet. When the team schedules a dinner, roundtable or virtual session, it appears here and you can reply.'
          : 'No past events yet. After you attend one, you can find the people you met here.'}</p>
        : <section className="mev-list">{shown.map(e => <EventCard key={e.id} event={e} me={me} past={tab === 'past'} onChange={reload} />)}</section>}
  </>
}

function EventCard({ event: e, me, past, onChange }: { event: MemberEvent; me: string | null; past: boolean; onChange: () => Promise<void> }) {
  const nav = useNav()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [people, setPeople] = useState<Attendee[] | null>(null)
  const [showPeople, setShowPeople] = useState(false)
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(e.description)
  const cancelled = e.status === 'cancelled'
  const isGoing = e.my_status === 'going'
  const canSeePeople = isGoing || e.is_host

  const reply = async (choice: 'going' | 'declined') => {
    setBusy(true); setMsg('')
    const r = await db.rpc('rsvp_event', { p_event: e.id, p_choice: choice })
    setBusy(false)
    if (r.error) { setMsg(r.error.message); return }
    if (r.data === 'waitlist') setMsg('The room is full, so you are on the waitlist. We will tell you if a place opens up.')
    setPeople(null)
    await onChange()
  }
  const loadPeople = async () => {
    if (!showPeople && !people) {
      const r = await db.rpc('event_attendees', { p_event: e.id })
      if (r.error) { setMsg(r.error.message); return }
      setPeople(r.data ?? [])
    }
    setShowPeople(s => !s)
  }
  const saveDescription = async () => {
    const r = await db.from('member_events').update({ description: desc.trim() }).eq('id', e.id).select('id')
    if (r.error || !r.data?.length) { setMsg(r.error?.message ?? 'Could not save.'); return }
    setEditing(false); await onChange()
  }

  return <article className={`mev-card${cancelled ? ' cancelled' : ''}`}>
    <div className="mev-head">
      <Eyebrow signal={isGoing}>{FORMAT_LABEL[e.format].toUpperCase()}{e.visibility === 'invite_only' ? ' · INVITE ONLY' : ''}{cancelled ? ' · CANCELLED' : ''}</Eyebrow>
      <h2>{e.title}</h2>
      <p className="mev-when"><CalendarDays size={13} aria-hidden /> {eventWhen(e.starts_at, e.ends_at, e.timezone)}</p>
      <p className="mev-meta">
        {e.format !== 'virtual' && e.city && <span><MapPin size={12} aria-hidden /> {e.city}</span>}
        {e.format !== 'in_person' && <span><Video size={12} aria-hidden /> Online</span>}
        <span><Users size={12} aria-hidden /> {placesLine(e)}</span>
        {e.host_name && <span>Hosted by {e.host_name}</span>}
      </p>
    </div>

    {editing
      ? <div className="mev-edit"><textarea rows={4} maxLength={4000} value={desc} onChange={x => setDesc(x.target.value)} />
        <div className="mev-actions"><Btn onClick={() => void saveDescription()}>Save description</Btn><Btn kind="quiet" onClick={() => { setEditing(false); setDesc(e.description) }}>Cancel</Btn></div></div>
      : e.description && <p className="mev-desc">{e.description}</p>}

    {(isGoing || e.is_host) && !cancelled && <div className="mev-private">
      {e.venue && <p><MapPin size={13} aria-hidden /> <b>{e.venue}</b>{e.city ? `, ${e.city}` : ''}</p>}
      {e.join_url && !past && <p><Globe size={13} aria-hidden /> <a href={e.join_url} target="_blank" rel="noopener noreferrer">Join online</a></p>}
      {e.format !== 'in_person' && !e.join_url && !past && <p><Video size={13} aria-hidden /> This session runs in Ask Intros Meetings. <button type="button" className="text-link" onClick={() => nav.setPage('meetings')}>Open Meetings</button></p>}
    </div>}

    <div className="mev-actions">
      {!past && !cancelled && e.status === 'published' && <>
        {e.my_status === 'going' && <span className="mev-status">You are going</span>}
        {e.my_status === 'waitlist' && <span className="mev-status">On the waitlist{e.waitlist_position ? ` · number ${e.waitlist_position}` : ''}</span>}
        {(e.my_status === null || e.my_status === 'declined') && <Btn disabled={busy} onClick={() => void reply('going')}>{e.capacity != null && e.going_count >= e.capacity ? 'Join the waitlist' : "I'm going"}</Btn>}
        {e.my_status !== 'declined' && <Btn kind="secondary" disabled={busy} onClick={() => void reply('declined')}>{e.my_status === 'going' ? 'I can no longer go' : e.my_status === 'waitlist' ? 'Leave the waitlist' : "Can't go"}</Btn>}
        {e.my_status === 'declined' && <span className="mev-status">You said you can't go</span>}
      </>}
      {!past && !cancelled && <Btn kind="quiet" onClick={() => addToCalendar(e)}><CalendarPlus size={14} /> Add to calendar</Btn>}
      {canSeePeople && <Btn kind="quiet" onClick={() => void loadPeople()}><Users size={14} /> {past && isGoing ? 'Met someone here?' : showPeople ? 'Hide who is going' : 'Who is going'}</Btn>}
      {e.is_host && !editing && !cancelled && <Btn kind="quiet" onClick={() => setEditing(true)}><Pencil size={14} /> Edit description</Btn>}
    </div>
    {msg && <p className="og-note">{msg}</p>}
    {showPeople && people && <AttendeeList people={people} me={me} past={past && isGoing} host={e.is_host} />}
  </article>
}

function AttendeeList({ people, me, past, host }: { people: Attendee[]; me: string | null; past: boolean; host: boolean }) {
  const nav = useNav()
  const net = useNetwork()
  const others = people.filter(p => p.user_id !== me)
  if (!others.length) return <p className="og-note">No one else is going yet.</p>
  return <div className="mev-people">
    {past && <p className="og-note">Ask for an introduction to someone you met. They see your request in Introductions and can accept or decline.</p>}
    <ul>{others.map(p => {
      const member = net.members.find(m => m.id === p.user_id)
      return <li key={p.user_id}>
        <span><b>{p.name}</b>{host && p.status && <small>{p.status === 'waitlist' ? 'Waitlist' : 'Going'}{p.company ? ` · ${p.company}` : ''}</small>}</span>
        {member && (past
          ? <button type="button" className="text-link" onClick={() => nav.openIntro(member)}>Request intro</button>
          : <button type="button" className="text-link" onClick={() => nav.openMember(member)}>View profile</button>)}
      </li>
    })}</ul>
  </div>
}

/* ── Admin: Events panel ──────────────────────────────────────────────────────────────── */

interface Draft {
  id?: string; title: string; description: string; start: string; end: string; timezone: string; format: EventFormat
  city: string; venue: string; join_url: string; capacity: string; visibility: 'all_members' | 'invite_only'; host_id: string
}
const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' } }
const blank = (): Draft => ({ title: '', description: '', start: '', end: '', timezone: localTz(), format: 'in_person', city: '', venue: '', join_url: '', capacity: '', visibility: 'all_members', host_id: '' })
const toDraft = (e: MemberEvent): Draft => ({
  id: e.id, title: e.title, description: e.description, start: utcToZonedLocal(e.starts_at, e.timezone), end: utcToZonedLocal(e.ends_at, e.timezone),
  timezone: e.timezone, format: e.format, city: e.city ?? '', venue: e.venue ?? '', join_url: e.join_url ?? '',
  capacity: e.capacity == null ? '' : String(e.capacity), visibility: e.visibility, host_id: e.host_id ?? '',
})

type Profile = { id: string; name: string; company: string | null }

export function AdminEventsPanel() {
  const [events, setEvents] = useState<MemberEvent[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    try { setEvents(await loadEvents()) } catch (e) { setMsg(e instanceof Error ? e.message : 'Events could not load.') }
    const p = await db.from('profiles').select('id, name, company').order('name').limit(1000)
    setProfiles(((p.data ?? []) as Profile[]).filter(x => x.name))
  }, [])
  useEffect(() => { void load() }, [load])

  const save = async (d: Draft, status?: MemberEvent['status']) => {
    setMsg('')
    if (!isValidTimeZone(d.timezone)) { setMsg('Use a real time zone, like Europe/London.'); return }
    let starts: Date, ends: Date
    try { starts = zonedLocalToUtc(d.start, d.timezone); ends = zonedLocalToUtc(d.end, d.timezone) } catch { setMsg('Set a start and end date and time.'); return }
    if (d.join_url && !/^https:\/\//i.test(d.join_url.trim())) { setMsg('Join links must start with https://'); return }
    const row: Record<string, unknown> = {
      title: d.title.trim(), description: d.description.trim(), starts_at: starts.toISOString(), ends_at: ends.toISOString(),
      timezone: d.timezone, format: d.format, city: d.city.trim() || null, venue: d.venue.trim() || null,
      join_url: d.join_url.trim() || null, capacity: d.capacity.trim() ? Number(d.capacity) : null,
      visibility: d.visibility, host_id: d.host_id || null,
    }
    if (status) row['status'] = status
    const r = d.id
      ? await db.from('member_events').update(row).eq('id', d.id).select('id')
      : await db.from('member_events').insert({ ...row, status: status ?? 'draft' }).select('id')
    if (r.error) { setMsg(r.error.message); return }
    setDraft(null); setMsg(status === 'published' ? 'Event published.' : 'Event saved.'); void load()
  }
  const setStatus = async (e: MemberEvent, status: MemberEvent['status']) => {
    if (status === 'cancelled' && !window.confirm(`Cancel "${e.title}"? Everyone going or waitlisted is told.`)) return
    const r = await db.from('member_events').update({ status }).eq('id', e.id).select('id')
    setMsg(r.error ? r.error.message : status === 'cancelled' ? 'Event cancelled. Members who replied have been told.' : 'Event published.')
    void load()
  }
  const remove = async (e: MemberEvent) => {
    if (!window.confirm(`Delete the draft "${e.title}"?`)) return
    const r = await db.from('member_events').delete().eq('id', e.id).select('id')
    setMsg(r.error ? r.error.message : 'Draft deleted.'); void load()
  }

  const sorted = [...events].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
  return <section className="executive-section admin-health">
    <Eyebrow><CalendarDays size={12} /> MEMBER EVENTS</Eyebrow>
    <h2>{events.filter(e => e.status === 'published' && new Date(e.ends_at).getTime() >= Date.now()).length} upcoming · {events.filter(e => e.status === 'draft').length} draft</h2>
    <p className="og-note">Members see published events (invite-only events: invitees only). The venue and join link are shown to people going. Hosts can edit the description and see who replied.</p>
    {draft ? <EventForm draft={draft} profiles={profiles} onSave={save} onClose={() => setDraft(null)} />
      : <Btn onClick={() => setDraft(blank())}>New event</Btn>}
    <ul className="admin-list mev-admin-list">
      {sorted.map(e => <li key={e.id}>
        <span><b>{e.title}</b> · {eventWhen(e.starts_at, e.ends_at, e.timezone)}</span>
        <small>{e.status}{e.visibility === 'invite_only' ? ` · invite only (${e.invite_count ?? 0})` : ''} · {placesLine(e)}</small>
        <span className="admin-actions">
          <button type="button" className="text-link" onClick={() => setDraft(toDraft(e))}>Edit</button>
          {e.status === 'draft' && <button type="button" className="text-link" onClick={() => void setStatus(e, 'published')}>Publish</button>}
          {e.status === 'published' && <button type="button" className="text-link" onClick={() => void setStatus(e, 'cancelled')}>Cancel</button>}
          {e.status === 'draft' && <button type="button" className="text-link" onClick={() => void remove(e)}>Delete</button>}
          <button type="button" className="text-link" onClick={() => setOpenId(openId === e.id ? null : e.id)}>{openId === e.id ? 'Close' : 'People'}</button>
        </span>
        {openId === e.id && <EventPeople event={e} profiles={profiles} onChange={load} />}
      </li>)}
      {!events.length && <li><span>No events yet. Create one, save it as a draft, then publish when it is ready.</span></li>}
    </ul>
    {msg && <p className="og-note">{msg}</p>}
  </section>
}

function EventForm({ draft, profiles, onSave, onClose }: { draft: Draft; profiles: Profile[]; onSave: (d: Draft, status?: MemberEvent['status']) => void; onClose: () => void }) {
  const [d, setD] = useState(draft)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }))
  return <div className="admin-plan mev-form">
    <label className="wide">Title<input value={d.title} maxLength={160} onChange={e => set('title', e.target.value)} placeholder="Operators dinner" /></label>
    <label className="wide">Description<textarea rows={3} maxLength={4000} value={d.description} onChange={e => set('description', e.target.value)} /></label>
    <label>Starts<input type="datetime-local" value={d.start} onChange={e => set('start', e.target.value)} /></label>
    <label>Ends<input type="datetime-local" value={d.end} onChange={e => set('end', e.target.value)} /></label>
    <label>Time zone<input value={d.timezone} onChange={e => set('timezone', e.target.value)} placeholder="Europe/London" /></label>
    <label>Format<select value={d.format} onChange={e => set('format', e.target.value as EventFormat)}><option value="in_person">In person</option><option value="virtual">Virtual</option><option value="hybrid">Hybrid</option></select></label>
    <label>City<input value={d.city} maxLength={120} onChange={e => set('city', e.target.value)} placeholder={d.format === 'virtual' ? 'Not needed' : 'London'} /></label>
    <label>Capacity<input inputMode="numeric" value={d.capacity} onChange={e => set('capacity', e.target.value.replace(/\D/g, ''))} placeholder="No limit" /></label>
    {d.format !== 'virtual' && <label className="wide">Venue address (going only)<input value={d.venue} maxLength={300} onChange={e => set('venue', e.target.value)} /></label>}
    {d.format !== 'in_person' && <label className="wide">Join link (going only; https, or leave empty to use Meetings)<input value={d.join_url} maxLength={500} onChange={e => set('join_url', e.target.value)} placeholder="https://" /></label>}
    <label>Who can see it<select value={d.visibility} onChange={e => set('visibility', e.target.value as Draft['visibility'])}><option value="all_members">All members</option><option value="invite_only">Invitees only</option></select></label>
    <label>Host<select value={d.host_id} onChange={e => set('host_id', e.target.value)}><option value="">No host</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}{p.company ? ` · ${p.company}` : ''}</option>)}</select></label>
    <div className="wide mev-actions">
      <Btn kind="secondary" onClick={() => onSave(d)}>{d.id ? 'Save' : 'Save draft'}</Btn>
      {!d.id && <Btn onClick={() => onSave(d, 'published')}>Publish</Btn>}
      <Btn kind="quiet" onClick={onClose}>Close</Btn>
    </div>
  </div>
}

function EventPeople({ event: e, profiles, onChange }: { event: MemberEvent; profiles: Profile[]; onChange: () => Promise<void> }) {
  const [people, setPeople] = useState<Attendee[]>([])
  const [invites, setInvites] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const [a, i] = await Promise.all([db.rpc('event_attendees', { p_event: e.id }), db.from('event_invites').select('user_id').eq('event_id', e.id)])
    setPeople(a.data ?? []); setInvites(((i.data ?? []) as Array<{ user_id: string }>).map(x => x.user_id))
  }, [e.id])
  useEffect(() => { void load() }, [load])
  const nameOf = (id: string) => profiles.find(p => p.id === id)?.name ?? 'A member'
  const invite = async (userId: string) => {
    const r = await db.from('event_invites').insert({ event_id: e.id, user_id: userId })
    setMsg(r.error ? r.error.message : `${nameOf(userId)} invited${e.status === 'published' ? ' and told' : '; they are told when you publish'}.`)
    setQuery(''); await load(); await onChange()
  }
  const uninvite = async (userId: string) => {
    const r = await db.from('event_invites').delete().eq('event_id', e.id).eq('user_id', userId)
    setMsg(r.error ? r.error.message : 'Invite withdrawn.'); await load(); await onChange()
  }
  const exportCsv = async () => {
    if (await contactExportIsDenied()) return
    download(`${icsFileName(e.title).replace(/\.ics$/, '')}-attendees.csv`, 'text/csv;charset=utf-8',
      toCsv(['Name', 'Company', 'Email', 'Status', 'Replied'], people.map(p => [p.name, p.company ?? '', p.email ?? '', p.status ?? '', p.replied_at ?? ''])))
  }
  const matches = query.trim()
    ? profiles.filter(p => !invites.includes(p.id) && `${p.name} ${p.company ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : []
  return <div className="concierge-form mev-people-admin">
    <b>{people.filter(p => p.status === 'going').length} going · {people.filter(p => p.status === 'waitlist').length} waitlisted</b>
    <ul>{people.map(p => <li key={p.user_id}>{p.name}{p.company ? ` · ${p.company}` : ''} <small>{p.status}</small></li>)}</ul>
    <div className="mev-actions"><Btn kind="secondary" disabled={!people.length} onClick={() => void exportCsv()}><Download size={14} /> Export CSV</Btn></div>
    {e.visibility === 'invite_only' && <>
      <b>Invited ({invites.length})</b>
      <ul>{invites.map(id => <li key={id}>{nameOf(id)} <button type="button" className="text-link" onClick={() => void uninvite(id)}>Withdraw</button></li>)}</ul>
      <input value={query} onChange={x => setQuery(x.target.value)} placeholder="Invite a member: search by name or company" />
      {matches.map(p => <button type="button" key={p.id} className="text-link" onClick={() => void invite(p.id)}>Invite {p.name}{p.company ? ` · ${p.company}` : ''}</button>)}
    </>}
    {msg && <p className="og-note">{msg}</p>}
  </div>
}
