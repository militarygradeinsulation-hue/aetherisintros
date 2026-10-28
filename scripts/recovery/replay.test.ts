import { describe,it,expect } from 'vitest'
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { replay,dependencyRoot,journalFiles } from './replay'
const repo=process.cwd()
describe('offline recovery',()=>{
 it('replays the unchanged source baseline and all 21 recovery migrations',async()=>{
  const r=await replay({repo,from:58,to:78,collisions:true})
  expect(r.baselineComplete).toBe(true)
  const target=r.steps.filter(s=>s.phase==='target-replay')
  expect(target).toHaveLength(21)
  expect(target.every(s=>s.status==='PASS')).toBe(true)
  expect(target[0]?.migration).toContain('0058_')
  expect(target[20]?.migration).toContain('0078_')
  // Probe 0092 may execute successfully against this bounded baseline. Never
  // assume it fails on a relation the baseline already provides.
  const probe0092 = r.collisionChecks.find(c=>c.migration.startsWith('0092'))
  expect(probe0092).toBeDefined()
  expect(probe0092?.status, JSON.stringify(probe0092)).toBe('PASS')
  expect(probe0092?.existingTables).toEqual([])
 },120000)
 it('identifies missing dependency roots',()=>{
  expect(dependencyRoot('relation "public.meetings" does not exist')).toBe('public.meetings')
  expect(dependencyRoot('function public.has_role(uuid) does not exist')).toBeUndefined()
 })
 it('uses the journal order and does not invent a missing 0057 file',()=>{
  const files=journalFiles(repo)
  expect(files.filter(f=>Number(f.slice(0,4))<58)).toHaveLength(57)
  expect(files.some(f=>f.startsWith('0057'))).toBe(false)
 })
 it('supports supplied schema and rolled-back collision probes',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'recovery-schema-'))
  try {
   const schema=join(dir,'schema.sql')
   writeFileSync(schema,'CREATE TABLE public.business_lobby_windows(id uuid); CREATE TABLE public.professional_opportunity_saves(id uuid); CREATE TABLE public.member_tiers(id uuid);')
   const r=await replay({repo,schema,from:58,to:58,collisions:true})
   expect(r.baselineComplete).toBe(true)
   expect(r.provenance).toContain('NOT live-verified')
   expect(r.steps.find(s=>s.phase==='target-replay')?.status).toBe('FAIL')
   expect(r.collisionChecks.map(c=>c.status)).toEqual(['COLLISION','COLLISION','COLLISION'])
  } finally {rmSync(dir,{recursive:true,force:true})}
 },120000)
 it('stops after a failed supplied schema instead of reporting compatibility',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'recovery-broken-'))
  try {
   const schema=join(dir,'schema.sql');writeFileSync(schema,'CREATE TABLE nope(id missing_type);')
   const r=await replay({repo,schema,from:58,to:61,collisions:true})
   expect(r.baselineComplete).toBe(false)
   expect(r.steps.some(s=>s.phase==='target-replay')).toBe(false)
  } finally {rmSync(dir,{recursive:true,force:true})}
 },120000)
})
