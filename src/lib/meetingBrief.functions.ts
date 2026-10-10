import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'
import { gatewayChat } from './aiGateway.server'
import { supabase } from '@/integrations/supabase/client'

const PROMPT = `You are a meeting prep specialist. Return ONLY valid JSON, no markdown:
{"their_background":"<2 sentences>","their_current_focus":"<1-2 sentences>","open_needs":[{"need":"...","how_you_can_help":"..."}],"talking_points":[{"point":"...","why_relevant":"..."}],"summary":"<paragraph>"}`

export const generateMeetingBrief = createServerFn({ method: 'POST' })
  .middleware([requireAuthContract])
  .validator((data: { otherUserId: string }) => data)
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId
    const [myRes, theirRes] = await Promise.all([
      (supabase.from('profiles') as any).select('name,title,company,focus,can_help_with').eq('id', userId).single(),
      (supabase.from('profiles') as any).select('name,title,company,focus,looking_for,can_help_with,industries,expertise').eq('id', data.otherUserId).single(),
    ])
    const me = myRes.data; const them = theirRes.data
    const ctx = [`Preparing ${me?.name} (${me?.title}) to meet ${them?.name} (${them?.title} at ${them?.company}).`,`Their focus: ${them?.focus}`,`Looking for: ${them?.looking_for}`,`Can help with: ${them?.can_help_with}`,`Your focus: ${me?.focus}`,`You can help with: ${me?.can_help_with}`].join('\n')
    const answer = await gatewayChat({ system: PROMPT, messages: [{ role: 'user', content: ctx }], maxSteps: 1 })
    let parsed: any = {}
    try { parsed = JSON.parse(answer) } catch { parsed = { their_background: answer, their_current_focus: '', open_needs: [], talking_points: [], summary: '' } }
    const { data: row, error } = await (supabase.from('meeting_briefs') as any).insert({ user_id: userId, other_user_id: data.otherUserId, ...parsed }).select().single()
    if (error) throw new Error(error.message)
    return row
  })

export const getLatestBrief = createServerFn({ method: 'GET' })
  .middleware([requireAuthContract])
  .validator((data: { otherUserId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: row } = await (supabase.from('meeting_briefs') as any).select('*').eq('user_id', (context as any).userId).eq('other_user_id', data.otherUserId).order('generated_at', { ascending: false }).limit(1).maybeSingle()
    return row
  })
