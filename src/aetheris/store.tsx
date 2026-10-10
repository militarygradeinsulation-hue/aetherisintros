import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { BusinessDetails } from './business-posts'
import type { AutonomyLevel, DigitalYouProfile, Objective, PrivacyScope } from './types'
import { defaultDigitalYou, objectives as seedObjectives } from './data'
import {
  learnings as catalogueLearnings, me as seedMe, members as catalogueMembers,
  networkAsks as catalogueAsks, posts as cataloguePosts, signals as catalogueSignals,
  threads as catalogueThreads,
  type IntroState, type JournalAttachment, type Learning, type Member, type NetworkAsk, type Post, type Signal, type Thread,
} from './social'
import {
  currentUserId, loadDirectory, loadUserGraph, saveAsk, saveAskResponse, saveDoc, saveIntro,
  saveLearning, saveMessage, saveNote, savePost, saveProfileFields, saveRelationship, saveThread,
  type Directory, type MemoryNote,
} from './db'
import {
  createLiveThread, emptyDirectory, loadLiveDirectory, mirrorFollow, saveComment,
  saveReaction, sendLiveMessage, ghostMessageSent, uploadProfileAvatar, type LiveProfileRow, type LiveQueryError, type WriteResult,
} from './live'
import { supabase } from '@/integrations/supabase/client'
import { quarterStart } from './activation'

/** 'live' = real members only (the network). 'demo' = the labelled showcase. */
export type NetworkMode = 'live' | 'demo'

export type { MemoryNote }
export type MeProfile = typeof seedMe & {
  wantToMeet?: string
  introPreferences?: string
  boundaries?: string
  onboarded?: boolean
  avatarUrl?: string | undefined
  whatIDo?: string
  building?: string
  openTo?: string[]
  schedulingEnabled?: boolean
  /** This quarter's goals (member_goals, 0051). Read-only here; feeds matching, never saved with the profile. */
  goals?: string[]
}

export interface PreferenceSettings {
  title: string
  focus: string
  profileVisibility: 'network' | 'connections' | 'private'
  availability: string
  meetingFormat: string
  allowBooking: boolean
  useRecommendations: boolean
  prioritizeMutual: boolean
  crossIndustry: boolean
  includeEarlyStage: boolean
  serendipity: number
  notificationFrequency: string
  coolingAlerts: boolean
  introAlerts: boolean
  contactPermission: string
  requireDoubleOptIn: boolean
  shareActivity: boolean
  rememberConversations: boolean
  rememberActions: boolean
  sharedMemory: boolean
  retention: string
}

export type HomeWidgetId = 'missing' | 'help' | 'strategic' | 'changed' | 'pulse' | 'chief' | 'approvals' | 'risk' | 'leverage' | 'mission' | 'graph' | 'matters' | 'signals' | 'people' | 'memory' | 'pipeline' | 'calendar' | 'news' | 'assistant'
export type HomeWidgetSize = 'compact' | 'standard' | 'wide'
export interface HomeWidgetConfig {
  id: HomeWidgetId
  size: HomeWidgetSize
  visible: boolean
}

export const defaultHomeLayout: HomeWidgetConfig[] = [
  { id: 'changed', size: 'wide', visible: true },
  { id: 'chief', size: 'standard', visible: true },
  { id: 'missing', size: 'standard', visible: true },
  { id: 'help', size: 'standard', visible: true },
  { id: 'strategic', size: 'standard', visible: true },
  { id: 'approvals', size: 'compact', visible: true },
  { id: 'risk', size: 'standard', visible: true },
  { id: 'leverage', size: 'standard', visible: true },
  { id: 'pulse', size: 'standard', visible: true },
  { id: 'mission', size: 'standard', visible: true },
  { id: 'graph', size: 'standard', visible: true },
  { id: 'matters', size: 'wide', visible: true },
  { id: 'signals', size: 'compact', visible: true },
  { id: 'people', size: 'standard', visible: true },
  { id: 'memory', size: 'standard', visible: true },
  { id: 'pipeline', size: 'wide', visible: true },
  { id: 'calendar', size: 'compact', visible: true },
  { id: 'news', size: 'wide', visible: true },
  { id: 'assistant', size: 'compact', visible: true },
]

export interface FeedPreferences {
  scope: 'all' | 'circle' | 'industry' | 'saved'
  industries: string[]
  circleId: string
}

export interface PostComment {
  id: string
  text: string
  when: string
  /** Live only: 'pending' while saving, 'unsaved' when the save failed (retry offered). */
  status?: 'pending' | 'unsaved'
}

/** A live write that is in flight or failed. Failed writes are never shown as delivered. */
export interface UnsavedWrite {
  key: string
  kind: 'message' | 'comment' | 'thread' | 'reaction' | 'follow'
  state: 'pending' | 'failed'
  label: string
  error?: string
}

interface Persisted {
  connections: string[]
  follows: string[]
  saved: string[]
  introStates: Record<string, IntroState>
  ownPosts: Post[]
  postResponses: string[]
  likedPosts: string[]
  repostedPosts: string[]
  postComments: Record<string, PostComment[]>
  feedPreferences: FeedPreferences
  ownAsks: NetworkAsk[]
  askResponses: Record<string, string[]>
  warmPaths: string[]
  sentMessages: Record<string, Array<{ id: string; text: string; at: string }>>
  ownThreads: Thread[]
  learned: Learning[]
  activity: Signal[]
  notes: MemoryNote[]
  objectives: Objective[]
  profile: MeProfile
  digitalYou: DigitalYouProfile
  autonomy: AutonomyLevel
  preferences: PreferenceSettings
  homeLayout: HomeWidgetConfig[]
  registeredEvents: string[]
  savedEvents: string[]
}

const KEY = 'aetheris-intros-graph-v1'

/** Settings that live in the member's preferences document rather than a table. */
const DOC_KEYS = [
  'objectives', 'profile', 'digitalYou', 'autonomy', 'preferences',
  'homeLayout',
  'registeredEvents', 'savedEvents', 'warmPaths', 'postResponses', 'likedPosts',
  'repostedPosts', 'postComments', 'feedPreferences', 'activity',
] as const

