// Offline ONLY. Never reads database environment variables or opens network connections.
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { replay } from './replay'
const args=process.argv.slice(2)
const value=(key:string)=>{const i=args.indexOf(key);return i>=0?args[i+1]:undefined}
const repo=resolve(value('--repo') ?? args.find(a=>!a.startsWith('-') && a===args[0]) ?? '.')
const from=Number(value('--from') ?? 58), to=Number(value('--to') ?? 61)
if(!Number.isInteger(from)||!Number.isInteger(to)||from<58||to<from||to>78) throw new Error('Range must be within 0058–0078')
const schema=value('--schema'), fixture=value('--fixture')
if(!schema && !args.includes('--baseline')) throw new Error('Choose --baseline (synthetic repo replay) or --schema <schema-only.sql>')
const report=await replay({repo,schema,fixture,from,to,collisions:args.includes('--collisions')})
for(const step of report.steps) console.log(`${step.status}\t${step.phase}\t${step.migration}${step.error?`\t${step.error}`:''}`)
console.log(report.provenance, 'baselineComplete:',report.baselineComplete)
for(const c of report.collisionChecks) console.log(`${c.status}\tcollision-probe\t${c.migration}\t${c.error ?? ''}`)
const output=value('--report')
if(output) writeFileSync(output,JSON.stringify(report,null,2)+'\n')
if(!report.baselineComplete || report.steps.some(s=>s.status==='FAIL') || report.collisionChecks.some(c=>c.status!=='PASS')) process.exitCode=2
