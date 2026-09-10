import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AutonomyLevel, DigitalYouProfile, Objective, PrivacyScope } from './types'
import { defaultDigitalYou, objectives as seedObjectives } from './data'
import {
  learnings as catalogueLearnings, me as seedMe, members as catalogueMembers,
  networkAsks as catalogueAsks, posts as cataloguePosts, signals as catalogueSignals,
  threads as catalogueThreads,
  type IntroState, type Learning, type Member, type NetworkAsk, type Post, type Signal, type Thread,
} from './social'
import {
  currentUserId, loadDirectory, loadUserGraph, saveAsk, saveAskResponse, saveDoc, saveIntro,
  saveLearning, saveMessage, saveNote, savePost, saveProfileFields, saveRelationship, saveThread,
  type Directory, type MemoryNote,
} from './db'

export type { MemoryNote }
export type MeProfile = typeof seedMe & {
  wantToMeet?: string
  introPreferences?: string
  boundaries?: string
  onboarded?: boolean
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

interface Persisted {
  connections: string[]
  follows: string[]
  saved: string[]
  introStates: Record<string, IntroState>
  ownPosts: Post[]
  postResponses: string[]
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
  registeredEvents: string[]
  savedEvents: string[]
}

const KEY = 'aetheris-intros-graph-v1'

/** Settings that live in the member's preferences document rather than a table. */
const DOC_KEYS = [
  'objectives', 'profile', 'digitalYou', 'autonomy', 'preferences',
  'registeredEvents', 'savedEvents', 'warmPaths', 'postResponses', 'activity',
] as const

const empty: Persisted = {
  connections: [], follows: [], saved: [], introStates: {}, ownPosts: [], postResponses: [],
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
  registeredEvents: [], savedEvents: [],
}

function load(): Persisted {
  if (typeof window === 'undefined') return empty
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...empty, ...(JSON.parse(raw) as Partial<Persisted>) }
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
const rowId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`)

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
  registeredEvents: string[]
  savedEvents: string[]
  connections: string[]
  follows: string[]
  saved: string[]
  postResponses: string[]
  askResponses: Record<string, string[]>
  warmPaths: string[]
  /** True once this member's own graph has been read from the database. */
  synced: boolean
  /* graph actions */
  connect: (id: string) => void
  follow: (id: string) => void
  toggleSave: (id: string, label?: string) => void
  openThreadWith: (id: string) => string
  sendMessage: (threadId: string, text: string) => void
  requestIntro: (id: string) => void
  authorizeIntro: (id: string) => void
  declineIntro: (id: string) => void
  addPost: (text: string, detail?: string) => void
  respondToPost: (postId: string, memberId: string) => string | null
  addAsk: (ask: Omit<NetworkAsk, 'id' | 'posted' | 'responses' | 'memberId' | 'mine'>) => void
  respondToAsk: (askId: string, text: string) => string | null
  requestWarmPath: (askId: string) => void
  addObjective: (o: Objective) => void
  addNote: (personId: string, text: string, scope: PrivacyScope) => void
  setDigitalYou: (x: DigitalYouProfile) => void
  setAutonomy: (x: AutonomyLevel) => void
  completeOnboarding: (answers: Record<string, string>) => void
  setPreferences: (settings: PreferenceSettings) => void
  toggleEventRegistration: (id: string) => void
  toggleEventSave: (id: string) => void
}

const Ctx = createContext<NetworkApi | null>(null)

const catalogue: Directory = {
  members: catalogueMembers, posts: cataloguePosts, asks: catalogueAsks,
  signals: catalogueSignals, threads: catalogueThreads, learnings: catalogueLearnings,
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Persisted>(load)
  const [dir, setDir] = useState<Directory>(catalogue)
  const [userId, setUserId] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const lastSynced = useRef<Persisted | null>(null)

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage full */ } }, [s])

  /* hydrate: shared catalogue, then this member's own graph */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const directory = await loadDirectory()
      if (!cancelled) setDir(directory)
      const id = await currentUserId()
      if (cancelled || !id) { setSynced(true); return }
      setUserId(id)
      const remote = await loadUserGraph(id)
      if (cancelled) return
      setS(prev => {
        const doc = (remote.doc ?? {}) as Partial<Persisted>
        const next: Persisted = { ...prev }
        for (const key of DOC_KEYS) {
          if (doc[key] !== undefined) (next[key] as unknown) = doc[key]
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

  /* write-through: persist only what changed since the last database read */
  useEffect(() => {
    if (!userId || !synced) return
    const prev = lastSynced.current
    lastSynced.current = s
    if (!prev) return

    const groups = ['connections', 'follows', 'saved'] as const
    for (const group of groups) {
      for (const id of s[group]) if (!prev[group].includes(id)) saveRelationship(userId, group, id, true)
      for (const id of prev[group]) if (!s[group].includes(id)) saveRelationship(userId, group, id, false)
    }
    for (const [memberId, status] of Object.entries(s.introStates)) {
      if (prev.introStates[memberId] !== status) saveIntro(userId, memberId, status)
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
      if (!prev.ownThreads.some(t => t.id === thread.id)) saveThread(userId, thread)
    }
    for (const [threadId, messages] of Object.entries(s.sentMessages)) {
      const before = prev.sentMessages[threadId] ?? []
      messages.slice(before.length).forEach(message => saveMessage(userId, threadId, message))
    }
    if (DOC_KEYS.some(key => prev[key] !== s[key])) {
      const doc: Record<string, unknown> = {}
      for (const key of DOC_KEYS) doc[key] = s[key]
      saveDoc(userId, doc)
      if (prev.profile !== s.profile) {
        saveProfileFields(userId, {
          name: s.profile.name, title: s.profile.title, company: s.profile.company,
          location: s.profile.location, focus: s.profile.focus, thesis: s.profile.thesis,
          looking_for: s.profile.lookingFor, can_help_with: s.profile.canHelpWith,
          want_to_meet: s.profile.wantToMeet ?? null, intro_preferences: s.profile.introPreferences ?? null,
          boundaries: s.profile.boundaries ?? null, availability: s.profile.availability,
          industries: s.profile.industries, expertise: s.profile.expertise,
          onboarded: s.profile.onboarded ?? false,
        })
      }
    }
  }, [s, userId, synced])

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

    return {
      synced,
      members: baseMembers.map(m => ({
        ...m,
        introState: s.introStates[m.id] ?? m.introState,
        saved: s.saved.includes(m.id),
        relationshipStatus: s.connections.includes(m.id) && m.relationshipStatus === 'new' ? 'active' : m.relationshipStatus,
      })),
      posts: [...s.ownPosts, ...dir.posts],
      asks: [...s.ownAsks, ...dir.asks].map(a => ({
        ...a, responses: a.responses + (s.askResponses[a.id]?.length ?? 0),
      })),
      threads: [...s.ownThreads, ...dir.threads].map(t => ({
        ...t,
        messages: [...t.messages, ...(s.sentMessages[t.id] ?? []).map(m => ({ id: m.id, from: 'me' as const, text: m.text, at: m.at }))],
      })),
      learnings: [...s.learned, ...dir.learnings],
      activity: [...s.activity, ...dir.signals],
      notes: s.notes,
      objectives: s.objectives,
      profile: s.profile,
      digitalYou: s.digitalYou,
      autonomy: s.autonomy,
      preferences: s.preferences,
      registeredEvents: s.registeredEvents,
      savedEvents: s.savedEvents,
      connections: s.connections,
      follows: s.follows,
      saved: s.saved,
      postResponses: s.postResponses,
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

      addPost: (text, detail) => patch(prev => ({
        ownPosts: [{ id: uid('post'), memberId: 'me', kind: 'Insight', text, detail: detail ?? 'Shared with your network.', when: 'Just now', responses: 0 }, ...prev.ownPosts],
        learned: remember(prev, { category: 'Interests', text: `You shared with the network: “${text.slice(0, 80)}${text.length > 80 ? '…' : ''}”`, source: 'Your post', confidence: 100, scope: 'public' }),
        activity: log(prev, { memberId: 'me', kind: 'New project', text: `You posted an update to your network.` }),
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
      setPreferences: (preferences) => patch(prev => ({
        preferences,
        profile: { ...prev.profile, title: preferences.title, focus: preferences.focus },
        learned: remember(prev, { category: 'Decisions', text: 'You updated how Intros may recommend, remember and share relationship context.', source: 'Preferences', confidence: 100, scope: 'private' }),
      })),
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
  }, [s, dir, synced])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useNetwork() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNetwork must be used inside NetworkProvider')
  return ctx
}
