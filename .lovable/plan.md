# Finish the CEO leverage layer

## Goal
Add only the high-value CEO capabilities not already covered, keeping Home, Network, Work, Messages, News, and Me unchanged as the permanent navigation. All intelligence remains deterministic, evidence-labelled, private by default, and based on canonical records.

## Reuse instead of duplication
- Extend the current CEO insight engine, drawer host, Truth Layer, confidence gaps, Approval Queue, Executive Replay, Coverage, Time ROI, Decision Room, Signals/Intent Exchange, Opportunity Graph, Executive Page, and Home customizer.
- Treat existing Time ROI delegation signals, Trust Passport/dimensions, Replay chronology, private asks, capital/advisor Mission matching, and single-thread coverage as foundations—not parallel features.
- Keep CRM people, companies, opportunities, activities, tasks, notes, calendar events, decisions, asks, profiles, and introductions canonical.

## Build
1. Add deterministic engines and contextual panels for Customer Risk Radar, Capital Map, Delegation Intelligence, Board Network, Advisor on Demand, and expanded key-person dependency.
2. Add a private Negotiation Room linked to existing people, companies, opportunities, meetings, commitments, influence tags, and Decision Room evidence.
3. Add a private Scenario Room that compares recorded baselines with clearly separated user assumptions; no inferred or fabricated financial inputs.
4. Extend Signals/Intent Exchange with a real Private Ask mode using verified-member targeting rules, expiration, share limits, and existing collision/double-opt-in flows.
5. Add factual Trust Profile presentation from verification, introductions, feedback, outcomes, responsiveness, stated expertise, and approved recommendations—without a score or ranking.
6. Extend Replay into Deal Memory and Company Memory with unresolved loops and an evidence-only “Why are we here?” summary.
7. Add verified-member Executive Office Hours settings and request flow, always requiring approval and never auto-booking.
8. Add only two compact Home widgets—Risk Radar and Leverage—and add contextual Work/Network/Executive Page entry points.
9. Extend deterministic Ask Intros recognition for every requested phrase and useful entity arguments.

## Data and security
- Add only minimal owner-scoped persistence for negotiation records, scenarios, and office hours/requests; extend existing asks for private targeting if needed.
- Every new table receives explicit minimum grants before RLS policies, no anonymous or PUBLIC access, service access only where required, and immutable owner columns.
- Authenticated users receive no TRUNCATE, REFERENCES, or TRIGGER privileges.
- Office-hours discovery exposes only explicitly enabled, verified-member-safe fields; requests use existing approval and consent safeguards.
- Verification evidence, private CRM/Grid data, private memory, and unrelated network context never leave their existing boundaries.

## Verification
- Run focused type checks and confirm the preview build is clean.
- Exercise each new panel and every deterministic command on desktop, 390px, and 360px widths with no horizontal overflow.
- Verify schema policies, grants, immutable owners, private targeting, and no anonymous reads.
- Confirm the permanent navigation is unchanged and CRM, Grid, Opportunity Graph, CEO OS, Decision Room, Approval Queue, and existing Executive Page actions still work.
- Do not publish production.

## Assumptions
- “Customer” means a canonical CRM company/person explicitly marked Customer or attached to recorded customer/opportunity activity; no sentiment or churn score will be invented.
- Board/advisor reach uses only visible member statements, recorded connections, strategic marks, and authorized CRM context.
- Office-hours visibility is limited to verified members; private windows remain visible only through an approved request flow.
