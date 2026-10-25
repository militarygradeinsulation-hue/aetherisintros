-- Additive meeting release. Deleted records remain in host trash for recovery.
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE TABLE public.meeting_invite_links (
 meeting_id uuid PRIMARY KEY REFERENCES public.meetings(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL
);
ALTER TABLE public.meeting_invite_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_invite_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meeting_invite_links TO service_role;

CREATE OR REPLACE FUNCTION public.is_meeting_participant(p_meeting uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.meeting_participants p JOIN public.meetings m ON m.id=p.meeting_id
 WHERE p.meeting_id=p_meeting AND p.user_id=auth.uid() AND m.deleted_at IS NULL)
$$;
REVOKE ALL ON FUNCTION public.is_meeting_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_meeting_participant(uuid) TO authenticated;
-- Host can see trash and restore; other participants cannot see deleted records.
CREATE POLICY "host reads meeting trash" ON public.meetings FOR SELECT TO authenticated USING(host_id=auth.uid());

CREATE OR REPLACE FUNCTION public.rotate_meeting_invite(p_meeting uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.meetings; token text := replace(gen_random_uuid()::text,'-',''); expiry timestamptz:=now()+interval '7 days';
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id=p_meeting AND host_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR m.ended_at IS NOT NULL OR m.archived_at IS NOT NULL OR m.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Only the host of an open meeting can share it' USING errcode='42501'; END IF;
 INSERT INTO public.meeting_invite_links VALUES(p_meeting,md5(token),expiry)
 ON CONFLICT(meeting_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at;
 RETURN jsonb_build_object('code',token,'expiresAt',expiry);
END $$;
CREATE OR REPLACE FUNCTION public.revoke_meeting_invite(p_meeting uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.meetings WHERE id=p_meeting AND host_id=auth.uid()) THEN RAISE EXCEPTION 'Only the host can revoke invitations' USING errcode='42501'; END IF;
 DELETE FROM public.meeting_invite_links WHERE meeting_id=p_meeting;
END $$;
CREATE OR REPLACE FUNCTION public.redeem_meeting_invite(p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE mid uuid; m public.meetings; code text:=lower(regexp_replace(p_code,'[[:space:]-]','','g'));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to join this meeting' USING errcode='42501'; END IF;
 IF code !~ '^[0-9a-f]{32}$' THEN RAISE EXCEPTION 'Invalid or expired meeting code'; END IF;
 SELECT meeting_id INTO mid FROM public.meeting_invite_links WHERE token_hash=md5(code) AND expires_at>now();
 SELECT * INTO m FROM public.meetings WHERE id=mid FOR UPDATE;
 IF NOT FOUND OR m.ended_at IS NOT NULL OR m.archived_at IS NOT NULL OR m.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Invalid or expired meeting code'; END IF;
 -- Recheck after locking to handle invitation rotation racing a join.
 IF NOT EXISTS(SELECT 1 FROM public.meeting_invite_links WHERE meeting_id=mid AND token_hash=md5(code) AND expires_at>now()) THEN RAISE EXCEPTION 'Invalid or expired meeting code'; END IF;
 IF EXISTS(SELECT 1 FROM public.meeting_participants WHERE meeting_id=mid AND user_id=auth.uid()) THEN RETURN mid; END IF;
 IF (SELECT count(*) FROM public.meeting_participants WHERE meeting_id=mid)>=4 THEN RAISE EXCEPTION 'This meeting is full'; END IF;
 INSERT INTO public.meeting_participants(meeting_id,user_id) VALUES(mid,auth.uid());
 RETURN mid;
END $$;
CREATE OR REPLACE FUNCTION public.manage_meeting_record(p_meeting uuid,p_action text,p_title text DEFAULT NULL,p_agenda text DEFAULT NULL,p_scheduled timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.meetings;
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id=p_meeting AND host_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Only the host can manage this meeting' USING errcode='42501'; END IF;
 IF p_action='save' THEN
  IF m.deleted_at IS NOT NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 140 OR p_title IS NULL OR char_length(coalesce(p_agenda,''))>4000 THEN RAISE EXCEPTION 'Invalid meeting details'; END IF;
  UPDATE public.meetings SET title=btrim(p_title),agenda=coalesce(p_agenda,''),scheduled_for=p_scheduled WHERE id=p_meeting;
 ELSIF p_action IN ('archive','delete') THEN
  IF m.started_at IS NOT NULL AND m.ended_at IS NULL THEN RAISE EXCEPTION 'End the live meeting before archiving or deleting it'; END IF;
  UPDATE public.meetings SET archived_at=CASE WHEN p_action='archive' THEN now() ELSE archived_at END,deleted_at=CASE WHEN p_action='delete' THEN now() ELSE deleted_at END WHERE id=p_meeting;
  DELETE FROM public.meeting_invite_links WHERE meeting_id=p_meeting;
 ELSIF p_action='restore' THEN
  UPDATE public.meetings SET archived_at=NULL,deleted_at=NULL WHERE id=p_meeting;
 ELSE RAISE EXCEPTION 'Unknown meeting action';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.rotate_meeting_invite(uuid),public.revoke_meeting_invite(uuid),public.redeem_meeting_invite(text),public.manage_meeting_record(uuid,text,text,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rotate_meeting_invite(uuid),public.revoke_meeting_invite(uuid),public.redeem_meeting_invite(text),public.manage_meeting_record(uuid,text,text,text,timestamptz) TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('meeting-audio','meeting-audio',false,4194304,ARRAY['audio/webm','audio/mp4','audio/ogg'])
ON CONFLICT(id) DO NOTHING;
CREATE POLICY "meeting attendees read audio" ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='meeting-audio' AND EXISTS(SELECT 1 FROM public.meetings m WHERE m.id::text=split_part(name,'/',1) AND m.deleted_at IS NULL AND public.is_meeting_participant(m.id)));
CREATE POLICY "consenting attendees upload own audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='meeting-audio' AND split_part(name,'/',2)=auth.uid()::text
 AND EXISTS(SELECT 1 FROM public.meeting_participants p JOIN public.meetings m ON m.id=p.meeting_id
 WHERE m.id::text=split_part(name,'/',1) AND p.user_id=auth.uid() AND p.notes_consent AND m.deleted_at IS NULL AND m.archived_at IS NULL AND m.ended_at IS NULL AND m.recording_started_at IS NOT NULL));
CREATE POLICY "speakers remove own audio" ON storage.objects FOR DELETE TO authenticated USING(
 bucket_id='meeting-audio' AND split_part(name,'/',2)=auth.uid()::text);

-- Existing member invitations and code redemption share one capacity lock.
CREATE OR REPLACE FUNCTION public.guard_meeting_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.meetings WHERE id=NEW.meeting_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.meeting_participants WHERE meeting_id=NEW.meeting_id AND user_id=NEW.user_id)
 AND (SELECT count(*) FROM public.meeting_participants WHERE meeting_id=NEW.meeting_id)>=4 THEN
 RAISE EXCEPTION 'This meeting is full';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_meeting_capacity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER meeting_capacity_guard BEFORE INSERT ON public.meeting_participants FOR EACH ROW EXECUTE FUNCTION public.guard_meeting_capacity();
NOTIFY pgrst, 'reload schema';
