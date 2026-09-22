/**
 * Personal calendar. Every member keeps their own events here: meetings,
 * introductions, follow-ups and personal time, in month, week, day and agenda
 * views. Events are stored per signed-in member in the database, and fall back
 * to this browser when there is no session (showcase / demo).
 */
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus, Trash2, X,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Btn, Head } from '../ui'

export type CalKind = 'meeting' | 'intro' | 'followup' | 'event' | 'personal'

export interface CalEvent {
  id: string
  title: string
  notes: string
  location: string
  kind: CalKind
  startsAt: string
  endsAt: string
  allDay: boolean
}

const kindLabel: Record<CalKind, string> = {
  meeting: 'Meeting', intro: 'Introduction', followup: 'Follow-up', event: 'Event', personal: 'Personal',
}

const STORE_KEY = 'aetheris.calendar.events'

/* --------------------------------------------------------------- date utils */

const pad = (n: number) => String(n).padStart(2, '0')
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => { const x = startOfDay(d); x.setDate(x.getDate() + n); return x }
const startOfWeek = (d: Date) => addDays(d, -startOfDay(d).getDay())
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
const monthLabel = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** Local value for <input type="datetime-local">. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (value: string) => new Date(value).toISOString()

const overlapsDay = (event: CalEvent, day: Date) => {
  const from = startOfDay(day).getTime()
  const to = addDays(day, 1).getTime()
  const start = new Date(event.startsAt).getTime()
  const end = Math.max(new Date(event.endsAt).getTime(), start + 1)
  return start < to && end > from
}

/* ------------------------------------------------------------------- store */

type Row = {
  id: string; title: string; notes: string; location: string; kind: string
  starts_at: string; ends_at: string; all_day: boolean
}

const fromRow = (row: Row): CalEvent => ({
  id: row.id, title: row.title, notes: row.notes ?? '', location: row.location ?? '',
  kind: (row.kind as CalKind) ?? 'meeting', startsAt: row.starts_at, endsAt: row.ends_at, allDay: row.all_day,
})

function readLocal(): CalEvent[] {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as CalEvent[] } catch { return [] }
}
function writeLocal(events: CalEvent[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(events)) } catch { /* storage unavailable */ }
}

function useCalendar() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    void (async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id ?? null
      if (!live) return
      setUserId(uid)
      if (!uid) { setEvents(readLocal()); setLoading(false); return }
      const res = await supabase.from('calendar_events')
        .select('id, title, notes, location, kind, starts_at, ends_at, all_day')
        .order('starts_at', { ascending: true })
      if (!live) return
      setEvents((res.data ?? []).map(row => fromRow(row as Row)))
      setLoading(false)
    })()
    return () => { live = false }
  }, [])

  const persistLocal = (next: CalEvent[]) => { setEvents(next); writeLocal(next) }

  const create = async (draft: Omit<CalEvent, 'id'>) => {
    if (!userId) { persistLocal([...events, { ...draft, id: `local-${Date.now()}` }]); return }
    const res = await supabase.from('calendar_events').insert({
      user_id: userId, title: draft.title, notes: draft.notes, location: draft.location,
      kind: draft.kind, starts_at: draft.startsAt, ends_at: draft.endsAt, all_day: draft.allDay,
    }).select('id, title, notes, location, kind, starts_at, ends_at, all_day').single()
    if (res.data) setEvents(list => [...list, fromRow(res.data as Row)])
  }

  const update = async (id: string, patch: Partial<CalEvent>) => {
    const next = events.map(event => event.id === id ? { ...event, ...patch } : event)
    if (!userId) { persistLocal(next); return }
    setEvents(next)
    await supabase.from('calendar_events').update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.startsAt !== undefined ? { starts_at: patch.startsAt } : {}),
      ...(patch.endsAt !== undefined ? { ends_at: patch.endsAt } : {}),
      ...(patch.allDay !== undefined ? { all_day: patch.allDay } : {}),
    }).eq('id', id)
  }

  const remove = async (id: string) => {
    const next = events.filter(event => event.id !== id)
    if (!userId) { persistLocal(next); return }
    setEvents(next)
    await supabase.from('calendar_events').delete().eq('id', id)
  }

  return { events, loading, signedIn: !!userId, create, update, remove }
}

