import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "post_ask",
  title: "Post an ask",
  description:
    "Post a professional ask for the signed-in member: what they need right now, why now, and what they can offer in return. No mass outreach — one clear ask at a time.",
  inputSchema: {
    ask: z.string().trim().min(4).describe("The ask in one sentence."),
    detail: z.string().trim().optional().describe("Context that helps someone judge whether they can help."),
    why_now: z.string().trim().optional().describe("Why the timing matters."),
    offer: z.string().trim().optional().describe("What the member gives in return."),
    industry: z.string().trim().optional(),
    location: z.string().trim().optional(),
    urgency: z.enum(["low", "medium", "high"]).default("medium"),
    visibility: z.enum(["network", "private"]).default("network"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const id = `ask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await supabase
      .from("asks")
      .insert({
        id,
        author_id: ctx.getUserId(),
        ask: input.ask,
        detail: input.detail ?? "",
        why_now: input.why_now ?? "",
        offer: input.offer ?? "",
        industry: input.industry ?? "",
        location: input.location ?? "",
        urgency: input.urgency ?? "medium",
        visibility: input.visibility ?? "network",
        posted: "Just now",
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Ask posted: ${input.ask}` }],
      structuredContent: { ask: data },
    };
  },
});
