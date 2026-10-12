-- Lovable scan hardening: anonymous demo data, direct launch controls,
-- rate-limit configuration, and member avatar visibility.
-- The /demo page has an in-code fictional catalogue; it does not require
-- direct public access to its seed tables.
--
-- This migration is additive and tolerant of legacy optional demo tables.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies', 'signals', 'seed_threads',
    'seed_learnings', 'posts', 'asks'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon', t);
    END IF;
  END LOOP;

  -- Seed conversations and inferred demo learnings should never be accessible
  -- via direct live-member queries. The authenticated app has in-code fallback.
  FOREACH t IN ARRAY ARRAY['companies','signals','seed_threads','seed_learnings'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM authenticated', t);
    END IF;
  END LOOP;

  -- Leave the member demo-card view intact: its RLS returns only is_demo
  -- fictional profiles, and the public demo depends on that contract.
  IF to_regclass('public.companies') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo companies readable" ON public.companies;
  END IF;
  IF to_regclass('public.signals') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo signals readable" ON public.signals;
  END IF;
  IF to_regclass('public.seed_threads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo threads readable" ON public.seed_threads;
  END IF;
  IF to_regclass('public.seed_learnings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo learnings readable" ON public.seed_learnings;
  END IF;
  IF to_regclass('public.posts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo posts readable" ON public.posts;
  END IF;
  IF to_regclass('public.asks') IS NOT NULL THEN
    DROP POLICY IF EXISTS "demo asks readable" ON public.asks;
  END IF;

  -- Public capacity/mode remains available through founding_stats(), which
  -- exposes only the aggregate values needed by the landing page.
  IF to_regclass('public.launch_settings') IS NOT NULL THEN
    REVOKE SELECT ON TABLE public.launch_settings FROM anon;
    GRANT SELECT ON TABLE public.launch_settings TO authenticated;
    DROP POLICY IF EXISTS "launch settings readable" ON public.launch_settings;
    DROP POLICY IF EXISTS "admin reads launch settings" ON public.launch_settings;
    CREATE POLICY "admin reads launch settings" ON public.launch_settings
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;

  -- API rate-limit thresholds are operational configuration, not member data.
  IF to_regclass('public.capability_limits') IS NOT NULL THEN
    REVOKE SELECT ON TABLE public.capability_limits FROM anon;
    DROP POLICY IF EXISTS "limits readable" ON public.capability_limits;
    DROP POLICY IF EXISTS "admins read capability limits" ON public.capability_limits;
    CREATE POLICY "admins read capability limits" ON public.capability_limits
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- Buckets remain private. Owners may read their own avatars even before
-- approval. Everyone else must be an approved member viewing an approved,
-- network-visible member; pending/suspended accounts gain no blanket access.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Members can view profile photos" ON storage.objects;
    DROP POLICY IF EXISTS "Owner or visible approved member reads avatars" ON storage.objects;
    CREATE POLICY "Owner or visible approved member reads avatars"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR (
          public.is_approved_member(auth.uid())
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id::text = split_part(storage.objects.name, '/', 1)
              AND p.visibility IN ('network', 'public')
              AND public.is_approved_member(p.id)
          )
        )
      )
    );
  END IF;
END $$;
