-- Follow-through record: evidence-based reputation built from introduction outcomes.
-- Answers "does this person follow through?" from what the other side of each introduction
-- reported, never from the member's own claims. Opt-in to show on a profile, banded (never exact counts or rates), and
-- withheld below a minimum sample so no single counterpart's private answer can be inferred.

CREATE TABLE public.track_record_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_on_profile boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.track_record_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.track_record_settings TO authenticated;
GRANT ALL ON public.track_record_settings TO service_role;
ALTER TABLE public.track_record_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own track record settings" ON public.track_record_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER track_record_settings_freeze BEFORE UPDATE ON public.track_record_settings
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('user_id');
CREATE TRIGGER track_record_settings_touch BEFORE UPDATE ON public.track_record_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Share of part in whole as a coarse band; 'insufficient' below the minimum sample.
CREATE OR REPLACE FUNCTION public.track_record_band(p_part integer, p_whole integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN coalesce(p_whole, 0) < 5 THEN 'insufficient'
    WHEN p_part * 3 >= p_whole * 2 THEN 'most'
    WHEN p_part * 3 >= p_whole THEN 'many'
    WHEN p_part > 0 THEN 'some'
    ELSE 'none'
  END
$$;

CREATE OR REPLACE FUNCTION public.member_track_record(p_member uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_self boolean;
  v_shown boolean;
  v_received integer;
  v_received_accepted integer;
  v_accepted integer;
  v_met integer;
  v_outcomes integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  v_self := v_uid = p_member;
  SELECT coalesce(bool_or(s.show_on_profile), false) INTO v_shown FROM public.track_record_settings s WHERE s.user_id = p_member;
  IF NOT v_self AND NOT v_shown THEN
    RETURN jsonb_build_object('visible', false);
  END IF;

  -- Requests this member received that have had two weeks to be answered (or were answered).
  SELECT count(*), count(*) FILTER (WHERE r.accepted_at IS NOT NULL)
    INTO v_received, v_received_accepted
    FROM public.intro_requests r
   WHERE r.target_user_id = p_member
     AND (r.accepted_at IS NOT NULL OR r.created_at < now() - interval '14 days');

  WITH accepted AS (
    SELECT r.id FROM public.intro_requests r
     WHERE r.accepted_at IS NOT NULL AND (r.user_id = p_member OR r.target_user_id = p_member)
  )
  -- Only the other side's reports count: a member cannot raise their own record by
  -- reporting their own meetings or outcomes.
  SELECT count(*),
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.intro_outcomes o WHERE o.intro_request_id = a.id AND o.author_id <> p_member AND o.stage IN ('met','next_step','outcome'))),
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.intro_outcomes o WHERE o.intro_request_id = a.id AND o.author_id <> p_member AND o.stage = 'outcome'))
    INTO v_accepted, v_met, v_outcomes
    FROM accepted a;

  RETURN jsonb_build_object(
    'visible', true,
    'is_self', v_self,
    'shown_on_profile', v_shown,
    'accepts_introductions', public.track_record_band(v_received_accepted, v_received),
    'introductions_lead_to_meetings', public.track_record_band(v_met, v_accepted),
    'introductions_lead_to_outcomes', public.track_record_band(v_outcomes, v_accepted),
    'sample', CASE WHEN v_accepted >= 25 THEN '25+' WHEN v_accepted >= 10 THEN '10+' WHEN v_accepted >= 5 THEN '5+' ELSE 'under 5' END
  );
END $$;
REVOKE ALL ON FUNCTION public.member_track_record(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_track_record(uuid) TO authenticated;
