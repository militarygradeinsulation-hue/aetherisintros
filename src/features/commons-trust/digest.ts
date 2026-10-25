// Digest: the week from your people and Circles, built only from real records in the window.
// Empty sections stay empty. Nothing is padded or invented.

export type DigestKind = "note" | "longform" | "ask";

export interface DigestSourcePost {
  id: string;
  authorId: string;
  authorName: string;
  /** null when posted to followers rather than to a Circle */
  circleId: string | null;
  kind: DigestKind;
  summary: string;
  createdAt: string;
  title?: string;
  readMinutes?: number;
  answered?: boolean;
}

export interface DigestCircle {
  id: string;
  name: string;
}

export interface DigestInput {
  from: string;
  to: string;
  followedAuthorIds: readonly string[];
  circles: readonly DigestCircle[];
  posts: readonly DigestSourcePost[];
  maxPeople?: number;
}

export interface DigestCircleLine {
  circle: DigestCircle;
  highlight: DigestSourcePost | null;
}

export interface Digest {
  from: string;
  to: string;
  people: DigestSourcePost[];
  worthReading: DigestSourcePost | null;
  circles: DigestCircleLine[];
  openAsk: DigestSourcePost | null;
  isEmpty: boolean;
}

function toMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`Invalid timestamp: ${iso}`);
  return ms;
}

export function buildDigest(input: DigestInput): Digest {
  const fromMs = toMs(input.from);
  const toMsValue = toMs(input.to);
  if (fromMs > toMsValue) throw new Error("Digest window starts after it ends");

  const followed = new Set(input.followedAuthorIds);
  const memberCircles = new Set(input.circles.map((c) => c.id));
  const isVisible = (p: DigestSourcePost) =>
    p.circleId === null ? followed.has(p.authorId) : memberCircles.has(p.circleId);

  const posts = input.posts
    .filter((p) => {
      const t = toMs(p.createdAt);
      return t >= fromMs && t <= toMsValue && isVisible(p);
    })
    .slice()
    .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));

  const people = posts.filter((p) => p.circleId === null && p.kind === "note").slice(0, input.maxPeople ?? 3);
  const worthReading = posts.find((p) => p.kind === "longform") ?? null;
  const openAsk = posts.find((p) => p.kind === "ask" && p.answered !== true && p.circleId !== null) ?? null;
  const circles = input.circles.map((circle) => {
    const inCircle = posts.filter((p) => p.circleId === circle.id && p.kind !== "ask");
    return { circle, highlight: inCircle[inCircle.length - 1] ?? null };
  });

  const isEmpty = people.length === 0 && !worthReading && !openAsk && circles.every((c) => c.highlight === null);
  return { from: input.from, to: input.to, people, worthReading, circles, openAsk, isEmpty };
}
