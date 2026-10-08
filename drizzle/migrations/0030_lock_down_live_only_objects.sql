-- Closes the access gaps in the objects recorded by 0029. All of them were reachable through
-- the public API (PostgREST) with nothing more than the anon key:
--
-- 1. network_health() returned every member's name, email, join date, last sign-in and
--    duplicate-account report to anyone, signed in or not. network_brief(p_user) returned any
--    member's pending introductions and reasons. run_verification_scan(p_user) let anyone
--    rewrite any member's verification record. nudge_incomplete_onboarding() let anyone send
--    notifications. member_profile_strength(p_user) scored anyone's profile. None of them is
--    called by the app; they are operator tools, so only the service role keeps them.
-- 2. match_reasoning(viewer, target) returned two arbitrary members' profile details. The
--    members view calls it for the signed-in viewer, so it stays callable by members, but
--    only as themselves.
-- 3. The members view granted INSERT/UPDATE/DELETE to anon and authenticated, and its
--    INSTEAD OF triggers write members_base as the table owner. Anyone could overwrite any
--    member's directory card (insert upserts on id). Only the service-role seed writes it.
-- 4. events rows were readable by the person an event is about, and memory events carry the
--    full text of the author's private note; saved-member events reveal a private save. Rows
--    are now readable only by their owner. Clients never wrote events (emit_event does, as
--    owner), so client writes are removed too.

-- 1. Operator-only functions
REVOKE ALL ON FUNCTION public.network_health() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.network_brief(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_verification_scan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.nudge_incomplete_onboarding() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.member_profile_strength(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.network_health(), public.network_brief(uuid, integer),
  public.run_verification_scan(uuid), public.nudge_incomplete_onboarding(),
  public.member_profile_strength(uuid) TO service_role;

-- Trigger-only functions: never meant to be called directly.
REVOKE ALL ON FUNCTION public.members_view_write(), public.emit_event(), public.sync_member_record(),
  public.open_verification_record(), public.block_demo_intro(), public.set_intro_target(),
  public.notify_intro_activity() FROM PUBLIC, anon, authenticated;

-- 2. match_reasoning: only for the signed-in viewer (service-role callers have no auth.uid()).
CREATE OR REPLACE FUNCTION public.match_reasoning(p_viewer uuid, p_target uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a profiles%rowtype; b profiles%rowtype;
  v_shared_exp text[]; v_shared_ind text[];
  v_why_them text := ''; v_why_you text := ''; v_why_now text := '';
  v_score int := 0;
begin
  if auth.uid() is not null and p_viewer is distinct from auth.uid() then return null; end if;

  select * into a from profiles where id = p_viewer;
  select * into b from profiles where id = p_target;
  if a.id is null or b.id is null then return null; end if;

  select array(select unnest(a.expertise)  intersect select unnest(b.expertise))  into v_shared_exp;
  select array(select unnest(a.industries) intersect select unnest(b.industries)) into v_shared_ind;

  if coalesce(btrim(b.can_help_with),'') <> '' then
    v_why_them := b.name || ' can help with: ' || b.can_help_with;
    v_score := v_score + 25;
  end if;
  if coalesce(btrim(b.focus),'') <> '' then
    v_why_them := nullif(v_why_them || case when v_why_them <> '' then ' ' else '' end, '')
                  || 'Current focus: ' || b.focus;
    v_score := v_score + 10;
  end if;

  if coalesce(btrim(a.can_help_with),'') <> '' and coalesce(btrim(b.looking_for),'') <> '' then
    v_why_you := 'They are looking for: ' || b.looking_for || '. You offer: ' || a.can_help_with;
    v_score := v_score + 30;
  elsif coalesce(btrim(a.can_help_with),'') <> '' then
    v_why_you := 'You offer: ' || a.can_help_with;
    v_score := v_score + 10;
  end if;

  if coalesce(array_length(v_shared_ind,1),0) > 0 then
    v_why_now := 'Shared industry: ' || array_to_string(v_shared_ind, ', ') || '. ';
    v_score := v_score + 15;
  end if;
  if coalesce(array_length(v_shared_exp,1),0) > 0 then
    v_why_now := v_why_now || 'Overlapping expertise: ' || array_to_string(v_shared_exp, ', ') || '. ';
    v_score := v_score + 15;
  end if;
  if coalesce(btrim(b.availability),'') <> '' then
    v_why_now := v_why_now || 'They are available: ' || b.availability || '.';
    v_score := v_score + 5;
  end if;

  return jsonb_build_object(
    'why_them', nullif(btrim(coalesce(v_why_them,'')),''),
    'why_you',  nullif(btrim(coalesce(v_why_you,'')),''),
    'why_now',  nullif(btrim(coalesce(v_why_now,'')),''),
    'score',    least(100, v_score),
    'shared_expertise', to_jsonb(v_shared_exp),
    'shared_industries', to_jsonb(v_shared_ind),
    'evidence', case when v_score = 0 then 'Neither profile states enough to justify an introduction yet.' else null end
  );
end $function$;
REVOKE ALL ON FUNCTION public.match_reasoning(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_reasoning(uuid, uuid) TO authenticated, service_role;

-- 3. The member directory is written by the service role only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.members FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.members_base FROM anon, authenticated;

-- 4. Events: readable by their owner only; written by emit_event() alone.
DROP POLICY IF EXISTS "own events insert" ON public.events;
DROP POLICY IF EXISTS "own events readable" ON public.events;
CREATE POLICY "own events readable" ON public.events FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.events FROM authenticated;
GRANT SELECT ON public.events TO authenticated;
