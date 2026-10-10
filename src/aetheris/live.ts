/**
 * LIVE network data. Every read here is real, user-generated production data:
 * approved member profiles, their posts, their asks and their direct messages.
 *
 * Nothing in this module may fall back to the fictional catalogue in
 * `social.ts` — an empty network returns empty arrays so the UI can teach the
 * member what to do next instead of showing invented activity.
 */
import { ghostSyncMessage } from './crm/ghost-sync'
import { supabase } from '@/integrations/supabase/client'
import { calculateConnectionScore, determineRadarState, NO_INTERACTION_EVIDENCE } from './lib/engine'
import { businessOf, type Directory } from './db'
import type { IntroEvidence, Member, NetworkAsk, Post, RelationshipEvidence, Thread } from './social'
import type { ScoreBreakdown } from './types'
import type { GiverBand } from './reciprocity-core'

export interface LiveProfileRow {
  id: string
  name: string
  initials: string
  title: string
  company: string
  location: string
  focus: string
  thesis: string
  bio: string
  looking_for: string
  can_help_with: string
  want_to_meet: string
  availability: string
  industries: string[]
  expertise: string[]
  avatar_url: string | null
  onboarded: boolean
  created_at: string
  what_i_do: string
  building: string
  open_to: string[]
  scheduling_enabled: boolean
}

const PROFILE_COLUMNS =
  'id, name, initials, title, company, location, focus, thesis, bio, looking_for, can_help_with, want_to_meet, availability, industries, expertise, avatar_url, onboarded, created_at, what_i_do, building, open_to, scheduling_enabled'

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? '').join('').toUpperCase() || 'M'

const list = (value: string) => value.split(/[,·;/]+/).map(x => x.trim()).filter(Boolean)
const overlap = (a: string[], b: string[]) => {
  const lower = new Set(b.map(x => x.toLowerCase()))
  return a.filter(x => lower.has(x.toLowerCase())).length
}

/** No evidence at all: nothing below may imply a recent or strong relationship. */
const NO_EVIDENCE: RelationshipEvidence = {
  lastInteractionAt: null, lastInteractionDays: null, messageCount: 0,
  directConnection: null, mutualConnections: null, intros: null, calendarMeetings: null, provenStrength: null,
}

const ACCEPTED_INTRO = new Set(['accepted', 'connected'])
const MET_OUTCOME = new Set(['met', 'next_step', 'outcome'])

/**
 * Proven relationship strength (0–100) from real rows only, or null when there is none.
 * Without any message it tops out at 61, so it can never mark a member dormant/at-risk on
 * the strength of an introduction alone.
 */
export function provenStrengthOf(e: Omit<RelationshipEvidence, 'provenStrength'>): number | null {
  const intros = e.intros ?? []
  const parts = [
    Math.min(30, e.messageCount * 3),
    e.lastInteractionDays !== null && e.lastInteractionDays <= 30 ? 10 : 0,
    e.directConnection ? 15 : 0,
    intros.some(i => ACCEPTED_INTRO.has(i.status)) ? 20 : 0,
    intros.some(i => i.outcome && MET_OUTCOME.has(i.outcome.stage)) ? 10 : 0,
    Math.min(16, (e.mutualConnections ?? 0) * 4),
    Math.min(20, (e.calendarMeetings ?? 0) * 5), // calendar/ghost-logged meetings, up to 20 pts
  ]
  const total = parts.reduce((a, b) => a + b, 0)
  return total > 0 ? Math.min(100, total) : null
}

/** Trust is earned only through accepted introductions, outcomes and connections. */
function provenTrustOf(e: RelationshipEvidence): number {
  const intros = e.intros ?? []
  return Math.min(100,
    (intros.some(i => ACCEPTED_INTRO.has(i.status)) ? 30 : 0)
    + (intros.some(i => i.outcome && MET_OUTCOME.has(i.outcome.stage)) ? 20 : 0)
    + (e.directConnection ? 20 : 0)
    + Math.min(20, (e.mutualConnections ?? 0) * 5))
}

