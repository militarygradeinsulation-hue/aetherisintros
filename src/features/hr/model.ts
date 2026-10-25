import { z } from "zod";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "select" | "employee" | "job";
  required?: boolean;
  options?: string[] | undefined;
  max?: number | undefined;
};
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  required = false,
  options?: string[],
  max?: number,
): Field => ({ key, label, type, required, options, max });
export const MODULES = {
  employee: {
    label: "People",
    singular: "Employee",
    description: "Private employment records, separate from public member profiles.",
    fields: [
      f("name", "Full name", "text", true),
      f("role", "Job title", "text", true),
      f("department", "Department"),
      f("manager", "Manager"),
      f("email", "Work email"),
      f("location", "Work location"),
      f("start", "Start date", "date"),
      f("status", "Employment status", "select", true, [
        "Active",
        "Onboarding",
        "On leave",
        "Departed",
      ]),
      f("type", "Engagement", "select", true, ["Employee", "Contractor"]),
      f("notes", "Work responsibilities", "textarea"),
    ],
  },
  job: {
    label: "Hiring",
    singular: "Open role",
    description: "Define the work, qualifications and interview process before recruiting.",
    fields: [
      f("title", "Role title", "text", true),
      f("department", "Department"),
      f("location", "Work location"),
      f("employment", "Employment arrangement", "select", true, [
        "Full time",
        "Part time",
        "Contract",
        "Temporary",
      ]),
      f("status", "Role status", "select", true, ["Draft", "Open", "Paused", "Filled", "Closed"]),
      f("description", "Responsibilities and essential qualifications", "textarea", true),
      f("compensation", "Compensation range and currency"),
      f("due", "Target start date", "date"),
    ],
  },
  candidate: {
    label: "Candidates",
    singular: "Candidate",
    description: "Track applications and documented evidence. People make every hiring decision.",
    fields: [
      f("name", "Candidate name", "text", true),
      f("job", "Open role", "job", true),
      f("email", "Contact email"),
      f("status", "Application stage", "select", true, [
        "Applied",
        "Screening",
        "Interview",
        "Offer",
        "Hired",
        "Declined",
        "Withdrawn",
      ]),
      f("evidence", "Job related evidence and interview notes", "textarea"),
      f("due", "Next follow up", "date"),
    ],
  },
  task: {
    label: "Onboarding & exits",
    singular: "Task",
    description: "Assign and complete onboarding and offboarding work with clear ownership.",
    fields: [
      f("title", "Task", "text", true),
      f("employee", "Employee", "employee", true),
      f("workflow", "Workflow", "select", true, ["Onboarding", "Offboarding", "General"]),
      f("assignee", "Responsible person", "text", true),
      f("due", "Due date", "date"),
      f("status", "Task status", "select", true, ["To do", "In progress", "Done"]),
      f("details", "Instructions", "textarea"),
    ],
  },
  leave: {
    label: "Time off",
    singular: "Time off request",
    description:
      "Record dates and a human approval. Entitlement and payroll balances are not inferred.",
    fields: [
      f("title", "Request label", "text", true),
      f("employee", "Employee", "employee", true),
      f("category", "Category", "select", true, ["Vacation", "Personal", "Unpaid", "Other"]),
      f("start", "First day", "date", true),
      f("end", "Last day", "date", true),
      f("hours", "Requested hours", "number", true, undefined, 744),
      f("status", "Decision", "select", true, ["Pending", "Approved", "Declined", "Cancelled"]),
      f("approver", "Decision maker"),
    ],
  },
  policy: {
    label: "Policies",
    singular: "Policy",
    description: "Maintain editable policies and their internal review status for your business.",
    fields: [
      f("title", "Policy title", "text", true),
      f("content", "Policy text", "textarea", true),
      f("status", "Review status", "select", true, ["Draft", "In review", "Approved", "Retired"]),
      f("reviewer", "Reviewer"),
      f("due", "Review date", "date"),
      f("effective", "Effective date", "date"),
    ],
  },
  review: {
    label: "Performance",
    singular: "Review",
    description: "Document goals, work evidence and development conversations.",
    fields: [
      f("title", "Review title", "text", true),
      f("employee", "Employee", "employee", true),
      f("manager", "Review owner", "text", true),
      f("goals", "Goals and agreed measures", "textarea", true),
      f("evidence", "Observed work and employee feedback", "textarea"),
      f("development", "Support and development plan", "textarea"),
      f("status", "Review status", "select", true, ["Draft", "Scheduled", "Discussed", "Complete"]),
      f("due", "Review date", "date"),
    ],
  },
  training: {
    label: "Training",
    singular: "Training record",
    description: "Track assigned learning and credentials without inventing completion.",
    fields: [
      f("title", "Training or credential", "text", true),
      f("employee", "Employee", "employee", true),
      f("provider", "Training provider"),
      f("status", "Progress", "select", true, ["Assigned", "In progress", "Completed", "Expired"]),
      f("due", "Due or renewal date", "date"),
      f("evidence", "Completion reference", "textarea"),
    ],
  },
  benefit: {
    label: "Benefits",
    singular: "Benefit",
    description: "Keep the team benefit catalog and renewal reminders in one place.",
    fields: [
      f("title", "Benefit name", "text", true),
      f("provider", "Provider"),
      f("eligibility", "Eligibility to review", "textarea"),
      f("details", "Plan summary and provider contact", "textarea", true),
      f("status", "Plan status", "select", true, ["Draft", "Active", "Closed"]),
      f("due", "Renewal or enrollment deadline", "date"),
    ],
  },
  timesheet: {
    label: "Payroll preparation",
    singular: "Hours record",
    description:
      "Review hours and export gross pay inputs. No tax calculation or wage payment is performed.",
    fields: [
      f("title", "Pay period label", "text", true),
      f("employee", "Employee", "employee", true),
      f("start", "Period start", "date", true),
      f("end", "Period end", "date", true),
      f("regular", "Regular hours", "number", true, undefined, 744),
      f("overtime", "Overtime hours", "number", true, undefined, 744),
      f("rate", "Regular hourly rate", "number", true, undefined, 10000),
      f("overtimeRate", "Overtime hourly rate", "number", true, undefined, 20000),
      f("currency", "Currency", "select", true, ["USD", "CAD", "GBP", "EUR", "AUD"]),
      f("status", "Hours approval", "select", true, ["Draft", "Submitted", "Approved", "Exported"]),
    ],
  },
  document: {
    label: "Documents",
    singular: "HR document",
    description: "Save and revisit working documents and AI drafts before using them.",
    fields: [
      f("title", "Document title", "text", true),
      f("category", "Document category"),
      f("content", "Document text", "textarea", true),
      f("status", "Review status", "select", true, ["Draft", "In review", "Approved", "Archived"]),
      f("reviewer", "Reviewer"),
      f("due", "Review date", "date"),
    ],
  },
} as const satisfies Record<
  string,
  { label: string; singular: string; description: string; fields: Field[] }
