import { checkConnection, type ConnectionCheck, type ConnectionResult, type ReadRpc } from './connection-preflight'

/** Reads return zero rows. They establish API availability for this account,
 * never certify another member's permissions or a complete write workflow. */
export const MEMBER_FEATURE_READS = [
  { id: 'private-library', label: 'Private Library workspaces', table: 'private_library_workspaces' },
  { id: 'library-imports', label: 'Reviewed library imports', table: 'private_library_import_batches' },
  { id: 'track-record', label: 'Track Record entries', table: 'track_record_entries' },
  { id: 'storefront', label: 'Member Storefront', table: 'member_storefronts' },
  { id: 'proposals', label: 'Private Proposals', table: 'proposals' },
  { id: 'deal-rooms', label: 'Deal Rooms', table: 'deal_rooms' },
  { id: 'workspaces', label: 'Private Deal Workspaces', table: 'deal_workspaces' },
  { id: 'meeting-briefs', label: 'Meeting briefs', table: 'meeting_briefs' },
  { id: 'referrals', label: 'Warm referrals', table: 'referrals' },
  { id: 'diagnostics', label: 'Business diagnostics', table: 'business_diagnostics' },
  { id: 'syndication', label: 'Syndication Rooms', table: 'syndication_rooms' },
  { id: 'peer-groups', label: 'Peer Groups', table: 'peer_groups' },
] as const

export async function checkMemberFeatures(read: ReadRpc, signal?: AbortSignal): Promise<ConnectionResult[]> {
  return Promise.all(MEMBER_FEATURE_READS.map(item => {
    const check: ConnectionCheck = {
      id: item.id, label: item.label, rpc: item.table,
      validate: data => { if (!Array.isArray(data) || data.length !== 0) throw new Error('Expected a zero-row read') },
    }
    return checkConnection(check, read, signal)
  }))
}
