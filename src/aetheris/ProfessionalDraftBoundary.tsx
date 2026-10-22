import type { ReactNode } from 'react'
import { isShowcase } from './showcase'
import { CurrentUserTrackRecord } from './CurrentUserTrackRecord'
import './professional-drafts.css'

/** Legacy professional planners are account drafts, not a second member network.
 * Keep existing records readable while real consent and collaboration use the
 * canonical server-backed modules. This boundary is removed only after a remote
 * adapter with the corresponding permissions is activated.
 */
const PRIVATE_PLANNERS = new Set([
  'passport', 'capital', 'expertise', 'talent', 'intelrooms', 'presence',
  'permission', 'vault', 'knowledgeassets',
])

export function ProfessionalDraftBoundary({ page, onNavigate, children }: {
  page: string
  onNavigate: (page: string) => void
  children: ReactNode
}) {
  if (isShowcase() || !PRIVATE_PLANNERS.has(page)) return <>{children}</>
  return <section className="professional-draft-boundary" aria-label="Private professional drafts">
    <div className="professional-draft-notice" role="status">
      <h2>Private planning records</h2>
      <p>Your existing drafts are preserved. These planners do not publish to other members, send invitations, record another person's consent, or verify credentials.</p>
      <p>Use the member tools for shared work. Each tool reports unavailable services; saved planner records remain available for review below.</p>
      <nav aria-label="Member workflow alternatives">
        <button type="button" onClick={() => onNavigate('executivework')}>Storefront, proposals & track record</button>
        <button type="button" onClick={() => onNavigate('workspaces')}>Private deal workspaces</button>
        <button type="button" onClick={() => onNavigate('peergroups')}>Peer groups</button>
        <button type="button" onClick={() => onNavigate('pocket')}>Private library & blueprints</button>
        <button type="button" onClick={() => onNavigate('providers')}>Trusted providers</button>
      </nav>
    </div>
    {page === 'passport' && <CurrentUserTrackRecord />}
    <details className="professional-draft-review">
      <summary>Review preserved planner records (read only)</summary>
      <fieldset disabled onClickCapture={event => { event.preventDefault(); event.stopPropagation() }}>
        <legend>Private drafts — shared actions are unavailable in this planner</legend>
        {children}
      </fieldset>
    </details>
  </section>
}