/* -------------------------------------------------------------------- form */

const blankDraft = (day: Date): Omit<CalEvent, 'id'> => {
  const start = new Date(day)
  if (!start.getHours()) start.setHours(9, 0, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { title: '', notes: '', location: '', kind: 'meeting', startsAt: start.toISOString(), endsAt: end.toISOString(), allDay: false }
}

function EventForm({ value, onChange, onSave, onDelete, onClose, saving }: {
  value: Omit<CalEvent, 'id'>
  onChange: (next: Omit<CalEvent, 'id'>) => void
  onSave: () => void
  onDelete?: (() => void) | undefined
  onClose: () => void
  saving: boolean
}) {
  return <aside className="cal-form">
    <header><b>{onDelete ? 'Edit event' : 'New event'}</b>
      <button onClick={onClose} aria-label="Close"><X size={15} /></button></header>
    <label>Title<input value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} placeholder="Coffee with…" /></label>
    <div className="cal-form-row">
      <label>Starts<input type="datetime-local" value={toLocalInput(value.startsAt)}
        onChange={e => onChange({ ...value, startsAt: fromLocalInput(e.target.value) })} /></label>
      <label>Ends<input type="datetime-local" value={toLocalInput(value.endsAt)}
        onChange={e => onChange({ ...value, endsAt: fromLocalInput(e.target.value) })} /></label>
    </div>
    <div className="cal-form-row">
      <label>Type<select value={value.kind} onChange={e => onChange({ ...value, kind: e.target.value as CalKind })}>
        {(Object.keys(kindLabel) as CalKind[]).map(kind => <option key={kind} value={kind}>{kindLabel[kind]}</option>)}
      </select></label>
      <label className="cal-check"><input type="checkbox" checked={value.allDay}
        onChange={e => onChange({ ...value, allDay: e.target.checked })} /> All day</label>
    </div>
    <label>Where<input value={value.location} onChange={e => onChange({ ...value, location: e.target.value })} placeholder="Call, office, city…" /></label>
    <label>Notes<textarea rows={4} value={value.notes} onChange={e => onChange({ ...value, notes: e.target.value })} placeholder="Context, agenda, what you owe them…" /></label>
    <div className="cal-form-actions">
      <Btn onClick={onSave} disabled={saving || !value.title.trim()}>{saving ? 'Saving…' : 'Save event'}</Btn>
      {onDelete && <Btn kind="quiet" onClick={onDelete}><Trash2 size={13} /> Delete</Btn>}
    </div>
  </aside>
}

/* -------------------------------------------------------------------- page */

