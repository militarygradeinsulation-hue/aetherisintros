// Synthetic identities only, inside the already-disposable catalog replay database.
// Never replace the observed membership helpers to make a test pass.
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
export async function checkObservedSecurity(db, repo) {
  const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b',C='00000000-0000-4000-8000-00000000000c',ADMIN='00000000-0000-4000-8000-0000000000ad'
  const report={pass:0,fail:0,checks:[],setupError:null,membershipHelperOverridden:false}
  let inSuite=false
  const as=async(uid,sql,params=[])=>{
    await db.exec('RESET ROLE')
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[uid??'',JSON.stringify(uid?{sub:uid,role:'authenticated'}:{role:'anon'})])
    await db.exec(`SET ROLE ${uid?'authenticated':'anon'}`)
    if(inSuite) await db.exec('SAVEPOINT actor_query')
    try {const rows=(await db.query(sql,params)).rows;if(inSuite) await db.exec('RELEASE SAVEPOINT actor_query');return {rows}}
    catch(e){if(inSuite) await db.exec('ROLLBACK TO SAVEPOINT actor_query; RELEASE SAVEPOINT actor_query');return {error:e.message}}
    finally{await db.exec('RESET ROLE')}
  }
  const svc=async sql=>{
    await db.exec('RESET ROLE')
    await db.query("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})])
    if(inSuite) await db.exec('SAVEPOINT service_query')
    try {const rows=(await db.query(sql)).rows;if(inSuite) await db.exec('RELEASE SAVEPOINT service_query');return rows}
    catch(e){if(inSuite) await db.exec('ROLLBACK TO SAVEPOINT service_query; RELEASE SAVEPOINT service_query');throw e}
  }
  const ok=(condition,name)=>{report[condition?'pass':'fail']++;report.checks.push({name,status:condition?'PASS':'FAIL'})}
  try {
    for(const [id,name] of [[A,'Synthetic A'],[B,'Synthetic B'],[C,'Synthetic C'],[ADMIN,'Synthetic Admin']]) {
      await svc(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${id}','${id}@test.invalid',now())`)
      await svc(`INSERT INTO public.profiles(id,name,onboarded,visibility) VALUES('${id}','${name}',true,'network')`)
      await svc(`INSERT INTO public.early_access_members(user_id,email,status) VALUES('${id}','${id}@test.invalid','approved') ON CONFLICT(user_id) DO UPDATE SET status='approved'`)
    }
    await svc(`INSERT INTO public.user_roles(user_id,role) VALUES('${ADMIN}','admin') ON CONFLICT DO NOTHING`)
    await svc(`INSERT INTO public.intro_requests(id,user_id,member_id,target_user_id,member_opt_in,accepted_at,status,reason) VALUES('11111111-1111-4111-8111-111111111111','${C}','${B}','${B}',true,now(),'accepted','Synthetic accepted introduction')`)
    await svc(`INSERT INTO public.intro_requests(id,user_id,member_id,reason) VALUES('22222222-2222-4222-8222-222222222222','${C}','${A}','Synthetic pending introduction')`)
    await svc(`INSERT INTO public.asks(id,author_id,ask) VALUES('ask-old','${A}','Looking for a CFO')`)
    await svc(`INSERT INTO public.ask_responses(ask_id,user_id,text) VALUES('ask-old','${B}','Synthetic response')`)
    for(const uid of [A,B,C,ADMIN]) ok((await as(uid,'SELECT public.is_live_member() AS live')).rows?.[0]?.live===true,'observed membership gate accepts confirmed/onboarded fixture '+uid.slice(-2))
  }catch(e){report.setupError=e.message;report.fail++;return report}
  for(const suite of ['private-library','deal-workspaces','deal-rooms','zz-basic-executive']) {
    await db.exec('BEGIN');inSuite=true
    try {await (await import(pathToFileURL(join(repo,'scripts/migration-checks',suite+'.check.mjs')).href)).default({db,as,svc,ok,A,B,C,ADMIN})}
    catch(e){report.fail++;report.checks.push({name:suite,status:'FAIL',error:e.message})}
    finally {await db.exec('RESET ROLE; ROLLBACK');inSuite=false}
  }
  return report
}
