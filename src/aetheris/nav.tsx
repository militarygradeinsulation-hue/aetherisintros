import { createContext, useContext } from 'react'
import type { Member } from './social'

export type Page =
  | 'home' | 'discover' | 'intros' | 'messages' | 'needs' | 'memory' | 'insights' | 'profile'
  | 'systems' | 'circles' | 'companies' | 'outcomes' | 'loops' | 'organization'

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
}

export const NavCtx = createContext<NavApi | null>(null)

export function useNav() {
  const ctx = useContext(NavCtx)
  if (!ctx) throw new Error('useNav must be used inside the Intros shell')
  return ctx
}
