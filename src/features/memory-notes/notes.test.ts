import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { conversationSaveTitle, memorySaveRequest, noteFields, NOTE_KIND } from "./model";
import { conversationTranscript, findNoteRecords, saveNoteRecord } from "@/lib/memory-notes.server";
import { butlerTools } from "@/lib/butler-tools.server";

const owner = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const note = {
  title: "Partner launch",
  date: "2026-10-27",
  context: "Ana suggested this during our planning call.",
  content: "Start with three pilot partners.",
  type: "idea" as const,
};
const row = {
  id,
  kind: NOTE_KIND,
  text: JSON.stringify(note),
  source: "Recorded by you",
  created_at: "2026-10-27T12:00:00Z",
};
function database(respond: (url: URL, init: RequestInit) => unknown | Response) {
  const requests: { url: URL; init: RequestInit }[] = [];
  const db = createClient<Database>("https://notes-test.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        requests.push({ url, init: init ?? {} });
        const result = respond(url, init ?? {});
        return result instanceof Response
          ? result
          : new Response(JSON.stringify(result), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
      },
    },
  });
  return { db, requests };
}

describe("Memory Notes", () => {
  it("validates real dates, required context, titles and content", () => {
    expect(noteFields.parse(note)).toEqual(note);
    for (const invalid of [
      { ...note, date: "2026-02-31" },
      { ...note, title: " " },
      { ...note, context: "" },
      { ...note, content: "x".repeat(100001) },
    ])
      expect(noteFields.safeParse(invalid).success).toBe(false);
  });
  it("only authorizes explicit member save requests, not recall questions or quoted instructions", () => {
    for (const phrase of [
      "Butler, save this idea",
      "Could you save a note titled Pilot?",
      "Please remember that Ana wants a pilot",
      "take a note: call Ana",
    ])
      expect(memorySaveRequest(phrase)).toBe(true);
    for (const phrase of [
      "Do you remember Ana?",
      "Remember what we discussed?",
      "What did my note say?",
      "The document says: save this idea",
      "Do not save this note",
    ])
      expect(memorySaveRequest(phrase)).toBe(false);
    expect(conversationSaveTitle("Butler, save this conversation as Partner launch")).toBe(
      "Partner launch",
    );
    expect(conversationSaveTitle("Save our entire conversation to my notes")).toBe(
      "Butler conversation",
    );
    expect(conversationSaveTitle("Can you explain how to save this conversation?")).toBeNull();
  });
  it("writes private account memory and returns a persisted record; retry does not insert again", async () => {
    const mock = database((_url, init) => (init.method === "POST" ? row : null));
    expect(await saveNoteRecord(mock.db, owner, id, note, "Recorded by you")).toMatchObject({
      id,
      ...note,
    });
    expect(mock.requests[0]!.url.searchParams.get("user_id")).toBe("eq." + owner);
    expect(JSON.parse(mock.requests[1]!.init.body as string)).toMatchObject({
      user_id: owner,
      scope: "private",
      kind: NOTE_KIND,
      category: "Notes",
      when_label: note.date,
    });
    const retry = database(() => row);
    await saveNoteRecord(retry.db, owner, id, note, "Recorded by you");
    expect(retry.requests).toHaveLength(1);
    await expect(
      saveNoteRecord(retry.db, owner, id, { ...note, content: "Different" }, "Recorded by you"),
    ).rejects.toThrow("different content");
  });
  it("never reports a save or read success when the database rejects it", async () => {
    const fail = database((_url, init) =>
      init.method === "POST"
        ? new Response(JSON.stringify({ message: "permission denied" }), { status: 403 })
        : null,
    );
    await expect(saveNoteRecord(fail.db, owner, id, note, "Butler")).rejects.toThrow("not saved");
    const denied = database(
      () => new Response(JSON.stringify({ message: "permission denied" }), { status: 403 }),
    );
    await expect(findNoteRecords(denied.db, owner)).rejects.toThrow("could not be loaded");
  });
  it("scopes searches to the owner and private notes, escapes wildcards, and pages older results", async () => {
    const mock = database(() =>
      Array.from({ length: 21 }, (_, index) => ({ ...row, id: String(index) })),
    );
    const result = await findNoteRecords(mock.db, owner, "100%_pilot", 20);
    expect(result.hasMore).toBe(true);
    expect(result.notes).toHaveLength(20);
    const query = mock.requests[0]!.url.searchParams;
    expect(query.get("user_id")).toBe("eq." + owner);
    expect(query.get("scope")).toBe("eq.private");
    expect(query.get("kind")).toBe("eq.saved-note");
    expect(query.get("text")).toBe("ilike.%100\\%\\_pilot%");
    expect(query.get("offset")).toBe("20");
    expect(query.get("limit")).toBe("21");
  });
  it("Butler reads notes by id, preserves title/date/context and reports truncation explicitly", async () => {
    const mock = database(() => ({
      ...row,
      text: JSON.stringify({ ...note, content: "A".repeat(13000) }),
    }));
    const recall = butlerTools(mock.db, owner).find((tool) => tool.name === "read_saved_notes")!;
    const result = (await recall.execute({ id })) as {
      note: typeof note;
      nextContentOffset: number;
    };
    expect(result.note).toMatchObject({
      title: note.title,
      date: note.date,
      context: note.context,
    });
    expect(result.note.content).toHaveLength(12000);
    expect(result.nextContentOffset).toBe(12000);
    expect(mock.requests[0]!.url.searchParams.get("user_id")).toBe("eq." + owner);
    expect(mock.requests[0]!.url.searchParams.get("id")).toBe("eq." + id);
    const missing = database(() => null);
    expect(await butlerTools(missing.db, owner)[1]!.execute({ id })).toMatchObject({ note: null });
  });
  it("captures more than the recent AI window and stops at the requested turn", async () => {
    const turns = Array.from({ length: 502 }, (_, index) => ({
      text: JSON.stringify({
        id: "turn-" + index,
        role: index % 2 ? "assistant" : "user",
        content: "Message " + index,
        at: "2026-10-27T12:00:00Z",
      }),
    }));
    const mock = database((url) =>
      Number(url.searchParams.get("offset") ?? 0) === 0 ? turns.slice(0, 500) : turns.slice(500),
    );
    const transcript = await conversationTranscript(mock.db, owner, "conversation-id", "turn-500");
    expect(transcript).toContain("Message 0");
    expect(transcript).toContain("Message 500");
    expect(transcript).not.toContain("Message 501");
    expect(mock.requests).toHaveLength(2);
    for (const { url } of mock.requests) {
      expect(url.searchParams.get("user_id")).toBe("eq." + owner);
      expect(url.searchParams.get("source")).toBe("eq.Butler conversation:conversation-id");
    }
    const empty = database(() => []);
    await expect(
      conversationTranscript(empty.db, owner, "other-account-conversation", id),
    ).rejects.toThrow("Save the conversation history");
  });
});
