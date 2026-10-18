import { z } from "zod";
import type { OpportunityKind } from "./domain/pro-models";

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
export const exchangeReadableKinds = [
  ...exchangeKinds,
  "Succession",
  "Distribution",
  "Consulting",
  "Supplier relationship",
  "Licensing",
  "Speaking",
  "Joint venture",
  "Strategic introduction",
  "Capital deployment",
] as const satisfies readonly OpportunityKind[];
const interest = z.object({ memberId: z.string().uuid(), note: z.string(), when: z.string() });
export const exchangeRow = z.object({
  id: z.string(),
  ownerId: z.string().uuid(),
  visibility: z.string(),
  createdAt: z.string(),
  title: z.string(),
  objective: z.string(),
  kind: z.enum(exchangeReadableKinds),
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
