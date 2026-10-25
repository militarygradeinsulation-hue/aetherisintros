import type {EvidenceState} from '../../src/features/evidence-loop/model'
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002'
let account=A,listener:Function=()=>{},counter=1
const states=new Map<string,EvidenceState>()
function state(id:string){if(!states.has(id))states.set(id,{userId:id,storageReady:!new URLSearchParams(location.search).has('unavailable'),preferences:{timing:false,ranking:false,newcomer:false},records:[],vouches:[],newcomerUntil:new Date(Date.now()+86400000).toISOString()});return states.get(id)!}
export const supabase={auth:{onAuthStateChange:(fn:Function)=>{listener=fn;return {data:{subscription:{unsubscribe(){listener=()=>{}}}}}},getSession:async()=>({data:{session:{user:{id:account}}}})}}
export async function loadEvidence(){return structuredClone(state(account))}
export async function saveEvidence({data}:{data:any}){
 const id=account,s=state(id)
 if((window as any).failSave)throw Error('Example save failure. Your task was not completed.')
 if((window as any).deferSave)await new Promise<void>(r=>(window as any).releaseSave=r)
 if(data.action==='preferences')s.preferences={timing:data.timing,ranking:data.ranking,newcomer:data.newcomer}
 if(data.action==='start')s.records.unshift({id:`20000000-0000-4000-8000-${String(counter++).padStart(12,'0')}`,task:data.task,started_at:new Date().toISOString(),finished_at:null,active_seconds:0,baseline_seconds:data.baselineSeconds,baseline_kind:data.baselineKind,baseline_samples:data.baselineSamples})
 if(data.action==='finish'){const r=s.records.find(r=>r.id===data.id)!;r.finished_at=new Date().toISOString();r.active_seconds=data.activeSeconds}
 if(data.action==='delete')s.records=s.records.filter(r=>r.id!==data.id)
 if(data.action==='erase')s.records=[]
 if(!s.preferences.timing)s.records=s.records.filter(r=>r.finished_at)
 return structuredClone(s)
}
;(window as any).changeAccount=()=>{account=account===A?B:A;listener('SIGNED_IN',{user:{id:account}})}
