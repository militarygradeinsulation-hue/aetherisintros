import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlueprintWorkbench } from "../business-execution/BlueprintWorkbench";
import {
  createPlaygroundBlueprint,
  createProposalComparison,
  parseBusinessExecutionState,
  readBusinessExecutionCopy,
  validateBudgetAssumption,
  validateEvidenceLink,
} from "../business-execution/model";

describe("business execution blueprint model", () => {
  it("announces the private workspace loading state to assistive technology", () => {
    const markup = renderToStaticMarkup(createElement(BlueprintWorkbench));
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Checking your private account workspace");
  });

  it("creates the editable playground template without inventing dates or a budget", () => {
    const blueprint = createPlaygroundBlueprint("plan-1");
    expect(blueprint.budgetAssumption).toEqual({ amount: null, currency: null, note: "" });
    expect(blueprint.workPackages.map((item) => item.title)).toEqual([
      "Site discovery and requirements",
      "Concept and design",
      "Installation and handover",
    ]);
    expect(
      blueprint.workPackages.every((item) =>
        item.milestones.every((milestone) => milestone.dueDate === null),
      ),
    ).toBe(true);
    expect(parseBusinessExecutionState({ blueprints: [blueprint] })).toEqual({
      blueprints: [blueprint],
    });
  });

  it("rejects missing dependencies, dependency cycles, duplicate ids, and malformed price/currency pairs", () => {
    const blueprint = createPlaygroundBlueprint("plan-1");
    const cycle = structuredClone(blueprint);
    cycle.workPackages[0]!.dependsOn = [cycle.workPackages[1]!.id];
    expect(parseBusinessExecutionState({ blueprints: [cycle] })).toBeNull();

    const missing = structuredClone(blueprint);
    missing.workPackages[0]!.dependsOn = ["not-a-package"];
    expect(parseBusinessExecutionState({ blueprints: [missing] })).toBeNull();

    const invalidPrice = structuredClone(blueprint);
    invalidPrice.proposals.push({ ...createProposalComparison("proposal-1"), price: 2500 });
    expect(parseBusinessExecutionState({ blueprints: [invalidPrice] })).toBeNull();

    expect(parseBusinessExecutionState({ blueprints: [blueprint, blueprint] })).toBeNull();

    const invalidDate = structuredClone(blueprint);
    invalidDate.workPackages[0]!.milestones[0]!.dueDate = "2026-99-99";
    expect(parseBusinessExecutionState({ blueprints: [invalidDate] })).toBeNull();
  });

  it("keeps unprovided comparison information unknown and never creates a best-provider score", () => {
    const proposal = createProposalComparison("proposal-1");
    expect(proposal).toMatchObject({
      scope: null,
      price: null,
      currency: null,
      timeline: null,
      exclusions: null,
      evidenceLinks: [],
      clarificationQuestions: [],
    });
    expect("score" in proposal).toBe(false);
    expect(
      parseBusinessExecutionState({
        blueprints: [{ ...createPlaygroundBlueprint("plan-1"), proposals: [proposal] }],
      }),
    ).not.toBeNull();
  });

  it("clears account data when a newly authenticated owner has no remote workspace", () => {
    expect(readBusinessExecutionCopy(null)).toEqual({ blueprints: [] });
    expect(readBusinessExecutionCopy({ invalid: true })).toBeNull();
  });

  it("requires an explicit supported currency with a budget and only accepts credential-free HTTPS evidence links", () => {
    expect(validateBudgetAssumption(null, null)).toBe(true);
    expect(validateBudgetAssumption(12000, "USD")).toBe(true);
    expect(validateBudgetAssumption(12000, null)).toBe(false);
    expect(validateBudgetAssumption(-1, "USD")).toBe(false);
    expect(validateEvidenceLink("https://example.com/proposal")).toBe(true);
    expect(validateEvidenceLink("http://example.com/proposal")).toBe(false);
    expect(validateEvidenceLink("ftp://example.com/proposal")).toBe(false);
    expect(validateEvidenceLink("not-a-url")).toBe(false);
    expect(validateEvidenceLink("https://example.com@evil.test/proposal")).toBe(false);
  });
});
