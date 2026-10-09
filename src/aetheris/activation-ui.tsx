/**
 * "Get value in your first week": the activation checklist on the live Home, shown until every
 * required step is done or the member dismisses it. Steps come from my_activation() (0051);
 * goals are edited inline (set_my_goals). Also records one visit per day per device
 * (touch_activity) for the admin growth report.
 */
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Circle, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/integrations/supabase/client'
import { googleStatus } from '@/lib/google.functions'

import {
  activationProgress, activationView, cleanGoals, quarterStart, shouldTouch, utcDay,
  type ActivationStepState, type ActivationTarget,
} from './activation'

const db = supabase as any // eslint-disable-line @typescript-eslint/no-explicit-any

/** Records today's visit once per UTC day per device and member. Never throws. */
export async function recordVisit() {
  try {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user.id
    if (!uid) return
    const key = `ai-activity-day:${uid}`
    let last: string | null = null
    try { last = localStorage.getItem(key) } catch { /* storage blocked */ }
    const now = new Date()
    if (!shouldTouch(last, now)) return
    const r = await db.rpc('touch_activity')
    if (!r.error) { try { localStorage.setItem(key, utcDay(now)) } catch { /* storage blocked */ } }
  } catch { /* analytics must never break the app */ }
}

export function ActivationChecklist({ onOpen }: { onOpen: (target: Exclude<ActivationTarget, 'verify' | 'goals'>) => void }) {
  const navigate = useNavigate()
  const [steps, setSteps] = useState<ActivationStepState[] | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [calendarAvailable, setCalendarAvailable] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)

  const load = useCallback(async () => {
    const r = await db.rpc('my_activation')
    if (r.error || !r.data) return
    setSteps(r.data.steps ?? [])
    setDismissed(!!r.data.dismissed)
  }, [])

  useEffect(() => {
    void load()
    void googleStatus().then(s => setCalendarAvailable(s.configured)).catch(() => setCalendarAvailable(false))
    const onVisible = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  if (!steps || dismissed) return null
  const view = activationView(steps, { calendarAvailable })
  const progress = activationProgress(view)
  if (progress.complete) return null

  const dismiss = async () => {
    setDismissed(true)
    await db.rpc('dismiss_activation')
  }
  const open = (target: ActivationTarget) => {
    if (target === 'goals') { setGoalsOpen(o => !o); return }
    if (target === 'verify') { void navigate({ to: '/verify' }); return }
    onOpen(target)
  }

  return <section className="this-week activation" aria-label="Get value in your first week">
    <header>
      <span className="home-board-label">Get value in your first week</span>
      <h2>{progress.done} of {progress.total} done.</h2>
      <div className="activation-bar" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
        <i style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
      </div>
      <button type="button" className="activation-dismiss" onClick={() => void dismiss()} aria-label="Hide this checklist"><X size={14} /> Hide</button>
    </header>
    <ol>{view.map(step => <li key={step.id} className={step.done ? 'activation-done' : ''}>
      {step.done ? <CheckCircle2 size={16} aria-label="Done" /> : <Circle size={16} aria-label="Not done yet" />}
      <div><b>{step.title}</b><span>{step.detail}</span></div>
      {!step.done && <button type="button" onClick={() => open(step.target)}>{step.action} <ArrowRight size={13} /></button>}
      {step.id === 'goals' && goalsOpen && <GoalsEditor onSaved={() => { setGoalsOpen(false); void load() }} />}
    </li>)}</ol>
  </section>
}

/** Up to three short goals for this quarter. Private to the member. */
export function GoalsEditor({ onSaved }: { onSaved?: () => void }) {
  const [goals, setGoals] = useState(['', '', ''])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    void db.from('member_goals').select('position, goal').eq('quarter', quarterStart(new Date())).order('position')
      .then((r: { data: Array<{ position: number; goal: string }> | null }) => {
        const next = ['', '', '']
        for (const g of r.data ?? []) if (g.position >= 1 && g.position <= 3) next[g.position - 1] = g.goal
        setGoals(next)
      })
  }, [])
  const save = async () => {
    setBusy(true); setMsg('')
    const r = await db.rpc('set_my_goals', { p_goals: cleanGoals(goals) })
    setBusy(false)
    if (r.error) { setMsg('Your goals could not be saved. Please try again.'); return }
    setMsg('Saved.')
    onSaved?.()
  }
  return <div className="activation-goals">
    {goals.map((g, i) => <input key={i} value={g} maxLength={140} placeholder={['e.g. Hire a CFO', 'e.g. Close two enterprise customers', 'e.g. Find a board advisor'][i]}
      aria-label={`Goal ${i + 1}`} onChange={e => setGoals(goals.map((x, j) => j === i ? e.target.value : x))} />)}
    <small>Only you can see your goals. We use them to suggest who to meet.</small>
    <div><button type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save goals'}</button>{msg && <span>{msg}</span>}</div>
  </div>
}
