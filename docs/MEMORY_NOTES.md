# Memory Notes and Butler recall

Memory now includes a private, searchable Notes area with a title, date, context,
content, and type (note, idea, or conversation). Members can create, expand,
search, and delete notes, or open Butler with an exact note ID for recall.

Examples:

- “Take a note: call Ana about the pilot on Friday.”
- “Save this idea as Partner launch: start with three pilot partners. The context is our planning call with Ana.”
- “Save this conversation as Partnership planning.”
- “What did I save about the pilot partners?”

Short direct notes and exact conversation capture work without a language-model
request. Richly worded ideas, summaries, and conversational recall use Butler's
existing configured provider. The model cannot authorize its own note write: the
current member message must explicitly request saving. Save receipts replace the
model's reply only after a confirmed database write, including spoken replies.

## Storage and privacy

Uses the existing `memories` table and its owner RLS policy; no migration is
required. `kind = saved-note` and `category = Notes` distinguish structured notes
from relationship notes, writing preferences, and individual Butler history turns.
Validated JSON in `text` holds title, date, context, content and type. `created_at`
is the database save timestamp; the separate note date defaults to the member's
local calendar date. All writes force `scope = private` and the authenticated
owner. No service credential or browser storage is used for private notes.

Server endpoints reject owner changes, validate all fields and IDs, and confirm
inserts/deletes. Reusing a save ID is idempotent only for identical content.
Account changes clear the notes view and unsaved drafts. Deleting a note does not
erase its separate original conversation history.

Conversation capture waits for pending history saves, then pages through persisted
turns through the last message visible when the command was issued. It is not
limited to the 24-turn AI context or the 100-turn history window. Conversations
above 100,000 characters or the bounded history read fail explicitly rather than
saving an unlabelled partial transcript.

Butler receives a recent title index in each authenticated request and can search
all notes with `read_saved_notes`, including older pages. Full note reads use the
exact owner-scoped ID and page long content in 12,000-character segments. Titles
and note content are untrusted data, never system instructions. Search failures
remain errors rather than evidence that the account has no notes.

## Verification

- `npx vitest run src/features/memory-notes/notes.test.ts src/aetheris/butler/__tests__/intent.test.ts src/aetheris/__tests__/butler-routing.test.ts src/aetheris/lib/memory-write.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- Local browser fixture: 390/768/1440px layout; light/dark appearance; failed-save
  draft retention; create/search/expand/delete; exact-ID recall handoff; account
  change clearing. The fixture uses test records, not a production member session.

Production authenticated save/recall and hosting publication require a live
member acceptance check; local tests are not evidence of a published release.
