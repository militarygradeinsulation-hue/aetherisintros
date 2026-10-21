# Specter Browser Capture Worker

This is a **separate** Playwright browser service, not a client-side iframe or HTML-only fetch. It renders JavaScript and extracts visible page evidence. It is not wired to production until deployed with authenticated access and network isolation.

## Runtime requirements
- Node 22, `npm install playwright`, `npx playwright install chromium`
- Isolated egress proxy/firewall that **denies private, loopback, link-local, metadata, internal DNS and non-public IPs**, including redirect and DNS-rebinding destinations.
- An authenticated API gateway with member identity, per-user rate limits, quotas, timeout and request size caps.
- Never forward user cookies, credentials, authorization headers or sessions to target sites.
- No login automation, CAPTCHA bypass, robots evasion, crawling private pages or unrestricted browser control.
- Audit requests without storing private page text; do not persist screenshots or full HTML by default.

The worker function in `capture.mjs` is deliberately not exposed as a public HTTP endpoint. The gateway must supply `authorizeTarget` and `checkResolvedAddress` hooks enforcing the network policy **before** it may be used. A regex/hostname-only SSRF check is insufficient.

## Response
Returns a validated, bounded snapshot with title, headings, link labels and sanitized source URLs, plus timestamp. The existing Specter rules engine can consume it. The UI must show provenance and failures; it must never silently substitute invented observations.
