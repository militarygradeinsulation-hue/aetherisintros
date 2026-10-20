import { supabase } from '@/integrations/supabase/client'
import { ACCOUNT_FAILURE, saveQuickNoteWith, type NoteDestination } from './quick-note'
import { isShowcase } from './showcase'

/** One persistence path for the note card, direct commands, and assistant actions. */
export function saveQuickNote(text: string): Promise<NoteDestination> {
  return saveQuickNoteWith(text, {
    getUserId: async () => {
      if (isShowcase()) return null
      const { data, error } = await supabase.auth.getUser()
      if (error && error.name !== 'AuthSessionMissingError') throw new Error(ACCOUNT_FAILURE)
      return data.user?.id ?? null
    },
    insertMemory: async ({ userId, text: body, when }) => {
      const { data, error } = await supabase.from('memories').insert({
        user_id: userId, kind: 'note', category: 'Quick note', member_id: null, text: body,
        scope: 'private', source: 'Quick note', when_label: when,
      } as never).select('id').single()
      return error || !data?.id ? ACCOUNT_FAILURE : null
    },
    storage: () => { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } },
    now: () => new Date(),
  })
}
