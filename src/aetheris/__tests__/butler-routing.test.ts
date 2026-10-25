import { describe, expect, it } from 'vitest'
import { answerGraphQuestion } from '../opportunity-graph'
import { recognizeCommand, recognizeCapabilityIntent } from '../capabilities/match'
import { explicitlyRequestsToolAction } from '../butler/intent'
import { parseVoiceCommand } from '../voice-commands'

const people = ['Ana Diaz', 'Marcus Lee']
const unreadableGraph = new Proxy({}, {
  get() { throw new Error('A vague question must not scan the local member graph.') },
}) as Parameters<typeof answerGraphQuestion>[1]

describe('Butler does not search or navigate from a cue word', () => {
  it.each([
    'who', 'Who?', 'Who is Ana Diaz?', 'Who is Arceus?',
    'Who can change this?', 'Which company should I contact?',
    'Where is Ana Diaz?', 'Who can I help?',
    'What is a promise?', 'Tell me about my mission',
  ])('leaves %s in conversation rather than opening a tool', phrase => {
    expect(parseVoiceCommand(phrase, people)).toBeNull()
    expect(explicitlyRequestsToolAction(phrase)).toBe(false)
    expect(answerGraphQuestion(phrase, unreadableGraph)).toBeNull()
  })

  it('allows explicit requests but does not promote question phrases into commands', () => {
    expect(parseVoiceCommand('Find Ana Diaz', people)?.kind).toBe('open-member')
    expect(parseVoiceCommand('Search for marketing partners', people)?.kind).toBe('open-search')
    expect(explicitlyRequestsToolAction('Open the company diagnostic')).toBe(true)
    expect(explicitlyRequestsToolAction('Show my capital map')).toBe(true)
    expect(explicitlyRequestsToolAction('Who can change this?')).toBe(false)
    // The legacy matchers know these phrase names; the dock must gate them
    // behind explicitlyRequestsToolAction before any navigation runs.
    expect(recognizeCommand('Who can change this?')?.view).toBe('who')
    expect(recognizeCapabilityIntent('Where are we losing money?')?.capabilityId).toBe('company.diagnose')
  })
})
