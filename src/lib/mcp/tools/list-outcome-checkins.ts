import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_outcome_checkins",
  title: "List introductions due for a follow-up",
  description:
    "List the signed-in member's accepted introductions that are due an outcome check-in (7, 30 or 90 days after acceptance). Ask the member what happened, then record it with record_intro_outcome.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseForUser(ctx) as any;
    const { data, error } = await supabase.rpc("my_due_outcome_checkins");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { checkins: data ?? [] },
    };
  },
});
