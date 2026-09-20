import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_members",
  title: "Search members",
  description:
    "Search the Ask Intros network for members by name, role, industry, expertise, needs or offers. Returns match reasoning fields (why them, why you, why now) when present.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Free text to match against name, title, company, industry or bio."),
    industry: z.string().trim().min(1).optional().describe("Restrict results to one industry."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum members to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, industry, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("members")
      .select("id,name,title,company,location,role,industry,bio,expertise,needs,offers,why_them,why_you,why_now,score_total,relationship_status")
      .order("score_total", { ascending: false })
      .limit(limit ?? 10);
    if (industry) request = request.ilike("industry", `%${industry}%`);
    if (query) {
      const q = query.replace(/[,%]/g, " ").trim();
      request = request.or(
        `name.ilike.%${q}%,title.ilike.%${q}%,company.ilike.%${q}%,industry.ilike.%${q}%,bio.ilike.%${q}%,role.ilike.%${q}%`,
      );
    }
    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { members: data ?? [] },
    };
  },
});