/**
 * Profile compatibility: derived from stated profile fields only, never invented. It says
 * nothing about an actual relationship — `trust` and `relationshipStrength` are the only
 * fields set from proven evidence, and they are 0 without it.
 */
function scoreAgainst(row: LiveProfileRow, me: LiveProfileRow | null, evidence: RelationshipEvidence = NO_EVIDENCE): ScoreBreakdown {
  const myIndustries = me?.industries ?? []
  const myExpertise = me?.expertise ?? []
  const myNeeds = me ? list(me.looking_for) : []
  const myOffers = me ? list(me.can_help_with) : []
  const theirNeeds = list(row.looking_for)
  const theirOffers = list(row.can_help_with)

  const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
  const industryFit = overlap(row.industries, myIndustries)
  const skillFit = overlap(row.expertise, myExpertise)
  const theyHelpMe = overlap(theirOffers, myNeeds)
  const iHelpThem = overlap(myOffers, theirNeeds)

  return {
    strategicFit: cap(24 + industryFit * 18 + skillFit * 8),
    mutualValue: cap(20 + theyHelpMe * 22 + iHelpThem * 22),
    timing: cap(row.availability ? 46 : 24),
    trust: provenTrustOf(evidence),
    relationshipStrength: evidence.provenStrength ?? 0,
    decisionInfluence: cap(row.title ? 46 : 20),
    opportunityValue: cap(20 + (theyHelpMe + iHelpThem) * 14),
    friction: cap(58 - industryFit * 8 - theyHelpMe * 6),
  }
}

function statusFrom(e: RelationshipEvidence): Member['relationshipStatus'] {
  if (e.provenStrength === null) return 'unknown'
  if (e.lastInteractionDays !== null && e.lastInteractionDays > 90) return 'dormant'
  if (e.provenStrength >= 60) return 'strong'
  if (e.lastInteractionDays !== null && e.lastInteractionDays <= 30) return 'active'
  return 'new'
}

function introStateFrom(e: RelationshipEvidence): Member['introState'] {
  const latest = e.intros?.[0]
  if (latest?.status === 'connected') return e.messageCount ? 'conversing' : 'introduced'
  if (latest?.status === 'accepted') return 'accepted'
  if (latest?.status === 'requested') return 'requested'
  if (latest?.status === 'declined') return 'closed'
  return e.messageCount ? 'conversing' : 'recommended'
}

export function profileToMember(row: LiveProfileRow, me: LiveProfileRow | null, evidence: RelationshipEvidence = NO_EVIDENCE, mutualNames: string[] = []): Member {
  const score = scoreAgainst(row, me, evidence)
  const proven = evidence.provenStrength !== null
  const partial = {
    id: row.id,
    name: row.name || 'Member',
    initials: row.initials || initialsOf(row.name || 'Member'),
    title: row.title,
    company: row.company,
    location: row.location,
    tags: row.expertise.slice(0, 4),
    needs: list(row.looking_for),
    offers: list(row.can_help_with),
    bio: row.bio,
    // Legacy numeric field: real days since the last message, or the "no evidence" sentinel
    // (never 0, which would read as "spoke today"). The nullable value is on relationshipEvidence.
    lastInteractionDays: evidence.lastInteractionDays ?? NO_INTERACTION_EVIDENCE,
    relationshipStatus: statusFrom(evidence),
    score,
    scoreTotal: calculateConnectionScore(score),
    whyThem: row.looking_for ? `They are looking for ${row.looking_for}` : row.focus || 'No stated focus yet.',
    whyYou: row.can_help_with ? `They can help with ${row.can_help_with}` : '',
    whyNow: row.availability ? `Availability they set: ${row.availability}` : '',
    bestPath: mutualNames.length ? ['You', mutualNames[0]!, row.name || 'Member'] : [],
    nextAction: 'Open with the specific reason this relationship makes sense for both sides.',
    dontDo: proven ? 'Build on the history you actually have — do not overstate it.' : 'No relationship history yet — do not assume context you have not earned.',
    confidence: row.onboarded ? 60 : 30,
    role: 'Operator' as const,
    industry: row.industries[0] ?? '',
    expertise: row.expertise,
    focus: row.focus,
    thesis: row.thesis,
    availability: row.availability,
    mutuals: mutualNames,
    introState: introStateFrom(evidence),
    relationshipEvidence: evidence,
    joined: new Date(row.created_at).getFullYear().toString(),
    avatarUrl: row.avatar_url ?? undefined,
    whatIDo: row.what_i_do,
    building: row.building,
    openTo: row.open_to ?? [],
    schedulingEnabled: row.scheduling_enabled,
  }
  return { ...partial, radar: determineRadarState(partial) } as unknown as Member
}

