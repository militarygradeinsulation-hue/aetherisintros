import { z } from "zod";

export const METRICS = {
  response_minutes: {
    label: "Lead response time",
    unit: "minutes",
    lowerIsBetter: true,
    max: 43200,
  },
  followup_percent: {
    label: "Quote follow up within 48 hours",
    unit: "%",
    lowerIsBetter: false,
    max: 100,
  },
  close_percent: { label: "Close rate", unit: "%", lowerIsBetter: false, max: 100 },
} as const;
export type Metric = keyof typeof METRICS;
const id = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
export const networkValueCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("load"), radius: z.number().int().min(5).max(100).default(60) }),
  z.object({
    action: z.literal("location"),
    city: text(100),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  z.object({
    action: z.literal("capacity_post"),
    id,
    kind: z.enum(["available", "needed"]),
    title: text(120),
    details: text(2000),
    starts_at: z.iso.datetime(),
    expires_at: z.iso.datetime(),
    radius: z.number().int().min(5).max(100),
  }),
  z.object({ action: z.literal("capacity_close"), id }),
  z.object({ action: z.literal("capacity_request"), post_id: id, note: text(1000) }),
  z.object({ action: z.literal("capacity_terms"), id, terms: text(3000) }),
  z.object({ action: z.literal("capacity_accept"), id, terms: text(3000) }),
  z.object({ action: z.literal("capacity_decline"), id }),
  z.object({
    action: z.literal("benchmark_share"),
    metric: z.enum(["response_minutes", "followup_percent", "close_percent"]),
    value: z.number().finite().min(0).max(43200),
    consent: z.literal(true),
  }),
  z.object({
    action: z.literal("benchmark_withdraw"),
    metric: z.enum(["response_minutes", "followup_percent", "close_percent"]),
  }),
  z.object({
    action: z.literal("settlement_create"),
    id,
    seller_id: id,
    buyer_id: id,
    title: text(120),
    rate_bps: z.number().int().min(1).max(10000),
    cap_cents: z.number().int().min(100).max(100000000),
    window_months: z.number().int().min(1).max(24),
  }),
  z.object({
    action: z.literal("settlement_sign"),
    id,
    terms_hash: text(64),
    typed_name: text(150),
    consent: z.literal(true),
  }),
  z.object({ action: z.literal("settlement_release"), id }),
  z.object({
    action: z.literal("settlement_confirm"),
    id,
    step: z.enum(["intro_accepted", "meeting_held", "proposal_sent", "closed_won", "invoice_paid"]),
    evidence: text(1500),
    invoice_cents: z.number().int().min(1).max(1000000000).optional(),
  }),
  z.object({ action: z.literal("settlement_cancel"), id }),
]);
export type NetworkCommand = z.input<typeof networkValueCommand>;
export type CapacityPost = {
  id: string;
  owner_id: string;
  kind: "available" | "needed";
  title: string;
  details: string;
  city: string;
  company: string;
  distance_miles: number;
  starts_at: string;
  expires_at: string;
  radius: number;
  closed_at: string | null;
};
export type CapacityLetter = {
  id: string;
  post_id: string;
  owner_id: string;
  requester_id: string;
  title: string;
  note: string;
  terms: string;
  state: "pending" | "offered" | "accepted" | "declined";
  created_at: string;
};
export type BenchmarkResult = {
  metric: Metric;
  period: string;
  value: number;
  median: number;
  p25: number;
  p75: number;
  companies_at_least: number;
};
export type Settlement = {
  id: string;
  connector_id: string;
  seller_id: string;
  buyer_id: string;
  title: string;
  terms: Record<string, string | number | null>;
  terms_hash: string;
  rate_bps: number;
  cap_cents: number;
  platform_bps: number;
  window_months: number;
  released_at: string | null;
  cancelled_at: string | null;
  signatures: Array<{ user_id: string; typed_name: string; signed_at: string }>;
  events: Array<{
    step: string;
    actor_id: string;
    evidence: string;
    created_at: string;
    invoice_cents: number | null;
  }>;
};
export type NetworkSnapshot = {
  referrals_ready: boolean;
  user_id: string;
  verified: boolean;
  location: { city: string; latitude: number; longitude: number } | null;
  cohort: { trade: string; size_band: string; region: string } | null;
  period: string;
  contributions: Array<{ metric: Metric; value: number }>;
  benchmarks: BenchmarkResult[];
  posts: CapacityPost[];
  letters: CapacityLetter[];
  settlements: Settlement[];
  members: Array<{ id: string; name: string; company: string }>;
};
export const STEPS = [
  "intro_accepted",
  "meeting_held",
  "proposal_sent",
  "closed_won",
  "invoice_paid",
] as const;
export const STEP_LABELS = [
  "Introduction accepted",
  "Meeting held",
  "Proposal sent",
  "Closed won",
  "First invoice paid",
];
export function verdict(result: BenchmarkResult) {
  const lower = METRICS[result.metric].lowerIsBetter;
  if (result.p25 === result.p75 && result.value === result.median) return "At the peer median";
  if (lower ? result.value < result.p25 : result.value > result.p75) return "Top quartile";
  if (lower ? result.value > result.p75 : result.value < result.p25) return "Bottom quartile";
  return "Middle half";
}
export function feeBreakdown(
  invoiceCents: number,
  rateBps: number,
  capCents: number,
  platformBps = 1000,
) {
  if (
    ![invoiceCents, rateBps, capCents, platformBps].every(Number.isSafeInteger) ||
    invoiceCents < 0 ||
    capCents < 0 ||
    rateBps < 0 ||
    rateBps > 10000 ||
    platformBps < 0 ||
    platformBps > 10000
  )
    throw new Error("Invalid fee inputs");
  const fee = Math.min(Math.round((invoiceCents * rateBps) / 10000), capCents);
  const platform = Math.round((fee * platformBps) / 10000);
  return { fee, platform, connector: fee - platform };
}
export const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
