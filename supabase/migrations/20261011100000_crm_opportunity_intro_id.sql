-- Ghost CRM: add intro_request_id to crm_opportunities so auto-created opportunities
-- can be deduped precisely (one per introduction) without a fragile ILIKE text scan.
--
-- The column is nullable — manually created opportunities have no intro.
-- A unique partial index on non-null values enforces at-most-one-per-intro.

alter table public.crm_opportunities
  add column if not exists intro_request_id uuid references public.intro_requests(id) on delete set null;

-- Unique: at most one ghost-created opportunity per introduction.
create unique index if not exists crm_opportunities_intro_request_id_unique
  on public.crm_opportunities (intro_request_id)
  where intro_request_id is not null;

-- Index for fast lookups when querying by intro (used in ghost-sync dedup check).
create index if not exists crm_opportunities_intro_request_id_idx
  on public.crm_opportunities (intro_request_id)
  where intro_request_id is not null;
