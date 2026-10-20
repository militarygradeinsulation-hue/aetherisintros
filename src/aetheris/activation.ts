/** Canonical activation copy and pure rules. Completion comes from my_activation(). */
export type ActivationStepId = 'profile' | 'verified' | 'goals' | 'ask' | 'intro' | 'push' | 'calendar'
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
  profile: { title: 'Show who you are and how you can help', detail: 'Give members the context to decide whether a conversation is relevant.', action: 'Edit profile', target: 'profile' },
  verified: { title: 'Verify your business role (optional)', detail: 'Role verification is separate from proof of work and is not required for normal member networking.', action: 'Verify role', target: 'verify' },
  goals: { title: 'Name what would move your business forward', detail: 'Keep up to three goals private. Saving a goal does not publish an ask.', action: 'Set goals', target: 'goals' },
  ask: { title: 'Share one specific business need', detail: 'Review the audience and details before publishing. A response is not guaranteed.', action: 'Review an ask', target: 'needs' },
  intro: { title: 'Start one useful introduction', detail: 'Explain why you want to meet. Each person chooses whether to connect.', action: 'Open introductions', target: 'intros' },
  push: { title: 'Choose reply notifications (optional)', detail: 'Set your notification preferences when you are ready.', action: 'Review preferences', target: 'preferences' },
  calendar: { title: 'Connect your calendar (optional)', detail: 'Review permissions before connecting your calendar.', action: 'Review connection', target: 'preferences' },
}
export const ACTIVATION_ORDER: ActivationStepId[] = ['profile', 'goals', 'ask', 'intro', 'verified', 'push', 'calendar']
export function activationView(steps: ActivationStepState[], opts: { calendarAvailable: boolean }): ActivationStepView[] {
  const byId = new Map(steps.map(s => [s.id, s]))
  return ACTIVATION_ORDER
    .filter(id => byId.has(id) && (id !== 'calendar' || opts.calendarAvailable))
    .map(id => {
      const s = byId.get(id)!
      const copy = COPY[id]
      const target = id === 'profile' && s.photo === false ? 'preferences' : copy.target
      const detail = id === 'profile' && !s.done
        ? s.photo === false && s.headline === false ? 'Add a photo in Settings and your title in My profile.'
          : s.photo === false ? 'Add a profile photo in Settings.' : 'Add your title in My profile.'
        : copy.detail
      return { ...s, ...copy, target, detail, optional: id === 'calendar' || id === 'verified' || id === 'push' || !!s.optional }
    })
}
export interface ActivationProgress { done: number; total: number; complete: boolean }
export function activationProgress(steps: Pick<ActivationStepState, 'done' | 'optional'>[]): ActivationProgress {
  const required = steps.filter(s => !s.optional)
  const done = required.filter(s => s.done).length
  return { done, total: required.length, complete: required.length > 0 && done === required.length }
}
export function cleanGoals(goals: string[]): string[] {
  const out: string[] = []
  for (const g of goals) {
    const t = g.replace(/\s+/g, ' ').trim().slice(0, 140)
    if (t && !out.some(o => o.toLowerCase() === t.toLowerCase())) out.push(t)
    if (out.length === 3) break
  }
  return out
}
export const utcDay = (now: Date) => now.toISOString().slice(0, 10)
export function shouldTouch(lastDay: string | null, now: Date): boolean { return lastDay !== utcDay(now) }
export const pctText = (v: number | null | undefined) => v == null ? '—' : `${Math.round(v)}%`
export function barPct(value: number, max: number): number {
  if (!max || value <= 0) return 0
  return Math.max(2, Math.round((value / max) * 100))
}
export function quarterStart(now: Date): string {
  const m = Math.floor(now.getUTCMonth() / 3) * 3 + 1
  return `${now.getUTCFullYear()}-${String(m).padStart(2, '0')}-01`
}
