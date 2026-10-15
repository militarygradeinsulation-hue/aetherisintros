/**
 * New-member activation: the "first week" checklist steps, their copy and destinations, and
 * the small pure rules around them (progress, goals clean-up, once-a-day activity ping,
 * growth report formatting). Done/not-done comes from my_activation() (drizzle 0051).
 */

export type ActivationStepId = 'profile' | 'verified' | 'goals' | 'ask' | 'intro' | 'push' | 'calendar'
/** Where a step's button goes: a classic workspace page key, the intros hub, the verify route, or inline goals. */
export type ActivationTarget = 'profile' | 'preferences' | 'needs' | 'intros' | 'verify' | 'goals'

export interface ActivationStepState {
  id: ActivationStepId
  done: boolean
  optional?: boolean
  photo?: boolean
  headline?: boolean
  count?: number
}

export interface ActivationStepView extends ActivationStepState {
  title: string
  detail: string
  action: string
  target: ActivationTarget
}

const COPY: Record<ActivationStepId, { title: string; detail: string; action: string; target: ActivationTarget }> = {
  profile: { title: 'Add your photo and headline', detail: 'Members reply faster to a face and a title.', action: 'Edit profile', target: 'profile' },
  verified: { title: 'Get verified', detail: 'Verified owners and CEOs can request and accept introductions.', action: 'Verify', target: 'verify' },
  goals: { title: 'Set your 3 goals for this quarter', detail: 'Only you see them. They shape who we suggest you meet.', action: 'Set goals', target: 'goals' },
  ask: { title: 'Post your first ask', detail: 'Say what you need. Members who can help will reply.', action: 'Post an ask', target: 'needs' },
  intro: { title: 'Request or accept your first introduction', detail: 'One warm introduction is the fastest way in.', action: 'Open introductions', target: 'intros' },
  push: { title: 'Turn on notifications', detail: 'Know the moment someone replies or accepts.', action: 'Turn on', target: 'preferences' },
  calendar: { title: 'Connect your calendar (optional)', detail: 'See when you last met each member. Visible only to you.', action: 'Connect', target: 'preferences' },
}

export const ACTIVATION_ORDER: ActivationStepId[] = ['profile', 'verified', 'goals', 'ask', 'intro', 'push', 'calendar']

/** Steps to show, in order. The calendar step is dropped when Google is not set up. */
export function activationView(steps: ActivationStepState[], opts: { calendarAvailable: boolean }): ActivationStepView[] {
  const byId = new Map(steps.map(s => [s.id, s]))
  return ACTIVATION_ORDER
    .filter(id => byId.has(id) && (id !== 'calendar' || opts.calendarAvailable))
    .map(id => {
      const s = byId.get(id)!
      const copy = COPY[id]
      // A member with a photo but no title goes to My profile; no photo goes to Settings (where photos are added).
      const target = id === 'profile' && s.photo === false ? 'preferences' : copy.target
      const detail = id === 'profile' && !s.done
        ? s.photo === false && s.headline === false ? 'Add a photo in Settings and your title in My profile.'
          : s.photo === false ? 'Add a profile photo in Settings.' : 'Add your title in My profile.'
        : copy.detail
      return { ...s, ...copy, target, detail, optional: id === 'calendar' || !!s.optional }
    })
}

export interface ActivationProgress { done: number; total: number; complete: boolean }

/** Progress over required steps only; optional ones never hold the checklist open. */
export function activationProgress(steps: Pick<ActivationStepState, 'done' | 'optional'>[]): ActivationProgress {
  const required = steps.filter(s => !s.optional)
  const done = required.filter(s => s.done).length
  return { done, total: required.length, complete: required.length > 0 && done === required.length }
}

/** Trimmed, non-empty, at most 140 characters each, no duplicates, at most three. */
export function cleanGoals(goals: string[]): string[] {
  const out: string[] = []
  for (const g of goals) {
    const t = g.replace(/\s+/g, ' ').trim().slice(0, 140)
    if (t && !out.some(o => o.toLowerCase() === t.toLowerCase())) out.push(t)
    if (out.length === 3) break
  }
  return out
}

/** UTC day key, matching the database's day for member_activity_days. */
export const utcDay = (now: Date) => now.toISOString().slice(0, 10)

/** Whether this device should record today's visit (once per UTC day per device). */
export function shouldTouch(lastDay: string | null, now: Date): boolean {
  return lastDay !== utcDay(now)
}

/** A share 0–100 (or null for weeks not reached yet) as display text. */
export const pctText = (v: number | null | undefined) => v == null ? '—' : `${Math.round(v)}%`

/** Bar width as a percentage of the largest value, with a visible sliver for any non-zero value. */
export function barPct(value: number, max: number): number {
  if (!max || value <= 0) return 0
  return Math.max(2, Math.round((value / max) * 100))
}

/** First day of the current UTC quarter, as stored in member_goals.quarter. */
export function quarterStart(now: Date): string {
  const m = Math.floor(now.getUTCMonth() / 3) * 3 + 1
  return `${now.getUTCFullYear()}-${String(m).padStart(2, '0')}-01`
}
