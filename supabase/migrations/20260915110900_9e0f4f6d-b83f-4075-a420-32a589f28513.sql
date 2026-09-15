ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'network';

DROP POLICY IF EXISTS "Members read network posts" ON public.posts;
CREATE POLICY "Members read network posts"
ON public.posts FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR (visibility = 'network' AND (is_demo = true OR author_id IS NULL OR public.is_live_member()))
);

CREATE POLICY "Journal owners manage their files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'journal' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'journal' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Members read journal files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'journal' AND public.is_live_member());