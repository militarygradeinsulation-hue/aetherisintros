DROP POLICY IF EXISTS rep_scores_read ON public.reputation_scores;
CREATE POLICY rep_scores_read ON public.reputation_scores FOR SELECT TO authenticated USING (
  auth.uid() = member_id
  OR (
    EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.followee_id = reputation_scores.member_id AND f.kind <> 'saved')
    AND EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = reputation_scores.member_id AND f.followee_id = auth.uid() AND f.kind <> 'saved')
  )
);