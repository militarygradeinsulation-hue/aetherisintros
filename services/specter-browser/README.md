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

## Ask Intros integration

The live menu now mounts the canonical `SpecterDetectPanel`. Its authenticated
`scanSpecterWebsite` server function rate-limits each member and calls
`captureSpecterWebsite` on the server. Without a browser gateway it uses the
existing external website reader at the fixed `r.jina.ai` origin (never a direct
fetch of user-controlled hosts from the application network). This mode is
labeled **Website reader capture** and does not claim a remote browser session.

To activate this worker, deploy it behind the isolated gateway described above.
Set `SPECTER_BROWSER_URL` to its HTTPS capture endpoint and `SPECTER_BROWSER_TOKEN`
to its server-only bearer secret on the Ask Intros host. The gateway must accept
`POST { "url": "https://…" }` and return the snapshot below (or `{ "snapshot": … }`).
The client never receives the endpoint secret. Gateway failures are shown rather
than silently replaced with invented results. Requests time out after 25 seconds
and responses are capped at 512 KB.

```json
{"url":"https://company.com/","title":"Company","headings":["Services"],"links":[{"text":"Contact","href":"https://company.com/contact"}],"capturedAt":"2026-10-21T00:00:00.000Z"}
```

The optional iframe is a sandboxed preview of the original public site. Sites
that disallow embedding must be opened with the original-website link. Preview
navigation does not change the recorded scan; use Scan Website to capture a new
page. Saved cases are account-scoped device storage, limited to 20 snapshots,
with explicit JSON export. No database migration is required for this release.
