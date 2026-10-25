import { createFileRoute } from '@tanstack/react-router'
import { useEffect,useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { loadMeetings, type Meeting } from '@/aetheris/meetings'
import { MeetingRoom, MeetingNotesPanel } from '@/aetheris/meetings-ui'
import { NetworkProvider } from '@/aetheris/store'
import '@/aetheris/styles.css'
export const Route=createFileRoute('/meet')({
 ssr:false,staticData:{sitemap:false},
 head:()=>({meta:[{title:'Join a meeting | Ask Intros'},{name:'robots',content:'noindex,nofollow'},{name:'referrer',content:'no-referrer'}]}),
 component:JoinMeeting,
})
function JoinMeeting(){
 const [meeting,setMeeting]=useState<Meeting|null>(null),[userId,setUserId]=useState(''),[ended,setEnded]=useState(false)
 const [code,setCode]=useState(()=>new URLSearchParams(location.search).get('code')??''),[signedIn,setSignedIn]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('')
 useEffect(()=>{void supabase.auth.getSession().then(r=>{setSignedIn(!!r.data.session);setUserId(r.data.session?.user.id??'')});const {data}=supabase.auth.onAuthStateChange((_event,session)=>{setSignedIn(!!session);setUserId(session?.user.id??'');setMeeting(null)});return()=>data.subscription.unsubscribe()},[])
 const join=async()=>{setBusy(true);try{const r=await (supabase as any).rpc('redeem_meeting_invite',{p_code:code});if(r.error){setMsg(r.error.message);return}const records=await loadMeetings();const found=records.data.find(m=>m.id===r.data);if(!found){setMsg(records.error||'The meeting could not be loaded.');return}setMeeting(found);setEnded(false)}catch{setMsg('Could not join. Check your connection and try again.')}finally{setBusy(false)}}
 const next='/meet?code='+encodeURIComponent(code)
 if(meeting&&signedIn&&userId)return <NetworkProvider mode="live">{ended?<MeetingNotesPanel meeting={meeting} userId={userId} onClose={()=>setMeeting(null)} onSaved={()=>{}}/>:<MeetingRoom meeting={meeting} userId={userId} onBack={()=>setMeeting(null)} onLeave={()=>setEnded(true)}/>}</NetworkProvider>
 return <main className="meetings" style={{maxWidth:620,margin:'60px auto',padding:24}}><h1>Join a meeting</h1><p>A host invitation lets you join from outside their network. Sign in to protect the meeting and identify each speaker.</p><label>Meeting code<input autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} maxLength={80}/></label>{signedIn?<button type="button" disabled={busy||!code.trim()} onClick={()=>void join()}>{busy?'Joining…':'Continue to meeting'}</button>:<><a className="btn primary" href={'/auth?next='+encodeURIComponent(next)}>Sign in to join</a><a className="btn" href={'/auth?mode=signup&next='+encodeURIComponent(next)}>Create an account</a></>}<p>Before entering, choose whether your microphone audio may be saved, transcribed and analyzed by Butler. Meeting codes expire and can be revoked by the host.</p>{msg&&<p role="alert">{msg}</p>}</main>
}