const relative = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const emptyDirectory: Directory = { members: [], posts: [], asks: [], signals: [], threads: [], learnings: [] }

export { emptyDirectory }

export async function loadMyProfile(userId: string): Promise<LiveProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  // Callers treat null as "no profile"; a failed read must not silently look like that.
  if (error) throw new Error(`Couldn't load your profile: ${error.message}`)
  return (data ?? null) as LiveProfileRow | null
}

/** Sources read by `loadLiveDirectory`. */
export type LiveSource = 'members' | 'posts' | 'asks' | 'threads' | 'messages' | 'reads' | 'connections' | 'intros' | 'outcomes'

/**
 * Per-source read failures. A source listed here could not be loaded, so its empty array
 * means "couldn't load", never "nothing yet". Null when every source read cleanly.
 */
export type LiveQueryError = Partial<Record<LiveSource, string>> | null

/**
 * The live network as the signed-in approved member sees it.
 * Members = other approved profiles (RLS already restricts this to approved
 * accounts). Posts/asks = real authored rows. Threads = real conversations.
 */
export async function loadLiveDirectory(userId: string): Promise<{ directory: Directory; me: LiveProfileRow | null; failed?: boolean; queryError: LiveQueryError }> {
  const errors: Partial<Record<LiveSource, string>> = {}
  const note = (source: LiveSource, error: { message: string } | null) => {
    if (error) { errors[source] = error.message; console.error(`live read failed: ${source}`, error) }
  }
  try {
    const [profileRows, postRows, askRows, threadRows] = await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS),
      supabase.from('posts').select('*').eq('is_demo', false).not('author_id', 'is', null).order('created_at', { ascending: false }),
      supabase.from('asks').select('*').eq('is_demo', false).not('author_id', 'is', null).order('created_at', { ascending: false }),
      supabase.from('dm_threads').select('*').order('updated_at', { ascending: false }),
    ])

    note('members', profileRows.error)
    note('posts', postRows.error)
    note('asks', askRows.error)
    note('threads', threadRows.error)

    const profiles = (profileRows.data ?? []) as unknown as LiveProfileRow[]
    const me = profiles.find(p => p.id === userId) ?? null
    const others = profiles.filter(p => p.id !== userId)

    const threadIds = (threadRows.data ?? []).map(t => t.id)
    const peerOf = (t: { member_a: string; member_b: string }) => (t.member_a === userId ? t.member_b : t.member_a)
    // Relationship evidence, read in parallel. Each source fails on its own: a failed read
    // leaves its evidence null ("unknown"), never zero or a default that implies strength.
    const [messageRead, unreadRead, edgeRead, introRead] = await Promise.all([
      threadIds.length ? supabase.from('dm_messages').select('*').in('thread_id', threadIds).order('created_at') : null,
      threadIds.length ? supabase.rpc('my_unread_counts') : null,
      supabase.from('follows').select('follower_id, followee_id').eq('kind', 'connection'),
      // RLS returns only introductions you requested or received.
      supabase.from('intro_requests').select('id, user_id, member_id, target_user_id, status, accepted_at, created_at').order('created_at', { ascending: false }),
    ])
    let messageRows: Array<{ id: string; thread_id: string; sender_id: string; text: string; created_at: string }> = []
    if (messageRead) { note('messages', messageRead.error); messageRows = messageRead.data ?? [] }
    if (unreadRead) note('reads', unreadRead.error)
    note('connections', edgeRead.error)
    note('intros', introRead.error)

    const introRows = introRead.data ?? []
    const outcomeRead = introRows.length
      ? await supabase.from('intro_outcomes').select('intro_request_id, stage, outcome_category, occurred_on').in('intro_request_id', introRows.map(r => r.id)).order('occurred_on', { ascending: false })
      : null
    if (outcomeRead) note('outcomes', outcomeRead.error)
    const latestOutcome = new Map<string, IntroEvidence['outcome']>()
    for (const o of outcomeRead?.data ?? []) {
      if (!latestOutcome.has(o.intro_request_id)) latestOutcome.set(o.intro_request_id, { stage: o.stage, category: o.outcome_category, occurredOn: o.occurred_on })
    }
    const introsByPeer = new Map<string, IntroEvidence[]>()
    for (const r of introRows) {
      const sent = r.user_id === userId
      const peer = sent ? (r.target_user_id ?? r.member_id) : r.user_id
      const entry: IntroEvidence = { id: r.id, direction: sent ? 'sent' : 'received', status: r.status, createdAt: r.created_at, acceptedAt: r.accepted_at, outcome: latestOutcome.get(r.id) ?? null }
      introsByPeer.set(peer, [...(introsByPeer.get(peer) ?? []), entry])
    }

    // Undirected connection graph: a `connection` row either way links two members.
    const connectionsOf = new Map<string, Set<string>>()
    for (const e of edgeRead.data ?? []) {
      for (const [a, b] of [[e.follower_id, e.followee_id], [e.followee_id, e.follower_id]] as const) {
        if (!connectionsOf.has(a)) connectionsOf.set(a, new Set())
        connectionsOf.get(a)!.add(b)
      }
    }
    const mine = connectionsOf.get(userId) ?? new Set<string>()
    const nameOf = new Map(profiles.map(p => [p.id, p.name || 'Member']))

    const peerMessages = new Map<string, { count: number; lastAt: string | null }>()
    for (const t of threadRows.data ?? []) {
      const rows = messageRows.filter(m => m.thread_id === t.id)
      const prev = peerMessages.get(peerOf(t)) ?? { count: 0, lastAt: null }
      const lastAt = rows.length ? rows[rows.length - 1]!.created_at : null
      peerMessages.set(peerOf(t), { count: prev.count + rows.length, lastAt: !prev.lastAt || (lastAt && lastAt > prev.lastAt) ? lastAt : prev.lastAt })
    }

    // Meetings logged in your CRM per member (RLS: your rows only). Optional evidence: a failed read leaves it unknown.
    const meetingsByMember = new Map<string, number>()
    let meetingsKnown = false
    const peopleRead = others.length
      ? await supabase.from('crm_people').select('id, member_id').in('member_id', others.map(o => o.id))
      : null
    if (peopleRead && !peopleRead.error) {
      const memberOfPerson = new Map((peopleRead.data ?? []).filter(p => p.member_id).map(p => [p.id, p.member_id as string]))
      const meetingRead = memberOfPerson.size
        ? await supabase.from('crm_activities').select('person_id').eq('kind', 'meeting').in('person_id', [...memberOfPerson.keys()])
        : null
      if (!meetingRead?.error) {
        meetingsKnown = true
        for (const a of meetingRead?.data ?? []) {
          const member = a.person_id ? memberOfPerson.get(a.person_id) : undefined
          if (member) meetingsByMember.set(member, (meetingsByMember.get(member) ?? 0) + 1)
        }
      }
    }

    const members = others.map(row => {
      const msgs = peerMessages.get(row.id) ?? { count: 0, lastAt: null }
      const theirs = connectionsOf.get(row.id) ?? new Set<string>()
      const mutualIds = edgeRead.error ? [] : [...mine].filter(id => id !== row.id && id !== userId && theirs.has(id))
      const base: Omit<RelationshipEvidence, 'provenStrength'> = {
        lastInteractionAt: msgs.lastAt,
        lastInteractionDays: msgs.lastAt ? Math.max(0, Math.floor((Date.now() - new Date(msgs.lastAt).getTime()) / 86400000)) : null,
        messageCount: msgs.count,
        directConnection: edgeRead.error ? null : mine.has(row.id),
        mutualConnections: edgeRead.error ? null : mutualIds.length,
        intros: introRead.error ? null : (introsByPeer.get(row.id) ?? []),
        calendarMeetings: meetingsKnown ? (meetingsByMember.get(row.id) ?? 0) : null,
      }
      return profileToMember(row, me, { ...base, provenStrength: provenStrengthOf(base) }, mutualIds.map(id => nameOf.get(id) ?? 'Member'))
    })
    // Bands of members who chose to show them, for the small matching boost. Optional: an
    // error (e.g. before migration 0055 is applied) just means no boost.
    if (others.length) {
      const bands = await (supabase as any).rpc('giver_bands', { p_members: others.slice(0, 100).map(p => p.id) }) // eslint-disable-line @typescript-eslint/no-explicit-any
      const byId = new Map<string, GiverBand>(((bands?.data ?? []) as Array<{ member_id: string; band: GiverBand }>).map(b => [b.member_id, b.band]))
      for (const m of members) m.giverBand = byId.get(m.id) ?? null
    }

    // Persisted read receipts: a thread is unread only when the server says so.
    const unreadById = new Map((unreadRead?.data ?? []).map(r => [r.thread_id, Number(r.unread) || 0]))
    const threads: Thread[] = (threadRows.data ?? []).map(t => {
      return {
        id: t.id,
        memberId: peerOf(t),
        unread: (unreadById.get(t.id) ?? 0) > 0,
        introContext: t.intro_context ?? '',
        commitment: '',
        suggested: '',
        messages: messageRows
          .filter(m => m.thread_id === t.id)
          .map(m => ({
            id: m.id,
            from: (m.sender_id === userId ? 'me' : 'them') as 'me' | 'them',
            text: m.text,
            at: new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
          })),
      }
    })

    const posts: Post[] = (postRows.data ?? []).map(r => ({
      id: r.id,
      memberId: r.author_id === userId ? 'me' : (r.author_id ?? 'me'),
      kind: r.kind as Post['kind'],
      text: r.text,
      detail: r.detail ?? '',
      when: relative(r.created_at),
      responses: r.response_count ?? 0,
      media: (r.media ?? []) as unknown as Post['media'],
      visibility: (r.visibility ?? 'network') as Post['visibility'],
      ...businessOf(r.kind, r.business),
    }))

    const asks: NetworkAsk[] = (askRows.data ?? []).map(r => ({
      id: r.id,
      memberId: r.author_id === userId ? 'me' : (r.author_id ?? 'me'),
      ask: r.ask,
      detail: r.detail,
      whyNow: r.why_now,
      offer: r.offer,
      industry: r.industry,
      location: r.location,
      urgency: r.urgency as NetworkAsk['urgency'],
      posted: relative(r.created_at),
      responses: r.response_count ?? 0,
      visibility: r.visibility as NetworkAsk['visibility'],
      ...(r.author_id === userId ? { mine: true } : {}),
    }))

    const queryError: LiveQueryError = Object.keys(errors).length ? errors : null
    // Evidence sources (reads/connections/intros/outcomes) degrade to "unknown" and are reported
    // in queryError, but don't fail the whole directory.
    const coreFailed = (['members', 'posts', 'asks', 'threads', 'messages'] as const).some(s => errors[s])
    return { directory: { members, posts, asks, signals: [], threads, learnings: [] }, me, queryError, ...(coreFailed ? { failed: true } : {}) }
  } catch (error) {
    console.error('live network read failed', error)
    const message = error instanceof Error ? error.message : 'Network error'
    return { directory: emptyDirectory, me: null, failed: true, queryError: { members: message, posts: message, asks: message, threads: message, messages: message, reads: message, connections: message, intros: message, outcomes: message } }
  }
}

