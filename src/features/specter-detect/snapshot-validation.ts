import { z } from "zod";
import type { PublicPageSnapshot } from "./diagnostics";

/** Only explicit, user-supplied observations are accepted. No automatic collection. */
const publicUrl = z.string().url().refine(value => {
  const url = new URL(value);
  return (url.protocol === "https:" || url.protocol === "http:") &&
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname) &&
    !url.hostname.endsWith(".local");
}, "Provide a public HTTP(S) URL.");

export const publicSnapshotSchema = z.object({
  url: publicUrl,
  title: z.string().max(300),
  headings: z.array(z.string().max(500)).max(100),
  links: z.array(z.object({
    text: z.string().max(500),
    href: z.string().max(2000)
  })).max(100),
  capturedAt: z.string().datetime()
}).strict();

export function validatePublicSnapshot(value: unknown): PublicPageSnapshot {
  return publicSnapshotSchema.parse(value);
}

/** Prevent private data and user-submitted text from being treated as a system instruction. */
export function redactSensitiveText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]")
    .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+\b/g, "[token redacted]");
}
