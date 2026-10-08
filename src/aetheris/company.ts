/**
 * Company relationship continuity (shared-only). Members choose which relationships to
 * share with their company workspace; on departure the company keeps exactly those plus a
 * handover the leaver approved. Every rule is enforced server-side in drizzle/migrations/0024.
 */
import { supabase } from '@/integrations/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any

export type OrgRole = 'admin' | 'member'
export type Strength = 'acquainted' | 'working' | 'trusted'
export type Coverage = 'at_risk' | 'single_owner' | 'covered'

export interface Org { id: string; name: string; domain: string; role: OrgRole }
export interface RosterRow { userId: string; role: OrgRole; status: 'active' | 'departed'; joinedAt: string; departedAt: string | null }
export interface SharedRelationship {
  id: string; ownerId: string; contactMemberId: string | null; contactName: string; contactCompany: string
  strength: Strength; context: string; createdAt: string
}
export interface CoverageRow {
  contactKey: string; contactName: string; contactCompany: string; contactMemberId: string | null
  activeOwners: number; departedOwners: number; coverage: Coverage
}
export interface Handover { id: string; authorId: string; note: string; openLoops: string; approved: boolean; approvedAt: string | null }

export const strengthLabel: Record<Strength, string> = { acquainted: 'Acquainted', working: 'Working relationship', trusted: 'Trusted' }
export const coverageLabel: Record<Coverage, string> = {
  at_risk: 'No one here holds this now',
  single_owner: 'Held by one person',
  covered: 'Held by several people',
}

export interface CoverageSummary { total: number; atRisk: number; singleOwner: number; covered: number; headline: string }

/** One line a leader can act on: how much of the company's network depends on too few people. */
export function summariseCoverage(rows: Pick<CoverageRow, 'coverage'>[]): CoverageSummary {
  const atRisk = rows.filter(r => r.coverage === 'at_risk').length
  const singleOwner = rows.filter(r => r.coverage === 'single_owner').length
  const covered = rows.length - atRisk - singleOwner
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const depend = (n: number) => (n === 1 ? 'depends' : 'depend')
  const headline = !rows.length
    ? 'No relationships shared with the company yet.'
    : atRisk
      ? `${plural(atRisk, 'relationship')} no longer held by anyone here${singleOwner ? `, and ${singleOwner} more ${depend(singleOwner)} on one person` : ''}.`
      : singleOwner
        ? `${plural(singleOwner, 'relationship')} ${depend(singleOwner)} on one person.`
        : `Every shared relationship is held by more than one person.`
  return { total: rows.length, atRisk, singleOwner, covered, headline }
}

const err = (r: { error: { message: string } | null }) => r.error?.message ?? ''

export async function loadMyOrgs(userId: string): Promise<{ data: Org[]; error: string }> {
  const r = await db.from('org_members').select('org_id, role, status, organizations(id, name, domain)').eq('user_id', userId).eq('status', 'active')
  if (r.error) return { data: [], error: r.error.message }
  return { data: (r.data ?? []).filter((x: any) => x.organizations).map((x: any) => ({ id: x.organizations.id, name: x.organizations.name, domain: x.organizations.domain, role: x.role })), error: '' }
}

export async function loadWorkspace(orgId: string) {
  const [roster, shared, coverage] = await Promise.all([
    db.from('org_members').select('user_id, role, status, joined_at, departed_at').eq('org_id', orgId).order('joined_at'),
    db.from('org_shared_relationships').select('id, owner_id, contact_member_id, contact_name, contact_company, strength, context, created_at').eq('org_id', orgId).order('contact_name'),
    db.rpc('org_relationship_coverage', { p_org: orgId }),
  ])
  return {
    roster: (roster.data ?? []).map((x: any): RosterRow => ({ userId: x.user_id, role: x.role, status: x.status, joinedAt: x.joined_at, departedAt: x.departed_at })),
    shared: (shared.data ?? []).map((x: any): SharedRelationship => ({
      id: x.id, ownerId: x.owner_id, contactMemberId: x.contact_member_id, contactName: x.contact_name, contactCompany: x.contact_company,
      strength: x.strength, context: x.context, createdAt: x.created_at,
    })),
    coverage: (coverage.data ?? []).map((x: any): CoverageRow => ({
      contactKey: x.contact_key, contactName: x.contact_name, contactCompany: x.contact_company, contactMemberId: x.contact_member_id,
      activeOwners: x.active_owners, departedOwners: x.departed_owners, coverage: x.coverage,
    })),
    error: err(roster) || err(shared) || err(coverage),
  }
}

export async function createOrganization(name: string, domain: string) {
  const r = await db.rpc('create_organization', { p_name: name, p_domain: domain })
  return { id: (r.data as string | null) ?? null, error: err(r) }
}
export async function createInvite(orgId: string, maxUses: number) {
  const r = await db.rpc('create_org_invite', { p_org: orgId, p_max_uses: maxUses })
  return { code: (r.data as string | null) ?? null, error: err(r) }
}
export async function joinOrganization(code: string) {
  const r = await db.rpc('join_organization', { p_code: code })
  return { id: (r.data as string | null) ?? null, error: err(r) }
}
export async function recordDeparture(orgId: string, userId: string) {
  return { error: err(await db.rpc('record_org_departure', { p_org: orgId, p_user: userId })) }
}
export async function setRole(orgId: string, userId: string, role: OrgRole) {
  return { error: err(await db.rpc('set_org_role', { p_org: orgId, p_user: userId, p_role: role })) }
}

export async function shareRelationship(orgId: string, input: { contactMemberId?: string | null; contactName: string; contactCompany: string; strength: Strength; context: string }) {
  const r = await db.from('org_shared_relationships').insert({
    org_id: orgId, contact_member_id: input.contactMemberId ?? null, contact_name: input.contactName.trim(),
    contact_company: input.contactCompany.trim(), strength: input.strength, context: input.context.trim().slice(0, 1000),
  })
  return { error: err(r) }
}
export async function withdrawShare(id: string) {
  return { error: err(await db.from('org_shared_relationships').delete().eq('id', id)) }
}

export async function loadMyHandover(orgId: string, userId: string): Promise<Handover | null> {
  const r = await db.from('org_handovers').select('*').eq('org_id', orgId).eq('author_id', userId).maybeSingle()
  return r.data ? { id: r.data.id, authorId: r.data.author_id, note: r.data.note, openLoops: r.data.open_loops, approved: r.data.approved, approvedAt: r.data.approved_at } : null
}
export async function saveHandover(orgId: string, note: string, openLoops: string, approve: boolean) {
  const r = await db.from('org_handovers').upsert({ org_id: orgId, note, open_loops: openLoops, approved: approve }, { onConflict: 'org_id,author_id' })
  return { error: err(r) }
}
export async function loadApprovedHandovers(orgId: string): Promise<Handover[]> {
  const r = await db.from('org_handovers').select('*').eq('org_id', orgId).eq('approved', true).order('approved_at', { ascending: false })
  return (r.data ?? []).map((x: any) => ({ id: x.id, authorId: x.author_id, note: x.note, openLoops: x.open_loops, approved: true, approvedAt: x.approved_at }))
}
