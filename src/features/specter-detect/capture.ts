import type { PublicPageSnapshot } from "./diagnostics";
import { validatePublicSnapshot, redactSensitiveText } from "./snapshot-validation";

/** Invoke only after an explicit user action on a public, non-sensitive page.
 * Never captures form values, hidden elements, cookies, storage, or full HTML.
 * This module is intended for a future permissioned extension/content script.
 */
export function captureVisiblePublicPage(doc: Document, locationUrl: string): PublicPageSnapshot {
  const url = new URL(locationUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported page protocol");
  const visible = (element: Element): boolean => {
    if (element.closest("form, [contenteditable], [aria-hidden='true'], [hidden], nav[aria-label*='account' i]")) return false;
    const html = element as HTMLElement;
    return !html.hidden && html.getAttribute("type") !== "password";
  };
  const clean = (value: string, max: number) => redactSensitiveText(value.replace(/\s+/g, " ").trim()).slice(0, max);
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3")).filter(visible).slice(0, 100).map(el => clean(el.textContent ?? "", 500)).filter(Boolean);
  const links = Array.from(doc.querySelectorAll("a[href]")).filter(visible).slice(0, 100).map(el => ({
    text: clean(el.textContent ?? "", 500),
    href: (() => { try { const target = new URL(el.getAttribute("href") ?? "", url); return ["https:", "http:"].includes(target.protocol) ? target.href.slice(0, 2000) : ""; } catch { return ""; } })()
  })).filter(link => link.text);
  return validatePublicSnapshot({
    url: url.href,
    title: clean(doc.title, 300),
    headings,
    links,
    capturedAt: new Date().toISOString()
  });
}
