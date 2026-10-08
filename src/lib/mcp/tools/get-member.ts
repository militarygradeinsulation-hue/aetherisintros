import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { MEMBER_COLUMNS } from "./search-members";

export default defineTool({
  name: "get_member",
  title: "Get member",
  description:
    "Read one verified Ask Intros member's own stated profile: focus, what they are looking for, what they can help with, availability and what they are open to.",
  inputSchema: { member_id: z.string().uuid().describe("The member id returned by search_members.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ member_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseForUser(ctx) as any;
    const { data, error } = await supabase.from("profiles").select(MEMBER_COLUMNS).eq("id", member_id).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No verified member found with id ${member_id}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { member: data },
    };
  },
});
