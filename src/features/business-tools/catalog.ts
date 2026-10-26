export interface BusinessTool { id: string; name: string; category: string; description: string; fields: string[]; sections: string[] }
export const BUSINESS_TOOLS: BusinessTool[] = [
  {
    "id": "ai-checklist",
    "name": "AI Readiness Checklist",
    "category": "Planning & reports",
    "description": "Assess AI readiness from the business information you supply.",
    "fields": [
      "Company",
      "Team size",
      "Current tools"
    ],
    "sections": [
      "Data captured consistently",
      "Repeatable processes documented",
      "CRM in use",
      "Owner time logged",
      "Customer questions centralized"
    ]
  },
  {
    "id": "all-in-one",
    "name": "All-In-One Content",
    "category": "Content & creative",
    "description": "Blog + social + email from one prompt.",
    "fields": [
      "Topic",
      "Audience"
    ],
    "sections": [
      "Blog outline",
      "LinkedIn post",
      "Facebook post",
      "Email subject + body",
      "Call to action"
    ]
  },
  {
    "id": "brand-contradictions",
    "name": "Brand Contradictions",
    "category": "Business reviews",
    "description": "Where your brand says one thing and does another.",
    "fields": [
      "Website URL",
      "Brand promise"
    ],
    "sections": [
      "Promise of speed vs. slow response path",
      "Premium claim vs. generic visuals",
      "'Personal service' vs. no named people",
      "Local claim vs. no local proof"
    ]
  },
  {
    "id": "content-calendar",
    "name": "Content Calendar Builder",
    "category": "Content & creative",
    "description": "30 days of aligned content.",
    "fields": [
      "Business",
      "Theme"
    ],
    "sections": [
      "Day 1",
      "Day 2",
      "Day 3",
      "Day 4",
      "Day 5",
      "Day 6",
      "Day 7",
      "Day 8",
      "Day 9",
      "Day 10",
      "Day 11",
      "Day 12",
      "Day 13",
      "Day 14",
      "Day 15",
      "Day 16",
      "Day 17",
      "Day 18",
      "Day 19",
      "Day 20",
      "Day 21",
      "Day 22",
      "Day 23",
      "Day 24",
      "Day 25",
      "Day 26",
      "Day 27",
      "Day 28",
      "Day 29",
      "Day 30"
    ]
  },
  {
    "id": "content-engine",
    "name": "Content Engine",
    "category": "Content & creative",
    "description": "Long-form + short-form pipeline.",
    "fields": [
      "Topic",
      "Audience"
    ],
    "sections": [
      "Long-form article outline",
      "3 short clips",
      "Newsletter blurb",
      "Hashtags",
      "Repurpose plan"
    ]
  },
  {
    "id": "creation-studio",
    "name": "Creation Studio",
    "category": "Content & creative",
    "description": "Create copy and generate a visual from your brand brief.",
    "fields": [
      "Brand",
      "Asset type",
      "Brief"
    ],
    "sections": [
      "Headline",
      "Body copy",
      "Visual direction",
      "Format variants",
      "Brand memory notes"
    ]
  },
  {
    "id": "detective-mode",
    "name": "Evidence Review",
    "category": "Business reviews",
    "description": "Deep forensic sweep on a single business surface.",
    "fields": [
      "Target URL or surface",
      "Suspected problem"
    ],
    "sections": [
      "Evidence collected from surface",
      "Contradiction located",
      "Root cause hypothesis",
      "Impact evidence needed",
      "Correction order"
    ]
  },
  {
    "id": "easy-mode",
    "name": "Plain Language Editor",
    "category": "Content & creative",
    "description": "Plain-English paste-ready copy.",
    "fields": [
      "Paste any text"
    ],
    "sections": [
      "Plain-English version",
      "Short version",
      "Bullet version"
    ]
  },
  {
    "id": "follow-up-plan",
    "name": "Follow-Up Sequences",
    "category": "Sales & relationships",
    "description": "Post-meeting email plays.",
    "fields": [
      "Prospect name",
      "Meeting topic"
    ],
    "sections": [
      "Day 0 recap",
      "Day 2 value add",
      "Day 5 proof",
      "Day 9 question",
      "Day 14 breakup"
    ]
  },
  {
    "id": "forensic-scan-all",
    "name": "Business Review",
    "category": "Business reviews",
    "description": "Review a captured public page across messaging, trust, and buyer experience.",
    "fields": [
      "Website URL",
      "Company"
    ],
    "sections": [
      "Website leaks",
      "Brand contradictions",
      "Buyer friction",
      "Follow-up gaps",
      "Strategic blind spots"
    ]
  },
  {
    "id": "friction-audit",
    "name": "Friction Audit",
    "category": "Business reviews",
    "description": "Every buyer step that quietly costs you deals.",
    "fields": [
      "Website URL",
      "Primary offer"
    ],
    "sections": [
      "Too many form fields",
      "No pricing expectation",
      "Dead-end pages",
      "No confirmation follow-up",
      "Unclear next step"
    ]
  },
  {
    "id": "golden-report",
    "name": "Executive Report",
    "category": "Planning & reports",
    "description": "The synthesis case file with Business X-Ray.",
    "fields": [
      "Company",
      "Website URL",
      "Industry"
    ],
    "sections": [
      "Verified impact and unknowns",
      "Customer path breakdown",
      "Evidence-backed findings",
      "Correction plan",
      "Business X-Ray map"
    ]
  },
  {
    "id": "head-to-head",
    "name": "Competitor Comparison",
    "category": "Planning & reports",
    "description": "Side-by-side competitor comparison.",
    "fields": [
      "Your URL",
      "Competitor URL"
    ],
    "sections": [
      "Offer clarity",
      "Trust proof",
      "Speed to contact",
      "Local presence",
      "Follow-up system"
    ]
  },
  {
    "id": "image-studio",
    "name": "Image Studio",
    "category": "Content & creative",
    "description": "Generate an image or prepare a detailed visual brief.",
    "fields": [
      "Subject",
      "Style"
    ],
    "sections": [
      "Primary prompt",
      "Alt composition",
      "Color direction",
      "Aspect ratios",
      "Ask Intros attribution"
    ]
  },
  {
    "id": "lien-notice-prep",
    "name": "Lien & Notice Prep",
    "category": "Field operations",
    "description": "Prepare a private project evidence packet and preliminary notice draft for legal review. No deadlines are calculated and nothing is filed.",
    "fields": ["Project name", "State and county", "Your project role", "Last work or supply date", "Contract counterparty"],
    "sections": ["Confirm jurisdiction and claimant role", "Gather contract and work evidence", "Verify every legal deadline independently", "Draft preliminary notice for review", "Approve recipients and method with counsel", "Record service and follow up"]
  },

  {
    "id": "linkedin-playbook",
    "name": "LinkedIn Playbook",
    "category": "Sales & relationships",
    "description": "Profile-to-lead-machine system.",
    "fields": [
      "Your role",
      "Ideal client"
    ],
    "sections": [
      "Headline rewrite",
      "About section",
      "Weekly post rhythm",
      "Connection message",
      "DM follow-up"
    ]
  },
  {
    "id": "nexus-iq",
    "name": "Meeting Intelligence Brief",
    "category": "Planning & reports",
    "description": "Pre-meeting dossier on any target company.",
    "fields": [
      "Company",
      "Website URL",
      "Contact role"
    ],
    "sections": [
      "Company snapshot",
      "Potential questions to validate",
      "Talking points",
      "Questions to ask",
      "Risk flags"
    ]
  },
  {
    "id": "pay-application-draft",
    "name": "Pay Application Draft",
    "category": "Field operations",
    "description": "Assemble a private progress-billing worksheet and provisional arithmetic from member-entered USD figures; not a payment request or certified AIA form.",
    "fields": ["Project name", "Billing period", "Contract amount USD", "Earned to date USD", "Retainage withheld to date USD", "Previously certified USD"],
    "sections": ["Project and billing period", "Reconcile contract and approved changes", "Work completed and stored-material backup", "Retainage and prior certificates", "Provisional current payment due", "Conditional lien waivers and review", "Counterparty approval and submission"]
  },

  {
    "id": "playbook-generator",
    "name": "Playbook Generator",
    "category": "Content & creative",
    "description": "Custom operating playbooks.",
    "fields": [
      "Function",
      "Goal"
    ],
    "sections": [
      "Purpose",
      "Roles",
      "Step-by-step process",
      "Checkpoints",
      "Metrics"
    ]
  },
  {
    "id": "reciprocation",
    "name": "Value-First Outreach",
    "category": "Planning & reports",
    "description": "Free custom door-opener report.",
    "fields": [
      "Prospect company",
      "Website URL"
    ],
    "sections": [
      "One visible leak",
      "Quick win fix",
      "Impact assumptions to validate",
      "Personal note",
      "Soft next step"
    ]
  },
  {
    "id": "resume-forensics",
    "name": "Resume Review",
    "category": "Planning & reports",
    "description": "Review and rewrite your resume for a target role.",
    "fields": [
      "Target role",
      "Paste resume text"
    ],
    "sections": [
      "Keyword gaps for target role",
      "Weak impact verbs",
      "Missing metrics",
      "Formatting ATS risks",
      "Rewritten summary"
    ]
  },
  {
    "id": "sales-scripts",
    "name": "Sales Scripts",
    "category": "Sales & relationships",
    "description": "Cold, warm, and follow-up scripts.",
    "fields": [
      "Offer",
      "Target buyer"
    ],
    "sections": [
      "Cold opener",
      "Warm intro",
      "Objection: price",
      "Objection: timing",
      "Close"
    ]
  },
  {
    "id": "social-content",
    "name": "Social Content Studio",
    "category": "Content & creative",
    "description": "Voice-locked social posts.",
    "fields": [
      "Brand",
      "Topic",
      "Voice"
    ],
    "sections": [
      "Post 1",
      "Post 2",
      "Post 3",
      "Post 4",
      "Post 5"
    ]
  },
  {
    "id": "strategic-questions",
    "name": "Strategic Questions",
    "category": "Business reviews",
    "description": "Boardroom questions you're avoiding.",
    "fields": [
      "Company",
      "Industry",
      "Biggest goal"
    ],
    "sections": [
      "What does a lost lead cost us per month?",
      "Who owns follow-up after first contact?",
      "Which offer actually makes margin?",
      "What would break if volume doubled?",
      "Where does the owner remain the bottleneck?"
    ]
  },
  {
    "id": "tool-generator",
    "name": "Tool Generator",
    "category": "Content & creative",
    "description": "Build a mini-tool from a brief.",
    "fields": [
      "Tool brief"
    ],
    "sections": [
      "Tool name",
      "Inputs",
      "Logic steps",
      "Output format",
      "Launch checklist"
    ]
  },
  {
    "id": "website-scanner",
    "name": "Website Review",
    "category": "Business reviews",
    "description": "Capture a public webpage and review evidence-backed findings.",
    "fields": [
      "Website URL"
    ],
    "sections": [
      "Missing above-fold CTA",
      "No visible phone/booking path",
      "Slow mobile load",
      "Weak trust signals",
      "No follow-up capture"
    ]
  }
];
export const findBusinessTool = (id: string) => BUSINESS_TOOLS.find(tool => tool.id === id);
