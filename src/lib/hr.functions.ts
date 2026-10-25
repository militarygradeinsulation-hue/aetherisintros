import { setResponseHeader } from "@tanstack/react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { requireAuthContract } from "./auth-gate";
import { routeLlmChat } from "./aiGateway.server";
import {
  hrCommand,
  aiRequest,
  contextSchema,
  tailorContext,
  type HRState,
  type Profile,
} from "@/features/hr/model";
import { hrPrompt } from "./hr.engine";

type Context = { userId: string; supabase: any };
async function profile(c: Context): Promise<Profile> {
  const { data, error } = await c.supabase
    .from("profiles")
    .select("id,company,industries,what_i_do,location")
    .eq("id", c.userId)
    .maybeSingle();
  if (error || !data)
    throw new Error(
      "Your business profile could not be loaded. Reopen your account and try again.",
    );
  return data;
}
async function read(c: Context, action = "load", payload: unknown = {}): Promise<HRState> {
  setResponseHeader("Cache-Control", "no-store");
  const { data, error } = await c.supabase.rpc("hr_workspace", {
    p_action: action,
    p_data: payload,
  });
  if (error) {
    if (action === "load" && ["PGRST202", "42P01"].includes(error.code)) {
      return {
        userId: c.userId,
        context: tailorContext(await profile(c)),
        version: 0,
        records: [],
        audit: [],
        aiAvailable: false,
        storageReady: false,
      };
    }
    if (error.code === "40001")
      throw new Error(
        "This HR record changed on another device. Export your work, reload, and review the saved version before retrying.",
      );
    if (error.code === "42501")
      throw new Error(
        "You do not have access to this HR record. Check your account and membership.",
      );
    if (["22023", "P0001"].includes(error.code)) throw new Error(error.message);
    throw new Error("HR changes were not saved. Your entries are still here. Please retry.");
  }
  return {
    ...data,
    userId: c.userId,
    context: data.context ?? tailorContext(await profile(c)),
    aiAvailable: Boolean(process.env["ROUTELLM_API_KEY"]),
    storageReady: true,
  } as HRState;
}
export const loadHR = createServerFn({ method: "GET" })
  .middleware([requireAuthContract])
  .handler(async ({ context }) => read(context));
export const saveHR = createServerFn({ method: "POST" })
  .middleware([requireAuthContract])
  .inputValidator(hrCommand)
  .handler(async ({ data, context }) => {
    const { action, ...payload } = data;
    return read(context, action, payload);
  });
export const askHR = createServerFn({ method: "POST" })
  .middleware([requireAuthContract])
  .inputValidator(aiRequest)
  .handler(async ({ data, context }) => {
    const state = await read(context);
    if (!state.storageReady || !state.version)
      throw new Error("Confirm and save your business setup before using HR AI.");
    if (!state.aiAvailable)
      throw new Error(
        "The HR AI provider is not connected. Your records and manual tools remain available.",
      );
    const business = contextSchema.parse(state.context);
    let answer: string;
    try {
      answer = await routeLlmChat(hrPrompt(business, data));
    } catch {
      throw new Error("HR AI could not respond. Your question is still here. Please retry.");
    }
    if (!answer.trim() || answer.length > 16000)
      throw new Error("The response could not be used. Try a more focused question.");
    return { userId: context.userId, answer };
  });