const empty: Persisted = {
  connections: [], follows: [], saved: [], introStates: {}, ownPosts: [], postResponses: [],
  likedPosts: [], repostedPosts: [], postComments: {},
  feedPreferences: { scope: 'all', industries: [], circleId: '' },
  ownAsks: [], askResponses: {}, warmPaths: [], sentMessages: {}, ownThreads: [],
  learned: [], activity: [], notes: [], objectives: seedObjectives,
  profile: { ...seedMe }, digitalYou: defaultDigitalYou, autonomy: 2,
  preferences: {
    title: seedMe.title, focus: seedMe.focus, profileVisibility: 'network',
    availability: 'Open to two conversations a week', meetingFormat: 'Video call', allowBooking: true,
    useRecommendations: true, prioritizeMutual: true, crossIndustry: true, includeEarlyStage: true,
    serendipity: 28, notificationFrequency: 'Weekly relationship review', coolingAlerts: true,
    introAlerts: true, contactPermission: 'Connections and warm introductions', requireDoubleOptIn: true,
    shareActivity: true, rememberConversations: true, rememberActions: true, sharedMemory: false,
    retention: 'Until I delete it',
  },
  homeLayout: defaultHomeLayout.map(widget => ({ ...widget })),
  registeredEvents: [], savedEvents: [],
}

function normalizeHomeLayout(value: unknown): HomeWidgetConfig[] {
  const validIds = new Set(defaultHomeLayout.map(widget => widget.id))
  const validSizes = new Set<HomeWidgetSize>(['compact', 'standard', 'wide'])
  const incoming = Array.isArray(value) ? value : []
  const normalized: HomeWidgetConfig[] = []
  for (const item of incoming) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Partial<HomeWidgetConfig>
    if (!candidate.id || !validIds.has(candidate.id) || normalized.some(widget => widget.id === candidate.id)) continue
    normalized.push({
      id: candidate.id,
      size: candidate.size && validSizes.has(candidate.size) ? candidate.size : 'standard',
      visible: candidate.visible !== false,
    })
  }
  for (const widget of defaultHomeLayout) {
    if (normalized.some(item => item.id === widget.id)) continue
    if (['changed', 'chief', 'missing', 'help', 'strategic', 'approvals', 'risk', 'leverage', 'pulse', 'mission', 'graph'].includes(widget.id)) {
      const order = ['changed', 'chief', 'missing', 'help', 'strategic', 'approvals', 'risk', 'leverage', 'pulse', 'mission', 'graph']
      const at = normalized.findIndex(item => order.indexOf(item.id) === -1 || order.indexOf(item.id) > order.indexOf(widget.id))
      normalized.splice(at < 0 ? normalized.length : at, 0, { ...widget })
    } else normalized.push({ ...widget })
  }
  return normalized
}

function load(): Persisted {
  if (typeof window === 'undefined') return empty
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Persisted>
      return { ...empty, ...stored, homeLayout: normalizeHomeLayout(stored.homeLayout) }
    }
  } catch { /* fall through to legacy migration */ }
  const legacy = <T,>(k: string, fallback: T): T => {
    try { return (JSON.parse(localStorage.getItem(k) || '') as T) ?? fallback } catch { return fallback }
  }
  return {
    ...empty,
    saved: legacy('aetheris-intros-saved', [] as string[]),
    notes: legacy('aetheris-nexus-memory', [] as MemoryNote[]),
    objectives: legacy('aetheris-nexus-objectives', seedObjectives),
    digitalYou: legacy('aetheris-intros-dy', defaultDigitalYou),
    autonomy: Number(localStorage.getItem('aetheris-intros-autonomy') ?? '2') as AutonomyLevel,
  }
}

