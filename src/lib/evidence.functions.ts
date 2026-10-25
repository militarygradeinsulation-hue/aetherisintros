import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireAuthContract } from "./auth-gate";
import {
  evidenceCommand,
  emptyPreferences,
  type EvidenceState,
} from "@/features/evidence-loop/model";
async function read(
  context: { userId: string; supabase: any },
  action = "load",
  payload: unknown = {},
): Promise<EvidenceState> {
  setResponseHeader("Cache-Control", "no-store");
  const { data, error } = await context.supabase.rpc("evidence_workspace", {
    p_action: action,
    p_data: payload,
  });
  if (error) {
    if (action === "load" && ["PGRST202", "42P01"].includes(error.code))
      return {
        userId: context.userId,
        storageReady: false,
        preferences: emptyPreferences,
        records: [],
        newcomerUntil: null,
        vouches: [],
      };
    if (["22023", "42501"].includes(error.code)) throw new Error(error.message);
    throw new Error("Your evidence changes were not saved. Please retry.");
  }
  return { ...data, userId: context.userId, storageReady: true };
}
export const loadEvidence = createServerFn({ method: "GET" })
  .middleware([requireAuthContract])
  .handler(async ({ context }) => read(context));
export const saveEvidence = createServerFn({ method: "POST" })
  .middleware([requireAuthContract])
  .inputValidator(evidenceCommand)
  .handler(async ({ context, data }) => {
    const { action, ...payload } = data;
    return read(context, action, payload);
  });
