import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const exchangeKinds = [
  "Partnership",
  "Advisory role",
  "Board seat",
  "Acquisition",
  "Investment",
  "Pilot",
  "Hiring",
  "Expert request",
] as const;
const interest = z.object({ memberId: z.string().uuid(), note: z.string(), when: z.string() });
export const exchangeRow = z.object({
  id: z.string(),
  ownerId: z.string().uuid(),
  visibility: z.string(),
  createdAt: z.string(),
  title: z.string(),
  objective: z.string(),
  kind: z.enum(exchangeKinds),
  whatIsNeeded: z.string(),
  whatIsOffered: z.string(),
  mutualValue: z.string(),
  expiresOn: z.string(),
  status: z.enum(["open", "in-conversation", "room-open", "deal-room", "expired", "closed"]),
  saved: z.boolean(),
  interest: z.array(interest),
});
export type ExchangeOpportunity = z.infer<typeof exchangeRow>;
export type ExchangeDraft = Pick<
  ExchangeOpportunity,
  | "title"
  | "objective"
  | "kind"
  | "whatIsNeeded"
  | "whatIsOffered"
  | "mutualValue"
  | "expiresOn"
  | "visibility"
>;
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