/* ------------------------------------------------------------------ writes */

/** Store a member's photo in their own private folder and persist only its path. */
export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile photos must be 5 MB or smaller.')
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return path
}

const imageTypes = /^image\/(jpeg|png|webp|gif)$/i
const videoTypes = /^video\/(mp4|webm|quicktime)$/i
const documentTypes = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\..+|application\/vnd\.ms-(excel|powerpoint)|text\/(plain|csv))$/i

export type JournalKind = 'image' | 'video' | 'document'

export function journalKindFor(file: File): JournalKind | null {
  if (imageTypes.test(file.type)) return 'image'
  if (videoTypes.test(file.type)) return 'video'
  if (documentTypes.test(file.type)) return 'document'
  return null
}

/** Upload one Journal attachment into the member's own private folder. */
export async function uploadJournalMedia(userId: string, file: File) {
  const kind = journalKindFor(file)
  if (!kind) throw new Error(`${file.name} is not a supported picture, video or document.`)
  const limit = kind === 'video' ? 200 * 1024 * 1024 : 25 * 1024 * 1024
  if (file.size > limit) throw new Error(`${file.name} is too large — ${kind === 'video' ? 'videos' : 'pictures and documents'} must be ${kind === 'video' ? '200 MB' : '25 MB'} or smaller.`)
  const extension = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const { error } = await supabase.storage.from('journal').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return { path, kind, name: file.name, mime: file.type, size: file.size }
}

