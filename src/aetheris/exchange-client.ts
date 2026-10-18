import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { exchangeRow, type ExchangeDraft } from "./exchange-contract";
export {
  exchangeKinds,
  exchangeReadableKinds,
  type ExchangeDraft,
  type ExchangeOpportunity,
} from "./exchange-contract";

// RPCs use the caller's JWT and enforce membership/ownership in Postgres.
const db = supabase as unknown as {
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};
async function rpc(name: string, args?: Record<string, unknown>) {
  const result = await db.rpc(name, args);
  if (result.error)
    throw new Error(
      "Opportunity Exchange is unavailable. Your change was not confirmed. Refresh and try again, or contact support.",
    );
  return result.data;
}
export async function listExchange() {
  return z.array(exchangeRow).parse(await rpc("list_exchange_opportunities"));
}
export async function publishExchange(draft: ExchangeDraft) {
  return z.string().parse(await rpc("publish_exchange_opportunity", { p_input: draft }));
}
export async function actOnExchange(
  id: string,
  action: "save" | "unsave" | "interest" | "close",
  note = "",
) {
  await rpc("act_on_exchange_opportunity", { p_id: id, p_action: action, p_note: note });
}
