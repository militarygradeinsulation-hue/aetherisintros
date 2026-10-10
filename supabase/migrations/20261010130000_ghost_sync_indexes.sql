-- Ghost CRM sync: fast contact lookup by network member and same-day activity dedup.
CREATE INDEX IF NOT EXISTS crm_people_member_id_idx ON public.crm_people(member_id) WHERE member_id IS NOT NULL;

-- Dedup checks filter on kind + thread/intro + an occurred_at range for one UTC day.
CREATE INDEX IF NOT EXISTS crm_activities_thread_day_idx ON public.crm_activities(thread_id, kind, occurred_at) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_activities_intro_day_idx ON public.crm_activities(intro_request_id, kind, occurred_at) WHERE intro_request_id IS NOT NULL;
