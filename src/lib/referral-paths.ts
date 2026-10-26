/**
 * Referential proof for a warm referral. Matching display names is never
 * enough: the signed-in member must know the connector AND that connector
 * must have an observed 'connection' edge to the proposed target.
 */
export interface ReferralMember {
  id: string
  name: string
  title?: string | null
  company?: string | null
}
export interface ReferralConnectionEdge {
  follower_id: string
  followee_id: string
}
export interface SuggestedPath {
  target_name: string
  connector_name: string
}

export function verifiedReferralPath(
  suggestion: SuggestedPath,
  myConnections: readonly ReferralMember[],
  possibleTargets: readonly ReferralMember[],
  observedConnections: readonly ReferralConnectionEdge[],
): { connector: ReferralMember; target: ReferralMember } | null {
  const norm = (text: string) => text.normalize('NFKC').trim().toLowerCase()
  const connectors = myConnections.filter(member => norm(member.name) === norm(suggestion.connector_name))
  const targets = possibleTargets.filter(member => norm(member.name) === norm(suggestion.target_name))
  // Names alone can be ambiguous across two accounts. Never guess an identity.
  if (connectors.length !== 1 || targets.length !== 1) return null
  const connector = connectors[0]!
  const target = targets[0]!
  if (connector.id === target.id) return null
  if (!observedConnections.some(edge =>
    edge.follower_id === connector.id && edge.followee_id === target.id
  )) return null
  return { connector, target }
}
