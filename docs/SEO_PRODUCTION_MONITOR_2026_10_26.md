# Production Search Readiness Monitor

The previous SEO releases established server rendered product pages, a sitemap, canonical metadata and an admin dashboard. This addition tests the **public hostname from GitHub's network** rather than relying only on the internal Vite test server.

## What runs

- GitHub Actions workflow: `Ask Intros Live Search Monitor` (`.github/workflows/live-search-monitor.yml`)
- Runs once when the workflow is first merged to the default branch, then daily at **13:35 UTC** and manually via Actions > Ask Intros Live Search Monitor > Run workflow.
- No Lovable agent messages or Lovable code-generation credits.
- Test URLs: `/robots.txt`, `/sitemap.xml`, and the eleven publicly indexable routes defined in `production-monitor.mjs`.
- Each public HTML response must return HTTP 200 over the canonical HTTPS hostname, have an Ask Intros title, description, initial H1, exactly one canonical and Organization/WebPage JSON-LD. Robots and sitemap must allow and enumerate canonical URLs.
- No auth cookies, member private pages, credentials, account identifiers, synthetic signups, or metrics are sent.
- The script retries transient request failures once; errors and success summaries appear in the GitHub Actions job summary. A failed job should be investigated, not ignored.
- The isolated monitor tests use mocked HTTP responses and never call the production site. These tests also run in the dedicated SEO CI workflow for pull requests.

## Important boundaries

- Passing does NOT establish that Google indexed a URL or that AI search systems cited it.
- A failed check may indicate DNS, certificate, firewall, CDN, hosting, SSR metadata or site configuration problems. It is not itself a diagnosis of the root cause.
- This monitor does not change the domain registrar or DNS; it cannot fix a broken domain simply by running.
- If the production deployment is delayed after a GitHub merge, manually check whether the latest commit was actually published. GitHub and Lovable's synced commit is not sufficient proof of a live deployment.
- Google Search Console and Bing Webmaster Tools verification, sitemap submission and query/index status remain external account actions.
- The legacy migration recovery suite has previously failed two synthetic historical replay tests unrelated to search discovery; do not bypass or rewrite it as part of SEO rollout.

## Operator review

1. Open [the live monitor workflow](https://github.com/militarygradeinsulation-hue/aetherisintros/actions/workflows/live-search-monitor.yml).
2. Check the newest job summary. Red means an external public URL or SEO signal needs attention.
3. Open the matching public URL on a device and use Google Search Console > Pages and URL Inspection to confirm actual indexing.
4. In Ask Intros admin Launch Control > SEO & AI visibility, compare with the live same-origin audit and import Search Console dates, queries and pages if available.
5. Record organic registrations separately; the live monitor is a crawl check, not a conversion tracking system.
