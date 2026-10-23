-- The table was introduced by 0070 with user_id, not member_id.
-- A permissive live-member SELECT policy was also installed by 0070;
-- it must be removed or PostgreSQL OR-combines it with this restriction.
-- Source-level repair only: production migration history must be reconciled
-- against the live ledger before any authorized database rollout.
DROP POLICY IF EXISTS "live members read reputation scores" ON public.reputation_scores;
DROP POLICY IF EXISTS rep_scores_read ON public.reputation_scores;
CREATE POLICY rep_scores_read ON public.reputation_scores
  FOR SELECT TO authenticated
  USING (
    public.is_live_member()
    AND (
      auth.uid() = user_id
      OR (
        EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = auth.uid()
            AND f.followee_id = reputation_scores.user_id
            AND f.kind <> 'saved'
        )
        AND EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = reputation_scores.user_id
            AND f.followee_id = auth.uid()
            AND f.kind <> 'saved'
        )
      )
    )
  );
