/** Public entry links only select existing views; they never grant access. */
export const MEMBER_WORKSPACE_IDS = [
  'hr', 'benchmarks', 'settlements', 'capacity',
  'crm', 'needs', 'opportunities', 'deals', 'calendar', 'peergroups', 'workspaces',
  'referrals', 'companies', 'providers', 'pocket', 'profile', 'preferences',
  'diagnostic', 'executivework', 'events', 'memory', 'circles', 'grid',
  'business-lobby', 'opportunity-exchange', 'membership', 'membership-upgrade',
  'marketplace-pilot', 'passport', 'briefing', 'capital', 'expertise', 'talent',
  'intelrooms', 'knowledgeassets', 'vault', 'integrations', 'consent', 'outcomes',
] as const

export type MemberWorkspace = typeof MEMBER_WORKSPACE_IDS[number]
export function isMemberWorkspace(value: unknown): value is MemberWorkspace {
  return typeof value === 'string' && (MEMBER_WORKSPACE_IDS as readonly string[]).includes(value)
}
