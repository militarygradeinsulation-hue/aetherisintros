import { z } from "zod";
export const TASKS = [
  { id: "contact", label: "Find and assess a contact", page: "discover" },
  { id: "prep", label: "Prepare for a meeting", page: "meetings" },
  { id: "followup", label: "Draft and review a follow-up", page: "messages" },
  { id: "context", label: "Retrieve context or a document", page: "memory" },
  { id: "content", label: "Prepare and review content", page: "executivework" },
  { id: "coordinate", label: "Coordinate a meeting", page: "calendar" },
] as const;
export type Task = (typeof TASKS)[number]["id"];
export type Preferences = { timing: boolean; ranking: boolean; newcomer: boolean };
export type TimeRecord = {
  id: string;
  task: Task;
  started_at: string;
  finished_at: string | null;
  active_seconds: number;
  baseline_seconds: number | null;
  baseline_kind: "estimate" | "observed" | null;
  baseline_samples: number;
};
export type EvidenceState = {
  userId: string;
  storageReady: boolean;
  preferences: Preferences;
  records: TimeRecord[];
  newcomerUntil: string | null;
  vouches: { id: string; body: string; display_approved: boolean; author_name: string }[];
};
export const emptyPreferences: Preferences = { timing: false, ranking: false, newcomer: false };
const task = z.enum(["contact", "prep", "followup", "context", "content", "coordinate"]);
export const evidenceCommand = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("preferences"),
      timing: z.boolean(),
      ranking: z.boolean(),
      newcomer: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("start"),
      task,
      baselineSeconds: z.number().int().min(1).max(14400).nullable(),
      baselineKind: z.enum(["estimate", "observed"]).nullable(),
      baselineSamples: z.number().int().min(0).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("finish"),
      id: z.string().uuid(),
      activeSeconds: z.number().int().min(1).max(14400),
    })
    .strict(),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("erase") }).strict(),
  z.object({ action: z.literal("vouch"), id: z.string().uuid(), approve: z.boolean() }).strict(),
]);
export type EvidenceCommand = z.infer<typeof evidenceCommand>;
/** Rolling seven days, UTC instants, including negative deltas. No extrapolation. */
export function weeklySummary(records: TimeRecord[], now = Date.now()) {
  const completed = records.filter(
    (r) =>
      r.finished_at &&
      Date.parse(r.finished_at) >= now - 7 * 86400000 &&
      Date.parse(r.finished_at) <= now,
  );
  const compared = completed.filter((r) => r.baseline_seconds !== null);
  const observed = compared.filter(
    (r) => r.baseline_kind === "observed" && r.baseline_samples >= 3,
  );
  const estimated = compared.filter((r) => !observed.includes(r));
  const delta = (rs: TimeRecord[]) =>
    rs.reduce((n, r) => n + r.baseline_seconds! - r.active_seconds, 0);
  return {
    count: completed.length,
    activeSeconds: completed.reduce((n, r) => n + r.active_seconds, 0),
    observedCount: observed.length,
    observedDelta: observed.length ? delta(observed) : null,
    estimatedCount: estimated.length,
    estimatedDelta: estimated.length ? delta(estimated) : null,
    unpaired: completed.length - compared.length,
  };
}
/** Only count foreground intervals while recent input indicates activity. */
export function activeTick(
  now: number,
  lastTick: number,
  lastInput: number,
  visible: boolean,
  running: boolean,
) {
  if (!visible || !running || now - lastInput > 60000 || now < lastTick) return 0;
  return Math.min(2000, now - lastTick);
}
export function minutes(seconds: number) {
  return Math.abs(seconds) < 60 ? `${Math.round(seconds)} sec` : `${(seconds / 60).toFixed(1)} min`;
}
