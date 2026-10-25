import { describe, expect, it } from "vitest";
import { buildDigest, type DigestSourcePost } from "./digest";

const FROM = "2026-10-17T00:00:00.000Z";
const TO = "2026-10-23T23:59:59.000Z";
const circles = [
  { id: "ops", name: "Operators" },
  { id: "fam", name: "Family" },
];
const post = (over: Partial<DigestSourcePost> & Pick<DigestSourcePost, "id">): DigestSourcePost => ({
  authorId: "a1",
  authorName: "Maya",
  circleId: null,
  kind: "note",
  summary: "Finished the shop shelving.",
  createdAt: "2026-10-20T10:00:00.000Z",
  ...over,
});

describe("digest", () => {
  it("is honestly empty when nothing happened", () => {
    const d = buildDigest({ from: FROM, to: TO, followedAuthorIds: ["a1"], circles, posts: [] });
    expect(d.isEmpty).toBe(true);
    expect(d.circles.every((c) => c.highlight === null)).toBe(true);
  });

  it("only includes posts in the window from people and Circles the member chose", () => {
    const d = buildDigest({
      from: FROM,
      to: TO,
      followedAuthorIds: ["a1"],
      circles,
      posts: [
        post({ id: "in" }),
        post({ id: "old", createdAt: "2026-10-10T00:00:00.000Z" }),
        post({ id: "stranger", authorId: "zz" }),
        post({ id: "other-circle", circleId: "not-mine" }),
      ],
    });
    expect(d.people.map((p) => p.id)).toEqual(["in"]);
    expect(d.isEmpty).toBe(false);
  });

  it("picks the longform, the latest Circle highlight, and only unanswered asks", () => {
    const d = buildDigest({
      from: FROM,
      to: TO,
      followedAuthorIds: ["a1"],
      circles,
      posts: [
        post({ id: "lf", kind: "longform", title: "The follow-up call nobody makes", readMinutes: 7 }),
        post({ id: "ops-1", circleId: "ops", createdAt: "2026-10-18T09:00:00.000Z" }),
        post({ id: "ops-2", circleId: "ops", createdAt: "2026-10-21T09:00:00.000Z" }),
        post({ id: "ask-done", circleId: "ops", kind: "ask", answered: true }),
        post({ id: "ask-open", circleId: "ops", kind: "ask", createdAt: "2026-10-22T09:00:00.000Z" }),
      ],
    });
    expect(d.worthReading?.id).toBe("lf");
    expect(d.circles.find((c) => c.circle.id === "ops")?.highlight?.id).toBe("ops-2");
    expect(d.circles.find((c) => c.circle.id === "fam")?.highlight).toBeNull();
    expect(d.openAsk?.id).toBe("ask-open");
  });

  it("rejects a backwards window", () => {
    expect(() => buildDigest({ from: TO, to: FROM, followedAuthorIds: [], circles: [], posts: [] })).toThrow();
  });
});
