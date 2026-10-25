import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthContract } from './auth-gate'
import { createRateLimiter } from '@/aetheris/linkedin-import'
import { boundedBody } from './public-fetch.server'
const allow=createRateLimiter(30,60_000)
export const transcribeButlerAudio=createServerFn({method:'POST'}).middleware([requireAuthContract])
.inputValidator(z.object({audio:z.string().min(1).max(2800000).regex(/^[A-Za-z0-9+/]*={0,2}$/),mimeType:z.enum(['audio/webm','audio/mp4','audio/ogg'])}))
.handler(async({data,context})=>{
 if(!allow(context.userId))throw new Error('Voice is receiving too many clips. Wait a minute and retry.')
 const key=process.env['LOVABLE_API_KEY']
 if(!key)throw new Error('Server voice transcription is not configured. Browser dictation can be retried or you can type.')
 const bytes=Uint8Array.from(atob(data.audio),c=>c.charCodeAt(0))
 if(bytes.length>2*1024*1024)throw new Error('Voice clip is too large. Please use a shorter phrase.')
 const form=new FormData();form.append('file',new Blob([bytes],{type:data.mimeType}),'voice.'+data.mimeType.split('/')[1]);form.append('model','openai/gpt-4o-transcribe');form.append('response_format','json')
 const r=await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions',{method:'POST',headers:{authorization:'Bearer '+key,'Lovable-API-Key':key,'X-Lovable-AIG-SDK':'fetch'},body:form,signal:AbortSignal.timeout(30000)})
 if(!r.ok){await r.body?.cancel().catch(()=>{});throw new Error(r.status===429?'Voice transcription is busy. Please retry shortly.':'Voice transcription is unavailable. Retry or type your message.')}
 const parsed=JSON.parse(new TextDecoder().decode(await boundedBody(r,32000))) as {text?:string}
 return {text:typeof parsed.text==='string'?parsed.text.trim().slice(0,8000):''}
})
