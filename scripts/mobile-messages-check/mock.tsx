// Isolated browser fixtures. No real accounts, messages or service requests.
import { createContext, useContext, useState } from 'react'
const ids = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333']
const members = [
  {id:ids[0],name:'Alex Example',company:'Example Construction',title:'Owner'},
  {id:ids[1],name:'Blair Example',company:'Example Design',title:'Designer'},
  {id:ids[2],name:'Casey Example',company:'Example HVAC',title:'Installer'},
]
const thread = (index: number) => ({id:'44444444-4444-4444-8444-44444444444'+index,memberId:ids[index],messages:[{id:'msg-'+index,from:'them',text:'Example conversation '+index,at:'Today'}],unread:true})
const Context = createContext<any>(null)
export function FixtureNetwork({children}:any) {
 const [threads,setThreads] = useState(new URLSearchParams(location.search).has('empty') ? [] : [thread(0),thread(1)])
 const [status,setStatus] = useState('ready')
 const w=window as any
 w.setDirectoryStatus=setStatus
 w.sent ??= [];w.reads ??=[]
 return <Context.Provider value={{members:status==='ready'?members:[],threads,synced:status!=='loading',networkLoadError:status==='error'?'Unavailable':'',
  openThreadWith:(memberId:string)=>{const existing=threads.find(t=>t.memberId===memberId);if(existing)return existing.id; const id='draft-'+memberId;setThreads(current=>[{id,memberId,messages:[],unread:false},...current]);return id},
  sendMessage:async(threadId:string,text:string,id:string)=>{
   w.sent.push({threadId,text,id})
   if(w.deferSend)await new Promise(resolve=>{w.finishSend=resolve})
   if(w.failSend)throw Error('Example failed send')
   const canonical=threadId.startsWith('draft-')?'saved-'+threadId:threadId
   setThreads(current=>current.map(t=>t.id===threadId?{...t,id:canonical,messages:[...t.messages,{id,from:'me',text,at:'Now'}]}:t))
   return canonical
  }
 }}>{children}</Context.Provider>
}
export const useNetwork=()=>useContext(Context)
export const useUnreadCounts=()=>({loaded:false,threads:{}})
export const markThreadRead=async(id:string)=>{(window as any).reads.push(id)}
export const loadReadReceiptsSetting=async()=>true
export const saveReadReceiptsSetting=async()=>{}
export const AttachButton=()=> <button aria-label="Attach file">Attach</button>
export const MessageBody=({text}:any)=><p>{text}</p>
export const attachmentPreview=(text:string)=>text
export const OpenDealRoomButton=()=> <button>Deal room</button>
export const MeetingBriefPanel=()=> <p>Example brief</p>
export const StartWorkspaceButton=()=> <button>Workspace</button>
export const AvatarImage=()=>null