const now = () => new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const clock = () => new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
/** Keep the first record for each id — optimistic rows and their saved twin. */
const byId = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>()
  return items.filter(item => (seen.has(item.id) ? false : (seen.add(item.id), true)))
}
const rowId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`)
const identityInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? '').join('').toUpperCase() || 'M'
const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error ?? new Error('Could not read that image.'))
  reader.readAsDataURL(file)
})

interface NetworkApi {
  members: Member[]
  posts: Post[]
  asks: NetworkAsk[]
  threads: Thread[]
  learnings: Learning[]
  activity: Signal[]
  notes: MemoryNote[]
  objectives: Objective[]
  profile: MeProfile
  digitalYou: DigitalYouProfile
  autonomy: AutonomyLevel
  preferences: PreferenceSettings
  homeLayout: HomeWidgetConfig[]
  registeredEvents: string[]
  savedEvents: string[]
  connections: string[]
  follows: string[]
  saved: string[]
  postResponses: string[]
  likedPosts: string[]
  repostedPosts: string[]
  postComments: Record<string, PostComment[]>
  feedPreferences: FeedPreferences
  askResponses: Record<string, string[]>
  warmPaths: string[]
  /** True once this member's own graph has been read from the database. */
  synced: boolean
  /** True when the last read of the live network failed, so the feed can say so. */
  feedError: boolean
  /** Which live sources failed to load; their empty lists mean "couldn't load", not "none yet". */
  queryError: LiveQueryError
  /** Live writes still saving or that failed. */
  unsavedWrites: UnsavedWrite[]
  /** Retry a failed write without duplicating it. Resolves true when it saved. */
  retryWrite: (key: string) => Promise<boolean>
  /* graph actions */
  connect: (id: string) => void
  follow: (id: string) => void
  toggleSave: (id: string, label?: string) => void
  openThreadWith: (id: string) => string
  sendMessage: (threadId: string, text: string) => void
  requestIntro: (id: string) => void
  authorizeIntro: (id: string) => void
  declineIntro: (id: string) => void
  /** Forget a withdrawn request locally; the row itself is deleted by the caller. */
  withdrawIntro: (id: string) => void
  addPost: (text: string, detail?: string, media?: JournalAttachment[], visibility?: 'network' | 'private', kind?: Post['kind'], business?: BusinessDetails) => void
  respondToPost: (postId: string, memberId: string) => string | null
  togglePostLike: (postId: string) => void
  togglePostRepost: (postId: string, memberId: string) => void
  addPostComment: (postId: string, text: string, memberId: string) => void
  setFeedPreferences: (settings: FeedPreferences) => void
  addAsk: (ask: Omit<NetworkAsk, 'id' | 'posted' | 'responses' | 'memberId' | 'mine'>) => void
  respondToAsk: (askId: string, text: string) => string | null
  requestWarmPath: (askId: string) => void
  addObjective: (o: Objective) => void
  addNote: (personId: string, text: string, scope: PrivacyScope) => void
  setDigitalYou: (x: DigitalYouProfile) => void
  setAutonomy: (x: AutonomyLevel) => void
  updateIdentity: (fields: { name: string; photo?: File | null }) => Promise<void>
  updateExecutiveProfile: (fields: Partial<Pick<MeProfile, 'title' | 'company' | 'location' | 'whatIDo' | 'building' | 'focus' | 'thesis' | 'lookingFor' | 'canHelpWith' | 'expertise' | 'industries' | 'openTo' | 'schedulingEnabled' | 'availability'>>) => Promise<void>
  completeOnboarding: (answers: Record<string, string>) => void
  setPreferences: (settings: PreferenceSettings) => void
  setHomeLayout: (layout: HomeWidgetConfig[]) => void
  toggleEventRegistration: (id: string) => void
  toggleEventSave: (id: string) => void
}

const Ctx = createContext<NetworkApi | null>(null)

const catalogue: Directory = {
  members: catalogueMembers, posts: cataloguePosts, asks: catalogueAsks,
  signals: catalogueSignals, threads: catalogueThreads, learnings: catalogueLearnings,
}

/** A live member starts from an empty identity, not from the showcase persona. */
const blankMe: MeProfile = {
  name: '', initials: '', title: '', company: '', location: '', thesis: '', focus: '',
  lookingFor: '', canHelpWith: '', industries: [], values: '', availability: '', expertise: [],
  wantToMeet: '', introPreferences: '', boundaries: '', onboarded: false,
  whatIDo: '', building: '', openTo: [], schedulingEnabled: false,
}

/** This quarter's goals for the signed-in member (own rows only by RLS). Empty on any error. */
async function loadOwnGoals(): Promise<string[]> {
  try {
    const r = await (supabase as any).from('member_goals').select('goal').eq('quarter', quarterStart(new Date())).order('position') // eslint-disable-line @typescript-eslint/no-explicit-any
    return (r.data ?? []).map((g: { goal: string }) => g.goal)
  } catch { return [] }
}

/** The signed-in member's own identity, read from their real profile row. */
function profileFromRow(prev: MeProfile, row: LiveProfileRow): MeProfile {
  return {
    ...prev,
    name: row.name || prev.name,
    initials: row.initials || prev.initials,
    title: row.title,
    company: row.company,
    location: row.location,
    focus: row.focus,
    thesis: row.thesis,
    lookingFor: row.looking_for,
    canHelpWith: row.can_help_with,
    availability: row.availability,
    industries: row.industries ?? [],
    expertise: row.expertise ?? [],
    wantToMeet: row.want_to_meet,
    onboarded: row.onboarded,
    avatarUrl: row.avatar_url ?? undefined,
    whatIDo: row.what_i_do,
    building: row.building,
    openTo: row.open_to ?? [],
    schedulingEnabled: row.scheduling_enabled,
  }
}

export function NetworkProvider({ children, mode = 'live' }: { children: React.ReactNode; mode?: NetworkMode }) {
  const live = mode === 'live'
  // Live members never inherit anything the demo left on this device.
  const [s, setS] = useState<Persisted>(() => live ? { ...empty, objectives: [], activity: [], profile: { ...blankMe } } : load())
  const [dir, setDir] = useState<Directory>(live ? emptyDirectory : catalogue)
  const [userId, setUserId] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const [feedError, setFeedError] = useState(false)
  const [queryError, setQueryError] = useState<LiveQueryError>(null)
  const lastSynced = useRef<Persisted | null>(null)
  const [writes, setWrites] = useState<Record<string, UnsavedWrite>>({})
  const retries = useRef(new Map<string, () => Promise<WriteResult>>())
  /** Write keys whose next reverse diff comes from a rollback, so it must not be re-sent. */
  const suppressed = useRef(new Set<string>())
  /** Thread creation in flight, so messages wait for their conversation row to exist. */
  const threadWrites = useRef(new Map<string, Promise<WriteResult>>())
  /** Message ids confirmed saved this session (the server copy may not have refreshed yet). */
  const delivered = useRef(new Set<string>())

  /**
   * Runs one live write and records its state. On failure `rollback` undoes the optimistic
   * update (toggles) and the write stays listed as failed with a retry; on success it clears.
   */
  const track = (entry: Omit<UnsavedWrite, 'state' | 'error'>, work: () => Promise<WriteResult>, rollback?: () => void, onRetrySaved?: () => void) => {
    const run = async (): Promise<WriteResult> => {
      setWrites(prev => ({ ...prev, [entry.key]: { ...entry, state: 'pending' } }))
      const result = await work()
      if (result.ok) {
        retries.current.delete(entry.key)
        setWrites(prev => { const { [entry.key]: _done, ...rest } = prev; return rest })
      } else {
        setWrites(prev => ({ ...prev, [entry.key]: { ...entry, state: 'failed', error: result.error } }))
      }
      return result
    }
    retries.current.set(entry.key, async () => {
      const result = await run()
      if (result.ok) onRetrySaved?.()
      return result
    })
    return run().then(result => { if (!result.ok) rollback?.(); return result })
  }

  /** Undo an optimistic list toggle without the write-through effect sending the reverse write. */
  const revertToggle = (key: string, list: 'likedPosts' | 'repostedPosts' | 'connections' | 'follows' | 'saved', id: string, wasOn: boolean) => {
    suppressed.current.add(key)
    setS(prev => ({ ...prev, [list]: wasOn ? prev[list].filter(x => x !== id) : prev[list].includes(id) ? prev[list] : [...prev[list], id] }))
  }
  const reapplyToggle = (key: string, list: 'likedPosts' | 'repostedPosts' | 'connections' | 'follows' | 'saved', id: string, on: boolean) =>
    revertToggle(key, list, id, !on)

  useEffect(() => { if (live) return; try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage full */ } }, [s, live])

  /* hydrate: the network this member may see, then their own private graph */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!live) {
        const directory = await loadDirectory()
        if (!cancelled) setDir(directory)
      }
      const id = await currentUserId()
      if (cancelled) return
      if (!id) { setSynced(true); return }
      setUserId(id)
      let meRow: LiveProfileRow | null = null
      let myGoals: string[] = []
      if (live) {
        const [{ directory, me, failed, queryError: readErrors }, goals] = await Promise.all([loadLiveDirectory(id), loadOwnGoals()])
        if (cancelled) return
        setFeedError(Boolean(failed))
        setQueryError(readErrors)
        meRow = me
        myGoals = goals
        setDir(directory)
      }
      const remote = await loadUserGraph(id)
      if (cancelled) return
      setS(prev => {
        const doc = (remote.doc ?? {}) as Partial<Persisted>
        const next: Persisted = { ...prev }
        for (const key of DOC_KEYS) {
          if (doc[key] !== undefined) (next[key] as unknown) = doc[key]
        }
        next.homeLayout = normalizeHomeLayout(doc.homeLayout ?? next.homeLayout)
        // In the live network your identity and your stated needs always come from
        // your own record — never from anything left behind by the demo showcase.
        if (live) {
          next.profile = profileFromRow(blankMe, meRow ?? ({ industries: [], expertise: [] } as unknown as LiveProfileRow))
          if (myGoals.length) next.profile = { ...next.profile, goals: myGoals }
          if (doc['objectives'] === undefined) next.objectives = []
          if (doc['activity'] === undefined) next.activity = []
          if (doc['preferences'] === undefined) {
            next.preferences = { ...empty.preferences, title: next.profile.title, focus: next.profile.focus }
          }
        }
        const take = <K extends keyof Persisted>(key: K, value: Persisted[K] | undefined, filled: boolean) => {
          if (value !== undefined && filled) (next[key] as unknown) = value
        }
        take('connections', remote.connections, true)
        take('follows', remote.follows, true)
        take('saved', remote.saved, true)
        take('introStates', remote.introStates, true)
        take('learned', remote.learned, true)
        take('notes', remote.notes, true)
        take('ownPosts', remote.ownPosts, true)
        take('ownAsks', remote.ownAsks, true)
        take('askResponses', remote.askResponses, true)
        take('ownThreads', remote.ownThreads, true)
        take('sentMessages', remote.sentMessages, true)
        lastSynced.current = next
        return next
      })
      setSynced(true)
    })()
    return () => { cancelled = true }
  }, [])

  /* live messaging: new messages and conversations from other members arrive instantly */
  useEffect(() => {
    if (!live || !userId) return
    const refresh = () => { void loadLiveDirectory(userId).then(({ directory, failed, queryError: readErrors }) => { setQueryError(readErrors); if (!failed) { setFeedError(false); setDir(directory) } }) }
    const channel = supabase
      .channel(`dm-${userId}-${Math.random().toString(36).slice(2, 10)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, payload => {
        const m = payload.new as { id: string; thread_id: string; sender_id: string; text: string; created_at: string }
        if (m.sender_id === userId) return
        setDir(prev => {
          const thread = prev.threads.find(t => t.id === m.thread_id)
          if (!thread) { refresh(); return prev }
          if (thread.messages.some(x => x.id === m.id)) return prev
          const at = new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          return {
            ...prev,
            threads: [
              { ...thread, unread: true, messages: [...thread.messages, { id: m.id, from: 'them' as const, text: m.text, at }] },
              ...prev.threads.filter(t => t.id !== m.thread_id),
            ],
          }
        })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_threads' }, payload => {
        const t = payload.new as { created_by: string }
        if (t.created_by !== userId) refresh()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [live, userId])

  /* write-through: persist only what changed since the last database read */
  useEffect(() => {
    if (!userId || !synced) return
    const prev = lastSynced.current
    lastSynced.current = s
    if (!prev) return

    const relayKind = { connections: 'connection', follows: 'follow', saved: 'saved' } as const
    const groups = ['connections', 'follows', 'saved'] as const
    const follow = (group: typeof groups[number], id: string, on: boolean) => {
      const key = `follow:${relayKind[group]}:${id}`
      // A rollback already restored the private graph's previous state; nothing to mirror.
      if (suppressed.current.delete(key)) return
      // The follows_notify trigger (0026) tells the other member; clients cannot write notifications.
      void track({ key, kind: 'follow', label: `${on ? 'Saving' : 'Removing'} ${relayKind[group]}` },
        () => mirrorFollow(userId, id, relayKind[group], on),
        () => revertToggle(key, group, id, on),
        () => reapplyToggle(key, group, id, on))
    }
    for (const group of groups) {
      for (const id of s[group]) if (!prev[group].includes(id)) {
        saveRelationship(userId, group, id, true)
        if (live) follow(group, id, true)
      }
      for (const id of prev[group]) if (!s[group].includes(id)) {
        saveRelationship(userId, group, id, false)
        if (live) follow(group, id, false)
      }
    }
    for (const [memberId, status] of Object.entries(s.introStates)) {
      if (prev.introStates[memberId] !== status) {
        // The intro_requests_notify trigger (0026) notifies the target once, for every request path.
        saveIntro(userId, memberId, status)
      }
    }
    for (const learning of s.learned) {
      if (!prev.learned.some(l => l.id === learning.id)) saveLearning(userId, learning)
    }
    for (const note of s.notes) {
      if (!prev.notes.some(n => n.id === note.id)) saveNote(userId, note)
    }
    for (const post of s.ownPosts) {
      if (!prev.ownPosts.some(p => p.id === post.id)) savePost(userId, post)
    }
    for (const ask of s.ownAsks) {
      if (!prev.ownAsks.some(a => a.id === ask.id)) saveAsk(userId, ask)
    }
    for (const [askId, texts] of Object.entries(s.askResponses)) {
      const before = prev.askResponses[askId] ?? []
      texts.slice(before.length).forEach(text => saveAskResponse(userId, askId, text))
    }
    for (const thread of s.ownThreads) {
      if (prev.ownThreads.some(t => t.id === thread.id)) continue
      if (live) {
        const created = track({ key: `thread:${thread.id}`, kind: 'thread', label: 'Starting conversation' },
          () => createLiveThread(thread.id, userId, thread.memberId, thread.introContext))
        threadWrites.current.set(thread.id, created)
      } else saveThread(userId, thread)
    }
    for (const [threadId, messages] of Object.entries(s.sentMessages)) {
      const before = prev.sentMessages[threadId] ?? []
      messages.slice(before.length).forEach(message => {
        if (live) {
          // The dm_messages_notify trigger (0026) notifies the other participant.
          const send = async (): Promise<WriteResult> => {
            // The conversation row must exist first; a retry re-attempts a failed creation.
            const thread = threadWrites.current.get(threadId)
            if (thread && !(await thread).ok) {
              const retryThread = retries.current.get(`thread:${threadId}`)
              const again = retryThread ? retryThread() : thread
              threadWrites.current.set(threadId, again)
              const result = await again
              if (!result.ok) return { ok: false, error: `Conversation not created: ${result.error}` }
            }
            return sendLiveMessage(threadId, userId, message.text, message.id)
          }
          void track({ key: `msg:${message.id}`, kind: 'message', label: 'Message' }, send)
            .then(result => {
              if (!result.ok) return
              delivered.current.add(message.id)
              const peerId = [...dir.threads, ...s.ownThreads].find(t => t.id === threadId)?.memberId
              const peer = peerId ? dir.members.find(m => m.id === peerId) : undefined
              if (peerId) void ghostMessageSent(threadId, peerId, { name: peer?.name ?? '', title: peer?.title ?? '', company: peer?.company ?? '' })
            })
        } else saveMessage(userId, threadId, message)
      })
    }
    if (live) {
      const react = (list: 'likedPosts' | 'repostedPosts', kind: 'like' | 'repost', id: string, on: boolean) => {
        const key = `react:${kind}:${id}`
        if (suppressed.current.delete(key)) return
        void track({ key, kind: 'reaction', label: kind === 'like' ? 'Like' : 'Repost' },
          () => saveReaction(id, userId, kind, on),
          () => revertToggle(key, list, id, on),
          () => reapplyToggle(key, list, id, on))
      }
      for (const id of s.likedPosts) if (!prev.likedPosts.includes(id)) react('likedPosts', 'like', id, true)
      for (const id of prev.likedPosts) if (!s.likedPosts.includes(id)) react('likedPosts', 'like', id, false)
      for (const id of s.repostedPosts) if (!prev.repostedPosts.includes(id)) react('repostedPosts', 'repost', id, true)
      for (const id of prev.repostedPosts) if (!s.repostedPosts.includes(id)) react('repostedPosts', 'repost', id, false)
      for (const [postId, comments] of Object.entries(s.postComments)) {
        const before = prev.postComments[postId] ?? []
        comments.slice(before.length).forEach(comment => {
          void track({ key: `comment:${comment.id}`, kind: 'comment', label: 'Comment' }, () => saveComment(postId, userId, comment.text, comment.id))
        })
      }
    }
    if (DOC_KEYS.some(key => prev[key] !== s[key])) {
      const doc: Record<string, unknown> = {}
      for (const key of DOC_KEYS) doc[key] = s[key]
      // Goals live in member_goals; keep the private copy out of the saved document.
      if (s.profile.goals) { const { goals: _goals, ...profile } = s.profile; doc['profile'] = profile }
      saveDoc(userId, doc)
      if (prev.profile !== s.profile) {
        saveProfileFields(userId, {
          name: s.profile.name, initials: s.profile.initials, title: s.profile.title, company: s.profile.company,
          location: s.profile.location, focus: s.profile.focus, thesis: s.profile.thesis,
          looking_for: s.profile.lookingFor, can_help_with: s.profile.canHelpWith,
          want_to_meet: s.profile.wantToMeet ?? null, intro_preferences: s.profile.introPreferences ?? null,
          boundaries: s.profile.boundaries ?? null, availability: s.profile.availability,
          industries: s.profile.industries, expertise: s.profile.expertise,
          avatar_url: s.profile.avatarUrl ?? null,
          onboarded: s.profile.onboarded ?? false,
          what_i_do: s.profile.whatIDo ?? '', building: s.profile.building ?? '',
          open_to: s.profile.openTo ?? [], scheduling_enabled: s.profile.schedulingEnabled ?? false,
        })
      }
    }
  }, [s, userId, synced, live, dir])

  const api = useMemo<NetworkApi>(() => {
    const patch = (fn: (prev: Persisted) => Partial<Persisted>) => setS(prev => ({ ...prev, ...fn(prev) }))
    const baseMembers = dir.members
    const nameOf = (id: string) => baseMembers.find(m => m.id === id)?.name ?? 'a member'

    const remember = (prev: Persisted, l: Omit<Learning, 'id' | 'when'>): Learning[] =>
      [{ ...l, id: rowId(), when: 'Just now' }, ...prev.learned]
    const log = (prev: Persisted, a: Omit<Signal, 'id' | 'when'>): Signal[] =>
      [{ ...a, id: uid('act'), when: 'Just now' }, ...prev.activity]

    const threadFor = (prev: Persisted, memberId: string) => {
      const existing = [...dir.threads, ...prev.ownThreads].find(t => t.memberId === memberId)
      return existing?.id ?? null
    }

    /** Create a thread with a caller-supplied id so callers can return it synchronously. */
    const makeThread = (memberId: string, id: string, context?: string): Thread => {
      const m = baseMembers.find(x => x.id === memberId)
      return {
        id, memberId, unread: false,
        introContext: context ?? (m && m.bestPath.length > 2
          ? `Warm path through ${m.bestPath[1]} · ${m.focus}`
          : `Direct conversation you started · ${m?.focus ?? ''}`),
        commitment: 'No commitment recorded yet in this conversation.',
        suggested: m ? `${m.name.split(' ')[0]} — ${m.nextAction}` : 'Open with the reason this matters to both sides.',
        messages: [],
      }
    }

    const statusOf = (key: string): 'pending' | 'unsaved' | undefined => {
      const w = writes[key]
      return w ? (w.state === 'failed' ? 'unsaved' : 'pending') : undefined
    }
    /**
     * A message kept from an earlier session that the server copy does not contain and that
     * was not confirmed this session was never delivered — show it as unsaved, not sent.
     */
    const messageStatus = (thread: Thread, id: string) => {
      const tracked = statusOf(`msg:${id}`)
      if (tracked || !live || !userId) return tracked
      if (delivered.current.has(id) || thread.messages.some(m => m.id === id)) return undefined
      return synced ? 'unsaved' as const : undefined
    }
    return {
      synced,
      feedError,
      queryError,
      unsavedWrites: Object.values(writes),
      retryWrite: async key => {
        const retry = retries.current.get(key)
        if (retry) return (await retry()).ok
        // An unsaved message carried over from an earlier session: send it with its own id.
        if (key.startsWith('msg:') && live && userId) {
          const id = key.slice(4)
          const found = Object.entries(s.sentMessages).flatMap(([threadId, list]) => list.filter(m => m.id === id).map(m => ({ threadId, m })))[0]
          if (!found) return false
          const result = await track({ key, kind: 'message', label: 'Message' }, () => sendLiveMessage(found.threadId, userId, found.m.text, found.m.id))
          if (result.ok) delivered.current.add(id)
          return result.ok
        }
        return false
      },
      members: baseMembers.map(m => ({
        ...m,
        introState: s.introStates[m.id] ?? m.introState,
        saved: s.saved.includes(m.id),
        relationshipStatus: s.connections.includes(m.id) && m.relationshipStatus === 'new' ? 'active' : m.relationshipStatus,
      })),
      posts: byId([...s.ownPosts, ...dir.posts]),
      asks: byId([...s.ownAsks, ...dir.asks]).map(a => ({
        ...a, responses: a.responses + (s.askResponses[a.id]?.length ?? 0),
      })),
      threads: byId([...dir.threads, ...s.ownThreads]).map(t => ({
        ...t,
        messages: byId([...t.messages, ...(s.sentMessages[t.id] ?? []).map(m => {
          const status = messageStatus(t, m.id)
          return { id: m.id, from: 'me' as const, text: m.text, at: m.at, ...(status ? { status } : {}) }
        })]),
      })),
      learnings: [...s.learned, ...dir.learnings],
      activity: [...s.activity, ...dir.signals],
      notes: s.notes,
      objectives: s.objectives,
      profile: s.profile,
      digitalYou: s.digitalYou,
      autonomy: s.autonomy,
      preferences: s.preferences,
      homeLayout: normalizeHomeLayout(s.homeLayout),
      registeredEvents: s.registeredEvents,
      savedEvents: s.savedEvents,
      connections: s.connections,
      follows: s.follows,
      saved: s.saved,
      postResponses: s.postResponses,
      likedPosts: s.likedPosts,
      repostedPosts: s.repostedPosts,
      postComments: Object.keys(writes).some(k => k.startsWith('comment:'))
        ? Object.fromEntries(Object.entries(s.postComments).map(([postId, list]) => [postId, list.map(c => {
          const status = statusOf(`comment:${c.id}`)
          return status ? { ...c, status } : c
        })]))
        : s.postComments,
      feedPreferences: s.feedPreferences,
      askResponses: s.askResponses,
      warmPaths: s.warmPaths,

      connect: (id) => patch(prev => prev.connections.includes(id) ? {
        connections: prev.connections.filter(x => x !== id),
      } : {
        connections: [...prev.connections, id],
        learned: remember(prev, { category: 'People', text: `You connected with ${nameOf(id)}.`, source: 'Your action · Discover', confidence: 100, scope: 'shareable' }),
        activity: log(prev, { memberId: id, kind: 'New project', text: `${nameOf(id)} is now a direct connection in your graph.` }),
      }),

      follow: (id) => patch(prev => prev.follows.includes(id) ? {
        follows: prev.follows.filter(x => x !== id),
      } : {
        follows: [...prev.follows, id],
        learned: remember(prev, { category: 'Interests', text: `You are following ${nameOf(id)}'s professional activity.`, source: 'Your action', confidence: 100, scope: 'private' }),
      }),

      toggleSave: (id, label) => patch(prev => prev.saved.includes(id) ? { saved: prev.saved.filter(x => x !== id) } : {
        saved: [...prev.saved, id],
        learned: remember(prev, { category: 'Decisions', text: `You saved ${label ?? nameOf(id)} for follow-up.`, source: 'Your action', confidence: 100, scope: 'private' }),
      }),

      openThreadWith: (id) => {
        const existing = threadFor(s, id)
        if (existing) return existing
        const threadId = rowId()
        setS(prev => ({
          ...prev,
          ownThreads: [makeThread(id, threadId), ...prev.ownThreads],
          learned: remember(prev, { category: 'Messages', text: `You opened a direct conversation with ${nameOf(id)}.`, source: 'Messages', confidence: 100, scope: 'private' }),
        }))
        return threadId
      },

      sendMessage: (threadId, text) => patch(prev => {
        const thread = [...prev.ownThreads, ...dir.threads].find(t => t.id === threadId)
        const who = thread ? nameOf(thread.memberId) : 'a member'
        return {
          sentMessages: { ...prev.sentMessages, [threadId]: [...(prev.sentMessages[threadId] ?? []), { id: rowId(), text, at: clock() }] },
          learned: remember(prev, { category: 'Messages', text: `You sent ${who} a message: “${text.slice(0, 70)}${text.length > 70 ? '…' : ''}”`, source: 'Conversation', confidence: 99, scope: 'private' }),
        }
      }),

      requestIntro: (id) => patch(prev => ({
        introStates: { ...prev.introStates, [id]: 'requested' },
        learned: remember(prev, { category: 'Introductions', text: `You requested an introduction to ${nameOf(id)}. Waiting on their opt-in.`, source: 'Double opt-in request', confidence: 100, scope: 'shareable' }),
        activity: log(prev, { memberId: id, kind: 'Intro requested', text: `Introduction to ${nameOf(id)} requested — both sides must agree.` }),
      })),

      authorizeIntro: (id) => patch(prev => ({
        introStates: { ...prev.introStates, [id]: 'introduced' },
        learned: remember(prev, { category: 'Introductions', text: `${nameOf(id)} and you both opted in. The introduction is authorized.`, source: 'Double opt-in', confidence: 100, scope: 'shareable' }),
        activity: log(prev, { memberId: id, kind: 'Waiting on you', text: `Introduction to ${nameOf(id)} authorized — open the conversation.` }),
      })),

      declineIntro: (id) => patch(prev => ({
        introStates: { ...prev.introStates, [id]: 'closed' },
        learned: remember(prev, { category: 'Decisions', text: `You set the ${nameOf(id)} introduction to “not now”.`, source: 'Your action', confidence: 100, scope: 'private' }),
      })),

      withdrawIntro: (id) => patch(prev => {
        const { [id]: _withdrawn, ...introStates } = prev.introStates
        return {
          introStates,
          learned: remember(prev, { category: 'Decisions', text: `You withdrew your introduction request to ${nameOf(id)}.`, source: 'Your action', confidence: 100, scope: 'private' }),
        }
      }),

      addPost: (text, detail, media, visibility, kind = 'Insight', business) => patch(prev => ({
        ownPosts: [{ id: uid('post'), memberId: 'me', kind, text, detail: detail ?? 'Shared with your network.', when: 'Just now', responses: 0, media: media ?? [], visibility: visibility ?? 'network', ...(business ? { business } : {}) }, ...prev.ownPosts],
        learned: remember(prev, { category: 'Interests', text: business ? `You posted a ${kind}: “${text.slice(0, 80)}${text.length > 80 ? '…' : ''}”` : `You wrote in your Journal: “${text.slice(0, 80)}${text.length > 80 ? '…' : ''}”`, source: business ? 'Network feed' : 'Your Journal', confidence: 100, scope: visibility === 'private' ? 'private' : 'public' }),
        activity: log(prev, { memberId: 'me', kind: 'New project', text: business ? `You posted a ${kind} to the network.` : `You added a Journal entry.` }),
      })),

      respondToPost: (postId, memberId) => {
        if (memberId === 'me') return null
        const existing = threadFor(s, memberId)
        const threadId = existing ?? rowId()
        setS(prev => ({
          ...prev,
          ownThreads: existing ? prev.ownThreads : [makeThread(memberId, threadId), ...prev.ownThreads],
          postResponses: prev.postResponses.includes(postId) ? prev.postResponses : [...prev.postResponses, postId],
          learned: remember(prev, { category: 'Messages', text: `You responded to ${nameOf(memberId)}'s post.`, source: 'Network feed', confidence: 100, scope: 'private' }),
        }))
        return threadId
      },

      togglePostLike: (postId) => patch(prev => ({
        likedPosts: prev.likedPosts.includes(postId)
          ? prev.likedPosts.filter(id => id !== postId)
          : [...prev.likedPosts, postId],
      })),

      togglePostRepost: (postId, memberId) => patch(prev => {
        const reposted = prev.repostedPosts.includes(postId)
        return {
          repostedPosts: reposted ? prev.repostedPosts.filter(id => id !== postId) : [...prev.repostedPosts, postId],
          ...(!reposted ? {
            learned: remember(prev, { category: 'Interests', text: `You reposted ${nameOf(memberId)}'s professional update.`, source: 'Network feed', confidence: 100, scope: 'public' }),
            activity: log(prev, { memberId, kind: 'New project', text: `You shared ${nameOf(memberId)}'s update with your network.` }),
          } : {}),
        }
      }),

      addPostComment: (postId, text, memberId) => patch(prev => ({
        postComments: {
          ...prev.postComments,
          [postId]: [...(prev.postComments[postId] ?? []), { id: rowId(), text, when: 'Just now' }],
        },
        learned: remember(prev, { category: 'Interests', text: `You joined the discussion on ${nameOf(memberId)}'s post.`, source: 'Network feed', confidence: 100, scope: 'public' }),
      })),

      setFeedPreferences: (feedPreferences) => patch(() => ({ feedPreferences })),

      addAsk: (ask) => patch(prev => ({
        ownAsks: [{ ...ask, id: uid('ask'), memberId: 'me', posted: 'Just now', responses: 0, mine: true }, ...prev.ownAsks],
        learned: remember(prev, { category: 'Needs', text: `You posted a need: ${ask.ask}`, source: 'Needs marketplace', confidence: 100, scope: ask.visibility === 'private' ? 'private' : 'public' }),
        activity: log(prev, { memberId: 'me', kind: 'New need', text: `You posted a need to the network: ${ask.ask}` }),
      })),

      respondToAsk: (askId, text) => {
        const ask = [...s.ownAsks, ...dir.asks].find(a => a.id === askId)
        if (!ask || ask.memberId === 'me') return null
        const existing = threadFor(s, ask.memberId)
        const threadId = existing ?? rowId()
        setS(prev => ({
          ...prev,
          ownThreads: existing ? prev.ownThreads : [makeThread(ask.memberId, threadId, `You responded to their ask: ${ask.ask}`), ...prev.ownThreads],
          sentMessages: { ...prev.sentMessages, [threadId]: [...(prev.sentMessages[threadId] ?? []), { id: rowId(), text, at: clock() }] },
          askResponses: { ...prev.askResponses, [askId]: [...(prev.askResponses[askId] ?? []), text] },
          learned: remember(prev, { category: 'Needs', text: `You responded to ${nameOf(ask.memberId)}'s ask about ${ask.industry.toLowerCase()}.`, source: 'Needs marketplace', confidence: 100, scope: 'shareable' }),
          activity: log(prev, { memberId: ask.memberId, kind: 'Waiting on you', text: `You responded to ${nameOf(ask.memberId)}'s ask — awaiting their reply.` }),
        }))
        return threadId
      },

      requestWarmPath: (askId) => patch(prev => {
        const ask = [...prev.ownAsks, ...dir.asks].find(a => a.id === askId)
        if (!ask) return {}
        const m = baseMembers.find(x => x.id === ask.memberId)
        const via = m && m.bestPath.length > 2 ? m.bestPath[1] : m?.mutuals[0]
        return {
          warmPaths: prev.warmPaths.includes(askId) ? prev.warmPaths : [...prev.warmPaths, askId],
          introStates: { ...prev.introStates, [ask.memberId]: prev.introStates[ask.memberId] ?? 'requested' },
          learned: remember(prev, {
            category: 'Introductions',
            text: via ? `You asked ${via} for a warm path to ${nameOf(ask.memberId)}.` : `You asked the network for a warm path to ${nameOf(ask.memberId)}.`,
            source: 'Needs marketplace', confidence: 100, scope: 'shareable',
          }),
          activity: log(prev, { memberId: ask.memberId, kind: 'Intro requested', text: via ? `Warm path to ${nameOf(ask.memberId)} requested via ${via}.` : `Warm path to ${nameOf(ask.memberId)} requested.` }),
        }
      }),

      addObjective: (o) => patch(prev => ({
        objectives: [o, ...prev.objectives],
        learned: remember(prev, { category: 'Needs', text: `Active need recorded: ${o.title}`, source: 'Your need', confidence: 100, scope: 'private' }),
      })),

      addNote: (personId, text, scope) => patch(prev => ({
        notes: [{ id: rowId(), personId, text, scope, createdAt: now() }, ...prev.notes],
        learned: remember(prev, { category: 'People', text, source: `Private note · ${nameOf(personId)}`, confidence: 100, scope }),
      })),

      setDigitalYou: (x) => patch(() => ({ digitalYou: x })),
      setAutonomy: (x) => patch(() => ({ autonomy: x })),
      updateIdentity: async ({ name, photo }) => {
        const cleanName = name.trim().replace(/\s+/g, ' ')
        if (!cleanName) throw new Error('Enter your name.')
        let avatarUrl = s.profile.avatarUrl
        if (photo) {
          if (live && !userId) throw new Error('Sign in again, then save your profile.')
          avatarUrl = live
            ? await uploadProfileAvatar(userId!, photo)
            : await fileToDataUrl(photo)
        }
        patch(prev => ({
          profile: { ...prev.profile, name: cleanName, initials: identityInitials(cleanName), ...(avatarUrl ? { avatarUrl } : {}) },
          learned: remember(prev, { category: 'People', text: 'You corrected your profile identity.', source: 'Profile edit', confidence: 100, scope: 'private' }),
        }))
      },
      updateExecutiveProfile: async fields => {
        patch(prev => ({
          profile: { ...prev.profile, ...fields },
          learned: remember(prev, { category: 'People', text: 'You updated your executive identity and conversation preferences.', source: 'Executive Page', confidence: 100, scope: 'shareable' }),
        }))
      },
      setPreferences: (preferences) => patch(prev => ({
        preferences,
        profile: { ...prev.profile, title: preferences.title, focus: preferences.focus },
        learned: remember(prev, { category: 'Decisions', text: 'You updated how Intros may recommend, remember and share relationship context.', source: 'Preferences', confidence: 100, scope: 'private' }),
      })),
      setHomeLayout: (homeLayout) => patch(() => ({ homeLayout: normalizeHomeLayout(homeLayout) })),
      toggleEventRegistration: (id) => patch(prev => ({
        registeredEvents: prev.registeredEvents.includes(id) ? prev.registeredEvents.filter(item => item !== id) : [...prev.registeredEvents, id],
        learned: remember(prev, { category: 'Commitments', text: `${prev.registeredEvents.includes(id) ? 'Removed' : 'Registered for'} a professional event.`, source: 'Events', confidence: 100, scope: 'private' }),
      })),
      toggleEventSave: (id) => patch(prev => ({
        savedEvents: prev.savedEvents.includes(id) ? prev.savedEvents.filter(item => item !== id) : [...prev.savedEvents, id],
      })),

      completeOnboarding: (answers) => patch(prev => {
        const trim = (k: string) => answers[k]?.trim() ?? ''
        const profile: MeProfile = {
          ...prev.profile,
          onboarded: true,
          ...(trim('who') && { title: trim('who') }),
          ...(trim('focus') && { focus: trim('focus') }),
          ...(trim('need') && { lookingFor: trim('need') }),
          ...(trim('help') && { canHelpWith: trim('help') }),
          ...(trim('industries') && { industries: trim('industries').split(/[,·/]+/).map(x => x.trim()).filter(Boolean) }),
          ...(trim('where') && { location: trim('where') }),
          ...(trim('meet') && { wantToMeet: trim('meet') }),
          ...(trim('valuable') && { introPreferences: trim('valuable') }),
          ...(trim('never') && { boundaries: trim('never') }),
        }
        const map: Array<[string, Learning['category'], PrivacyScope, (v: string) => string]> = [
          ['who', 'People', 'public', v => `You describe yourself as: ${v}`],
          ['focus', 'Companies', 'public', v => `Your current focus: ${v}`],
          ['need', 'Needs', 'shareable', v => `Active need: ${v}`],
          ['help', 'Interests', 'public', v => `You can help others with: ${v}`],
          ['industries', 'Companies', 'public', v => `Industries you understand: ${v}`],
          ['where', 'People', 'public', v => `You are based in ${v}`],
          ['meet', 'Introductions', 'shareable', v => `You want to meet: ${v}`],
          ['valuable', 'Decisions', 'private', v => `Valuable intros for you: ${v}`],
          ['never', 'Commitments', 'private', v => `Boundary Intros must respect: ${v}`],
        ]
        const learned = map
          .filter(([k]) => trim(k))
          .map(([k, category, scope, text]): Learning => ({
            id: rowId(), category, scope, confidence: 100, when: 'Just now',
            source: 'Profile onboarding', text: text(trim(k)),
          }))
        const objectives = trim('need')
          ? [{
              id: uid('o'), title: trim('need'), outcome: trim('need'),
              target: trim('meet') || 'People who can move this outcome forward',
              whyNow: 'Stated during profile onboarding.',
              valueOffer: trim('help') || 'Your experience and network',
              success: 'A qualified next conversation', priority: 'high' as const,
            }, ...prev.objectives]
          : prev.objectives
        return {
          profile, objectives, learned: [...learned, ...prev.learned],
          activity: log(prev, { memberId: 'me', kind: 'New project', text: 'Your professional profile and Active Memory were created from onboarding.' }),
        }
      }),
    }
  }, [s, dir, synced, feedError, queryError, writes, live, userId])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useNetwork() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNetwork must be used inside NetworkProvider')
  return ctx
}
