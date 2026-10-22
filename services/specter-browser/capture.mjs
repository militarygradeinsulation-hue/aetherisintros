/**
 * Browser-based public evidence capture. Deploy only behind an authenticated gateway
 * with network-level SSRF isolation and per-request DNS/IP checks.
 */
export async function capturePublicPage(target, { authorizeTarget, checkResolvedAddress, chromium }) {
  if (typeof authorizeTarget !== "function" || typeof checkResolvedAddress !== "function" || !chromium) {
    throw new Error("Browser security controls are required");
  }
  const url = new URL(target);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("HTTP(S) required");
  if (url.username || url.password) throw new Error("Credential-bearing URL refused");
  await authorizeTarget(url);
  await checkResolvedAddress(url.hostname);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      acceptDownloads: false, permissions: [], serviceWorkers: "block",
      viewport: { width: 1365, height: 900 }
    });
    await context.route("**/*", async route => {
      const request = route.request();
      const next = new URL(request.url());
      if (!["http:", "https:"].includes(next.protocol) || next.username || next.password) return route.abort();
      try {
        await authorizeTarget(next);
        await checkResolvedAddress(next.hostname);
        if (["media", "font", "websocket"].includes(request.resourceType())) return route.abort();
        return route.continue();
      } catch { return route.abort(); }
    });
    const page = await context.newPage();
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);
    const result = await page.evaluate(() => {
      const visible = el => {
        if (el.closest("form,[contenteditable],[hidden],[inert],[aria-hidden='true'],[data-private],[data-sensitive]")) return false;
        for (let node = el; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0) return false;
        }
        return el.getClientRects().length > 0;
      };
      const clean = value => (value || "").replace(/\s+/g, " ").trim();
      return {
        title: clean(document.title).slice(0, 300),
        headings: Array.from(document.querySelectorAll("h1,h2,h3")).filter(visible).slice(0,100).map(el=>clean(el.textContent).slice(0,500)).filter(Boolean),
        links: Array.from(document.querySelectorAll("a[href]")).filter(visible).slice(0,100).map(el=>({text:clean(el.textContent).slice(0,500),href:el.href})).filter(x=>x.text)
      };
    });
    const sanitize = value => {
      const u = new URL(value);
      u.username = ""; u.password = ""; u.hash = "";
      for (const key of [...u.searchParams.keys()]) {
        if (/token|secret|password|auth|session|api.?key|signature/i.test(key)) u.searchParams.delete(key);
      }
      return u.href.slice(0, 2000);
    };
    const redact = value => value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]").replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+\b/g, "[token redacted]");
    return {
      url: sanitize(page.url()), title: redact(result.title),
      headings: result.headings.map(redact),
      links: result.links.flatMap(x => {
        try { return /^https?:/i.test(x.href) ? [{text:redact(x.text),href:sanitize(x.href)}] : []; }
        catch { return []; }
      }),
      capturedAt: new Date().toISOString()
    };
  } finally {
    await browser?.close();
  }
}
