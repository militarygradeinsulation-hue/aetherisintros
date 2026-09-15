# Journal — member posts with pictures, video and documents

Each account gets a Journal: a place to write an entry and attach photos, video or documents. Entries live on the member's own profile and are visible to other members viewing that profile, and they appear in the network feed. Everywhere the product currently says "post", the member-facing wording becomes "Journal".

## What the member gets

**Write an entry**
- A Journal composer on Home and on their own profile: a headline, a longer note, and an optional attachment area.
- Drag or choose files: images (jpg/png/webp/gif), video (mp4/webm/mov), documents (pdf, doc/docx, ppt/pptx, xls/xlsx, txt, csv).
- Up to 6 attachments per entry, 25 MB each for pictures/documents and 200 MB for video; clear message when a file is too large or an unsupported type.
- Each file shows as a small tile while uploading, with a remove control before publishing.
- Choose who sees it: My network (default) or Private to me.

**Read an entry**
- Journal entries render inside the existing entry card: images in a compact gallery, video with an inline player, documents as a titled row that opens in a new tab.
- A member's profile gets a "Journal" section listing their entries newest-first, with a "See all" expansion. Your own profile shows your entries plus the composer.
- Private entries are only visible to their author.

**Empty states**
- Own profile with no entries: short editorial prompt explaining what a Journal is for and one button to write the first entry.
- Another member with no entries: a single quiet line, no empty boxes.

## Technical notes

**Database**
- `posts` gains `media jsonb not null default '[]'` (array of `{path, kind, name, mime, size}`) and `visibility text not null default 'network'`.
- Read policy adjusted so network entries are readable by approved members and private entries only by their author; write/update/delete stay author-scoped.

**Storage**
- New private bucket `journal` with member-owned folders (`<user_id>/...`): authors write/delete their own objects, approved members read.
- Media is fetched through short-lived signed URLs, cached in memory the same way `src/aetheris/avatar.tsx` caches portraits.

**Code**
- `src/aetheris/live.ts`: `uploadJournalMedia(userId, file)`, media + visibility mapping in `loadLiveDirectory`, signed-URL helper.
- `src/aetheris/db.ts` / `social.ts`: `Post` gains `media` and `visibility`; `savePost` persists both.
- `src/aetheris/store.tsx`: `addPost(text, detail, media, visibility)`; entries still feed Active Memory as today.
- `src/aetheris/App.tsx`: new `JournalComposer` and `JournalMedia` components; `PostCard` renders media; profile pages get the Journal section; copy changed from "post" to "Journal entry".
- `src/aetheris/styles.css`: Journal composer, attachment tiles, gallery and document row styles in the existing dark intelligence tokens (cobalt actions, amber signals, hairlines).

No new dependencies, no demo/fake entries — `/demo` keeps its own catalogue, the live path stays real data only.
