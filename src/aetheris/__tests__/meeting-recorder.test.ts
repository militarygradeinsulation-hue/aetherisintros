import { describe, expect, it } from 'vitest'

import { cleanTranscript, pickMimeType, rms } from '../meeting-recorder'

describe('meeting recorder', () => {
  it('picks a recording format the transcriber accepts', () => {
    expect(pickMimeType(t => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus')
    expect(pickMimeType(t => t === 'audio/mp4')).toBe('audio/mp4') // Safari
    expect(pickMimeType(() => false)).toBeNull()
    expect(pickMimeType(() => { throw new Error('old browser') })).toBeNull()
  })
  it('drops phrases speech models invent from silence', () => {
    for (const phantom of ['Thank you.', 'thanks for watching!', 'you', '...', '  ', 'Subtitles by the Amara.org community']) expect(cleanTranscript(phantom)).toBe('')
    expect(cleanTranscript('  Thank you for the intro to Cora,\n we should  meet Tuesday. ')).toBe('Thank you for the intro to Cora, we should meet Tuesday.')
  })
  it('measures sound level', () => {
    expect(rms(new Float32Array(100))).toBe(0)
    expect(rms(new Float32Array(100).fill(0.5))).toBeCloseTo(0.5)
  })
})
