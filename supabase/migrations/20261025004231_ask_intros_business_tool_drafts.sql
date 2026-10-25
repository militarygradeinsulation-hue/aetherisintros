-- Private, profile-owned working documents for Ask Intros Business Tools.
CREATE TABLE IF NOT EXISTS public.business_tool_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tool_id text NOT NULL CHECK (length(tool_id) BETWEEN 1 AND 80),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(inputs) = 'object' AND octet_length(inputs::text) <= 60000),
  output text NOT NULL DEFAULT '' CHECK (length(output) <= 50000),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_tool_drafts_owner_updated ON public.business_tool_drafts(user_id, updated_at DESC);
ALTER TABLE public.business_tool_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_tool_drafts FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_tool_drafts TO authenticated;
CREATE POLICY business_tool_drafts_read ON public.business_tool_drafts FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY business_tool_drafts_create ON public.business_tool_drafts FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY business_tool_drafts_edit ON public.business_tool_drafts FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY business_tool_drafts_remove ON public.business_tool_drafts FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