const journalUrls = new Map<string, { url: string; expiresAt: number }>()
const SIGNED_URL_TTL = 60 * 60 // 1 hour, matches createSignedUrl
const SIGNED_URL_REFRESH_BUFFER = 5 * 60 // refresh 5 min before expiry

/** Short-lived signed URL for a private Journal file, cached with expiry awareness. */
export async function journalUrl(path: string): Promise<string | null> {
  const cached = journalUrls.get(path)
  if (cached && Date.now() < cached.expiresAt - SIGNED_URL_REFRESH_BUFFER * 1000) return cached.url
  const { data, error } = await supabase.storage.from('journal').createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data?.signedUrl) return null
  journalUrls.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL * 1000 })
  return data.signedUrl
}

/* ------------------------------------------------------------------ write results */

/**
 * Every live write resolves to a typed result instead of being fired and forgotten, so the
 * UI can undo optimistic state, mark the item unsaved and offer a retry.
 */
export type WriteResult = { ok: true } | { ok: false; error: string; code?: string }

interface DbError { message: string; code?: string }
const UNIQUE_VIOLATION = '23505'

async function settle(label: string, work: PromiseLike<{ error: DbError | null }>, opts: { duplicateIsSuccess?: boolean } = {}): Promise<WriteResult> {
  try {
    const { error } = await work
    if (!error) return { ok: true }
    // A retried insert that carries the same client id already landed the first time.
    if (opts.duplicateIsSuccess && error.code === UNIQUE_VIOLATION) return { ok: true }
    console.error(`live write failed: ${label}`, error)
    return { ok: false, error: error.message || 'The change could not be saved.', ...(error.code ? { code: error.code } : {}) }
  } catch (error) {
    console.error(`live write failed: ${label}`, error)
    return { ok: false, error: error instanceof Error ? error.message : 'Network error — the change was not saved.' }
  }
}

