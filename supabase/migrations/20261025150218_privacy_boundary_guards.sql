-- Forward-only privacy guards. Existing grants and permissive policies remain;
-- restrictive policies prevent legacy permissive rules from widening visibility.
-- No member rows, attachments, or historical migration records are changed.
DROP POLICY IF EXISTS "posts_visibility_boundary_v1" ON public.posts;
CREATE POLICY "posts_visibility_boundary_v1" ON public.posts
AS RESTRICTIVE FOR SELECT TO authenticated
USING (author_id = (SELECT auth.uid()) OR (visibility = 'network' AND public.is_live_member()));

DROP POLICY IF EXISTS "comments_visible_post_read_v1" ON public.post_comments;
CREATE POLICY "comments_visible_post_read_v1" ON public.post_comments
AS RESTRICTIVE FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id));
DROP POLICY IF EXISTS "comments_visible_post_insert_v1" ON public.post_comments;
CREATE POLICY "comments_visible_post_insert_v1" ON public.post_comments
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id));
DROP POLICY IF EXISTS "comments_visible_post_update_v1" ON public.post_comments;
CREATE POLICY "comments_visible_post_update_v1" ON public.post_comments
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id));

DROP POLICY IF EXISTS "reactions_visible_post_read_v1" ON public.post_reactions;
CREATE POLICY "reactions_visible_post_read_v1" ON public.post_reactions
AS RESTRICTIVE FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_reactions.post_id));
DROP POLICY IF EXISTS "reactions_visible_post_insert_v1" ON public.post_reactions;
CREATE POLICY "reactions_visible_post_insert_v1" ON public.post_reactions
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_reactions.post_id));

DROP POLICY IF EXISTS "journal_visible_post_boundary_v1" ON storage.objects;
CREATE POLICY "journal_visible_post_boundary_v1" ON storage.objects
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  bucket_id <> 'journal'
  OR split_part(name, '/', 1) = (SELECT auth.uid())::text
  OR (
    public.is_live_member()
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.author_id::text = split_part(objects.name, '/', 1)
        AND p.visibility = 'network'
        AND p.media @> jsonb_build_array(jsonb_build_object('path', objects.name))
    )
  )
);

DROP POLICY IF EXISTS "reactions_visible_post_update_v1" ON public.post_reactions;
CREATE POLICY "reactions_visible_post_update_v1" ON public.post_reactions
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_reactions.post_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_reactions.post_id));
