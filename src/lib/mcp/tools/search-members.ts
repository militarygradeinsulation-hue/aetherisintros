import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

// Live, approved members only (profiles RLS). The `members` table is the labelled /demo
// showcase catalogue and must never be offered to an assistant as real people.
export const MEMBER_COLUMNS =
  "id,name,title,company,location,focus,bio,looking_for,can_help_with,want_to_meet,availability,industries,expertise,what_i_do,building,open_to";

export default defineTool({
  name: "search_members",
  title: "Search members",
  description:
    "Search verified Ask Intros members by name, role, company, focus, what they are looking for or what they can help with. Returns only what members state on their own profiles; never infer more.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Free text to match against name, title, company, focus, bio, what they want or what they offer."),
    industry: z.string().trim().min(1).optional().describe("Restrict results to members who list this industry."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum members to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, industry, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseForUser(ctx) as any;
    let request = supabase
      .from("profiles")
      .select(MEMBER_COLUMNS)
      .eq("onboarded", true)
      .neq("id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (industry) request = request.contains("industries", [industry]);
    if (query) {
      const q = query.replace(/[,%()]/g, " ").trim();
      request = request.or(
        `name.ilike.%${q}%,title.ilike.%${q}%,company.ilike.%${q}%,focus.ilike.%${q}%,bio.ilike.%${q}%,looking_for.ilike.%${q}%,can_help_with.ilike.%${q}%,what_i_do.ilike.%${q}%`,
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
