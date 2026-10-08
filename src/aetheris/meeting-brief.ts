/**
 * Pre-meeting brief: for each other person in a meeting, who they are, why they matter to
 * you, what you share, where you left off, what they are asking for, and your own notes about
 * them, plus one suggested goal for the call. Built only from records the member can already
 * read, so it is instant and free; nothing is generated or sent anywhere.
 */
import { supabase } from '@/integrations/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export interface BriefPerson {
  userId: string
  name: string
  role: string
  whyTheyMatter: string
  common: string
  lookingFor: string
  canHelpWith: string
  lastConversation: Array<{ fromMe: boolean; text: string; at: string }>
  theirAsks: string[]
  yourNotes: string[]
  lastMeetingSummary: string
}

export interface Brief { people: BriefPerson[]; goal: string; agenda: string; introContext: { why: string; whyNow: string; firstGoal: string } | null }

export interface BriefInputs {
  agenda: string
  intro: { why: string; whyNow: string; firstGoal: string } | null
  people: Array<{
    userId: string
    profile: { name?: string | null; title?: string | null; company?: string | null; looking_for?: string | null; can_help_with?: string | null; focus?: string | null } | null
    reasoning: { why_them?: string | null; why_you?: string | null; why_now?: string | null } | null
    messages: Array<{ sender_id: string; text: string; created_at: string }>
    asks: Array<{ ask: string }>
    notes: Array<{ text: string }>
    lastMeetingSummary: string
  }>
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
const clean = (s: string | null | undefined) => (s ?? '').trim()

export function buildBrief(input: BriefInputs, myId: string): Brief {
  const people = input.people.map(p => {
    const name = clean(p.profile?.name) || 'A member'
    const role = [clean(p.profile?.title), clean(p.profile?.company)].filter(Boolean).join(' · ')
    return {
      userId: p.userId,
      name,
      role,
      whyTheyMatter: clean(p.reasoning?.why_them) || clean(p.profile?.focus),
      common: clean(p.reasoning?.why_now),
      lookingFor: clean(p.profile?.looking_for),
      canHelpWith: clean(p.profile?.can_help_with),
      lastConversation: [...p.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-3)
        .map(m => ({ fromMe: m.sender_id === myId, text: clip(m.text, 220), at: m.created_at })),
      theirAsks: p.asks.map(a => clip(a.ask, 160)).slice(0, 3),
      yourNotes: p.notes.map(n => clip(n.text, 200)).slice(0, 3),
      lastMeetingSummary: clip(p.lastMeetingSummary, 400),
    }
  })
  return { people, goal: suggestGoal(input, people), agenda: input.agenda.trim(), introContext: input.intro }
}

/** One concrete goal: the introduction's first goal, then their open ask, then a stated need. */
export function suggestGoal(input: Pick<BriefInputs, 'agenda' | 'intro'>, people: Pick<BriefPerson, 'name' | 'lookingFor' | 'theirAsks'>[]): string {
  if (input.intro?.firstGoal.trim()) return input.intro.firstGoal.trim()
  const ask = people.find(p => p.theirAsks.length)
  if (ask) return `Find out whether you can help ${ask.name} with “${ask.theirAsks[0]}”.`
  const need = people.find(p => p.lookingFor)
  if (need) return `Learn what ${need.name} needs most right now: ${clip(need.lookingFor, 120)}.`
  if (input.agenda.trim()) return 'Agree what happens next before you hang up.'
  return 'Leave with one specific next step and who owns it.'
}

export async function loadBrief(meeting: { id: string; agenda: string; introRequestId: string | null; participants: Array<{ userId: string }> }, myId: string): Promise<Brief> {
  const others = meeting.participants.map(p => p.userId).filter(id => id !== myId)
  const [profiles, reasoning, threads, asks, notes, capsule, pastMeetings] = await Promise.all([
    db.from('profiles').select('id, name, title, company, looking_for, can_help_with, focus').in('id', others),
    db.from('members').select('id, why_them, why_you, why_now').in('id', others),
    db.from('dm_threads').select('id, member_a, member_b').or(others.map(o => `and(member_a.eq.${myId},member_b.eq.${o}),and(member_a.eq.${o},member_b.eq.${myId})`).join(',') || 'id.is.null'),
    db.from('asks').select('author_id, ask, created_at').in('author_id', others).neq('status', 'closed').order('created_at', { ascending: false }).limit(12),
    db.from('memories').select('member_id, text, created_at').eq('user_id', myId).in('member_id', others).order('created_at', { ascending: false }).limit(12),
    meeting.introRequestId
      ? db.from('intro_context_capsules').select('why_exists, why_now, first_goal').eq('intro_request_id', meeting.introRequestId).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from('meeting_notes').select('meeting_id, summary, updated_at').neq('meeting_id', meeting.id).order('updated_at', { ascending: false }).limit(20),
  ])

  const threadOf = new Map<string, string>()
  for (const t of threads.data ?? []) threadOf.set(t.member_a === myId ? t.member_b : t.member_a, t.id)
  const threadIds = [...threadOf.values()]
  const msgs = threadIds.length
    ? await db.from('dm_messages').select('thread_id, sender_id, text, created_at').in('thread_id', threadIds).order('created_at', { ascending: false }).limit(30)
    : { data: [] }

  // My notes from the most recent earlier meeting with each person.
  const pastIds = ((pastMeetings.data ?? []) as any[]).map(n => n.meeting_id)
  const pastParts = pastIds.length ? await db.from('meeting_participants').select('meeting_id, user_id').in('meeting_id', pastIds).in('user_id', others) : { data: [] }
  const lastSummary = (who: string) => {
    const shared = new Set(((pastParts.data ?? []) as any[]).filter(p => p.user_id === who).map(p => p.meeting_id))
    return ((pastMeetings.data ?? []) as any[]).find(n => shared.has(n.meeting_id) && n.summary)?.summary ?? ''
  }

  const c = capsule.data
  return buildBrief({
    agenda: meeting.agenda,
    intro: c ? { why: c.why_exists ?? '', whyNow: c.why_now ?? '', firstGoal: c.first_goal ?? '' } : null,
    people: others.map(id => ({
      userId: id,
      profile: (profiles.data ?? []).find((p: any) => p.id === id) ?? null,
      reasoning: (reasoning.data ?? []).find((p: any) => p.id === id) ?? null,
      messages: ((msgs.data ?? []) as any[]).filter(m => m.thread_id === threadOf.get(id)),
      asks: ((asks.data ?? []) as any[]).filter(a => a.author_id === id),
      notes: ((notes.data ?? []) as any[]).filter(n => n.member_id === id),
      lastMeetingSummary: lastSummary(id),
    })),
  }, myId)
}