type View = 'month' | 'week' | 'day' | 'agenda' | 'timeline'
const views: [View, string][] = [['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['agenda', 'Agenda'], ['timeline', 'Timeline']]
const timelineHours = Array.from({ length: 16 }, (_, i) => i + 7)
const timelineKinds = Object.keys(kindLabel) as CalKind[]

export function CalendarPage() {
  const cal = useCalendar()
  const [view, setView] = useState<View>(() => (localStorage.getItem('aetheris.calendar.view') as View) || 'month')
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [editing, setEditing] = useState<{ id?: string; draft: Omit<CalEvent, 'id'> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [timelineZoom, setTimelineZoom] = useState(100)
  const [timelineDrag, setTimelineDrag] = useState<{ eventId: string; startX: number; moved: boolean } | null>(null)

  useEffect(() => { localStorage.setItem('aetheris.calendar.view', view) }, [view])

  const sorted = useMemo(
    () => [...cal.events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [cal.events],
  )
  const eventsOn = (day: Date) => sorted.filter(event => overlapsDay(event, day))

  const step = (dir: number) => setCursor(current => {
    if (view === 'month') return new Date(current.getFullYear(), current.getMonth() + dir, 1)
    if (view === 'week') return addDays(current, dir * 7)
    if (view === 'day') return addDays(current, dir)
    if (view === 'agenda') return addDays(current, dir * 14)
    return addDays(current, dir)
  })

  const openNew = (day: Date) => setEditing({ draft: blankDraft(day) })
  const openEdit = (event: CalEvent) => setEditing({ id: event.id, draft: { ...event } })

  const save = async () => {
    if (!editing) return
    setSaving(true)
    if (editing.id) await cal.update(editing.id, editing.draft)
    else await cal.create(editing.draft)
    setSaving(false)
    setEditing(null)
  }

  const moveTo = async (event: CalEvent, day: Date) => {
    const start = new Date(event.startsAt)
    const duration = Math.max(new Date(event.endsAt).getTime() - start.getTime(), 15 * 60 * 1000)
    const next = new Date(day)
    next.setHours(start.getHours(), start.getMinutes(), 0, 0)
    await cal.update(event.id, { startsAt: next.toISOString(), endsAt: new Date(next.getTime() + duration).toISOString() })
  }

  const moveOnTimeline = async (event: CalEvent, kind: CalKind, minute: number) => {
    const start = new Date(event.startsAt)
    const duration = Math.max(new Date(event.endsAt).getTime() - start.getTime(), 15 * 60 * 1000)
    const snapped = Math.max(7 * 60, Math.min(22 * 60 - 15, Math.round(minute / 15) * 15))
    const next = new Date(cursor)
    next.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0)
    await cal.update(event.id, { kind, startsAt: next.toISOString(), endsAt: new Date(next.getTime() + duration).toISOString(), allDay: false })
  }

  const timelineDrop = (event: React.PointerEvent<HTMLElement>, kind: CalKind) => {
    if (!timelineDrag) return
    const item = cal.events.find(entry => entry.id === timelineDrag.eventId)
    const track = event.currentTarget.querySelector<HTMLElement>('.cal-timeline-track')
    if (item && track && timelineDrag.moved) {
      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      void moveOnTimeline(item, kind, 7 * 60 + ratio * 15 * 60)
    }
    setTimelineDrag(null)
  }

  const heading = view === 'day' || view === 'timeline' ? dayLabel(cursor)
    : view === 'week' ? `${startOfWeek(cursor).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : view === 'agenda' ? 'Next two weeks' : monthLabel(cursor)

  const chip = (event: CalEvent) => <button key={event.id} className={`cal-chip kind-${event.kind}`}
    draggable onDragStart={e => e.dataTransfer.setData('text/plain', event.id)}
    onClick={e => { e.stopPropagation(); openEdit(event) }}>
    <em>{event.allDay ? 'All day' : timeLabel(event.startsAt)}</em><b>{event.title}</b>
  </button>

  const dropProps = (day: Date) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      const id = e.dataTransfer.getData('text/plain')
      const event = cal.events.find(item => item.id === id)
      if (event) void moveTo(event, day)
    },
  })

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const from = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => addDays(from, i))
  }, [cursor])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)), [cursor])
  const agendaDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(cursor, i)), [cursor])
  const hours = Array.from({ length: 15 }, (_, i) => i + 7)
  const today = startOfDay(new Date())

  return <div className="page calendar-page">
    <Head label="YOUR TIME" title="Calendar" copy="Every meeting, introduction and follow-up you have committed to, in one place."
      proof="Your calendar is private to you. Nobody else in the network can see it."
      action={<Btn onClick={() => openNew(view === 'day' ? cursor : today)}><Plus size={14} /> New event</Btn>} />

    <div className="cal-bar">
      <div className="cal-move">
        <button onClick={() => step(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
        <button onClick={() => setCursor(startOfDay(new Date()))}>Today</button>
        <button onClick={() => step(1)} aria-label="Next"><ChevronRight size={16} /></button>
        <strong>{heading}</strong>
      </div>
      <nav className="cal-views">{views.map(([id, label]) =>
        <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>)}</nav>
    </div>

    <div className={`cal-body ${editing ? 'with-form' : ''}`}>
      <section className="cal-canvas">
        {cal.loading && <p className="cal-empty">Loading your calendar…</p>}

        {!cal.loading && view === 'month' && <>
          <div className="cal-weekhead">{weekDays.map(day =>
            <span key={day.toISOString()}>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>)}</div>
          <div className="cal-month">
            {monthDays.map(day => {
              const dim = day.getMonth() !== cursor.getMonth()
              return <div key={day.toISOString()} className={`cal-cell ${dim ? 'dim' : ''} ${sameDay(day, today) ? 'today' : ''}`}
                {...dropProps(day)} onClick={() => openNew(day)}>
                <span className="cal-daynum">{day.getDate()}</span>
                {eventsOn(day).slice(0, 4).map(chip)}
              </div>
            })}
          </div>
        </>}

        {!cal.loading && view === 'week' && <div className="cal-week">
          {weekDays.map(day => <div key={day.toISOString()} className={`cal-col ${sameDay(day, today) ? 'today' : ''}`}
            {...dropProps(day)}>
            <header onClick={() => { setCursor(day); setView('day') }}>
              <b>{day.toLocaleDateString(undefined, { weekday: 'short' })}</b><em>{day.getDate()}</em></header>
            <div className="cal-col-body" onClick={() => openNew(day)}>
              {eventsOn(day).map(chip)}
              {!eventsOn(day).length && <span className="cal-free">Free</span>}
            </div>
          </div>)}
        </div>}

        {!cal.loading && view === 'day' && <div className="cal-day" {...dropProps(cursor)}>
          {hours.map(hour => {
            const slot = sorted.filter(event => overlapsDay(event, cursor) && !event.allDay && new Date(event.startsAt).getHours() === hour)
            return <div key={hour} className="cal-hour" onClick={() => {
              const at = new Date(cursor); at.setHours(hour, 0, 0, 0)
              const draft = blankDraft(at)
              setEditing({ draft: { ...draft, startsAt: at.toISOString(), endsAt: new Date(at.getTime() + 3600000).toISOString() } })
            }}>
              <span>{new Date(2020, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' })}</span>
              <div>{slot.map(chip)}</div>
            </div>
          })}
        </div>}

        {!cal.loading && view === 'timeline' && <div className="cal-timeline-shell">
          <div className="cal-timeline-tools">
            <span>RELATIONSHIP SCHEDULE</span>
            <label>Visible range <input aria-label="Timeline visible range" type="range" min="75" max="160" step="5" value={timelineZoom} onChange={e => setTimelineZoom(Number(e.target.value))} /></label>
          </div>
          <div className="cal-timeline-scroll">
            <div className="cal-timeline" style={{ '--timeline-zoom': `${timelineZoom}%` } as React.CSSProperties}>
              <div className="cal-timeline-head"><b>Type</b><div className="cal-timeline-track">{timelineHours.map(hour => <span key={hour}>{new Date(2020, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' })}</span>)}</div></div>
              {timelineKinds.map(kind => <div key={kind} className={`cal-timeline-row kind-${kind}`}
                data-timeline-kind={kind}
                onPointerMove={e => timelineDrag && setTimelineDrag(current => current ? { ...current, moved: current.moved || Math.abs(e.clientX - current.startX) > 5 } : null)}
                onPointerUp={e => timelineDrop(e, kind)}>
                <strong><span className={`cal-dot kind-${kind}`} />{kindLabel[kind]}</strong>
                <div className="cal-timeline-track">
                  {timelineHours.map(hour => <i key={hour} />)}
                  {sameDay(cursor, today) && (() => {
                    const now = new Date(); const minutes = now.getHours() * 60 + now.getMinutes()
                    return minutes >= 420 && minutes <= 1320 ? <span className="cal-timeline-now" style={{ left: `${((minutes - 420) / 900) * 100}%` }}><b>Now</b></span> : null
                  })()}
                  {eventsOn(cursor).filter(item => item.kind === kind).map(item => {
                    const start = new Date(item.startsAt)
                    const startMinute = item.allDay ? 420 : start.getHours() * 60 + start.getMinutes()
                    const duration = item.allDay ? 60 : Math.max(15, (new Date(item.endsAt).getTime() - start.getTime()) / 60000)
                    const left = Math.max(0, ((startMinute - 420) / 900) * 100)
                    const width = Math.max(4, Math.min(100 - left, (duration / 900) * 100))
                    return <button key={item.id} className={`cal-timeline-event kind-${kind}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setTimelineDrag({ eventId: item.id, startX: e.clientX, moved: false }) }}
                      onClick={() => { if (!timelineDrag?.moved) openEdit(item) }}
                      onKeyDown={e => {
                        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
                        e.preventDefault()
                        const kindIndex = timelineKinds.indexOf(item.kind)
                        const nextKind = e.key === 'ArrowUp' ? timelineKinds[Math.max(0, kindIndex - 1)] : e.key === 'ArrowDown' ? timelineKinds[Math.min(timelineKinds.length - 1, kindIndex + 1)] : item.kind
                        const delta = e.key === 'ArrowLeft' ? -15 : e.key === 'ArrowRight' ? 15 : 0
                        if (nextKind) void moveOnTimeline(item, nextKind, startMinute + delta)
                      }}>
                      <b>{item.title}</b><em>{item.allDay ? 'All day' : timeLabel(item.startsAt)}</em>
                    </button>
                  })}
                </div>
              </div>)}
            </div>
          </div>
          <p className="cal-timeline-help">Drag an event across time or between types. Arrow keys move it in 15-minute steps; up and down change its type.</p>
        </div>}

        {!cal.loading && view === 'agenda' && <div className="cal-agenda">
          {agendaDays.map(day => {
            const list = eventsOn(day)
            if (!list.length) return null
            return <article key={day.toISOString()} {...dropProps(day)}>
              <header><b>{day.toLocaleDateString(undefined, { weekday: 'long' })}</b>
                <em>{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</em></header>
              <ul>{list.map(event => <li key={event.id}>
                <button onClick={() => openEdit(event)}>
                  <span className={`cal-dot kind-${event.kind}`} />
                  <b>{event.title}</b>
                  <em><Clock size={12} /> {event.allDay ? 'All day' : `${timeLabel(event.startsAt)} – ${timeLabel(event.endsAt)}`}</em>
                  {event.location && <small><MapPin size={12} /> {event.location}</small>}
                  <i>{kindLabel[event.kind]}</i>
                </button></li>)}</ul>
            </article>
          })}
          {!agendaDays.some(day => eventsOn(day).length) &&
            <p className="cal-empty">Nothing scheduled in the next two weeks. Add the commitments you have already made so timing can inform your relationships.</p>}
        </div>}

        {!cal.loading && !cal.events.length && view !== 'agenda' && view !== 'timeline' &&
          <p className="cal-empty"><CalendarDays size={15} /> Your calendar is empty. Click any day to add an event — drag an event to move it.</p>}
        {!cal.loading && !cal.signedIn &&
          <p className="cal-note">You are viewing the showcase. Events you add here stay in this browser until you sign in.</p>}
      </section>

      {editing && <EventForm value={editing.draft} saving={saving}
        onChange={draft => setEditing({ ...editing, draft })}
        onSave={() => void save()}
        onClose={() => setEditing(null)}
        onDelete={editing.id ? () => { const id = editing.id; if (id) void cal.remove(id); setEditing(null) } : undefined} />}
    </div>
  </div>
}
