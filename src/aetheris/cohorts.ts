/**
 * Founding cohorts: bulk, email-locked invitations for a named group (for example existing
 * Aetheris clients) and an activation funnel that ends at a counterpart-reported outcome.
 * Server rules live in drizzle/migrations/0025. Nothing here sends email.
 */
import { supabase } from '@/integrations/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface InviteRow { email: string; name: string; company: string }
export interface ParsedList { rows: InviteRow[]; skipped: string[] }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Parse a pasted list: one person per line, fields separated by commas, tabs or semicolons,
 * in any order. The field containing "@" is the email; the first other field is the name
 * and the next is the company. A header line, blanks and duplicates are dropped.
 */
export function parseInviteList(text: string): ParsedList {
  const rows: InviteRow[] = []
  const skipped: string[] = []
  const seen = new Set<string>()
  let first = true
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const isFirst = first
    first = false
    const fields = line.split(/[,\t;]/).map(f => f.trim().replace(/^"|"$/g, '').trim()).filter(Boolean)
    const email = fields.find(f => f.includes('@'))?.toLowerCase()
    if (!email) {
      // Only the first line may be a header (e.g. "Name, Email, Company").
      if (!(isFirst && /e-?mail/i.test(line))) skipped.push(line)
      continue
    }
    if (!EMAIL.test(email)) { skipped.push(line); continue }
    if (seen.has(email)) continue
    seen.add(email)
    const others = fields.filter(f => !f.includes('@'))
    rows.push({ email, name: others[0] ?? '', company: others[1] ?? '' })
  }
  return { rows, skipped }
}

export type Stage = 'invited' | 'expired' | 'joined' | 'onboarded' | 'asked' | 'introduced' | 'outcome'
export const STAGE_ORDER: Stage[] = ['invited', 'joined', 'onboarded', 'asked', 'introduced', 'outcome']
export const stageLabel: Record<Stage, string> = {
  invited: 'Invited', expired: 'Invite expired', joined: 'Joined', onboarded: 'Profile complete',
  asked: 'Posted an ask', introduced: 'Accepted introduction', outcome: 'Outcome reported by the other side',
}

export interface ActivationRow {
  inviteId: string; email: string; name: string; company: string; code: string; expiresAt: string | null; stage: Stage; userId: string | null
}

/** Cumulative funnel: how many invitees reached each stage or beyond. Expired counts as invited. */
export function cohortFunnel(rows: Pick<ActivationRow, 'stage'>[]): Array<{ stage: Stage; reached: number }> {
  const rank = (s: Stage) => (s === 'expired' ? 0 : STAGE_ORDER.indexOf(s))
  return STAGE_ORDER.map((stage, i) => ({ stage, reached: rows.filter(r => rank(r.stage) >= i).length }))
}

export const inviteLink = (origin: string, code: string) => `${origin.replace(/\/$/, '')}/invite/${encodeURIComponent(code)}`

/** Escape for CSV, and neutralise spreadsheet formulas (names often come from CRM exports). */
export const csvCell = (raw: string) => {
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** CSV for a mail merge the admin sends personally: name, company, email, link, stage. */
export function linksCsv(origin: string, rows: ActivationRow[]): string {
  const lines = [['name', 'company', 'email', 'invite_link', 'stage'].join(',')]
  for (const r of rows) lines.push([r.name, r.company, r.email, inviteLink(origin, r.code), stageLabel[r.stage]].map(csvCell).join(','))
  return lines.join('\n') + '\n'
}

export interface Cohort { id: string; name: string; sourceLabel: string; createdAt: string }

export async function loadCohorts(): Promise<{ data: Cohort[]; error: string }> {
  const r = await db.from('invite_cohorts').select('id, name, source_label, created_at').order('created_at', { ascending: false })
  return r.error ? { data: [], error: r.error.message } : { data: (r.data ?? []).map((x: any) => ({ id: x.id, name: x.name, sourceLabel: x.source_label, createdAt: x.created_at })), error: '' }
}

export async function createCohort(name: string, sourceLabel: string, userId: string) {
  const r = await db.from('invite_cohorts').insert({ name: name.trim(), source_label: sourceLabel.trim(), created_by: userId }).select('id').single()
  return { id: (r.data?.id as string | undefined) ?? null, error: r.error?.message ?? '' }
}

export interface CreateResult { email: string; code: string | null; outcome: 'created' | 'already_member' | 'already_invited' | 'invalid_email' }

export async function createCohortInvites(cohortId: string, rows: InviteRow[]): Promise<{ data: CreateResult[]; error: string }> {
  const r = await db.rpc('create_cohort_invites', { p_cohort: cohortId, p_rows: rows })
  return r.error ? { data: [], error: r.error.message } : { data: (r.data ?? []) as CreateResult[], error: '' }
}

export async function loadActivation(cohortId: string): Promise<{ data: ActivationRow[]; error: string }> {
  const r = await db.rpc('cohort_activation', { p_cohort: cohortId })
  if (r.error) return { data: [], error: r.error.message }
  return {
    data: (r.data ?? []).map((x: any) => ({
      inviteId: x.invite_id, email: x.email, name: x.invitee_name, company: x.invitee_company, code: x.code,
      expiresAt: x.expires_at, stage: x.stage, userId: x.user_id,
    })),
    error: '',
  }
}

export async function revokeCohortInvite(inviteId: string) {
  const r = await db.rpc('revoke_cohort_invite', { p_invite: inviteId })
  return { error: r.error?.message ?? '' }
}
