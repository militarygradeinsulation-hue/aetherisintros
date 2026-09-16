import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description:
    "Read the signed-in member's own Aetheris Intros profile: focus, thesis, looking for, can help with, boundaries, availability, industries and expertise.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, name, initials, title, company, location, focus, thesis, bio, looking_for, can_help_with, want_to_meet, availability, industries, expertise, avatar_url, onboarded, created_at",
      )
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "No profile yet — complete onboarding in Aetheris Intros first." }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { profile: data } };
  },
});
