import { createServerFn } from "@tanstack/react-start";
import { requireAuthContract } from "./auth-gate";
import { networkValueCommand, type NetworkSnapshot } from "@/features/network-value/model";

export const networkValue = createServerFn({ method: "POST" })
  .middleware([requireAuthContract])
  .inputValidator(networkValueCommand)
  .handler(async ({ data, context }) => {
    const { action, ...payload } = data;
    const { data: result, error } = await context.supabase.rpc(
      "network_value" as never,
      { p_action: action, p_data: payload } as never,
    );
    if (error) {
      if (error.code === "PGRST202" || error.code === "42P01")
        throw new Error("Network systems are awaiting database activation. No changes were saved.");
      throw new Error(
        error.code === "42501"
          ? "Your account does not have permission for this action. Check membership and business verification."
          : error.code === "22023" || error.code === "P0001"
            ? error.message
            : "This action could not be completed. Your form is still here. Please retry.",
      );
    }
    return result as unknown as NetworkSnapshot;
  });
