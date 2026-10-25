/**
 * Member-originated requests only. These parsers must never inspect LLM output,
 * web pages or attachments to authorize generation or a write.
 */
export type ButlerDraftKind = 'publish-post' | 'create-task' | 'save-writing-style' | 'draft-email'
export type ApprovedDraftKind = Exclude<ButlerDraftKind, 'draft-email'>
export interface VoiceApproval {
  owner: string
  id: string
  kind: ApprovedDraftKind
  text: string
  expiresAt: number
}

const clean = (value: string) => value.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim()
const withoutWake = (value: string) =>
  clean(value).replace(/^(?:hey\s+)?butler[,\s:]+/i, '').replace(/^please\s+/i, '').trim()

/** Never interpret a question *about* image creation as a request to generate. */
export function imageCreationBrief(phrase: string): string | null {
  const original = withoutWake(phrase)
    .replace(/^(?:can|could|would|will) you\s+/i, '')
    .replace(/^i(?:'d| would) like you to\s+/i, '')
  if (original.length < 10 || original.length > 2000) return null
  if (!/^(?:generate|create|make|draw|render|design|illustrate)\b/i.test(original)) return null
  if (!/\b(?:image|picture|photo|portrait|illustration|visual|poster|banner|graphic|logo|artwork)\b/i.test(original)) return null
  return original
}

/** A source-backed image lookup is not image generation. */
export function imageReferenceQuery(phrase: string): string | null {
  const original = withoutWake(phrase).replace(/^(?:can|could|would) you\s+/i, '')
  if (!/^(?:show|find|look up|search for|pull up|display)\b/i.test(original)) return null
  const matched = original.match(/^(?:show|find|look up|search for|pull up|display)\s+(?:me\s+)?(?:(?:some|a|an|the|real|reference|source|licensed|public)\s+)*(?:photos?|images?|pictures?|illustrations?|visuals?)\s+(?:of|for|about|showing)\s+(.+)$/i)
  return matched?.[1] && matched[1].trim().length >= 2 && matched[1].trim().length <= 120
    ? matched[1].trim() : null
}

export type SpokenReviewCommand = 'request' | 'confirm-publish' | 'confirm-task' | 'confirm-style' | 'cancel' | null

/** Require a distinct, exact confirmation phrase. Never accept incidental "yes". */
export function spokenReviewCommand(phrase: string): SpokenReviewCommand {
  const text = withoutWake(phrase).toLowerCase()
  if (text === 'cancel approval' || text === 'cancel publishing' || text === 'cancel that approval') return 'cancel'
  if (text === 'confirm publish') return 'confirm-publish'
  if (text === 'confirm save task') return 'confirm-task'
  if (text === 'confirm save style') return 'confirm-style'
  if (/^(?:publish (?:this|the|my) (?:post|draft)|publish this|publish the post|approve (?:this|the) (?:post|draft)|approve (?:this|the) action|save (?:this|the) (?:task|writing style|preference))$/.test(text)) return 'request'
  return null
}

export function spokenConfirmationFor(kind: ApprovedDraftKind): string {
  return kind === 'publish-post' ? 'confirm publish' : kind === 'create-task' ? 'confirm save task' : 'confirm save style'
}

export function voiceApprovalMatches(
  approval: VoiceApproval | null, draft: { id: string; kind: ButlerDraftKind; text: string } | null,
  owner: string | null, phrase: string, now: number,
): boolean {
  if (!approval || !draft || !owner || approval.expiresAt <= now || approval.owner !== owner) return false
  if (draft.id !== approval.id || draft.kind !== approval.kind || draft.text !== approval.text) return false
  const heard = spokenReviewCommand(phrase)
  return (heard === 'confirm-publish' && approval.kind === 'publish-post') ||
    (heard === 'confirm-task' && approval.kind === 'create-task') ||
    (heard === 'confirm-style' && approval.kind === 'save-writing-style')
}