/** Find or create the single conversation between two approved members. */
export async function ensureThread(userId: string, peerId: string, context = ''): Promise<string | null> {
  const [a, b] = [userId, peerId].sort()
  const existing = await supabase.from('dm_threads').select('id').eq('member_a', a!).eq('member_b', b!).maybeSingle()
  if (existing.error) console.error('thread lookup failed', existing.error)
  if (existing.data?.id) return existing.data.id
  const created = await supabase
    .from('dm_threads')
    .insert({ member_a: a!, member_b: b!, created_by: userId, intro_context: context })
    .select('id')
    .maybeSingle()
  if (created.error) {
    console.error('thread create failed', created.error)
    const retry = await supabase.from('dm_threads').select('id').eq('member_a', a!).eq('member_b', b!).maybeSingle()
    if (retry.error) console.error('thread lookup failed', retry.error)
    return retry.data?.id ?? null
  }
  return created.data?.id ?? null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const withId = (id?: string) => (id && UUID.test(id) ? { id } : {})

/**
 * `id` (when a uuid) keeps the sent row's id equal to the local message, so read receipts
 * line up and a retry can never deliver the same message twice.
 */
export async function sendLiveMessage(threadId: string, senderId: string, text: string, id?: string): Promise<WriteResult> {
  const sent = await settle('message', supabase.from('dm_messages').insert({ ...withId(id), thread_id: threadId, sender_id: senderId, text }), { duplicateIsSuccess: Boolean(withId(id).id) })
  if (!sent.ok) return sent
  // Ordering hint only: the message itself is delivered, so a failure here is logged, not surfaced.
  await settle('thread touch', supabase.from('dm_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId))
  return sent
}

/** Ghost CRM: after a message is delivered, keep the peer's contact and timeline current (never throws). */
export async function ghostMessageSent(threadId: string, peerId: string, peerProfile: { name: string; title: string; company: string }): Promise<void> {
  await ghostSyncMessage({ theirProfile: { id: peerId, ...peerProfile, location: '' }, threadId })
}

export async function mirrorFollow(userId: string, peerId: string, kind: 'follow' | 'connection' | 'saved', on: boolean): Promise<WriteResult> {
  if (!UUID.test(peerId)) return { ok: true }
  return settle(`follow ${kind}`, on
    ? supabase.from('follows').upsert({ follower_id: userId, followee_id: peerId, kind }, { onConflict: 'follower_id,followee_id,kind' })
    : supabase.from('follows').delete().eq('follower_id', userId).eq('followee_id', peerId).eq('kind', kind))
}

export async function saveComment(postId: string, authorId: string, text: string, id?: string): Promise<WriteResult> {
  return settle('comment', supabase.from('post_comments').insert({ ...withId(id), post_id: postId, author_id: authorId, text }), { duplicateIsSuccess: Boolean(withId(id).id) })
}

export async function saveReaction(postId: string, userId: string, kind: 'like' | 'save' | 'repost', on: boolean): Promise<WriteResult> {
  return settle(`reaction ${kind}`, on
    ? supabase.from('post_reactions').upsert({ post_id: postId, user_id: userId, kind }, { onConflict: 'post_id,user_id,kind' })
    : supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('kind', kind))
}

/** Create the conversation row with a caller-supplied id (optimistic UI). */
export async function createLiveThread(id: string, userId: string, peerId: string, context: string): Promise<WriteResult> {
  if (!UUID.test(peerId)) return { ok: true }
  const [a, b] = [userId, peerId].sort()
  const created = await settle('thread', supabase.from('dm_threads').insert({ id, member_a: a!, member_b: b!, created_by: userId, intro_context: context }))
  if (created.ok || created.code !== UNIQUE_VIOLATION) return created
  // A retry of a create that already landed is fine; a different conversation for the pair is not.
  const same = await supabase.from('dm_threads').select('id').eq('id', id).maybeSingle()
  if (same.data?.id) return { ok: true }
  return { ok: false, error: 'A conversation with this member already exists. Reload to continue it.', code: UNIQUE_VIOLATION }
}

export async function saveLiveAskResponse(askId: string, userId: string, text: string, id?: string): Promise<WriteResult> {
  return settle('ask response', supabase.from('ask_responses').insert({ ...withId(id), ask_id: askId, user_id: userId, text }), { duplicateIsSuccess: Boolean(withId(id).id) })
}
