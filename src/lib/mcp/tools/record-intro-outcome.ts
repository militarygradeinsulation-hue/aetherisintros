import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "record_intro_outcome",
  title: "Record what an introduction led to",
  description:
    "Append what happened after an accepted introduction, as the signed-in member said it. Only record what the member actually told you — never infer an outcome. Private unless the member explicitly asks to share it with the other participant.",
  inputSchema: {
    intro_request_id: z.string().uuid().describe("The accepted introduction."),
    stage: z.enum(["too_early", "met", "next_step", "outcome", "no_outcome"]),
    outcome_category: z
      .enum(["customer", "partnership", "hire", "investor", "advisor", "board", "vendor", "acquisition", "knowledge", "other"])
      .optional()
      .describe("Required when stage is 'outcome'."),
    attribution: z.enum(["direct", "influenced", "contextual"]).default("direct"),
    value_band: z
      .enum(["undisclosed", "under_10k", "10k_100k", "100k_1m", "over_1m"])
      .default("undisclosed")
      .describe("Only if the member volunteered it; otherwise undisclosed."),
    private_note: z.string().max(1000).default(""),
    shareable: z.boolean().default(false),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    if (input.stage === "outcome" && !input.outcome_category)
      return { content: [{ type: "text", text: "outcome_category is required when stage is 'outcome'." }], isError: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseForUser(ctx) as any;
    const isOutcome = input.stage === "outcome";
    const { error } = await supabase.from("intro_outcomes").insert({
      intro_request_id: input.intro_request_id,
      stage: input.stage,
      outcome_category: isOutcome ? input.outcome_category : null,
      attribution: input.attribution ?? "direct",
      value_band: isOutcome ? (input.value_band ?? "undisclosed") : "undisclosed",
      private_note: input.private_note ?? "",
      shareable: input.shareable ?? false,
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Recorded '${input.stage}' for introduction ${input.intro_request_id}.` }] };
  },
});
