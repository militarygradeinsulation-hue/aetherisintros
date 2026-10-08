import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_asks",
  title: "List network asks",
  description:
    "List the professional asks (what members need right now) visible to the signed-in member, newest first. Optionally filter by industry or urgency.",
  inputSchema: {
    industry: z.string().trim().min(1).optional().describe("Restrict asks to one industry."),
    urgency: z.enum(["low", "medium", "high"]).optional().describe("Restrict asks to one urgency level."),
    limit: z.number().int().min(1).max(50).default(15).describe("Maximum asks to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ industry, urgency, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("asks")
      .select("id,member_id,ask,detail,why_now,offer,industry,location,urgency,posted,response_count,visibility,created_at")
      // Live member asks only: showcase rows are /demo content, and closed asks are no longer true.
      .eq("is_demo", false)
      .not("author_id", "is", null)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(limit ?? 15);
    if (industry) request = request.ilike("industry", `%${industry}%`);
    if (urgency) request = request.eq("urgency", urgency);
    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { asks: data ?? [] },
    };
  },
});
