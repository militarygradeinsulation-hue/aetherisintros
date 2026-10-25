import { EvidenceProvider } from '@/features/evidence-loop/EvidenceWorkspace'
import type { ReactNode } from 'react'

import { NetworkProvider, type NetworkMode } from './store'
import { PlatformProvider } from './platform'
import { OSProvider } from './os-store'
import { MoatProvider } from './moat-store'
import { ProProvider } from './pro-store'
import { OpsProvider } from './crm/store'
import { GraphProvider } from './graph-store'
import { CeoProvider } from './ceo-store'
import { setShowcaseMode } from './showcase'

/**
 * One authoritative state/provider tree for an Ask Intros session.
 *
 * Embedded surfaces must consume these contexts instead of mounting their own
 * providers. This keeps Supabase reads, realtime subscriptions and local state
 * consistent across the editorial shell, assistant and legacy workspaces.
 */
export function AetherisProviderRoot({
  children,
  mode = 'live',
}: {
  children: ReactNode
  mode?: NetworkMode
}) {
  // Preserve the existing runtime-mode contract while centralizing the write.
  setShowcaseMode(mode === 'demo')

  return (
    <NetworkProvider mode={mode}>
      <PlatformProvider>
        <OSProvider>
          <MoatProvider>
            <ProProvider>
              <OpsProvider>
                <GraphProvider>
                  <CeoProvider><EvidenceProvider live={mode === 'live'}>{children}</EvidenceProvider></CeoProvider>
                </GraphProvider>
              </OpsProvider>
            </ProProvider>
          </MoatProvider>
        </OSProvider>
      </PlatformProvider>
    </NetworkProvider>
  )
}

export default AetherisProviderRoot
