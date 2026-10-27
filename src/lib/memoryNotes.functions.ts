import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireAuthContract } from "./auth-gate";
import { noteFields, NOTE_KIND } from "@/features/memory-notes/model";
import { conversationTranscript, findNoteRecords, saveNoteRecord } from "./memory-notes.server";

const identity = z.object({ owner: z.string().uuid(), id: z.string().uuid() });
export const saveMemoryNote = createServerFn({ method: "POST" })
  .middleware([requireAuthContract])
  .inputValidator(identity.extend({ note: noteFields, fromButler: z.boolean().default(false) }))
  .handler(async ({ data, context }) => {
    if (data.owner !== context.userId)
      throw new Error("Account changed. Retry in the current account.");
    return saveNoteRecord(
      context.supabase,
      context.userId,
      data.id,
      data.note,
      data.fromButler ? "Saved with Butler" : "Recorded by you",
    );
  });

export const listMemoryNotes = createServerFn({ method: "POST" })
  .middleware([requireAuthContract])
  .inputValidator(
    z.object({
      search: z.string().max(160).default(""),
      offset: z.number().int().min(0).max(100000).default(0),
    }),
  )
  .handler(({ data, context }) =>
    findNoteRecords(context.supabase, context.userId, data.search, data.offset),
  );

export const deleteMemoryNote = createServerFn({ method: "POST" })
  .middleware([requireAuthContract])
  .inputValidator(identity)
  .handler(async ({ data, context }) => {
    if (data.owner !== context.userId)
      throw new Error("Account changed. Retry in the current account.");
    const result = await context.supabase
      .from("memories")
      .delete()
      .eq("user_id", context.userId)
      .eq("id", data.id)
      .eq("kind", NOTE_KIND)
      .select("id");
    if (result.error || !result.data?.length)
      throw new Error("Note could not be deleted. Refresh and try again.");
    return { deleted: true };
  });

export const saveConversationNote = createServerFn({ method: "POST" })
  .middleware([requireAuthContract])
  .inputValidator(
    identity.extend({
      conversation: z.string().uuid(),
      through: z.string().uuid(),
      title: noteFields.shape.title,
      date: noteFields.shape.date,
      context: noteFields.shape.context,
    }),
  )
  .handler(async ({ data, context }) => {
    if (data.owner !== context.userId)
      throw new Error("Account changed. Retry in the current account.");
    const content = await conversationTranscript(
      context.supabase,
      context.userId,
      data.conversation,
      data.through,
    );
    return saveNoteRecord(
      context.supabase,
      context.userId,
      data.id,
      { title: data.title, date: data.date, context: data.context, content, type: "conversation" },
      "Butler conversation:" + data.conversation,
    );
  });
