import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_intro_requests",
  title: "List my introductions",
  description:
    "List the signed-in member's introduction requests with their double opt-in status, reason and mutual value.",
  inputSchema: {
    status: z.enum(["requested", "accepted", "declined", "connected"]).optional().describe("Filter by status."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("intro_requests")
      .select("id,member_id,status,reason,mutual_value,requester_opt_in,member_opt_in,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) request = request.eq("status", status);
    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { intro_requests: data ?? [] },
    };
  },
});
