/**
 * Quick-note saving, kept free of UI so both the note card and the assistant (direct commands and
 * AI actions) share one rule: only report success for the place the note really went. Signed-in
 * members save to their Memory (account); in the showcase the note stays on this device. A failed
 * write is always thrown, never reported as saved.
 */
export const DEMO_KEY = 'aetheris-demo-quick-notes'
export const MAX_NOTE = 4000

export type NoteDestination = 'account' | 'device'

export interface NoteStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface QuickNoteDeps {
  /** The signed-in member's id, or null when nobody is signed in. */
  getUserId: () => Promise<string | null>
  /** Inserts the private Memory row; resolves to an error message or null. */
  insertMemory: (row: { userId: string; text: string; when: string }) => Promise<string | null>
  /** Device storage, or null when the browser does not provide it. */
  storage: () => NoteStorage | null
  now: () => Date
}

export const DEVICE_FAILURE = 'Could not save the note on this device — browser storage is unavailable or full.'
export const ACCOUNT_FAILURE = 'Could not save the note to your Memory. Please try again.'

export async function saveQuickNoteWith(text: string, deps: QuickNoteDeps): Promise<NoteDestination> {
  const body = text.trim().slice(0, MAX_NOTE)
  if (!body) throw new Error('Write something first.')
  const userId = await deps.getUserId()
  if (!userId) {
    try {
      const storage = deps.storage()
      if (!storage) throw new Error('no storage')
      let list: Array<{ text: string; at: string }> = []
      try {
        const parsed: unknown = JSON.parse(storage.getItem(DEMO_KEY) ?? '[]')
        if (Array.isArray(parsed)) list = parsed as typeof list
      } catch { /* an unreadable list is replaced */ }
      storage.setItem(DEMO_KEY, JSON.stringify([{ text: body, at: deps.now().toISOString() }, ...list].slice(0, 50)))
    } catch { throw new Error(DEVICE_FAILURE) }
    return 'device'
  }
  let failed: string | null
  try {
    failed = await deps.insertMemory({
      userId, text: body,
      when: deps.now().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    })
  } catch { failed = ACCOUNT_FAILURE }
  if (failed) throw new Error(ACCOUNT_FAILURE)
  return 'account'
}

/** What to tell the member, naming where the note went. */
export function noteSavedMessage(where: NoteDestination): string {
  return where === 'account' ? 'Saved to your Memory.' : 'Saved on this device only — not in your account.'
}

/** Assistant wording for the same outcomes. */
export function noteSavedResult(where: NoteDestination): string {
  return where === 'account' ? 'Saved that note to your Memory' : 'Saved that note on this device only'
}

/** Assistant wording for a failed save (no trailing full stop, for the activity list). */
export function noteFailedResult(error: unknown): string {
  return error instanceof Error ? error.message.replace(/\.$/, '') : 'Could not save the note'
}
