import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_FAILURE, DEMO_KEY, DEVICE_FAILURE, noteFailedResult, noteSavedMessage, noteSavedResult, saveQuickNoteWith,
  type NoteStorage, type QuickNoteDeps,
} from '../quick-note'

const memoryStorage = (): NoteStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v) } }
}
const deps = (over: Partial<QuickNoteDeps> = {}): QuickNoteDeps => ({
  getUserId: async () => null, insertMemory: async () => null, storage: () => memoryStorage(), now: () => new Date('2026-01-01T00:00:00Z'), ...over,
})

describe('saveQuickNoteWith', () => {
  it('rejects an empty note', async () => {
    await expect(saveQuickNoteWith('   ', deps())).rejects.toThrow('Write something first.')
  })
  it('saves on the device when signed out, newest first, capped at 50', async () => {
    const storage = memoryStorage()
    storage.setItem(DEMO_KEY, JSON.stringify(Array.from({ length: 60 }, (_, i) => ({ text: `n${i}`, at: '' }))))
    expect(await saveQuickNoteWith(' hello ', deps({ storage: () => storage }))).toBe('device')
    const list = JSON.parse(storage.getItem(DEMO_KEY)!)
    expect(list).toHaveLength(50)
    expect(list[0].text).toBe('hello')
  })
  it('replaces an unreadable device list instead of failing', async () => {
    const storage = memoryStorage(); storage.setItem(DEMO_KEY, '{not json')
    expect(await saveQuickNoteWith('x', deps({ storage: () => storage }))).toBe('device')
  })
  it('never reports device success when storage throws on write', async () => {
    const storage: NoteStorage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
    await expect(saveQuickNoteWith('x', deps({ storage: () => storage }))).rejects.toThrow(DEVICE_FAILURE)
  })
  it('never reports device success when storage is unavailable', async () => {
    await expect(saveQuickNoteWith('x', deps({ storage: () => null }))).rejects.toThrow(DEVICE_FAILURE)
    await expect(saveQuickNoteWith('x', deps({ storage: () => { throw new Error('SecurityError') } }))).rejects.toThrow(DEVICE_FAILURE)
  })
  it('saves to the account when signed in, and never touches device storage', async () => {
    const storage = memoryStorage(); const rows: unknown[] = []
    const where = await saveQuickNoteWith('private thought', deps({ getUserId: async () => 'u1', storage: () => storage, insertMemory: async row => { rows.push(row); return null } }))
    expect(where).toBe('account')
    expect(rows).toMatchObject([{ userId: 'u1', text: 'private thought' }])
    expect(storage.data.size).toBe(0)
  })
  it('surfaces a failed account write, without leaking the database message or the text', async () => {
    const failing = deps({ getUserId: async () => 'u1', insertMemory: async () => 'new row violates row-level security: secret text' })
    await expect(saveQuickNoteWith('secret text', failing)).rejects.toThrow(ACCOUNT_FAILURE)
    await expect(saveQuickNoteWith('x', deps({ getUserId: async () => 'u1', insertMemory: async () => { throw new Error('network') } }))).rejects.toThrow(ACCOUNT_FAILURE)
  })
})

describe('account versus device confirmation', () => {
  it('names the destination in both the card and assistant wording', () => {
    expect(noteSavedMessage('account')).toMatch(/Memory/)
    expect(noteSavedMessage('device')).toMatch(/device only/)
    expect(noteSavedResult('account')).toMatch(/Memory/)
    expect(noteSavedResult('device')).toMatch(/device only/)
    expect(noteSavedResult('device')).not.toMatch(/Memory/)
  })
  it('turns a failure into a message that is not a success', () => {
    expect(noteFailedResult(new Error(DEVICE_FAILURE))).toMatch(/^Could not save/)
    expect(noteFailedResult('boom')).toBe('Could not save the note')
    expect(noteFailedResult(new Error(DEVICE_FAILURE))).not.toMatch(/^Saved/)
  })
})
