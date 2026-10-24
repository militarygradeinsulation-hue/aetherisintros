// Offline only. Catalog JSON contains trusted DDL; never pass application rows or credentials.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { checkObservedSecurity } from './observed-security.mjs'
import { collisionTags, validatePending, reconciliationPlan } from './reconciliation-plan.mjs'
const require = createRequire(process.env.PGLITE_MODULE_ROOT ? resolve(process.env.PGLITE_MODULE_ROOT, 'package.json') : import.meta.url)
const { PGlite } = require('@electric-sql/pglite')
const { pg_trgm } = require(join(require.resolve('@electric-sql/pglite'), '../contrib/pg_trgm.cjs'))
const ident = value => '"' + String(value).replaceAll('"', '""') + '"'
const literal = value => "'" + String(value).replaceAll("'", "''") + "'"
const statement = value => value.trim().replace(/;+$/, '') + ';'
const roleName = value => value === 'PUBLIC' || value === 'public' ? 'PUBLIC' : ident(value)

export function catalogSteps(catalog) {
  if (!Array.isArray(catalog.column_grants)) throw new Error('Catalog must explicitly capture column_grants; recapture with catalog-export.sql')
  const steps = []
  const add = (phase, name, sql) => steps.push({ phase, name, sql })
  for (const e of catalog.enums) add('enum', e.name, `CREATE TYPE public.${ident(e.name)} AS ENUM (${e.labels.map(literal).join(',')});`)
  for (const t of catalog.tables) {
    if (t.reloptions?.length) throw new Error(`Unsupported table options: ${t.name}`)
    if (t.columns.some(c => c.generated || c.identity)) throw new Error(`Unsupported generated/identity column: ${t.name}`)
    add('table', t.name, `CREATE TABLE public.${ident(t.name)} (${t.columns.map(c => `${ident(c.name)} ${c.type}${c.not_null ? ' NOT NULL' : ''}`).join(',')});`)
  }
  for (const f of catalog.functions) add('definition', f.signature, statement(f.definition))
  for (const v of catalog.views) add('definition', v.name, `CREATE VIEW public.${ident(v.name)}${v.reloptions?.length ? ` WITH (${v.reloptions.join(',')})` : ''} AS ${statement(v.definition)}`)
  for (const t of catalog.tables) for (const c of t.columns) if (c.default != null) add('default', `${t.name}.${c.name}`, `ALTER TABLE public.${ident(t.name)} ALTER COLUMN ${ident(c.name)} SET DEFAULT ${c.default};`)
  // Unique keys must exist before referencing foreign keys.
  for (const c of [...catalog.constraints].sort((a,b) => Number(a.kind === 'f') - Number(b.kind === 'f'))) add('constraint', `${c.table_name}.${c.name}`, `ALTER TABLE public.${ident(c.table_name)} ADD CONSTRAINT ${ident(c.name)} ${c.definition};`)
  for (const i of catalog.indexes) add('index', i.name, statement(i.definition))
  for (const t of catalog.triggers) {
    if (!['O','D','R','A'].includes(t.enabled)) throw new Error(`Unknown trigger state: ${t.name}`)
    add('trigger', `${t.table_name}.${t.name}`, statement(t.definition) + (t.enabled === 'O' ? '' : ` ALTER TABLE public.${ident(t.table_name)} ${t.enabled === 'D' ? 'DISABLE' : t.enabled === 'R' ? 'ENABLE REPLICA' : 'ENABLE ALWAYS'} TRIGGER ${ident(t.name)};`))
  }
  for (const p of catalog.policies) add('policy', `${p.table_name}.${p.name}`, `CREATE POLICY ${ident(p.name)} ON public.${ident(p.table_name)} AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.map(roleName).join(',')}${p.qual ? ` USING (${p.qual})` : ''}${p.with_check ? ` WITH CHECK (${p.with_check})` : ''};`)
  for (const t of catalog.tables) add('rls', t.name, `ALTER TABLE public.${ident(t.name)} ${t.rls ? 'ENABLE' : 'DISABLE'} ROW LEVEL SECURITY; ALTER TABLE public.${ident(t.name)} ${t.force_rls ? 'FORCE' : 'NO FORCE'} ROW LEVEL SECURITY;`)
  const relationNames = [...catalog.tables, ...catalog.views].map(t => `public.${ident(t.name)}`)
  const acl = relationNames.length ? [`REVOKE ALL ON ${relationNames.join(',')} FROM PUBLIC,anon,authenticated,service_role;`] : []
  for (const g of catalog.relation_grants) acl.push(`GRANT ${g.privilege} ON public.${ident(g.table_name)} TO ${roleName(g.role)}${g.is_grantable ? ' WITH GRANT OPTION' : ''};`)
  for (const g of catalog.column_grants ?? []) acl.push(`GRANT ${g.privilege} (${ident(g.column_name)}) ON public.${ident(g.table_name)} TO ${roleName(g.role)}${g.is_grantable ? ' WITH GRANT OPTION' : ''};`)
  for (const f of catalog.functions.filter(f => f.kind === 'f')) acl.push(`REVOKE ALL ON FUNCTION public.${ident(f.name)}(${f.arguments}) FROM PUBLIC,anon,authenticated,service_role;`)
  for (const g of catalog.function_grants) acl.push(`GRANT ${g.privilege} ON FUNCTION ${g.signature} TO ${roleName(g.role)}${g.is_grantable ? ' WITH GRANT OPTION' : ''};`)
  add('acl', 'observed grants', acl.join('\n'))
  return steps
}

