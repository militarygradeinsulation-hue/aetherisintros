# Admin SEO & AI search visibility: release and verification

This release adds a private search visibility panel to `/admin/early-access` (the existing admin launch-control route). It is not part of the public member interface or demo.

## What is measured

1. **Current-host HTTP audit.** An administrator can request nine public pages plus `/robots.txt` and `/sitemap.xml` over normal HTTP and inspect the initial response for canonical links, title, description, H1, indexability and basic organization JSON-LD. The results describe the hostname from which the admin is currently signed in. A preview domain is not the production domain.
2. **Search Console CSV imports.** Import `Dates.csv` for daily clicks, impressions, calculated CTR and impression-weighted average position. Import `Queries.csv` separately to see up to 25 top reported queries. CSV input is validated, capped at 2 MB, and kept only in component memory. It is never transmitted by this feature or written to a database. Totals from two different dimensions are never added.
3. **AI answer observation grid.** Four concrete buyer prompts across ChatGPT Search, Gemini, Perplexity and Bing Copilot can be marked by an administrator as not tested, absent, mentioned or cited. This is **manual**, not a provider API call or independent verification; evidence links are optional and notes clear upon leaving the page.

## What is not measured

- Search engine indexing status, actual crawl logs, Google Search Console API connection, ranking trends or indexed page counts.
- Automatically verified AI answer mentions/citations.
- Search-referral signups, organic conversions, or inferred revenue impact.
- Member-private pages, private CRM data, member names or private AI discussions.

Leave the dashboard unconnected until a verified property and corresponding authorization are available. Never fill blank metrics with demonstrations or synthetic numbers.

## Premerge checks

- GitHub `Checks` runs typecheck, unit tests, build and the public server-rendered SEO metadata regression script on every PR.
- The new model unit tests exercise the CSV parser, mismatch rejection, zero-impression suppression and public route inventory.
- Manually verify Launch Control with an admin session in mobile and desktop light/dark modes. The table must scroll horizontally inside its container, without moving the whole phone viewport.
- Confirm nonadmins cannot enter the launch-control route; its private client-only measurements require no new database permissions or backend endpoints.

## After deployment

- With an authorized admin account on `https://askintros.vip`, open Launch Control and press **Run HTTP checks**. Inspect failures individually; a passing probe means HTML is structurally ready, not that a search engine indexed it.
- In Google Search Console, verify the `https://askintros.vip/` property and sitemap, check the Pages/Indexing report and Performance > Search Results, and download Dates/Queries exports for the dashboard.
- Verify Bing Webmaster Tools property ownership, sitemap, and any configured IndexNow endpoint. IndexNow is not activated by this branch.
- Verify CDN / bot firewall rules separately for Googlebot, Bingbot, OAI-SearchBot and other required AI crawlers. A robots directive does not prove crawler reachability.
- Record a baseline of indexed pages and impressions, then evaluate whether impressions/qualified organic registrations change after release; never promise a timeframe or a ranking.
- Confirm production remains published after the GitHub merge. Repository merges alone do not prove that Lovable has deployed the code.

## Follow-up architecture (not included)

For fully automated performance, implement Google property OAuth with server-side token storage, least-privilege scope, admin role checks and a trusted API caller. Prefer server-generated, time-stamped snapshots. Add consent-aware conversion attribution with explicit source/medium and real registration events. Do not collect member messages or personal activity for SEO reporting.
