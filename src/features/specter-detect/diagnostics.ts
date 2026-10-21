import type { SpecterEvidence, SpecterFinding } from "./types";
export interface PublicPageSnapshot { url: string; title: string; headings: string[]; links: Array<{ text: string; href: string }>; capturedAt: string; }
export function detectPublicPage(snapshot: PublicPageSnapshot): { evidence: SpecterEvidence[]; findings: SpecterFinding[] } {
  const evidence: SpecterEvidence[] = [];
  const findings: SpecterFinding[] = [];
  const add = (id: string, title: string, excerpt: string, recommendation: string) => {
    const evidenceId = "e_" + id;
    evidence.push({ id: evidenceId, url: snapshot.url, excerpt, observedAt: snapshot.capturedAt });
    findings.push({ id, title, category: "conversion_friction", status: "observed", severity: "medium", confidence: 0.75, evidenceIds: [evidenceId], recommendation });
  };
  const ctas = snapshot.links.filter(link => /contact|quote|book|schedule|demo|start/i.test(link.text));
  if (!ctas.length) add("cta_missing", "No obvious contact CTA in captured links", "No matching CTA label in captured links", "Review the full conversion journey manually.");
  if (!snapshot.headings.some(heading => heading.trim().length > 0)) add("heading_missing", "No meaningful heading in captured content", "No non-empty heading captured", "Verify heading hierarchy and messaging.");
  return { evidence, findings };
}
