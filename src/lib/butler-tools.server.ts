import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import type { ToolDef } from './aiGateway.server'

/** Read-only tools use the authenticated request client and an explicit owner predicate. */
export function butlerTools(db: SupabaseClient<Database>, userId: string): ToolDef[] {
  return [{
    name: 'read_workspace', description: 'Read this member’s own profile, CRM contacts, opportunities, tasks, posts, or private memories/conversation history. Results are a limited slice, not complete account totals. Search memories to recall past conversations and writing preferences.',
    parameters: { type: 'object', properties: { area: { type: 'string', enum: ['profile', 'contacts', 'opportunities', 'tasks', 'posts', 'memory'] }, query: { type: 'string' } }, required: ['area'], additionalProperties: false },
    execute: async args => {
      const query = String(args['query'] ?? '').slice(0, 160).replace(/[\\%_]/g, '\\$&')
      let request
      switch (args['area']) {
        case 'profile': request = db.from('profiles').select('name,title,company,location,focus,thesis,bio,looking_for,can_help_with').eq('id', userId).limit(1); break
        case 'contacts': request = db.from('crm_people').select('id,full_name,title,company_name,email,notes,status').eq('owner_id', userId).order('updated_at', { ascending: false }).limit(30); if (query) request = request.ilike('full_name', `%${query}%`); break
        case 'opportunities': request = db.from('crm_opportunities').select('id,name,amount,currency,stage_name,status,next_action,expected_close,value_state').eq('owner_id', userId).order('updated_at', { ascending: false }).limit(30); if (query) request = request.ilike('name', `%${query}%`); break
        case 'tasks': request = db.from('crm_tasks').select('id,title,detail,status,due_at,priority').eq('owner_id', userId).order('created_at', { ascending: false }).limit(30); if (query) request = request.ilike('title', `%${query}%`); break
        case 'posts': request = db.from('posts').select('id,text,detail,created_at').eq('author_id', userId).order('created_at', { ascending: false }).limit(20); if (query) request = request.ilike('text', `%${query}%`); break
        case 'memory': request = db.from('memories').select('id,text,category,source,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30); if (query) request = request.ilike('text', `%${query}%`); break
        default: return { error: 'Unknown workspace area.' }
      }
      const result = await request
      if (result.error) return { error: 'This workspace area could not be read. Do not infer that it is empty.' }
      return { records: result.data, limited: true }
    },
  }]
}
