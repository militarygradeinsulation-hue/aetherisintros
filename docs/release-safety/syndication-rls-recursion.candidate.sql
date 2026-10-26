-- CANDIDATE ONLY: never run on live until backed up and A/B/anon staging tests pass.
-- Production 2026-10-26: SELECT as authenticated with synthetic subject
-- raises SQLSTATE 42P17 (infinite recursion detected in syndication_rooms).
-- Current policy on rooms queries syndication_room_members; members policy
-- queries syndication_rooms, creating a cycle.
--
-- A purpose-limited helper checks only the member's own membership, without
-- selecting syndication_rooms. Tight function execution grants prevent anon use.
BEGIN;

CREATE OR REPLACE FUNCTION public.my_syndication_room_membership(p_room uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.syndication_room_members m
    WHERE m.room_id = p_room AND m.member_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.my_syndication_room_membership(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_syndication_room_membership(uuid) TO authenticated;

DROP POLICY IF EXISTS syn_rooms_access ON public.syndication_rooms;
CREATE POLICY syn_rooms_access ON public.syndication_rooms
  FOR ALL TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.my_syndication_room_membership(id)
    OR visibility = 'public'
  )
  WITH CHECK (created_by = (SELECT auth.uid()));

-- Remove the member -> room policy dependency. An owner may manage
-- memberships in their own rooms via a purpose-limited helper instead.
CREATE OR REPLACE FUNCTION public.my_syndication_room_owner(p_room uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.syndication_rooms r
    WHERE r.id = p_room AND r.created_by = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.my_syndication_room_owner(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_syndication_room_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS syn_members_access ON public.syndication_room_members;
CREATE POLICY syn_members_access ON public.syndication_room_members
  FOR ALL TO authenticated
  USING (member_id = (SELECT auth.uid()) OR public.my_syndication_room_owner(room_id))
  WITH CHECK (member_id = (SELECT auth.uid()) OR public.my_syndication_room_owner(room_id));

DROP POLICY IF EXISTS syn_interests_access ON public.syndication_interests;
CREATE POLICY syn_interests_access ON public.syndication_interests
  FOR ALL TO authenticated
  USING (member_id = (SELECT auth.uid()) OR public.my_syndication_room_owner(room_id))
  WITH CHECK (member_id = (SELECT auth.uid()) OR public.my_syndication_room_owner(room_id));

COMMIT;
-- STAGING: test creator A, invited B, unrelated C, anon D with actual tokens.
-- Test that B cannot invite C, change room, or see private invitees before acceptance.
-- Review helper owner, function body, grants, and Supabase security advisors.
