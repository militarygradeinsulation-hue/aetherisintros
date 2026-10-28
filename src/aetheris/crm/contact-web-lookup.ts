/** Source-grounded professional web contact suggestions; no guessing or automatic writes. */
import { isSafeSourceUrl } from '../public-info'

export type WebContactField = 'email' | 'phone' | 'title'
export const WEB_CONTACT_FIELDS: readonly WebContactField[] = ['email','phone','title']
export interface ContactLookupIdentity { name:string; company:string; location:string }
export interface ContactLookupSource { url:string; title:string; text:string }
export interface ContactLookupSuggestion {
  field: WebContactField; value:string; quote:string; sourceUrl:string; sourceTitle:string; checkedAt:string
}
export type ContactLookupResult =
  | { status:'ok'; suggestions:ContactLookupSuggestion[]; sourcesConsidered:number }
  | { status:'none'|'unavailable'|'needs_context'; reason:string; suggestions:[] }

const tidy=(text:string)=>text.replace(/[\p{Cc}<>]/gu,' ').replace(/\s+/g,' ').trim()
const lower=(text:string)=>tidy(text).toLocaleLowerCase('en-US')
const regexEscape=(text:string)=>text.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')
const EMAIL=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const PHONE=/(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{4}/g
const PERSONAL=new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','proton.me','protonmail.com'])
export function contactLookupIdentity(name:unknown,company:unknown,location:unknown):ContactLookupIdentity|null {
  const n=typeof name==='string'?tidy(name).slice(0,120):''
  const c=typeof company==='string'?tidy(company).slice(0,130):''
  const l=typeof location==='string'?tidy(location).slice(0,120):''
  if(n.length<5||n.split(' ').length<2||(!c&&!l))return null
  return {name:n,company:c,location:l}
}
export function contactLookupQueries(person:ContactLookupIdentity):string[] {
  const context=person.company||person.location
  return [
    '"'+person.name+'" "'+context+'" professional contact email phone title',
    '"'+person.name+'" "'+context+'" leadership team email phone',
  ].map(query=>query.slice(0,280))
}
export function identityWindows(source:ContactLookupSource,person:ContactLookupIdentity):string[] {
  if(!isSafeSourceUrl(source.url))return []
  const text=tidy(source.text).slice(0,12000),str=lower(text),name=lower(person.name),key=lower(person.company||person.location)
  if(!key||!name)return []
  const windows:string[]=[]
  let at=str.indexOf(name)
  while(at>=0&&windows.length<5){
    const context=text.slice(Math.max(0,at-175),Math.min(text.length,at+name.length+235))
    if(lower(context).includes(key))windows.push(text.slice(Math.max(0,at-110),Math.min(text.length,at+name.length+330)))
    at=str.indexOf(name,at+name.length)
  }
  return windows
}
export function validContactValue(field:WebContactField,value:string):boolean {
  const v=tidy(value)
  if(field==='email')return v.length<=254&&/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v)&&!PERSONAL.has(v.split('@')[1]!.toLowerCase())
  if(field==='phone'){PHONE.lastIndex=0;const n=v.replace(/\D/g,'');return n.length>=10&&n.length<=15&&PHONE.test(v)}
  return v.length>=3&&v.length<=140&&!/^(?:unknown|n\/a|contact|employee|staff)$/i.test(v)
}
export function quoteGrounded(quote:string,value:string,source:ContactLookupSource,person:ContactLookupIdentity):boolean {
  const q=lower(quote),v=lower(value),name=lower(person.name)
  if(!q||!v||!q.includes(v)||!lower(source.text).includes(q))return false
  return identityWindows(source,person).some(windowText=>{
    const window=lower(windowText)
    return window.includes(q)&&Math.abs(window.indexOf(v)-window.indexOf(name))<=220
  })
}
function add(field:WebContactField,value:string,quote:string,source:ContactLookupSource,person:ContactLookupIdentity,time:string):ContactLookupSuggestion|null {
  if(!validContactValue(field,value)||!quoteGrounded(quote,value,source,person))return null
  return {field,value:tidy(value),quote:tidy(quote),sourceUrl:source.url,sourceTitle:tidy(source.title).slice(0,200),checkedAt:time}
}
function excerpt(text:string,index:number,len:number):string {
  return tidy(text.slice(Math.max(0,index-105),Math.min(text.length,index+len+105))).slice(0,440)
}
/** Conservative fallback extraction from published snippets/pages; title uses explicit role-at-company pattern only. */
export function extractContactQuotes(sources:readonly ContactLookupSource[],person:ContactLookupIdentity,missing:readonly WebContactField[],time:string):ContactLookupSuggestion[] {
  const out:ContactLookupSuggestion[]=[],found=new Set<WebContactField>()
  for(const source of sources)for(const window of identityWindows(source,person)){
    const nameAt=lower(window).indexOf(lower(person.name))
    if(missing.includes('email')&&!found.has('email'))for(const match of window.matchAll(EMAIL)){
      if(Math.abs((match.index??0)-nameAt)>210)continue
      const proposed=add('email',match[0],excerpt(window,match.index??0,match[0].length),source,person,time)
      if(proposed){out.push(proposed);found.add('email');break}
    }
    if(missing.includes('phone')&&!found.has('phone'))for(const match of window.matchAll(PHONE)){
      if(Math.abs((match.index??0)-nameAt)>210)continue
      const quote=excerpt(window,match.index??0,match[0].length)
      if(!/\b(phone|call|mobile|office|tel|contact|direct)\b/i.test(quote))continue
      const proposed=add('phone',match[0],quote,source,person,time)
      if(proposed){out.push(proposed);found.add('phone');break}
    }
    if(missing.includes('title')&&!found.has('title')&&person.company){
      const pattern=new RegExp(regexEscape(person.name)+'\\s*[,\\u2014\\u2013\\-\\u00b7|:]\\s*([A-Za-z][A-Za-z0-9& /().\\-]{2,95}?)\\s+(?:at|of|for)\\s+'+regexEscape(person.company),'i')
      const match=pattern.exec(window)
      if(match?.[1]){
        const proposed=add('title',match[1].trim(),excerpt(window,match.index,match[0].length),source,person,time)
        if(proposed){out.push(proposed);found.add('title')}
      }
    }
    if(found.size===missing.length)return out
  }
  return out
}
/** LLM suggestions survive only when the quote and value are verbatim in an identity-matched page. */
export function groundContactQuotes(answer:string,sources:readonly ContactLookupSource[],person:ContactLookupIdentity,missing:readonly WebContactField[],time:string):ContactLookupSuggestion[] {
  const json=answer.match(/\{[\s\S]*\}/)?.[0]
  if(!json)return []
  let parsed:unknown
  try{parsed=JSON.parse(json)}catch{return []}
  const values=parsed&&typeof parsed==='object'?(parsed as {suggestions?:unknown}).suggestions:null
  if(!Array.isArray(values))return []
  const out:ContactLookupSuggestion[]=[],seen=new Set<WebContactField>()
  for(const item of values.slice(0,15)){
    if(!item||typeof item!=='object')continue
    const data=item as Record<string,unknown>,field=data['field']
    if(typeof field!=='string'||!WEB_CONTACT_FIELDS.includes(field as WebContactField)||!missing.includes(field as WebContactField)||seen.has(field as WebContactField))continue
    const source=sources[typeof data['source']==='number'?data['source']-1:-1]
    if(!source||typeof data['value']!=='string'||typeof data['quote']!=='string'||data['quote'].length>440||data['value'].length>254)continue
    const candidate=add(field as WebContactField,data['value'],data['quote'],source,person,time)
    if(candidate){out.push(candidate);seen.add(candidate.field)}
  }
  return out
}
/** Never overwrite a contact value added after lookup started. */
export function stillMissingValues(current:Readonly<Record<WebContactField,string>>,selected:readonly ContactLookupSuggestion[]):Partial<Record<WebContactField,string>> {
  const patch:Partial<Record<WebContactField,string>>={}
  for(const item of selected)if(!current[item.field]?.trim()&&!(item.field in patch))patch[item.field]=item.value
  return patch
}
