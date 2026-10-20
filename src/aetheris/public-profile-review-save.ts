import { supabase } from '@/integrations/supabase/client'
import type { ScanPatch } from './linkedin-scan-ui'

type PublicColumn = 'title' | 'company' | 'location' | 'thesis' | 'what_i_do'
export interface PublicReviewContext { userId: string; baseline: Record<PublicColumn | 'name', string | null> }
const allowed: PublicColumn[] = ['title','company','location','thesis','what_i_do']

export async function loadPublicReviewContext(): Promise<PublicReviewContext> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in again before searching your profile.')
  const { data: baseline, error: readError } = await supabase.from('profiles').select('name,title,company,location,thesis,what_i_do').eq('id',data.user.id).maybeSingle()
  if (readError || !baseline) throw new Error('Your saved profile could not be loaded. Retry the search.')
  return { userId:data.user.id, baseline }
}

/** Apply only reviewed supported fields to the same unchanged own-profile snapshot. */
export async function savePublicReview(context: PublicReviewContext, fields: ScanPatch): Promise<void> {
  const { data, error } = await supabase.auth.getUser()
  if (error || data.user?.id !== context.userId) throw new Error('Your account changed. Search again before applying.')
  const mapping = { title:'title', company:'company', location:'location', headline:'thesis', about:'what_i_do' } as const
  const columns: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    const column = mapping[key as keyof typeof mapping]
    if (!column) throw new Error('That suggestion has no supported profile field.')
    columns[column] = value
  }
  const patch: Partial<Record<PublicColumn,string>>={}
  for(const [key,value] of Object.entries(columns)) {
    if (!allowed.includes(key as PublicColumn) || typeof value !== 'string') throw new Error('That suggestion has no supported profile field.')
    patch[key as PublicColumn]=value
  }
  if(!Object.keys(patch).length) throw new Error('Select a supported suggestion first.')
  let query=supabase.from('profiles').update(patch).eq('id',context.userId)
  for(const key of new Set<PublicColumn|'name'>(['name','title','thesis',...Object.keys(patch) as PublicColumn[]])) {
    query=context.baseline[key]==null ? query.is(key,null) : query.eq(key,context.baseline[key]!)
  }
  const {data:receipt,error:writeError}=await query.select('id').maybeSingle()
  if(writeError) throw new Error('Your selected public fields could not be saved. Retry the review.')
  if(!receipt || receipt.id!==context.userId) throw new Error('Your profile changed during the review. Search again to protect your edits.')
}
