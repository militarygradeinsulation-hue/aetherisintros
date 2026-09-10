import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_memories",
  title: "List Active Memory",
  description:
    "List the signed-in member's Active Memory entries — learned context about people, needs, timing and commitments, newest first.",
  inputSchema: {
    category: z.string().trim().min(1).optional().describe("Filter by category, e.g. People, Needs, Timing."),
    member_id: z.string().trim().min(1).optional().describe("Only memories about this member."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, member_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("memories")
      .select("id,kind,category,member_id,text,source,confidence,scope,when_label,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (category) request = request.ilike("category", `%${category}%`);
    if (member_id) request = request.eq("member_id", member_id);
    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { memories: data ?? [] },
    };
  },
});
