# SEO/AEO release 3: page-level evidence and founder authority

## Changes

- Admin Launch Control > SEO & AI visibility accepts a separate Google Search Console `Pages.csv` report alongside `Dates.csv` and `Queries.csv`.
- Pages.csv must include `Top pages` (or `Page`), `Clicks` and `Impressions`. Optional `Position` adds average position. Only the canonical `https://askintros.vip` hostname is accepted. Rows are checked for valid counts and duplicate canonical URLs.
- The dashboard displays the top 100 reported pages by impression volume, then highlights up to 20 **review candidates** where impressions are at least 50 and CTR is below 2% or average position is above 10. These are heuristics and not SEO verdicts or promises.
- All three CSV dimensions stay separate, and imports stay in the current browser session. Nothing is sent to a database or automatically shared with users.
- The browser-based public crawl check sends no member credentials. Audit inventory now covers eleven routes, including the public membership and founder pages.
- Public Organization JSON-LD includes the known founder and the user-provided founder LinkedIn URL. This is an identity signal, not a certification or a search-ranking shortcut.
- The founder-story and membership pages now share the public entity graph, explicit indexable robots directive, and canonical metadata. No private profiles or member notes are published.

## Validation and known limits

- Dedicated `Public Search Visibility` workflow: Vite build/router regeneration, TypeScript, Search Console parser tests, and raw HTML/canonical/sitemap checks.
- General CI may still report separate historical recovery fixture errors in `scripts/recovery`; never edit migration history solely to pass this SEO release.
- Imported Search Console click totals cannot be equated to qualified signups. Lovable referral analytics and GSC are different sources and may differ in scope.
- Crawl readiness is not proof of Google indexing. Verify Search Console property ownership and indexed-page reports in production; URLs still need external crawling and ranking.
- `Ask Intros`' search appearance in general web search has not been independently established; no rankings claimed.

## Next steps

- Verify the published custom hostname and its sitemap, indexability, and availability.
- Obtain a verified Google Search Console property or import CSVs for a data-backed baseline.
- Only then prioritize individual pages, improve on-page content, and measure whether search-driven visitors register.
- Later, add a server-authorized Search Console API integration with scoped credentials and consent-aware registration attribution.
