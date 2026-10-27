import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  decodeNote,
  NOTE_CATEGORY,
  NOTE_KIND,
  noteFields,
  type NoteFields,
} from "@/features/memory-notes/model";

type DB = SupabaseClient<Database>;
export async function saveNoteRecord(
  db: DB,
  owner: string,
  id: string,
  fields: NoteFields,
  source: string,
) {
  const text = JSON.stringify(noteFields.parse(fields));
  const previous = await db
    .from("memories")
    .select("id,text,kind,created_at,source")
    .eq("user_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (previous.error) throw new Error("Could not check this note. Please retry.");
  if (previous.data) {
    if (previous.data.kind !== NOTE_KIND || previous.data.text !== text)
      throw new Error("This note ID already has different content.");
    return decodeNote(previous.data);
  }
  const saved = await db
    .from("memories")
    .insert({
      id,
      user_id: owner,
      kind: NOTE_KIND,
      category: NOTE_CATEGORY,
      text,
      source,
      scope: "private",
      confidence: 100,
      when_label: fields.date,
    })
    .select("id,text,created_at,source")
    .single();
  if (saved.error || !saved.data) throw new Error("Note was not saved. Please retry.");
  return decodeNote(saved.data);
}

export async function findNoteRecords(db: DB, owner: string, search = "", offset = 0, limit = 20) {
  let request = db
    .from("memories")
    .select("id,text,created_at,source")
    .eq("user_id", owner)
    .eq("kind", NOTE_KIND)
    .eq("scope", "private")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  // One bound filter; quotes, punctuation and wildcard characters cannot inject an OR expression.
  if (search.trim())
    request = request.ilike("text", `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`);
  const result = await request.range(offset, offset + limit);
  if (result.error) throw new Error("Saved notes could not be loaded. Please retry.");
  const rows = result.data ?? [];
  return { notes: rows.slice(0, limit).map(decodeNote), hasMore: rows.length > limit };
}

export async function conversationTranscript(
  db: DB,
  owner: string,
  conversation: string,
  through: string,
) {
  const turns: { id: string; role: string; content: string; at: string }[] = [];
  // Page through saved history, not merely the 24 turns sent to the language provider.
  for (let offset = 0; offset < 10000; offset += 500) {
    const result = await db
      .from("memories")
      .select("text")
      .eq("user_id", owner)
      .eq("scope", "private")
      .eq("category", "Butler conversations")
      .eq("source", "Butler conversation:" + conversation)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 499);
    if (result.error)
      throw new Error("Conversation could not be read. Nothing was saved to Notes.");
    for (const row of result.data ?? []) {
      const turn = JSON.parse(row.text) as (typeof turns)[number];
      if (
        !["user", "assistant"].includes(turn.role) ||
        typeof turn.content !== "string" ||
        typeof turn.at !== "string"
      )
        throw new Error("Conversation contains an unreadable message.");
      turns.push(turn);
    }
    const end = turns.findIndex((turn) => turn.id === through);
    if (end >= 0) {
      const content = turns
        .slice(0, end + 1)
        .map((turn) => `${turn.role === "user" ? "You" : "Butler"} · ${turn.at}\n${turn.content}`)
        .join("\n\n");
      if (content.length > 100000)
        throw new Error(
          "This conversation is too long for one note. Ask Butler to save a shorter summary instead.",
        );
      return content;
    }
    if ((result.data?.length ?? 0) < 500) break;
  }
  throw new Error("Save the conversation history successfully before saving it to Notes.");
}
