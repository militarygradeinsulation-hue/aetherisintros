import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "request_intro",
  title: "Request an introduction",
  description:
    "Request a double opt-in introduction to a member for the signed-in member. The request is recorded as 'requested' — the other side still has to opt in, so this never sends a pitch.",
  inputSchema: {
    member_id: z.string().trim().min(1).describe("The member to be introduced to."),
    reason: z.string().trim().min(4).describe("Why this relationship makes sense."),
    mutual_value: z.string().trim().optional().describe("What the other person gets out of it."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ member_id, reason, mutual_value }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("intro_requests")
      .upsert(
        {
          user_id: ctx.getUserId(),
          member_id,
          reason,
          mutual_value: mutual_value ?? "",
          status: "requested",
          requester_opt_in: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,member_id" },
      )
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        {
          type: "text",
          text: `Introduction requested with ${member_id}. Waiting on their opt-in — nothing is sent until both sides agree.`,
        },
      ],
      structuredContent: { intro_request: data },
    };
  },
});
