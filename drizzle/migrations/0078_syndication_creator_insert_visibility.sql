-- Allow creators to read a newly inserted room in INSERT ... RETURNING.
-- A STABLE SECURITY DEFINER membership lookup may not see the row inserted
-- by its calling statement, so the creator check must be direct in the policy.
-- All non-creator reads remain limited to verified room participants.
DROP POLICY IF EXISTS "room participants read syndication rooms" ON public.syndication_rooms;
CREATE POLICY "room participants read syndication rooms"
  ON public.syndication_rooms FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_syndication_member(id));
