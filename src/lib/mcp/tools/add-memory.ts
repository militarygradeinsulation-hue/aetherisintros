import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_memory",
  title: "Add to Active Memory",
  description:
    "Record a piece of learned context in the signed-in member's Active Memory so future introductions and timing improve. Private by default.",
  inputSchema: {
    text: z.string().trim().min(4).describe("The observation, commitment or context to remember."),
    category: z.string().trim().min(1).default("People").describe("e.g. People, Needs, Timing, Commitments."),
    member_id: z.string().trim().min(1).optional().describe("The member this context is about, if any."),
    scope: z.enum(["private", "team", "organization", "shareable", "public"]).default("private"),
    confidence: z.number().int().min(1).max(100).default(100),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ text, category, member_id, scope, confidence }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("memories")
      .insert({
        user_id: ctx.getUserId(),
        kind: "learning",
        category: category ?? "People",
        member_id: member_id ?? null,
        text,
        source: "Agent integration",
        confidence: confidence ?? 100,
        scope: scope ?? "private",
        when_label: "Just now",
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: "Added to Active Memory." }],
      structuredContent: { memory: data },
    };
  },
});
