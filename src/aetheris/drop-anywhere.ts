// Pure rules for "drop anything anywhere": what a dropped item is and where Butler suggests it goes.
// Nothing is saved until the member confirms one of the suggestions.

export type DropKind = 'contacts' | 'image' | 'document' | 'link' | 'text'
export type DropAction = 'crm-import' | 'butler-post' | 'butler-read' | 'butler-ask'

export interface DropSuggestion { action: DropAction; label: string; detail: string }
export interface DroppedFileInfo { name: string; type: string }

const SHEET = /\.(csv|tsv)$/i
const IMAGE = /\.(png|jpe?g|gif|webp|heic|avif)$/i
const DOC = /\.(pdf|docx?|txt|md|rtf|pptx?|xlsx?)$/i
const URL_RE = /^https?:\/\/\S+$/i

export function classifyFile(file: DroppedFileInfo): DropKind {
  if (SHEET.test(file.name) || file.type === 'text/csv') return 'contacts'
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

/** The kind that drives suggestions for a mixed drop: a sheet wins, then images, then documents. */
export function kindForFiles(files: DroppedFileInfo[]): DropKind {
  const kinds = files.map(classifyFile)
  for (const k of ['contacts', 'image', 'document'] as const) if (kinds.includes(k)) return k
  return 'document'
}

export function butlerPrompt(action: DropAction, kind: DropKind, text = ''): string {
  if (action === 'butler-post') return kind === 'image' ? 'Draft a short professional post using the attached photo. Show me the draft before anything is shared.' : `Draft a short professional post from this. Show me the draft before anything is shared:\n\n${text}`
  if (kind === 'link') return `What is this link, and who in my network might it matter to?\n${text}`
  if (kind === 'text') return `Read this and suggest what I should do with it:\n\n${text}`
  return 'Read the attached file. Tell me what it contains and where it belongs in my account.'
}

// One-shot hand-off so the CRM import opens with the dropped sheet already loaded.
let pendingSheet: File | null = null
export const setPendingSheet = (file: File | null) => { pendingSheet = file }
export const hasPendingSheet = () => pendingSheet !== null
export const takePendingSheet = () => { const f = pendingSheet; pendingSheet = null; return f }
