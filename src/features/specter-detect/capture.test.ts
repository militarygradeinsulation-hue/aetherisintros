import { describe, expect, it } from "vitest";
import { safeEvidenceUrl } from "./capture";
describe("Specter capture URL hygiene", () => {
  it("strips sensitive query parameters and fragments", () => {
    expect(safeEvidenceUrl("https://example.com/contact?token=secret#private")).toBe("https://example.com/contact");
  });
  it("resolves relative links without retaining the page query", () => {
    expect(safeEvidenceUrl("/about?email=private", "https://example.com/?session=secret")).toBe("https://example.com/about");
  });
  it("rejects non-web schemes and URL credentials", () => {
    expect(() => safeEvidenceUrl("javascript:alert(1)")).toThrow();
    expect(() => safeEvidenceUrl("https://user:secret@example.com")).toThrow();
  });
});
