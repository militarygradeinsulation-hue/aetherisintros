import { describe, expect, it } from 'vitest'
import {
  imageCreationBrief,
  imageReferenceQuery,
  spokenReviewCommand,
  spokenConfirmationFor,
  voiceApprovalMatches,
  type VoiceApproval,
} from '../intent'

describe('Butler image intentions', () => {
  it('recognizes explicit generation requests only', () => {
    expect(imageCreationBrief('Butler, create an image of a community playground')).toContain('create an image')
    expect(imageCreationBrief('Could you generate a banner showing a night skyline?')).toContain('generate a banner')
    expect(imageCreationBrief('What is image generation?')).toBeNull()
    expect(imageCreationBrief('Explain how to make an image')).toBeNull()
    expect(imageCreationBrief('Show images of the moon')).toBeNull()
  })

  it('extracts public image queries without interpreting them as creation', () => {
    expect(imageReferenceQuery('Show me images of Arceus')).toBe('Arceus')
    expect(imageReferenceQuery('Butler, find photos of vintage Indiana parks')).toBe('vintage Indiana parks')
    expect(imageReferenceQuery('Please search for reference images of a blue playground')).toBe('a blue playground')
    expect(imageReferenceQuery('Create an image of a bridge')).toBeNull()
  })
})

describe('Butler voice confirmation guard', () => {
  const now = Date.now()
  const owner = '00000000-0000-4000-8000-000000000001'
  const original = { id: '00000000-0000-4000-8000-000000000002', kind: 'publish-post' as const, text: 'Launch news' }
  const approval: VoiceApproval = { owner, ...original, expiresAt: now + 60000 }

  it('arms only explicit review commands', () => {
    expect(spokenReviewCommand('Approve this action')).toBe('request')
    expect(spokenReviewCommand('Butler, publish this post')).toBe('request')
    expect(spokenReviewCommand('confirm publish')).toBe('confirm-publish')
    expect(spokenReviewCommand('I agree')).toBeNull()
    expect(spokenReviewCommand('yes')).toBeNull()
    expect(spokenReviewCommand('publish this post without review')).toBeNull()
    expect(spokenReviewCommand('cancel approval')).toBe('cancel')
    expect(spokenConfirmationFor('create-task')).toBe('confirm save task')
  })

  it('allows exactly one unchanged reviewed draft with matching owner, kind and deadline', () => {
    expect(voiceApprovalMatches(approval, original, owner, 'Confirm publish', now)).toBe(true)
    expect(voiceApprovalMatches(approval, original, owner, 'yes', now)).toBe(false)
    expect(voiceApprovalMatches(approval, original, '00000000-0000-4000-8000-000000000003', 'confirm publish', now)).toBe(false)
    expect(voiceApprovalMatches(approval, { ...original, text: 'Edited' }, owner, 'confirm publish', now)).toBe(false)
    expect(voiceApprovalMatches(approval, { ...original, id: crypto.randomUUID() }, owner, 'confirm publish', now)).toBe(false)
    expect(voiceApprovalMatches(approval, original, owner, 'confirm save task', now)).toBe(false)
    expect(voiceApprovalMatches(approval, original, owner, 'confirm publish', approval.expiresAt)).toBe(false)
    expect(voiceApprovalMatches(null, original, owner, 'confirm publish', now)).toBe(false)
  })

  it('requires distinct confirmation phrases for different write types', () => {
    const task = { ...original, kind: 'create-task' as const }
    const taskApproval: VoiceApproval = { ...approval, kind: 'create-task' }
    expect(voiceApprovalMatches(taskApproval, task, owner, 'confirm save task', now)).toBe(true)
    expect(voiceApprovalMatches(taskApproval, task, owner, 'confirm publish', now)).toBe(false)
    expect(spokenConfirmationFor('save-writing-style')).toBe('confirm save style')
  })
})
