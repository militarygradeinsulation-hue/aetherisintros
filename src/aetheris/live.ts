/**
 * LIVE network data. Every read here is real, user-generated production data:
 * approved member profiles, their posts, their asks and their direct messages.
 *
 * Nothing in this module may fall back to the fictional catalogue in
 * `social.ts` — an empty network returns empty arrays so the UI can teach the
 * member what to do next instead of showing invented activity.
 */
import { supabase } from '@/integrations/supabase/client'
import { calculateConnectionScore, determineRadarState } from './lib/engine'
import type { Directory } from './db'
import type { Member, NetworkAsk, Post, Thread } from './social'
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

/** Honest, evidence-only scoring: derived from stated fields, never invented. */
function scoreAgainst(row: LiveProfileRow, me: LiveProfileRow | null): ScoreBreakdown {
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
    trust: 20,
    relationshipStrength: 10,
    decisionInfluence: cap(row.title ? 46 : 20),
    opportunityValue: cap(20 + (theyHelpMe + iHelpThem) * 14),
    friction: cap(58 - industryFit * 8 - theyHelpMe * 6),
  }
}

export function profileToMember(row: LiveProfileRow, me: LiveProfileRow | null): Member {
  const score = scoreAgainst(row, me)
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
    lastInteractionDays: 0,
    relationshipStatus: 'new' as const,
    score,
    scoreTotal: calculateConnectionScore(score),
    whyThem: row.looking_for ? `They are looking for ${row.looking_for}` : row.focus || 'No stated focus yet.',
    whyYou: row.can_help_with ? `They can help with ${row.can_help_with}` : '',
    whyNow: row.availability ? `Availability they set: ${row.availability}` : '',
    bestPath: [],
    nextAction: 'Open with the specific reason this relationship makes sense for both sides.',
    dontDo: 'No relationship history yet — do not assume context you have not earned.',
    confidence: row.onboarded ? 60 : 30,
    role: 'Operator' as const,
    industry: row.industries[0] ?? '',
    expertise: row.expertise,
    focus: row.focus,
    thesis: row.thesis,
    availability: row.availability,
    mutuals: [],
    introState: 'recommended' as const,
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
  const { data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  return (data ?? null) as LiveProfileRow | null
}

/**
 * The live network as the signed-in approved member sees it.
 * Members = other approved profiles (RLS already restricts this to approved
 * accounts). Posts/asks = real authored rows. Threads = real conversations.
 */
export async function loadLiveDirectory(userId: string): Promise<{ directory: Directory; me: LiveProfileRow | null }> {
  try {
    const [profileRows, postRows, askRows, threadRows] = await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS),
      supabase.from('posts').select('*').eq('is_demo', false).not('author_id', 'is', null).order('created_at', { ascending: false }),
      supabase.from('asks').select('*').eq('is_demo', false).not('author_id', 'is', null).order('created_at', { ascending: false }),
      supabase.from('dm_threads').select('*').order('updated_at', { ascending: false }),
    ])

    const profiles = (profileRows.data ?? []) as unknown as LiveProfileRow[]
    const me = profiles.find(p => p.id === userId) ?? null
    const others = profiles.filter(p => p.id !== userId)
    const members = others.map(row => profileToMember(row, me))
    // Bands of members who chose to show them, for the small matching boost. Optional: an
    // error (e.g. before migration 0055 is applied) just means no boost.
    if (others.length) {
      const bands = await (supabase as any).rpc('giver_bands', { p_members: others.slice(0, 100).map(p => p.id) }) // eslint-disable-line @typescript-eslint/no-explicit-any
      const byId = new Map<string, GiverBand>(((bands?.data ?? []) as Array<{ member_id: string; band: GiverBand }>).map(b => [b.member_id, b.band]))
      for (const m of members) m.giverBand = byId.get(m.id) ?? null
    }

    const threadIds = (threadRows.data ?? []).map(t => t.id)
    const messageRows = threadIds.length
      ? (await supabase.from('dm_messages').select('*').in('thread_id', threadIds).order('created_at')).data ?? []
      : []

    const threads: Thread[] = (threadRows.data ?? []).map(t => {
      const peer = t.member_a === userId ? t.member_b : t.member_a
      return {
        id: t.id,
        memberId: peer,
        unread: false,
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

    return { directory: { members, posts, asks, signals: [], threads, learnings: [] }, me }
  } catch (error) {
    console.error('live network read failed', error)
    return { directory: emptyDirectory, me: null }
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

const journalUrls = new Map<string, string>()

/** Short-lived signed URL for a private Journal file, cached in memory. */
export async function journalUrl(path: string): Promise<string | null> {
  const cached = journalUrls.get(path)
  if (cached) return cached
  const { data, error } = await supabase.storage.from('journal').createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) return null
  journalUrls.set(path, data.signedUrl)
  return data.signedUrl
}

const fire = (work: PromiseLike<unknown>) => {
  void Promise.resolve(work).catch(error => console.error('live write failed', error))
}

/** Find or create the single conversation between two approved members. */
export async function ensureThread(userId: string, peerId: string, context = ''): Promise<string | null> {
  const [a, b] = [userId, peerId].sort()
  const existing = await supabase.from('dm_threads').select('id').eq('member_a', a!).eq('member_b', b!).maybeSingle()
  if (existing.data?.id) return existing.data.id
  const created = await supabase
    .from('dm_threads')
    .insert({ member_a: a!, member_b: b!, created_by: userId, intro_context: context })
    .select('id')
    .maybeSingle()
  if (created.error) {
    console.error('thread create failed', created.error)
    const retry = await supabase.from('dm_threads').select('id').eq('member_a', a!).eq('member_b', b!).maybeSingle()
    return retry.data?.id ?? null
  }
  return created.data?.id ?? null
}

export function sendLiveMessage(threadId: string, senderId: string, text: string) {
  fire(supabase.from('dm_messages').insert({ thread_id: threadId, sender_id: senderId, text }))
  fire(supabase.from('dm_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId))
}

export function mirrorFollow(userId: string, peerId: string, kind: 'follow' | 'connection' | 'saved', on: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(peerId)) return
  fire(on
    ? supabase.from('follows').upsert({ follower_id: userId, followee_id: peerId, kind }, { onConflict: 'follower_id,followee_id,kind' })
    : supabase.from('follows').delete().eq('follower_id', userId).eq('followee_id', peerId).eq('kind', kind))
}

export function saveComment(postId: string, authorId: string, text: string) {
  fire(supabase.from('post_comments').insert({ post_id: postId, author_id: authorId, text }))
}

export function saveReaction(postId: string, userId: string, kind: 'like' | 'save' | 'repost', on: boolean) {
  fire(on
    ? supabase.from('post_reactions').upsert({ post_id: postId, user_id: userId, kind }, { onConflict: 'post_id,user_id,kind' })
    : supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('kind', kind))
}

/** Create the conversation row with a caller-supplied id (optimistic UI). */
export function createLiveThread(id: string, userId: string, peerId: string, context: string) {
  if (!/^[0-9a-f-]{36}$/i.test(peerId)) return
  const [a, b] = [userId, peerId].sort()
  fire(supabase.from('dm_threads').insert({ id, member_a: a!, member_b: b!, created_by: userId, intro_context: context }))
}

export function saveLiveAskResponse(askId: string, userId: string, text: string) {
  fire(supabase.from('ask_responses').insert({ ask_id: askId, user_id: userId, text }))
}
