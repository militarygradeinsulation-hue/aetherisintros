import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { catalogSteps, collisionStatus, replayCatalog } from './catalog-replay.mjs'

const emptyCatalog = () => ({ enums: [], tables: [], functions: [], views: [], constraints: [], indexes: [], triggers: [], policies: [], relation_grants: [], column_grants: [], function_grants: [], extensions: [] })
const repo = resolve(import.meta.dirname, '../..')

describe('observed catalog recovery rehearsal', () => {
  it('preserves quoted names, restrictive policies and disabled trigger state', () => {
    const c: any = emptyCatalog()
    c.enums = [{ name: 'example"kind', labels: ["can't", 'ordinary'] }]
    c.policies = [{ name: 'only mine', table_name: 'items', permissive: 'RESTRICTIVE', cmd: 'SELECT', roles: ['authenticated'], qual: 'owner_id = auth.uid()', with_check: null }]
    c.triggers = [{ name: 'blocked', table_name: 'items', definition: 'CREATE TRIGGER blocked BEFORE INSERT ON public.items FOR EACH ROW EXECUTE FUNCTION public.check_item()', enabled: 'D' }]
    c.column_grants = [{table_name: 'items', column_name: 'member\"note', role: 'authenticated', privilege: 'UPDATE', is_grantable: true}]
    const steps = catalogSteps(c)
    expect(steps.find(s=>s.phase==='acl')?.sql).toContain('GRANT UPDATE (\"member\"\"note\") ON public.\"items\" TO \"authenticated\" WITH GRANT OPTION;')
    expect(steps.find(s=>s.phase==='enum')?.sql).toContain('"example""kind"')
    expect(steps.find(s=>s.phase==='enum')?.sql).toContain("'can''t'")
    expect(steps.find(s=>s.phase==='policy')?.sql).toContain('AS RESTRICTIVE FOR SELECT TO "authenticated" USING (owner_id = auth.uid())')
    expect(steps.find(s=>s.phase==='trigger')?.sql).toContain('DISABLE TRIGGER "blocked"')
  })

  it('loads a view before retrying a SQL function that depends on it', async () => {
    const c: any = emptyCatalog()
    c.tables = [{ name: 'sample', columns: [{ name: 'id', type: 'uuid', not_null: true, default: 'gen_random_uuid()', identity: '', generated: '' }], rls: true, force_rls: false }]
    c.views = [{ name: 'sample_view', definition: 'SELECT id FROM public.sample', reloptions: ['security_invoker=true'] }]
    c.functions = [{ kind: 'f', name: 'read_sample', arguments: '', signature: 'read_sample()', definition: 'CREATE FUNCTION public.read_sample() RETURNS SETOF uuid LANGUAGE sql AS $$ SELECT id FROM public.sample_view $$;' }]
    c.relation_grants = [{ table_name: 'sample', role: 'authenticated', privilege: 'SELECT', is_grantable: false }]
    c.function_grants = [{ signature: 'read_sample()', role: 'authenticated', privilege: 'EXECUTE', is_grantable: false }]
    const report = await replayCatalog({ catalog: c, repo, pending: [] })
    expect(report.baselineComplete, JSON.stringify(report.steps.filter(s=>s.status==='FAIL'))).toBe(true)
    expect(report.runtimeVerified).toBe(false)
    expect(report.steps.filter(s=>s.phase==='definition')).toHaveLength(2)
  })

  it('blocks recovery and collision probes after an incomplete observed baseline', async () => {
    const c: any = emptyCatalog()
    c.tables = [{ name: 'broken', columns: [{ name: 'id', type: 'definitely_missing_type', generated: '', identity: '' }], rls: true, force_rls: false }]
    const report = await replayCatalog({ catalog: c, repo, pending: ['0058_deal_rooms'] })
    expect(report.baselineComplete).toBe(false)
    expect(report.recovery).toEqual([])
    expect(report.collisions).toEqual([])
    expect(report.steps.some(s=>s.status==='FAIL')).toBe(true)
  })

  it('requires explicit column ACL provenance and preserves unrelated probe failures', () => {
    const c: any = emptyCatalog(); delete c.column_grants
    expect(()=>catalogSteps(c)).toThrow('explicitly capture column_grants')
    expect(collisionStatus(['existing'], '42P07', 'duplicate relation')).toBe('COLLISION')
    expect(collisionStatus(['existing'], '42703', 'missing column')).toBe('FAIL')
    expect(collisionStatus([], '42P07', 'unexpected duplicate relation')).toBe('FAIL')
    expect(collisionStatus(['existing'], undefined, undefined)).toBe('PASS')
  })

  it('refuses unsupported column semantics instead of silently stripping them', () => {
    const c: any = emptyCatalog()
    c.tables = [{ name: 'calculated', columns: [{ name: 'id', type: 'integer', generated: 's', identity: '' }] }]
    expect(()=>catalogSteps(c)).toThrow('Unsupported generated/identity')
  })
})
