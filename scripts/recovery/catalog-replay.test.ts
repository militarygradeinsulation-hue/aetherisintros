import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { catalogSteps, collisionStatus, probeCollision, replayCatalog } from './catalog-replay.mjs'
const require = createRequire(process.env.PGLITE_MODULE_ROOT ? resolve(process.env.PGLITE_MODULE_ROOT, 'package.json') : import.meta.url)
const { PGlite } = require('@electric-sql/pglite')

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
    expect(collisionStatus(['existing'], '42P07', 'relation \"existing\" already exists')).toBe('COLLISION')
    expect(collisionStatus(['existing'], '42703', 'missing column')).toBe('FAIL')
    expect(collisionStatus(['existing'], '42P07', 'relation \"unrelated_index\" already exists')).toBe('FAIL')
    expect(collisionStatus([], '42P07', 'unexpected duplicate relation')).toBe('FAIL')
    expect(collisionStatus(['existing'], undefined, undefined)).toBe('PASS')
  })

  it('refuses unsupported column semantics instead of silently stripping them', () => {
    const c: any = emptyCatalog()
    c.tables = [{ name: 'calculated', columns: [{ name: 'id', type: 'integer', generated: 's', identity: '' }] }]
    expect(()=>catalogSteps(c)).toThrow('Unsupported generated/identity')
  })

  it('rolls back successful and failed collision probes, including preceding DML and grants', async () => {
    const db = new PGlite()
    try {
      await db.exec('CREATE ROLE anon; CREATE TABLE public.existing(id integer); INSERT INTO public.existing VALUES (7);')
      const prefix = 'UPDATE public.existing SET id=99; GRANT SELECT ON public.existing TO anon; CREATE TABLE public.probe_side_effect(id integer);'
      const collision = await probeCollision(db, 'synthetic-collision', prefix + 'CREATE TABLE public.existing(id integer);')
      expect(collision.status).toBe('COLLISION')
      expect(collision.sha256).toMatch(/^[a-f0-9]{64}$/)
      const failure = await probeCollision(db, 'unrelated-failure', prefix + 'SELECT missing_column FROM public.existing; CREATE TABLE public.existing(id integer);')
      expect(failure.status).toBe('FAIL')
      expect(failure.errorCode).toBe('42703')
      expect((await probeCollision(db, 'success', prefix)).status).toBe('PASS')
      const { rows } = await db.query("SELECT id, to_regclass('public.probe_side_effect') AS side_effect, has_table_privilege('anon','public.existing','SELECT') AS granted FROM public.existing")
      expect(rows).toEqual([{ id: 7, side_effect: null, granted: false }])
    } finally { await db.close() }
  }, 30000)

  it('preserves two-member RLS, column permissions and revoked RPC execution when rebuilding ACLs', async () => {
    const db = new PGlite()
    try {
      await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`)
      const c: any = emptyCatalog()
      c.tables = [{ name: 'private_notes', columns: [{ name: 'owner_id', type: 'uuid', not_null: true }, { name: 'note', type: 'text' }, { name: 'secret', type: 'text' }], rls: true, force_rls: false }]
      c.policies = [{ name: 'owner only', table_name: 'private_notes', permissive: 'PERMISSIVE', cmd: 'ALL', roles: ['authenticated'], qual: 'owner_id = auth.uid()', with_check: 'owner_id = auth.uid()' }]
      c.column_grants = ['owner_id', 'note'].map(column_name => ({ table_name: 'private_notes', column_name, role: 'authenticated', privilege: 'SELECT', is_grantable: false }))
      c.column_grants.push({ table_name: 'private_notes', column_name: 'note', role: 'authenticated', privilege: 'UPDATE', is_grantable: false })
      c.functions = [{ kind: 'f', name: 'read_my_secret', arguments: '', signature: 'public.read_my_secret()', definition: 'CREATE FUNCTION public.read_my_secret() RETURNS SETOF text LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT secret FROM public.private_notes WHERE owner_id=auth.uid() $$;' }]
      c.function_grants = [{ signature: 'public.read_my_secret()', role: 'authenticated', privilege: 'EXECUTE', is_grantable: false }]
      for (const step of catalogSteps(c)) await db.exec(step.sql)
      const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b'
      await db.query('INSERT INTO public.private_notes VALUES ($1,$2,$3),($4,$5,$6)', [A, 'A note', 'A secret', B, 'B note', 'B secret'])
      await db.exec('SET ROLE authenticated')
      for (const [uid, note, secret] of [[A, 'A note', 'A secret'], [B, 'B note', 'B secret']]) {
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid])
        expect((await db.query('SELECT note FROM public.private_notes')).rows).toEqual([{ note }])
        expect((await db.query('SELECT * FROM public.read_my_secret()')).rows).toEqual([{ read_my_secret: secret }])
        await expect(db.query('SELECT secret FROM public.private_notes')).rejects.toThrow(/permission denied/)
        await expect(db.query('UPDATE public.private_notes SET owner_id=$1', [uid])).rejects.toThrow(/permission denied/)
        expect((await db.query('UPDATE public.private_notes SET note=$1 WHERE owner_id<>$2 RETURNING note', ['forged', uid])).rows).toEqual([])
      }
      await db.exec('RESET ROLE; SET ROLE anon')
      await expect(db.query('SELECT * FROM public.read_my_secret()')).rejects.toThrow(/permission denied/)
      await expect(db.query('SELECT note FROM public.private_notes')).rejects.toThrow(/permission denied/)
      await db.exec('RESET ROLE')
      expect((await db.query('SELECT note FROM public.private_notes ORDER BY note')).rows).toEqual([{ note: 'A note' }, { note: 'B note' }])
    } finally { await db.close() }
  }, 30000)

  it('stops collision and security work after the first failed recovery migration', async () => {
    const report = await replayCatalog({ catalog: emptyCatalog(), repo, pending: ['0058_deal_rooms', '0059_deal_room_idempotency'], security: true })
    expect(report.baselineComplete).toBe(true)
    expect(report.recovery).toHaveLength(1)
    expect(report.recovery[0].status).toBe('FAIL')
    expect(report.collisions).toEqual([])
    expect(report.security).toBeUndefined()
    expect(report.productionActivationAllowed).toBe(false)
  }, 30000)

  it('refuses invalid order and ledger-confirmed applied targets before loading any DDL', async () => {
    const tag = '0058_deal_rooms'
    const hash = createHash('sha256').update(readFileSync(resolve(repo, 'drizzle/migrations', tag + '.sql'))).digest('hex')
    await expect(replayCatalog({ catalog: null, repo, pending: [tag], ledger: [{ id: 1, hash, created_at: 1 }] })).rejects.toThrow('does not confirm')
    await expect(replayCatalog({ catalog: null, repo, pending: ['0059_deal_room_idempotency', tag] })).rejects.toThrow('journal order')
    await expect(replayCatalog({ catalog: null, repo, pending: ['0062_business_posts'] })).rejects.toThrow('already recorded')
  })
})
