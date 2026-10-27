# Ask Intros SEO and AI search release — 2026-10-26

## What this branch changes

- Adds five server-rendered, indexable public guides: `/executive-networking`, `/relationship-intelligence`, `/ai-networking-assistant`, `/business-relationship-crm`, and `/social-business-views`.
- Reuses the existing `PublicProductPage`, canonical metadata, Organization/WebPage structured-data graph, route-managed sitemap inclusion, and accessible common-questions markup. Nothing exposes private member content.
- Adds natural internal links from the homepage and guide footers.
- Aligns the home page's HTML heading, title and description around executive networking and warm introductions.
- Expands the existing public-search regression script to require all new pages in the initial HTML and sitemap.

## Known release / verification boundaries

- The repository is a TanStack Start application with generated `src/routeTree.gen.ts`. Run the framework build/router generation step on the target branch. Do not hand-maintain this generated file.
- Run `npm ci` (or the repo's project lockfile installer), `npm run build`, and `node scripts/public-search-check/run.mjs` in CI. For browser coverage set `PUBLIC_SEARCH_BROWSER=1` with Playwright browser installed.
- After deploying, request `https://askintros.vip/robots.txt`, `/sitemap.xml`, and each new page over HTTP without client JavaScript. Confirm 200 responses, exact canonical links, visible initial HTML text, robots indexability, and single Organization/WebPage JSON-LD script.
- Verify the site property and sitemap submission in Google Search Console and Bing Webmaster Tools. Search Console verification markup in the root route is preserved, but account ownership, sitemap acceptance and indexing cannot be confirmed from repository code.
- Confirm actual crawler access via CDN/firewall logs for Googlebot, Bingbot, OAI-SearchBot and other relevant crawlers; user-agent allowances alone do not guarantee accessibility.
- Do not automatically publish member profiles, private CRM records, demo identities, generated opinions, or claims of customer results.
- This release does not claim improved rankings or AI citations. Measure initial indexed pages, impressions, query coverage, clicks and qualified registrations over time.
- Optional follow up: IndexNow submission with server side key/proof, only after the hostname deployment and IndexNow configuration are verified. Do not call third party endpoints from a public client or use invented keys.

## Intended keyword themes

- executive networking for founders and CEOs
- double opt-in warm introductions
- business relationship intelligence
- AI networking assistant for executives
- business relationship CRM and social/business workspace

Avoid generic, unsubstantiated 'best CRM' or guaranteed outcomes claims.