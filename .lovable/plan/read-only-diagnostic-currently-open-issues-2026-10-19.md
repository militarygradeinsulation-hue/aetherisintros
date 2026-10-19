# Read-only diagnostic: currently open issues

Nothing was changed. I cannot see the Lovable "issues found" panel directly. I can only read the scanners behind it. Together they show **6 open issue types, not 7**. I did not invent a seventh.

## What the scanners report right now (Oct 19, 13:44 UTC)

| # | Issue | Source | Severity | Count | Evidence |
|---|---|---|---|---|---|
| 1 | RLS Enabled No Policy | Database linter (rule 0008) | INFO | 15 tables | Linter run: these tables have security turned on but no access rules, so the app can't read them from the browser |
| 2 | Function Search Path Mutable | Database linter (0011) | WARN | 3 functions | Linter run |
| 3 | Extension in Public | Database linter (0014) | WARN | 2 extensions | Linter run |
| 4 | Public Can Execute SECURITY DEFINER Function | Database linter (0028) | WARN | 20 functions | Linter run |
| 5 | Signed-In Users Can Execute SECURITY DEFINER Function | Database linter (0029) | WARN | 149 functions | Linter run |
| 6 | Resolve the conflicting Google canonical | SEO scanner (agent_content:growth_opportunity) | low | 1 | Google's indexed copy picks intros.today as the main address instead of askintros.vip |

Clean or not counted:
- Security scanners: app MCP shows 0 findings (current). Database deep scan shows 0 (stale, Oct 19 02:57). Dependency scan shows 0 (stale, Oct 15).
- SEO: robots, sitemap, Google setup and page metadata are marked fixed or passing. All SEO scanners are stale against the current commit.

## Affected source files
- Issues 1–5: the database schema in `supabase/migrations/`. The linter gives counts only. The names below come from the earlier catalog read:
  - Issue 1 tables: account_deletions, agent_inbound_hashes, agent_rate_counters, app_settings, capability_usage, companies, intro_request_nudges, member_activation, member_activity_days, professional_opportunities, professional_opportunity_interests, professional_opportunity_saves, seed_learnings, seed_threads, signals.
  - Issue 2 functions: asks_before_write, posts_before_write, sms_group.
  - Issue 3 extensions: pg_net, pg_trgm.
  - Issue 4 functions: the 20 listed in the previous diagnostic, for example invite_preview and join_waitlist. Those two must stay public.
- Issue 6: homepage canonical/og:url in `src/routes/index.tsx` (already askintros.vip in the published build). What's left is Google re-crawling and re-selecting the canonical, plus the intros.today redirect.

## Possible seventh issue (unconfirmed)
The panel may count a stale scanner, such as the outdated dependency or database deep scan, as an item. It may also split a group differently. A screenshot of the panel would let me match it exactly.

## Optional next step (read-only)
Re-run the stale scanners so the counts reflect the current commit. Still no changes or publishing.