export function collisionStatus(existing, errorCode, error) {
  return error ? (errorCode === '42P07' && existing.some(name => error === `relation \"${name}\" already exists`) ? 'COLLISION' : 'FAIL') : 'PASS'
}

export async function probeCollision(db, tag, sql) {
  const created=[...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi)].map(m=>m[1])
  const existing=[]
  for(const name of created) if((await db.query('SELECT to_regclass($1) AS name',['public.'+name])).rows[0]?.name) existing.push(name)
  let error, errorCode
  await db.exec('BEGIN')
  try { await db.exec(sql) } catch(e) {error=e.message;errorCode=e.code} finally {await db.exec('ROLLBACK')}
  return {name:tag,existingTables:existing,status:collisionStatus(existing,errorCode,error),error,errorCode,sha256:createHash('sha256').update(sql).digest('hex')}
}

export async function replayCatalog({ catalog, repo, pending, security = false, ledger }) {
  const entries = JSON.parse(readFileSync(join(repo,'drizzle/migrations/meta/_journal.json'),'utf8')).entries
  validatePending(entries, pending)
  const ledgerPlan = ledger === undefined ? null : reconciliationPlan({repo, ledger, pending})
  if (ledgerPlan?.selected.some(m=>m.status !== 'PENDING')) throw Error('Supplied ledger does not confirm every selected migration is pending')
  const db = new PGlite({ extensions: { pg_trgm } })
  const report = { provenance: 'Observed public catalog + SYNTHETIC auth/storage/realtime shell; NOT a full live-schema clone', runtimeVerified: false, productionActivationAllowed: false, ledgerPlan, baselineComplete: false, catalogSha256:createHash('sha256').update(JSON.stringify(catalog)).digest('hex'), sourceContext:catalog.context??null, catalogCounts: Object.fromEntries(Object.entries(catalog).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length])), platformExtensions: catalog.extensions, steps: [], recovery: [], collisions: [] }
  const run = async step => {
    try { await db.exec('BEGIN'); await db.exec(step.sql); await db.exec('COMMIT'); return { ...step, sql: undefined, status: 'PASS' } }
    catch (e) { await db.exec('ROLLBACK'); return { phase: step.phase, name: step.name, status: 'FAIL', error: String(e.message) } }
  }
  try {
    report.engineVersion=(await db.query('SHOW server_version')).rows[0].server_version
    const platform = await run({ phase: 'platform', name: 'synthetic managed-service shell', sql: readFileSync(join(repo,'scripts/recovery/fixtures/platform.sql'),'utf8') })
    report.steps.push(platform)
    if (platform.status === 'FAIL') return report
    for (const extension of catalog.extensions.filter(e=>e.name==='pg_trgm')) report.steps.push(await run({phase:'extension',name:extension.name,sql:`CREATE EXTENSION IF NOT EXISTS ${ident(extension.name)} WITH SCHEMA ${ident(extension.schema)};`}))
    const all = catalogSteps(catalog)
    const roles = new Set([...catalog.relation_grants, ...catalog.column_grants, ...catalog.function_grants].map(g=>g.role).filter(r=>r !== 'PUBLIC' && r !== 'public'))
    for (const role of roles) if (!(await db.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rows.length) report.steps.push(await run({phase:'role',name:role,sql:`CREATE ROLE ${ident(role)};`}))
    for (const step of all.filter(s=>['enum','table'].includes(s.phase))) report.steps.push(await run(step))
    let unresolved = all.filter(s=>s.phase === 'definition')
    while (unresolved.length) {
      const failures = []
      let progress = 0
      for (const step of unresolved) { const r=await run(step); if(r.status === 'PASS') { report.steps.push(r);progress++ } else failures.push({step,result:r}) }
      if (!progress) { report.steps.push(...failures.map(f=>f.result));break }
      unresolved = failures.map(f=>f.step)
    }
    for (const step of all.filter(s=>!['enum','table','definition'].includes(s.phase))) report.steps.push(await run(step))
    report.baselineComplete = report.steps.every(s=>s.status === 'PASS')
    if (!report.baselineComplete) return report
    for (const tag of pending) {
      const sql=readFileSync(join(repo,'drizzle/migrations',tag+'.sql'),'utf8')
      const result=await run({phase:'recovery',name:tag,sql})
      report.recovery.push({...result,sha256:createHash('sha256').update(sql).digest('hex')})
      if(result.status === 'FAIL') return report
    }
    for (const tag of collisionTags) {
      // Probe separately and always roll back, including a successful statement.
      const sql=readFileSync(join(repo,'drizzle/migrations',tag+'.sql'),'utf8')
      report.collisions.push(await probeCollision(db,tag,sql))
    }
    if(security && report.collisions.every(s=>s.status!=='FAIL')) report.security=await checkObservedSecurity(db,repo)
    return report
  } finally { await db.close() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1]
  if(!args.includes('--catalog') || !args.includes('--pending') || !args.includes('--report')) throw Error('Required: --catalog structure.json --pending tags.json --report report.json [--repo path]')
  const report=await replayCatalog({catalog:JSON.parse(readFileSync(value('--catalog'),'utf8')),pending:JSON.parse(readFileSync(value('--pending'),'utf8')),repo:resolve(args.includes('--repo')?value('--repo'):'.'),security:args.includes('--security'),ledger:args.includes('--ledger')?JSON.parse(readFileSync(value('--ledger'),'utf8')):undefined})
  writeFileSync(value('--report'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({provenance:report.provenance,productionActivationAllowed:report.productionActivationAllowed,ledgerPlan:report.ledgerPlan,engineVersion:report.engineVersion,catalogSha256:report.catalogSha256,baselineComplete:report.baselineComplete,counts:report.catalogCounts,failures:report.steps.filter(s=>s.status==='FAIL'),recovery:report.recovery,collisions:report.collisions,security:report.security},null,2))
  if(!report.baselineComplete || report.recovery.some(s=>s.status==='FAIL') || report.security?.fail || report.collisions.some(c=>c.status==='FAIL') || report.ledgerPlan?.blockers.length) process.exitCode=2
}
