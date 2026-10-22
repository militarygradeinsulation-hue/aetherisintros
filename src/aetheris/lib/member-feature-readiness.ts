import { checkConnection, type ConnectionCheck, type ConnectionResult, type ReadRpc } from './connection-preflight'

/** Reads return zero rows. They establish API availability for this account,
 * never certify another member's permissions or a complete write workflow. */
export const MEMBER_FEATURE_READS = [
  { id: 'private-library', label: 'Private Library workspaces', table: 'private_library_workspaces', columns: 'id,owner_id,name,is_default' },
  { id: 'library-imports', label: 'Reviewed library imports', table: 'private_library_import_batches', columns: 'id,workspace_id,owner_id,file_hash,status,imported_count,total_rows' },
  { id: 'track-record', label: 'Track Record entries', table: 'track_record_entries', columns: 'id,user_id,kind,title,verified,public' },
  { id: 'reputation', label: 'Derived reputation', table: 'reputation_scores', columns: 'user_id,score,response_rate,intro_success_rate,follow_through_rate,total_intros' },
  { id: 'storefront', label: 'Member Storefront', table: 'member_storefronts', columns: 'id,user_id,headline,services,seeking,intake_questions,is_public' },
  { id: 'proposals', label: 'Private Proposals', table: 'proposals', columns: 'id,from_user_id,to_user_id,storefront_id,subject,message,answers,status' },
  { id: 'deal-rooms', label: 'Deal Rooms', table: 'deal_rooms', columns: 'id,created_by,title,stage,owner_side,source_kind,source_id' },
  { id: 'workspaces', label: 'Private Deal Workspaces', table: 'deal_workspaces', columns: 'id,created_by,source_type,source_id,title,status,row_version,scope_version' },
  { id: 'meeting-briefs', label: 'Meeting briefs', table: 'meeting_briefs', columns: 'id,user_id,other_user_id,generated_at,their_background,summary' },
  { id: 'referrals', label: 'Warm referrals', table: 'referrals', columns: 'id,referrer_id,referred_id,referred_to_id,status,source_deal_room_id' },
  { id: 'diagnostics', label: 'Business diagnostics', table: 'business_diagnostics', columns: 'id,user_id,generated_at,model_used,lead_leaks,health_score,summary' },
  { id: 'syndication', label: 'Syndication Rooms', table: 'syndication_rooms', columns: 'id,created_by,title,room_type,status,opportunity_size,deadline' },
  { id: 'peer-groups', label: 'Peer Groups', table: 'peer_groups', columns: 'id,name,cadence,facilitator_id,max_size,created_by' },
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
