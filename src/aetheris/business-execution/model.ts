export interface Requirement {
  id: string;
  question: string;
  answer: string;
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string | null;
}

export interface WorkPackage {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  dependsOn: string[];
  milestones: Milestone[];
  requiredDocuments: string[];
}

export interface ProjectBlueprint {
  id: string;
  title: string;
  brief: string;
  budgetAssumption: {
    amount: number | null;
    currency: string | null;
    note: string;
  };
  requirements: Requirement[];
  workPackages: WorkPackage[];
  proposals: ProposalComparison[];
}

export interface ProposalComparison {
  id: string;
  providerLabel: string;
  scope: string | null;
  price: number | null;
  currency: string | null;
  timeline: string | null;
  exclusions: string | null;
  evidenceLinks: string[];
  clarificationQuestions: string[];
}

export interface BusinessExecutionState {
  blueprints: ProjectBlueprint[];
}

export const EMPTY_BUSINESS_EXECUTION_STATE: BusinessExecutionState = { blueprints: [] };

interface DataRecord {
  [key: string]: unknown;
  amount?: unknown;
  answer?: unknown;
  blueprints?: unknown;
  brief?: unknown;
  budgetAssumption?: unknown;
  clarificationQuestions?: unknown;
  currency?: unknown;
  deliverables?: unknown;
  dependsOn?: unknown;
  description?: unknown;
  dueDate?: unknown;
  evidenceLinks?: unknown;
  exclusions?: unknown;
  id?: unknown;
  milestones?: unknown;
  note?: unknown;
  price?: unknown;
  proposals?: unknown;
  providerLabel?: unknown;
  question?: unknown;
  requiredDocuments?: unknown;
  requirements?: unknown;
  scope?: unknown;
  timeline?: unknown;
  title?: unknown;
  workPackages?: unknown;
}

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown, maxLength = 5000): value is string =>
  typeof value === "string" && value.length <= maxLength;

const isNullableString = (value: unknown, maxLength = 5000): value is string | null =>
  value === null || isString(value, maxLength);

const isIdentifier = (value: unknown): value is string =>
  isString(value, 120) && value.trim().length > 0;

