import { useEffect,useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Meeting } from './meetings'
const bucket=()=>supabase.storage.from('meeting-audio')
export async function saveMeetingAudio(meetingId:string,userId:string,blob:Blob,mimeType:string){
 const ext=mimeType.startsWith('audio/mp4')?'mp4':mimeType.startsWith('audio/ogg')?'ogg':'webm'
 const path=meetingId+'/'+userId+'/'+Date.now()+'_'+crypto.randomUUID()+'.'+ext
 const r=await bucket().upload(path,blob,{contentType:mimeType.split(';')[0]!,upsert:false})
 if(r.error)throw new Error('Audio could not be saved: '+r.error.message)
 return path
}
export function MeetingAudio({meeting}:{meeting:Meeting}){
 const [clips,setClips]=useState<Array<{path:string;name:string}>>([]),[msg,setMsg]=useState(''),[playing,setPlaying]=useState('')
 useEffect(()=>{let stale=false;void(async()=>{const all:Array<{path:string;name:string}>=[];try{for(const p of meeting.participants){let offset=0;for(;;){const r=await bucket().list(meeting.id+'/'+p.userId,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(r.error)throw r.error;for(const f of r.data??[])all.push({path:meeting.id+'/'+p.userId+'/'+f.name,name:p.name+' · '+new Date(Number(f.name.split('_')[0])).toLocaleTimeString()});if((r.data?.length??0)<100)break;offset+=100;if(offset>=3000)break}}if(!stale)setClips(all.sort((a,b)=>a.path.split('/').pop()!.localeCompare(b.path.split('/').pop()!)))}catch{if(!stale)setMsg('Saved audio could not be loaded.')}})();return()=>{stale=true}},[meeting])
 const play=async(path:string)=>{const r=await bucket().createSignedUrl(path,60);if(r.error)setMsg(r.error.message);else setPlaying(r.data.signedUrl)}
 return <details><summary>Saved microphone recordings ({clips.length} clips)</summary><p>Audio from consenting speakers. Video is not stored. Silent clips are omitted.</p>{playing&&<audio src={playing} controls autoPlay/>}<div style={{maxHeight:220,overflow:'auto'}}>{clips.map(c=><button type="button" key={c.path} onClick={()=>void play(c.path)}>{c.name}</button>)}</div>{msg&&<p role="alert">{msg}</p>}</details>
}
