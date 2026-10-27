// Pure rules for "drop anything anywhere": what a dropped item is and where Butler suggests it goes.
import { isContactSheet } from './contact-files'
// Nothing is saved until the member confirms one of the suggestions.

export type DropKind = 'contacts' | 'image' | 'document' | 'link' | 'text'
export type DropAction = 'crm-import' | 'butler-post' | 'butler-read' | 'butler-ask' | 'butler-memory' | 'butler-message' | 'butler-task'

export interface DropSuggestion { action: DropAction; label: string; detail: string }
export interface DroppedFileInfo { name: string; type: string }

const IMAGE = /\.(png|jpe?g|gif|webp|heic|avif)$/i
const DOC = /\.(pdf|docx?|txt|md|rtf|pptx?|xlsx?)$/i
const URL_RE = /^https?:\/\/\S+$/i

export function classifyFile(file: DroppedFileInfo): DropKind {
  if (isContactSheet(file)) return 'contacts'
  if (file.type.startsWith('image/') || IMAGE.test(file.name)) return 'image'
  if (DOC.test(file.name) || file.type === 'application/pdf') return 'document'
  return 'document'
}

export function classifyText(text: string): DropKind {
  return URL_RE.test(text.trim()) ? 'link' : 'text'
}

export function suggestionsFor(kind: DropKind): DropSuggestion[] {
  const read: DropSuggestion = { action: 'butler-read', label: 'Ask Butler about it', detail: 'Butler reads it and tells you what it contains and where it belongs.' }
  switch (kind) {
    case 'contacts': return [
      { action: 'crm-import', label: 'Import people into CRM', detail: 'Match the columns, check the rows, then add them.' },
      read,
    ]
    case 'image': return [
      { action: 'butler-post', label: 'Draft a post with this photo', detail: 'Butler drafts a post for you to review before anything is shared.' },
      read,
    ]
    case 'link': return [
      { action: 'butler-ask', label: 'Ask Butler about this link', detail: 'Butler explains it and suggests who in your network it matters to.' },
      { action: 'butler-post', label: 'Draft a post sharing it', detail: 'You review the draft before anything is shared.' },
    ]
    case 'text': return [
      { action: 'butler-ask', label: 'Ask Butler about this text', detail: 'Butler reads it and suggests what to do next.' },
      { action: 'butler-post', label: 'Turn it into a post draft', detail: 'You review the draft before anything is shared.' },
    ]
    default: return [read]
  }
}

const ALL: DropSuggestion[] = [
  { action: 'crm-import', label: 'Import people into CRM', detail: 'Butler reads the contacts; you check the rows before they are added.' },
  { action: 'butler-post', label: 'Draft a post', detail: 'You review the draft before anything is shared.' },
  { action: 'butler-memory', label: 'Save to Memory', detail: 'Butler summarises it as a private note you approve.' },
  { action: 'butler-message', label: 'Draft a message', detail: 'Butler drafts a message to the right person for you to send.' },
  { action: 'butler-task', label: 'Make a follow-up task', detail: 'Butler turns it into a task you confirm.' },
  { action: 'butler-read', label: 'Ask Butler about it', detail: 'Butler reads it and tells you what it contains.' },
]

/** Every destination the member can choose, with Butler's best guesses first. */
export function destinationsFor(kind: DropKind): DropSuggestion[] {
  const top = suggestionsFor(kind)
  return [...top, ...ALL.filter(d => !top.some(t => t.action === d.action) && !(d.action === 'butler-read' && top.some(t => t.action === 'butler-ask')))]
}

/** The kind that drives suggestions for a mixed drop: a sheet wins, then images, then documents. */
export function kindForFiles(files: DroppedFileInfo[]): DropKind {
  const kinds = files.map(classifyFile)
  for (const k of ['contacts', 'image', 'document'] as const) if (kinds.includes(k)) return k
  return 'document'
}

export function butlerPrompt(action: DropAction, kind: DropKind, text = ''): string {
  if (action === 'butler-post') return kind === 'image' ? 'Draft a short professional post using the attached photo. Show me the draft before anything is shared.' : `Draft a short professional post from this. Show me the draft before anything is shared:\n\n${text}`
  const body = text ? `\n\n${text}` : ' (see the attached file)'
  if (action === 'butler-memory') return `Read this and save a concise private Memory note of what matters. Show me the note first.${body}`
  if (action === 'butler-message') return `Read this and draft a message to the most relevant person in my network. Show me the draft before sending.${body}`
  if (action === 'butler-task') return `Read this and create a follow-up task for me to confirm.${body}`
  if (action === 'crm-import') return `Read the attached file, pull out every person (name, email, phone, title, company) and tell me who you found so I can add them to my CRM.`
  if (kind === 'link') return `What is this link, and who in my network might it matter to?\n${text}`
  if (kind === 'text') return `Read this and suggest what I should do with it:\n\n${text}`
  return 'Read the attached file. Tell me what it contains and where it belongs in my account.'
}

// One-shot hand-off so the CRM import opens with the dropped sheet already loaded.
let pendingSheet: File | null = null
export const setPendingSheet = (file: File | null) => { pendingSheet = file }
export const hasPendingSheet = () => pendingSheet !== null
export const takePendingSheet = () => { const f = pendingSheet; pendingSheet = null; return f }