>;
export type HRKind = keyof typeof MODULES;
export const KINDS = Object.keys(MODULES) as [HRKind, ...HRKind[]];
export const contextSchema = z
  .object({
    company: z.string().trim().min(1).max(180),
    industry: z.string().max(300),
    description: z.string().max(3000),
    locations: z.string().max(500),
    teamSize: z
      .string()
      .max(30)
      .refine((v) => v === "" || /^\d{1,6}$/.test(v), "Use a whole number or leave blank"),
    workModel: z.enum(["Field", "Office", "Hybrid", "Remote"]),
    priorities: z.string().max(2000),
    policyContext: z.string().max(5000),
  })
  .strict();
export type HRContext = z.infer<typeof contextSchema>;
export type Profile = {
  id: string;
  company: string;
  industries?: string[];
  what_i_do?: string;
  location?: string;
};
export function tailorContext(profile: Profile): HRContext {
  const description = profile.what_i_do ?? "",
    industry = (profile.industries ?? []).join(", ");
  return {
    company: profile.company || "My business",
    industry,
    description,
    locations: profile.location ?? "",
    teamSize: "",
    workModel: /hvac|plumb|roof|electri|construct|install|landscap/i.test(
      industry + " " + description,
    )
      ? "Field"
      : "Office",
    priorities: "",
    policyContext: "",
  };
}
const validDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
export const recordInput = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(KINDS),
    version: z.number().int().min(0),
    fields: z.record(z.string(), z.string().max(20000)),
  })
  .strict()
  .superRefine((record, ctx) => {
    const fields: readonly Field[] = MODULES[record.kind].fields;
    for (const key of Object.keys(record.fields))
      if (!fields["some"]((f) => f.key === key))
        ctx.addIssue({ code: "custom", path: ["fields", key], message: "Unknown field" });
    for (const f of fields) {
      const v = record.fields[f.key] ?? "";
      let message = "";
      if (f.required && !v.trim()) message = `${f.label} is required`;
      else if (v && f.type === "date" && !validDate(v)) message = "Enter a valid date";
      else if (
        v &&
        f.type === "number" &&
        (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > (f.max ?? 100000))
      )
        message = `Enter a number from 0 to ${f.max ?? 100000}`;
      else if (v && f.type === "select" && !f.options?.includes(v))
        message = "Choose a listed option";
      else if (v && ["employee", "job"].includes(f.type ?? "") && !z.uuid().safeParse(v).success)
        message = "Choose a saved record";
      else if (v.length > (f.type === "textarea" ? 20000 : 500)) message = "This field is too long";
      if (message) ctx.addIssue({ code: "custom", path: ["fields", f.key], message });
    }
    if (
      record.fields["start"] &&
      record.fields["end"] &&
      record.fields["end"] < record.fields["start"]
    )
      ctx.addIssue({ code: "custom", message: "The end date must be on or after the start date" });
    if (
      record.kind === "timesheet" &&
      Number(record.fields["regular"]) + Number(record.fields["overtime"]) > 744
    )
      ctx.addIssue({ code: "custom", message: "Total hours cannot exceed 744 in a period" });
    if (["Approved"].includes(record.fields["status"] ?? "")) {
      const reviewer =
        record.kind === "leave"
          ? record.fields["approver"]
          : ["policy", "document"].includes(record.kind)
            ? record.fields["reviewer"]
            : "present";
      if (!reviewer?.trim())
        ctx.addIssue({ code: "custom", message: "Record the person who approved this item" });
    }
  });
