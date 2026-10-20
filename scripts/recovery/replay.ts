import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
export type Step = { migration:string; phase:string; status:'PASS'|'FAIL'; sha256:string; error?:string; dependencyRoot?:string }
export function dependencyRoot(message:string) {
  return message.match(/(?:relation|function|type|schema|column|role|extension) "([^"]+)" (?:does not exist|is not available)/i)?.[1]
}
export function journalFiles(repo:string):string[] {
  const journal = JSON.parse(readFileSync(join(repo,'drizzle/migrations/meta/_journal.json'),'utf8')) as {entries:{tag:string}[]}
  return journal.entries.map(e => `${e.tag}.sql`)
}
export async function replay(options:{repo:string;schema?:string;fixture?:string;from:number;to:number;collisions:boolean}) {
  const db = new PGlite({extensions:{pg_trgm}})
  const steps:Step[]=[]
  const collisionChecks:{migration:string;existingTables:string[];status:string;error?:string}[]=[]
  const execute = async(path:string,phase:string) => {
    const sql=readFileSync(path,'utf8')
    const step:Step={migration:path.replace(`${options.repo}/`,''),phase,status:'PASS',sha256:createHash('sha256').update(sql).digest('hex')}
    try {await db.exec('BEGIN');await db.exec(sql);await db.exec('COMMIT')}
    catch(e) {await db.exec('ROLLBACK');step.status='FAIL';step.error=e instanceof Error?e.message:String(e);step.dependencyRoot=dependencyRoot(step.error)}
    steps.push(step)
  }
  try {
    await execute(join(options.repo,'scripts/recovery/fixtures/platform.sql'),'platform-fixture')
    if(options.fixture) await execute(options.fixture,'supplied-synthetic-fixture')
    const files=journalFiles(options.repo)
    if(options.schema) {
      await execute(options.schema,'supplied-schema-only')
      if(steps.some(s=>s.status==='FAIL')) return {provenance:'supplied schema-only; NOT live-verified',baselineComplete:false,steps,collisionChecks}
    } else {
      for(const file of readdirSync(join(options.repo,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) await execute(join(options.repo,'supabase/migrations',file),'frozen-baseline')
      for(const file of files.filter(f=>Number(f.slice(0,4))<options.from)) await execute(join(options.repo,'drizzle/migrations',file),'repo-baseline')
    }
    const baselineComplete=steps.every(s=>s.status==='PASS')
    for(const file of files.filter(f=>Number(f.slice(0,4))>=options.from && Number(f.slice(0,4))<=options.to)) await execute(join(options.repo,'drizzle/migrations',file),'target-replay')
    if(options.collisions) for(const n of [82,90,92]) {
      const file=files.find(f=>Number(f.slice(0,4))===n)
      if(!file) continue
      const sql=readFileSync(join(options.repo,'drizzle/migrations',file),'utf8')
      const tables=[...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi)].map(m=>m[1])
      const existingTables:string[]=[]
      for(const table of tables) if((await db.query<{name:string|null}>('SELECT to_regclass($1) AS name',[`public.${table}`])).rows[0]?.name) existingTables.push(table)
      let error:string|undefined
      await db.exec('BEGIN')
      try {await db.exec(sql)} catch(e) {error=e instanceof Error?e.message:String(e)} finally {await db.exec('ROLLBACK')}
      collisionChecks.push({migration:file,existingTables,status:existingTables.length?'COLLISION':error?'FAIL':'PASS',error})
    }
    return {provenance:options.schema?'supplied schema-only; NOT live-verified':'SYNTHETIC version-controlled baseline; NOT live schema',baselineComplete,steps,collisionChecks}
  } finally {await db.close()}
}
