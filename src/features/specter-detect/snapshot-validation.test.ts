import { describe, expect, it } from "vitest";
import { validatePublicSnapshot, redactSensitiveText } from "./snapshot-validation";
describe("Specter snapshot boundaries", () => {
  it("rejects localhost and non-web schemes", () => {
    const base = { title: "Test", headings: [], links: [], capturedAt: "2026-10-21T00:00:00.000Z" };
    expect(() => validatePublicSnapshot({ ...base, url: "http://localhost/private" })).toThrow();
    expect(() => validatePublicSnapshot({ ...base, url: "file:///etc/passwd" })).toThrow();
  });
  it("rejects unexpected fields", () => {
    expect(() => validatePublicSnapshot({ url: "https://example.com", title: "", headings: [], links: [], capturedAt: "2026-10-21T00:00:00.000Z", password: "secret" })).toThrow();
  });
  it("redacts email and common API token patterns", () => {
    expect(redactSensitiveText("hello jane@example.com sk_live_abc123")).not.toContain("jane@example.com");
    expect(redactSensitiveText("sk_live_abc123")).toContain("[token redacted]");
  });
});
