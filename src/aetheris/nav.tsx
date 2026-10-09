import { createContext, useContext } from 'react'
import type { Member } from './social'

export type Page =
  | 'home' | 'network' | 'work' | 'messages' | 'me' | 'discover' | 'intros' | 'needs' | 'memory' | 'insights' | 'profile'
  | 'calendar' | 'systems' | 'circles' | 'companies' | 'outcomes' | 'loops' | 'organization' | 'events' | 'preferences'
  | 'inbox' | 'rooms' | 'collisions' | 'simulation' | 'strategy' | 'evidence' | 'autopilot'
  | 'ask' | 'constitution' | 'serendipity' | 'eventmode' | 'gaps' | 'identity' | 'consent'
  | 'timemachine' | 'attribution' | 'knowledge' | 'boards' | 'integrations'
  | 'directory' | 'passport' | 'opportunities' | 'dealrooms' | 'expertise' | 'talent' | 'capital'
  | 'intelrooms' | 'presence' | 'permission' | 'briefing' | 'vault' | 'knowledgeassets' | 'simple'
  | 'crm' | 'grid' | 'news' | 'pocket' | 'diagnostic' | 'meetings' | 'peergroups'

/** Navigation intents any surface can trigger. */
export interface NavApi {
  setPage: (p: Page) => void
  openMember: (m: Member) => void
  openIntro: (m: Member) => void
  messageMember: (memberId: string) => void
  goToThread: (threadId: string) => void
  postNeed: () => void
  openSystem: (systemId: string) => void
  openCircle: (circleId: string) => void
  openCompany: (companyId: string) => void
  openHandshake: (memberId: string) => void
  openIntent: (memberId?: string) => void
  openRoom: (roomId: string) => void
  captureConversation: () => void
}

export const NavCtx = createContext<NavApi | null>(null)

export function useNav() {
  const ctx = useContext(NavCtx)
  if (!ctx) throw new Error('useNav must be used inside the Intros shell')
  return ctx
}
