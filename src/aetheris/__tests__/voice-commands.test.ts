import { describe, expect, it } from 'vitest'

import { matchPage, matchPerson, parseVoiceCommand } from '../voice-commands'

const people = ['Ana Diaz', 'Bo Chen', 'Ana Ortiz', 'Marcus Lee']

describe('voice commands', () => {
  it('navigates by the words people say', () => {
    expect(parseVoiceCommand('go to events')).toEqual({ kind: 'navigate', page: 'events', value: null })
    expect(parseVoiceCommand('Take me to my peer group')?.page).toBe('peergroups')
    expect(parseVoiceCommand('open the settings page')?.page).toBe('preferences')
    expect(parseVoiceCommand('show me warm paths')?.page).toBe('warmpaths')
    expect(parseVoiceCommand('Hey Ask Intros, open messages')?.page).toBe('messages')
    expect(parseVoiceCommand('calendar')?.page).toBe('calendar')
    expect(matchPage('the CRM')).toBe('crm')
    expect(matchPage('nowhere')).toBeNull()
  })

  it('finds people and companies', () => {
    expect(parseVoiceCommand('find Bo Chen', people)).toEqual({ kind: 'open-member', page: null, value: 'Bo Chen' })
    expect(parseVoiceCommand('find marcus', people)?.value).toBe('Marcus Lee')
    expect(parseVoiceCommand('find Ana', people)).toEqual({ kind: 'open-search', page: null, value: 'Ana' })
    expect(parseVoiceCommand('search for logistics CFOs in Texas', people)).toEqual({ kind: 'open-search', page: null, value: 'logistics CFOs in Texas' })
    expect(parseVoiceCommand('look up Acme Logistics?', people)?.value).toBe('Acme Logistics')
    expect(parseVoiceCommand('open Bo Chen', people)?.kind).toBe('open-member')
    expect(matchPerson('ana diaz', people)).toBe('Ana Diaz')
  })

  it('messages, introduces, notes and posts asks', () => {
    expect(parseVoiceCommand('message Bo', people)).toEqual({ kind: 'message-member', page: null, value: 'Bo Chen' })
    expect(parseVoiceCommand('introduce me to Marcus Lee', people)?.kind).toBe('request-intro')
    expect(parseVoiceCommand('take a note: call Ana on Friday about the CFO search')).toEqual({ kind: 'take-note', page: null, value: 'call Ana on Friday about the CFO search' })
    expect(parseVoiceCommand('remember that Bo prefers mornings')?.value).toBe('Bo prefers mornings')
    expect(parseVoiceCommand('post an ask about hiring a fractional CFO')).toEqual({ kind: 'post-need', page: null, value: 'hiring a fractional CFO' })
    expect(parseVoiceCommand('make the text bigger')?.kind).toBe('text-size')
  })

  it('leaves real questions to the assistant', () => {
    expect(parseVoiceCommand('Who in my network knows the logistics industry best and why?', people)).toBeNull()
    expect(parseVoiceCommand('What changed this week?')).toBeNull()
    expect(parseVoiceCommand('')).toBeNull()
  })
})
