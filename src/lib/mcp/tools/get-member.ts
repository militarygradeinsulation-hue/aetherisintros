import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_member",
  title: "Get member",
  description:
    "Read one Ask Intros member in full, including focus, thesis, availability, trust path, next action and the reasoning behind a possible introduction.",
  inputSchema: { member_id: z.string().trim().min(1).describe("The member id returned by search_members.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ member_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("members").select("*").eq("id", member_id).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No member found with id ${member_id}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { member: data },
    };
  },
});