const isIsoDate = (value: unknown): value is string | null => {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

const isStringList = (value: unknown, maxItems = 60): value is string[] =>
  Array.isArray(value) && value.length <= maxItems && value.every((item) => isString(item, 1000));

const hasValidPrice = (amount: unknown, currency: unknown) =>
  (amount === null && currency === null) ||
  (typeof amount === "number" &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    typeof currency === "string" &&
    /^[A-Z]{3}$/.test(currency));

function hasAcyclicDependencies(packages: WorkPackage[]): boolean {
  const packageIds = new Set(packages.map((item) => item.id));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(packages.map((item) => [item.id, item]));

  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    const item = byId.get(id);
    for (const dependency of item?.dependsOn ?? []) {
      if (!packageIds.has(dependency) || !visit(dependency)) return false;
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  };

  return packages.every((item) => visit(item.id));
}

function validProposal(value: unknown): value is ProposalComparison {
  if (!isRecord(value)) return false;
  return (
    isIdentifier(value.id) &&
    isString(value.providerLabel, 200) &&
    isNullableString(value.scope) &&
    hasValidPrice(value.price, value.currency) &&
    isNullableString(value.timeline, 1000) &&
    isNullableString(value.exclusions) &&
    isStringList(value.evidenceLinks) &&
    value.evidenceLinks.every((link) => {
      try {
        const url = new URL(link);
        return url.protocol === "https:" && !url.username && !url.password;
      } catch {
        return false;
      }
    }) &&
    isStringList(value.clarificationQuestions)
  );
}

function validBlueprint(value: unknown): value is ProjectBlueprint {
  if (!isRecord(value) || !isRecord(value.budgetAssumption)) return false;
  if (!isIdentifier(value.id) || !isString(value.title, 200) || !isString(value.brief))
    return false;
  if (
    !hasValidPrice(value.budgetAssumption.amount, value.budgetAssumption.currency) ||
    !isString(value.budgetAssumption.note, 1000)
  )
    return false;
  if (
    !Array.isArray(value.requirements) ||
    value.requirements.length > 60 ||
    !value.requirements.every(
      (requirement) =>
        isRecord(requirement) &&
        isIdentifier(requirement.id) &&
        isString(requirement.question, 1000) &&
        isString(requirement.answer),
    )
  )
    return false;
  if (
    !Array.isArray(value.workPackages) ||
    value.workPackages.length > 30 ||
    !value.workPackages.every(
      (workPackage) =>
        isRecord(workPackage) &&
        isIdentifier(workPackage.id) &&
        isString(workPackage.title, 200) &&
        isString(workPackage.description) &&
        isStringList(workPackage.deliverables) &&
        isStringList(workPackage.dependsOn, 30) &&
        Array.isArray(workPackage.milestones) &&
        workPackage.milestones.length <= 60 &&
        workPackage.milestones.every(
          (milestone) =>
            isRecord(milestone) &&
            isIdentifier(milestone.id) &&
            isString(milestone.title, 200) &&
            isIsoDate(milestone.dueDate),
        ) &&
        isStringList(workPackage.requiredDocuments),
    )
  )
    return false;
  if (
    !Array.isArray(value.proposals) ||
    value.proposals.length > 30 ||
    !value.proposals.every(validProposal)
  )
    return false;

  const requirements = value.requirements as Requirement[];
  const workPackages = value.workPackages as WorkPackage[];
  const proposals = value.proposals as ProposalComparison[];
  if (
    new Set(requirements.map((item) => item.id)).size !== requirements.length ||
    new Set(workPackages.map((item) => item.id)).size !== workPackages.length ||
    new Set(proposals.map((item) => item.id)).size !== proposals.length
  )
    return false;
  if (!hasAcyclicDependencies(workPackages)) return false;
  return workPackages.every(
    (item) =>
      new Set(item.dependsOn).size === item.dependsOn.length && !item.dependsOn.includes(item.id),
  );
}

export function parseBusinessExecutionState(value: unknown): BusinessExecutionState | null {
  if (!isRecord(value) || !Array.isArray(value.blueprints) || value.blueprints.length > 100)
    return null;
  if (!value.blueprints.every(validBlueprint)) return null;
  const blueprints = value.blueprints as ProjectBlueprint[];
  return new Set(blueprints.map((item) => item.id)).size === blueprints.length
    ? { blueprints }
    : null;
}

export function createProposalComparison(id: string): ProposalComparison {
  return {
    id,
    providerLabel: "",
    scope: null,
    price: null,
    currency: null,
    timeline: null,
    exclusions: null,
    evidenceLinks: [],
    clarificationQuestions: [],
  };
}

export function createPlaygroundBlueprint(id: string): ProjectBlueprint {
  return {
    id,
    title: "Playground site improvement",
    brief: "",
    budgetAssumption: { amount: null, currency: null, note: "" },
    requirements: [
      {
        id: `${id}-req-use`,
        question: "What should the playground support, and for whom?",
        answer: "",
      },
      {
        id: `${id}-req-site`,
        question: "What site constraints, access needs, or existing conditions are known?",
        answer: "",
      },
      {
        id: `${id}-req-acceptance`,
        question: "How will completion and accessibility be reviewed?",
        answer: "",
      },
    ],
    workPackages: [
      {
        id: `${id}-pkg-discovery`,
        title: "Site discovery and requirements",
        description: "",
        deliverables: ["Site assessment", "Confirmed user and accessibility requirements"],
        dependsOn: [],
        milestones: [
          { id: `${id}-mile-discovery`, title: "Requirements confirmed", dueDate: null },
        ],
        requiredDocuments: [
          "Site plan or survey, if available",
          "Applicable accessibility requirements",
        ],
      },
      {
        id: `${id}-pkg-design`,
        title: "Concept and design",
        description: "",
        deliverables: ["Concept options", "Review-ready design package"],
        dependsOn: [`${id}-pkg-discovery`],
        milestones: [{ id: `${id}-mile-design`, title: "Design reviewed", dueDate: null }],
        requiredDocuments: ["Design drawings", "Materials and equipment specifications"],
      },
      {
        id: `${id}-pkg-build`,
        title: "Installation and handover",
        description: "",
        deliverables: ["Installed improvements", "Inspection and handover records"],
        dependsOn: [`${id}-pkg-design`],
        milestones: [{ id: `${id}-mile-handover`, title: "Handover reviewed", dueDate: null }],
        requiredDocuments: [
          "Permits or approvals, if required",
          "Inspection and maintenance information",
        ],
      },
    ],
    proposals: [],
  };
}

export function validateBudgetAssumption(amount: number | null, currency: string | null): boolean {
  return hasValidPrice(amount, currency);
}

export function validateEvidenceLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
