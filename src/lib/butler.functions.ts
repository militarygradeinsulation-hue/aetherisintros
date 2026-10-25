import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { requireAuthContract } from './auth-gate'

const SOURCE = 'Butler conversation:'
export const butlerTurn = z.object({ id: z.string().uuid(), role: z.enum(['user', 'assistant']), content: z.string().min(1).max(16000), at: z.string().datetime() })
export type ButlerTurn = z.infer<typeof butlerTurn>

/** Existing private Memory policies enforce ownership; never use a service credential. */
export const saveButlerTurn = createServerFn({ method: 'POST' }).middleware([requireAuthContract])
  .inputValidator(z.object({ owner: z.string().uuid(), conversation: z.string().uuid(), turn: butlerTurn }))
  .handler(async ({ data, context }) => {
    if (data.owner !== context.userId) throw new Error('Account changed. Please retry in the current account.')
    const source = SOURCE + data.conversation
    const text = JSON.stringify(data.turn)
    const previous = await context.supabase.from('memories').select('id,text,source').eq('user_id', context.userId).eq('id', data.turn.id).maybeSingle()
    if (previous.error) throw new Error('Conversation could not be saved.')
    if (previous.data) {
      if (previous.data.text !== text || previous.data.source !== source) throw new Error('Conversation entry conflict.')
      return { saved: true }
    }
    const result = await context.supabase.from('memories').insert({ id: data.turn.id, user_id: context.userId,
      text, source, category: 'Butler conversations', kind: 'note', scope: 'private', confidence: 100, when_label: data.turn.at,
    }).select('id,user_id').single()
    if (result.error || result.data?.user_id !== context.userId) throw new Error('Conversation could not be saved. Retry before leaving.')
    return { saved: true }
  })

export const loadButlerHistory = createServerFn({ method: 'POST' }).middleware([requireAuthContract])
  .inputValidator(z.object({ conversation: z.string().uuid().optional(), before: z.string().datetime().optional() }))
  .handler(async ({ data, context }) => {
    let query = context.supabase.from('memories').select('source,text,created_at').eq('user_id', context.userId)
      .eq('scope', 'private').eq('category', 'Butler conversations').order('created_at', { ascending: false }).limit(100)
    if (data.conversation) query = query.eq('source', SOURCE + data.conversation)
    if (data.before) query = query.lt('created_at', data.before)
    const result = await query
    if (result.error) throw new Error('Conversation history could not be loaded.')
    const entries = (result.data ?? []).flatMap(row => {
      try {
        const turn = butlerTurn.parse(JSON.parse(row.text))
        const conversation = z.string().uuid().parse(row.source.slice(SOURCE.length))
        return [{ conversation, turn, savedAt: row.created_at }]
      } catch { return [] }
    })
    return { entries, before: result.data?.length === 100 ? result.data[99]?.created_at : null }
  })

/** Only a visible, reviewed action calls this endpoint. IDs make retries idempotent. */
export const executeButlerDraft = createServerFn({ method: 'POST' }).middleware([requireAuthContract])
  .inputValidator(z.object({ owner: z.string().uuid(), id: z.string().uuid(), kind: z.enum(['publish-post', 'create-task', 'save-writing-style']), text: z.string().trim().min(4).max(4000) }))
  .handler(async ({ data, context }) => {
    if (data.owner !== context.userId) throw new Error('Account changed. Review this draft again.')
    const db = context.supabase
    if (data.kind === 'publish-post') {
      const prior = await db.from('posts').select('id,text').eq('id', data.id).eq('author_id', context.userId).maybeSingle()
      if (prior.error) throw new Error('Post could not be checked.')
      if (prior.data) {
        if (prior.data.text !== data.text) throw new Error('This post has already been published with different text.')
        return { id: data.id, receipt: 'Post published to your network.' }
      }
      const { data: saved, error } = await db.from('posts').insert({ id: data.id, author_id: context.userId, member_id: context.userId,
        kind: 'Insight', text: data.text, detail: '', visibility: 'network', is_demo: false, when_label: 'Just now',
      }).select('id').single()
      if (error || !saved) throw new Error('Post was not published. Please retry.')
      return { id: saved.id, receipt: 'Post published to your network.' }
    }
    if (data.kind === 'create-task') {
      const prior = await db.from('crm_tasks').select('id,detail').eq('id', data.id).eq('owner_id', context.userId).maybeSingle()
      if (prior.error) throw new Error('Task could not be checked.')
      if (prior.data) {
        if (prior.data.detail !== data.text) throw new Error('Task already exists with different text.')
        return { id: data.id, receipt: 'Task saved in your CRM.' }
      }
      const { data: saved, error } = await db.from('crm_tasks').insert({ id: data.id, owner_id: context.userId, title: data.text.split('\n')[0]!.slice(0, 200), detail: data.text })
        .select('id').single()
      if (error || !saved) throw new Error('Task was not saved. Please retry.')
      return { id: saved.id, receipt: 'Task saved in your CRM.' }
    }
    const { data: saved, error } = await db.from('memories').upsert({ id: data.id, user_id: context.userId,
      kind: 'note', category: 'Butler writing style', text: data.text, source: 'Butler approved writing preference', scope: 'private', confidence: 100,
    }).select('id,user_id').single()
    if (error || saved?.user_id !== context.userId) throw new Error('Writing preference was not saved.')
    return { id: saved.id, receipt: 'Writing preference saved privately for future conversations.' }
  })
