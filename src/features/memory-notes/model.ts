import { z } from "zod";

export const NOTE_KIND = "saved-note";
export const NOTE_CATEGORY = "Notes";
export const NOTES_CHANGED = "aetheris:memory-notes-changed";
export const noteFields = z.object({
  title: z.string().trim().min(1).max(160),
  date: z.string().date(),
  context: z.string().trim().min(1).max(2000),
  content: z.string().trim().min(1).max(100000),
  type: z.enum(["note", "idea", "conversation"]),
});
export type NoteFields = z.infer<typeof noteFields>;
export interface MemoryNote extends NoteFields {
  id: string;
  createdAt: string;
  source: string;
}
export function decodeNote(row: {
  id: string;
  text: string;
  created_at: string;
  source: string;
}): MemoryNote {
  const fields = noteFields.parse(JSON.parse(row.text));
  return { ...fields, id: row.id, createdAt: row.created_at, source: row.source };
}
export function localNoteDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Only a direct member request can authorize a model-proposed note write. */
export function memorySaveRequest(phrase: string) {
  const text = phrase
    .trim()
    .replace(/^(?:(?:hey|ok|okay)\s+)?(?:butler|ask intros|intros)[,\s:]+/i, "")
    .replace(/^please\s+/i, "")
    .replace(/^(?:can|could|would|will) you\s+/i, "")
    .replace(/^please\s+/i, "");
  if (/^remember\s+(?:what|when|where|who|why|how|whether|if|anything)\b/i.test(text)) return false;
  return /^(?:(?:save|store|keep|remember|record)\b|(?:take|make|add|write|jot)\s+(?:(?:a|this|the|my)\s+)?(?:note|idea)\b|(?:note(?: that)?|write down|jot down)\s)/i.test(
    text,
  );
}

/** Exact conversation capture runs without the language provider. */
export function conversationSaveTitle(phrase: string): string | null {
  if (!memorySaveRequest(phrase)) return null;
  const match = phrase.match(
    /\b(?:save|store|keep|remember|record)\s+(?:this|our|the|my)\s+(?:whole\s+|entire\s+)?(?:conversation|chat|discussion)(?:\s+(?:to|in)\s+(?:my\s+)?(?:memory|notes))?(?:\s+(?:as|called|titled|with (?:the )?title)\s+(.+?))?[.!]?$/i,
  );
  if (!match) return null;
  return (match[1]?.replace(/^["“]|["”]$/g, "").trim() || "Butler conversation").slice(0, 160);
}
