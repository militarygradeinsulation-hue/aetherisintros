import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

// An assistant's request carries the same context capsule a member writes in the app:
// the target reviews exactly this before opting in, so an agent can never send a bare ask.
const why = (label: string) => z.string().trim().min(12, `${label} needs a real reason (12+ characters).`).max(600);

export default defineTool({
  name: "request_intro",
  title: "Request an introduction",
  description:
    "Request a double opt-in introduction to a member for the signed-in member. Every request carries a context capsule — why this introduction exists, why the member may care, why the other person may care, and why now — written from what the member actually told you. The other side reviews that capsule before opting in, so this never sends a pitch. Do not invent reasons; ask the member if any answer is missing.",
  inputSchema: {
    member_id: z.string().uuid().describe("The live member to be introduced to (their member id from search_members)."),
    why_exists: why("why_exists").describe("Why this introduction should exist at all."),
    why_requester: why("why_requester").describe("Why the signed-in member may care."),
    why_target: why("why_target").describe("Why the other person may care — what is in it for them."),
    why_now: why("why_now").describe("Why the timing is right now."),
    first_goal: z.string().trim().max(400).default("").describe("Goal for the first conversation, if the member stated one."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ member_id, why_exists, why_requester, why_target, why_now, first_goal }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    if (member_id === ctx.getUserId())
      return { content: [{ type: "text", text: "A member cannot request an introduction to themselves." }], isError: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseForUser(ctx) as any;
    const { data, error } = await supabase
      .from("intro_requests")
      .upsert(
        {
          user_id: ctx.getUserId(),
          member_id,
          reason: why_exists,
          mutual_value: why_target,
          status: "requested",
          requester_opt_in: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,member_id" },
      )
      .select("id,member_id,status,requester_opt_in,member_opt_in,created_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const existing = await supabase.from("intro_context_capsules").select("id").eq("intro_request_id", data.id).maybeSingle();
    if (existing.error) return { content: [{ type: "text", text: existing.error.message }], isError: true };
    if (!existing.data) {
      const capsule = await supabase.from("intro_context_capsules").insert({
        intro_request_id: data.id,
        why_exists,
        why_requester,
        why_target,
        why_now,
        first_goal: first_goal ?? "",
      });
      if (capsule.error) return { content: [{ type: "text", text: capsule.error.message }], isError: true };
    }
    await supabase.from("entity_events").insert({
      entity_type: "intro_request",
      entity_id: data.id,
      event: "capsule_shared",
      summary: "Introduction requested through an assistant with a context capsule",
      detail: { via: "mcp" },
      source: "ask-intros",
    });

    return {
      content: [
        {
          type: "text",
          text: existing.data
            ? `Introduction already requested; the existing context capsule was kept unchanged. Edit it in Ask Intros if it needs to change. Waiting on their opt-in.`
            : `Introduction requested with a context capsule. They will review exactly that context before opting in — nothing is sent until both sides agree.`,
        },
      ],
      structuredContent: { intro_request: data },
    };
  },
});