export type HRRecordInput = z.infer<typeof recordInput>;
export type HRRecord = HRRecordInput & { updated_at: string };
export type HRState = {
  userId: string;
  context: HRContext;
  version: number;
  records: HRRecord[];
  aiAvailable: boolean;
  storageReady: boolean;
  audit: Array<{ action: string; kind: string | null; created_at: string }>;
};
export const hrCommand = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("context"),
    version: z.number().int().min(0),
    context: contextSchema,
  }),
  z.object({ action: z.literal("record"), record: recordInput }),
  z.object({
    action: z.literal("delete"),
    id: z.string().uuid(),
    version: z.number().int().positive(),
  }),
  z
    .object({ action: z.literal("plan"), records: z.array(recordInput).min(1).max(20) })
    .superRefine((c, ctx) => {
      if (
        c.records.some((r) => r.kind !== "task" || r.version !== 0) ||
        new Set(c.records.map((r) => r.id)).size !== c.records.length
      )
        ctx.addIssue({ code: "custom", message: "A plan must contain new, distinct tasks" });
    }),
]);
export type HRCommand = z.infer<typeof hrCommand>;
export const AI_TASKS = [
  "Conversation",
  "Job description",
  "Interview guide",
  "Onboarding plan",
  "Policy draft",
  "Performance conversation",
  "Workforce plan",
  "Offboarding plan",
] as const;
export const aiRequest = z
  .object({
    task: z.enum(AI_TASKS),
    brief: z.string().trim().min(3).max(6000),
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(16000) }))
      .max(8),
    consent: z.literal(true),
  })
  .strict();
export function grossPay(fields: Record<string, string>) {
  return (
    Math.round(
      (Number(fields["regular"]) * Number(fields["rate"]) +
        Number(fields["overtime"]) * Number(fields["overtimeRate"])) *
        100,
    ) / 100
  );
}
export function planTasks(
  context: HRContext,
  employee: HRRecord,
  workflow: "Onboarding" | "Offboarding",
  date: string,
): HRRecordInput[] {
  const steps =
    workflow === "Offboarding"
      ? [
          "Agree the handover and communication plan",
          "Review outstanding work and customer ownership",
          "Arrange return of equipment and access removal",
          "Review final pay inputs with the payroll provider",
          "Offer an exit conversation and close the checklist",
        ]
      : [
          `Welcome to ${context.company} and explain the role`,
          "Confirm required employment documentation with the responsible reviewer",
          context.workModel === "Field"
            ? "Review site safety, equipment and job specific training"
            : context.workModel === "Remote"
              ? "Set up remote access, equipment and communication practices"
              : "Set up equipment, access and workplace orientation",
          "Meet the manager and agree first month outcomes",
          "Review company policies and questions",
          "Schedule role training and a first week check in",
          "Schedule a 30 day development conversation",
        ];
  return steps.map((title) => ({
    id: crypto.randomUUID(),
    kind: "task",
    version: 0,
    fields: {
      title,
      employee: employee.id,
      workflow,
      assignee: employee.fields["manager"] || "Business owner",
      due: date,
      status: "To do",
      details: `For ${employee.fields["name"]}, ${employee.fields["role"]}. Review and adapt before completion.`,
    },
  }));
}
export const csvCell = (value: unknown) => {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
};
export function payrollCsv(records: HRRecord[]) {
  const people = new Map(
    records.filter((r) => r.kind === "employee").map((r) => [r.id, r.fields["name"]]),
  );
  const rows = records.filter(
    (r) => r.kind === "timesheet" && ["Approved", "Exported"].includes(r.fields["status"] ?? ""),
  );
  return [
    [
      "Employee",
      "Start",
      "End",
      "Regular hours",
      "Overtime hours",
      "Regular rate",
      "Overtime rate",
      "Currency",
      "Gross estimate",
      "Status",
    ],
    ...rows.map((r) => [
      people.get(r.fields["employee"] ?? "") || "Removed employee",
      r.fields["start"],
      r.fields["end"],
      r.fields["regular"],
      r.fields["overtime"],
      r.fields["rate"],
      r.fields["overtimeRate"],
      r.fields["currency"],
      grossPay(r.fields),
      r.fields["status"],
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
