import type { PublicPageSnapshot } from "./diagnostics";
import { validatePublicSnapshot, redactSensitiveText } from "./snapshot-validation";

/** Discard query strings, fragments and credentials before any URL is retained. */
export function safeEvidenceUrl(raw: string, base?: string): string {
  const url = new URL(raw, base);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Unsupported URL scheme");
  if (url.username || url.password) throw new Error("Credential-bearing URLs cannot be captured");
  url.search = "";
  url.hash = "";
  return url.href;
}

/** Called only after explicit consent on a public page. Never reads form values or HTML. */
export function captureVisiblePublicPage(doc: Document, locationUrl: string): PublicPageSnapshot {
  const url = safeEvidenceUrl(locationUrl);
  const visible = (element: Element): boolean => {
    if (element.closest("form, input, textarea, select, button, [contenteditable], [aria-hidden='true'], [hidden], [inert], [data-private], [data-sensitive]")) return false;
    const html = element as HTMLElement;
    if (html.hidden) return false;
    const view = doc.defaultView;
    if (view) {
      const style = view.getComputedStyle(html);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
    }
    return true;
  };
  const clean = (value: string, max: number) => redactSensitiveText(value.replace(/\s+/g, " ").trim()).slice(0, max);
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3"))
    .filter(visible).slice(0, 100).map(el => clean(el.textContent ?? "", 500)).filter(Boolean);
  const links = Array.from(doc.querySelectorAll("a[href]"))
    .filter(visible).slice(0, 100).map(el => {
      let href = "";
      try { href = safeEvidenceUrl(el.getAttribute("href") ?? "", url).slice(0, 2000); } catch { /* ignore unsafe link */ }
      return { text: clean(el.textContent ?? "", 500), href };
    }).filter(link => link.text && link.href);
  return validatePublicSnapshot({
    url,
    title: clean(doc.title, 300),
    headings,
    links,
    capturedAt: new Date().toISOString()
  });
}
