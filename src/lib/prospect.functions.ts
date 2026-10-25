import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'
import { reviewNote, statuses } from '@/aetheris/prospect/core'
import { requirePrivateOwner, type GateRpc } from '@/aetheris/prospect/owner-gate'

const profile = z.object({
  id: z.string().min(1).max(80), label: z.string().min(1).max(120), objective: z.enum(['client','partner','investor','referral','hire']),
  industries: z.string().max(1000), employees: z.string().max(1000), revenue: z.string().max(1000), titles: z.string().max(1000), locations: z.string().max(1000),
  keywords: z.string().max(1000), disqualifiers: z.string().max(1000), excludeClients: z.boolean(), excludeContacted: z.boolean(), minimumFit: z.number().int().min(0).max(100), valueOffer: z.string().max(200),
})
const gate = (context: unknown) => {
  const sb = (context as { supabase: { rpc: GateRpc } }).supabase
  return requirePrivateOwner(sb.rpc.bind(sb) as GateRpc)
}
export const loadProspectState = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await gate(context)
  const [state,people,companies,activities] = await Promise.all([
    context.supabase.from('member_workspace_state').select('store_key,data,version').eq('user_id',context.userId).like('store_key','icp:%'),
    context.supabase.from('crm_people').select('id').eq('owner_id',context.userId),
    context.supabase.from('crm_companies').select('id').eq('owner_id',context.userId),
    context.supabase.from('crm_activities').select('id').eq('owner_id',context.userId),
  ])
  if (state.error || people.error || companies.error || activities.error) throw new Error('Your private CRM could not be loaded. Retry before reviewing prospects.')
  return { rows: state.data ?? [], people: (people.data ?? []).map((p:{id:string}) => p.id), companies: (companies.data ?? []).map((c:{id:string}) => c.id) }
})
const saveSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('profiles'), profiles: z.array(profile).min(1).max(20), expected: z.number().int().min(0) }),
  z.object({ kind: z.literal('person'), personId: z.string().uuid(), status: z.enum(statuses), note: z.string().max(300), consent: z.boolean(), expected: z.number().int().min(0) }),
])
export const saveProspectState = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(saveSchema).handler(async ({ data,context }) => {
  await gate(context)
  if (data.kind === 'person' && data.status === 'approved') {
    const issues = reviewNote(data.note)
    if (issues.length) throw new Error(issues.join(' '))
    const { data: prior,error: priorError } = await context.supabase.from('member_workspace_state').select('store_key,data').eq('user_id',context.userId).like('store_key','icp:person:%')
    if (priorError) throw new Error('Previous prospect reviews could not be checked. Retry before approval.')
    const duplicate = prior?.some((row:{store_key:string;data:unknown}) => {
      const value = row.data as { status?:string; note?:string }
      return row.store_key !== `icp:person:${data.personId}` && ['invited','accepted','follow_up'].includes(value.status ?? '') && value.note?.trim()===data.note.trim()
    })
    if (duplicate) throw new Error('This note was already used for another person. Add their individual context.')
  }
  const key = data.kind === 'profiles' ? 'icp:profiles' : `icp:person:${data.personId}`
  const payload = data.kind === 'profiles' ? { profiles: data.profiles } : { status:data.status, note:data.note, consent:data.consent }
  const { data: result,error } = await context.supabase.rpc('icp_save', { p_key:key, p_data:payload, p_expected:data.expected })
  if (error) throw new Error(error.message)
  return result
})
/** Search results are evidence for review, never fabricated CRM records. */
export const searchProspectEvidence=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
.inputValidator(z.object({query:z.string().trim().min(3).max(240)}))
.handler(async({data,context})=>{
 await gate(context)
 const {searchWeb}=await import('./webSearch.server')
 const {publicTarget}=await import('@/features/specter-detect/investigation')
 const results=await searchWeb(data.query,8)
 return {provider:'Public web search',checkedAt:new Date().toISOString(),results:results.flatMap(r=>{try{return [{...r,url:publicTarget(r.url)}]}catch{return []}})}
})
