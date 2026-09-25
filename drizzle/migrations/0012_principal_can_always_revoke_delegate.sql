-- A principal must always be able to revoke a delegate, even if their own
-- verification has lapsed. Only the move to 'revoked' is allowed by this policy.
CREATE POLICY "principal revokes delegates" ON public.delegates FOR UPDATE TO authenticated
  USING (principal_id = auth.uid())
  WITH CHECK (principal_id = auth.uid() AND status = 'revoked');