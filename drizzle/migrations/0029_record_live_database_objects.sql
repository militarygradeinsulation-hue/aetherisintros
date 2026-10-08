-- Records objects that exist in the live database but were created by SQL run directly
-- against it, outside supabase/migrations and drizzle/migrations. Every definition below
-- was copied from the live catalog (pg_get_functiondef / pg_get_triggerdef / pg_get_viewdef)
-- on 2026-10-08, so applying this to production changes nothing: it is idempotent and only
-- makes the repo the source of truth again. Access is tightened separately, in 0030.
--
-- Known limitation: a database built from scratch out of this repo still fails earlier, at
-- supabase/migrations/20260916194438, which ALTERs memories_before_insert() and
-- relative_label() before any migration creates them. supabase/migrations is frozen history
-- (docs/MIGRATIONS.md), so that ordering is documented here rather than rewritten.

-- ── Columns ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS fact_key text;
CREATE INDEX IF NOT EXISTS memories_fact_key_idx ON public.memories USING btree (user_id, source, fact_key) WHERE (fact_key IS NOT NULL);

-- ── Activity log written by emit_event() ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  person_id uuid,
  type text NOT NULL,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'app'::text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_user_time_idx ON public.events USING btree (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS events_person_time_idx ON public.events USING btree (person_id, occurred_at DESC) WHERE (person_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS events_type_idx ON public.events USING btree (user_id, type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS events_payload_idx ON public.events USING gin (payload);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own events insert" ON public.events;
CREATE POLICY "own events insert" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own events readable" ON public.events;
CREATE POLICY "own events readable" ON public.events FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR (auth.uid() = person_id));

-- ── members: the table became members_base, and members a view over it ─────────────────
DO $$
BEGIN
  IF to_regclass('public.members_base') IS NULL THEN
    ALTER TABLE public.members RENAME TO members_base;
  END IF;
END $$;
ALTER TABLE public.members_base ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS members_demo_idx ON public.members_base USING btree (is_demo);
CREATE INDEX IF NOT EXISTS members_industry_idx ON public.members_base USING btree (industry);
ALTER TABLE public.members_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "demo members readable" ON public.members_base;
CREATE POLICY "demo members readable" ON public.members_base FOR SELECT TO anon USING ((is_demo = true));
DROP POLICY IF EXISTS "live members readable" ON public.members_base;
CREATE POLICY "live members readable" ON public.members_base FOR SELECT TO authenticated USING (((is_demo = false) AND public.is_live_member()));

-- ── Functions ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.relative_label(ts timestamp with time zone)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when ts is null then ''
    when now() - ts < interval '2 minutes'  then 'Just now'
    when now() - ts < interval '1 hour'     then extract(minute from now() - ts)::int || 'm ago'
    when now() - ts < interval '1 day'      then extract(hour   from now() - ts)::int || 'h ago'
    when now() - ts < interval '30 days'    then extract(day    from now() - ts)::int || 'd ago'
    else to_char(ts, 'Mon DD, YYYY')
  end;
$function$;
REVOKE ALL ON FUNCTION public.relative_label(timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relative_label(timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_approved_member(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.early_access_members e
    where e.user_id = p_user and e.status = 'approved'
  )
$function$;

CREATE OR REPLACE FUNCTION public.memories_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_key text;
begin
  -- always stamp an accurate label at write time
  new.when_label := public.relative_label(coalesce(new.created_at, now()));

  -- drop near-duplicate writes (same user, same text, same source, within 10 minutes)
  if exists (
    select 1 from public.memories m
    where m.user_id = new.user_id
      and m.text    = new.text
      and m.source  = new.source
      and m.created_at > now() - interval '10 minutes'
  ) then
    return null;
  end if;

  -- supersede: a restated fact replaces the prior version instead of stacking
  v_key := case when position(':' in new.text) > 0
                then lower(btrim(split_part(new.text, ':', 1)))
                else null end;
  new.fact_key := v_key;

  if v_key is not null then
    delete from public.memories m
    where m.user_id = new.user_id
      and m.source  = new.source
      and m.fact_key = v_key;
  end if;

  return new;
end;
$function$;
REVOKE ALL ON FUNCTION public.memories_before_insert() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.asks_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.member_id is null and new.author_id is not null then
    new.member_id := new.author_id::text;
  end if;
  new.posted := public.relative_label(coalesce(new.created_at, now()));
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.posts_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.member_id is null and new.author_id is not null then
    new.member_id := new.author_id::text;
  end if;
  new.when_label := public.relative_label(coalesce(new.created_at, now()));
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.set_intro_target()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.target_user_id is null and new.member_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select p.id into new.target_user_id
    from public.profiles p
    where p.id = new.member_id::uuid;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.notify_intro_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_requester text;
  v_target text;
begin
  select coalesce(nullif(btrim(name),''),'A member') into v_requester from profiles where id = new.user_id;
  select coalesce(nullif(btrim(name),''),'A member') into v_target   from profiles where id = new.target_user_id;

  if TG_OP = 'INSERT' and new.target_user_id is not null then
    insert into notifications (user_id, kind, text, actor_id, link)
    values (new.target_user_id, 'intro_request',
            v_requester || ' asked to be introduced: ' || new.reason,
            new.user_id, '/app/introductions');
    return new;
  end if;

  if TG_OP = 'UPDATE' and new.status is distinct from old.status then
    insert into notifications (user_id, kind, text, actor_id, link)
    values (new.user_id, 'intro_' || new.status,
            v_target || ' ' ||
            case new.status
              when 'accepted'  then 'accepted your introduction request'
              when 'declined'  then 'declined your introduction request'
              when 'connected' then 'is now connected with you'
              else 'updated your introduction request'
            end,
            new.target_user_id, '/app/introductions');

    -- both sides opted in: make the connection real
    if new.status in ('accepted','connected') and new.target_user_id is not null then
      insert into relationships (user_id, member_id, kind)
      values (new.user_id, new.target_user_id::text, 'connection')
      on conflict (user_id, member_id, kind) do nothing;
      insert into relationships (user_id, member_id, kind)
      values (new.target_user_id, new.user_id::text, 'connection')
      on conflict (user_id, member_id, kind) do nothing;
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.member_profile_strength(p_user uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select least(100, (
      case when coalesce(btrim(p.title),'')          <> '' then 10 else 0 end
    + case when coalesce(btrim(p.company),'')        <> '' then 10 else 0 end
    + case when coalesce(btrim(p.location),'')       <> '' then  8 else 0 end
    + case when coalesce(btrim(p.focus),'')          <> '' then 12 else 0 end
    + case when coalesce(btrim(p.thesis),'')         <> '' then 10 else 0 end
    + case when coalesce(btrim(p.bio),'')            <> '' then  8 else 0 end
    + case when coalesce(btrim(p.looking_for),'')    <> '' then 12 else 0 end
    + case when coalesce(btrim(p.can_help_with),'')  <> '' then 12 else 0 end
    + case when coalesce(array_length(p.expertise,1),0)  > 0 then 8 else 0 end
    + case when coalesce(array_length(p.industries,1),0) > 0 then 5 else 0 end
    + coalesce((select v.verification_level * 5 from member_verifications v where v.user_id = p.id), 0)
  ))
  from profiles p where p.id = p_user;
$function$;

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

CREATE OR REPLACE FUNCTION public.block_demo_intro()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists (select 1 from public.members m where m.id = new.member_id and m.is_demo) then
    raise exception 'Cannot request an introduction to % — that record is a demo fixture, not a real member.', new.member_id
      using errcode = 'check_violation';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.emit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid; v_person uuid; v_type text; v_payload jsonb := '{}'::jsonb; v_at timestamptz;
begin
  if TG_TABLE_NAME = 'intro_requests' then
    v_user := new.user_id; v_person := new.target_user_id; v_at := coalesce(new.updated_at, now());
    v_type := case when TG_OP = 'INSERT' then 'intro.requested' else 'intro.' || new.status end;
    if TG_OP = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
    v_payload := jsonb_build_object('reason', new.reason, 'mutual_value', new.mutual_value,
                                    'member_id', new.member_id, 'status', new.status);

  elsif TG_TABLE_NAME = 'memories' then
    v_user := new.user_id; v_at := new.created_at; v_type := 'memory.recorded';
    v_payload := jsonb_build_object('text', new.text, 'category', new.category,
                                    'source', new.source, 'fact_key', new.fact_key);
    if new.member_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then v_person := new.member_id::uuid; end if;

  elsif TG_TABLE_NAME = 'asks' then
    if new.author_id is null then return new; end if;
    v_user := new.author_id; v_at := new.created_at; v_type := 'ask.posted';
    v_payload := jsonb_build_object('ask', new.ask, 'urgency', new.urgency,
                                    'industry', new.industry, 'visibility', new.visibility);

  elsif TG_TABLE_NAME = 'posts' then
    if new.author_id is null then return new; end if;
    v_user := new.author_id; v_at := new.created_at; v_type := 'post.published';
    v_payload := jsonb_build_object('kind', new.kind, 'text', new.text);

  elsif TG_TABLE_NAME = 'relationships' then
    v_user := new.user_id; v_at := new.created_at; v_type := 'connection.created';
    if new.member_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then v_person := new.member_id::uuid; end if;
    v_payload := jsonb_build_object('kind', new.kind, 'member_id', new.member_id);

  elsif TG_TABLE_NAME = 'member_verifications' then
    if TG_OP = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
    v_user := new.user_id; v_at := coalesce(new.updated_at, now());
    v_type := 'verification.' || new.status::text;
    v_payload := jsonb_build_object('level', new.verification_level,
                                    'reason', new.decision_reason, 'flags', new.risk_flags);

  elsif TG_TABLE_NAME = 'profiles' then
    v_user := new.id; v_at := coalesce(new.updated_at, now());
    if TG_OP = 'INSERT' then
      v_type := 'member.joined';
    elsif coalesce(old.onboarded,false) = false and new.onboarded = true then
      v_type := 'member.onboarded';
    else
      return new;
    end if;
    v_payload := jsonb_build_object('name', new.name, 'company', new.company);
  else
    return new;
  end if;

  insert into public.events (user_id, person_id, type, occurred_at, source, payload)
  values (v_user, v_person, v_type, v_at, 'app', v_payload);
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.members_view_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if TG_OP = 'INSERT' then
    insert into public.members_base values (new.*)
    on conflict (id) do update set
      name=excluded.name, initials=excluded.initials, title=excluded.title,
      company=excluded.company, location=excluded.location, role=excluded.role,
      industry=excluded.industry, bio=excluded.bio, focus=excluded.focus,
      thesis=excluded.thesis, availability=excluded.availability,
      expertise=excluded.expertise, needs=excluded.needs, offers=excluded.offers,
      why_them=excluded.why_them, score_total=excluded.score_total,
      confidence=excluded.confidence, radar=excluded.radar,
      relationship_status=excluded.relationship_status, is_demo=excluded.is_demo;
    return new;
  elsif TG_OP = 'UPDATE' then
    update public.members_base set
      name=new.name, initials=new.initials, title=new.title, company=new.company,
      location=new.location, role=new.role, industry=new.industry, bio=new.bio,
      tags=new.tags, expertise=new.expertise, needs=new.needs, offers=new.offers,
      focus=new.focus, thesis=new.thesis, availability=new.availability,
      mutuals=new.mutuals, last_interaction_days=new.last_interaction_days,
      relationship_status=new.relationship_status, score=new.score,
      score_total=new.score_total, radar=new.radar, why_them=new.why_them,
      why_you=new.why_you, why_now=new.why_now, best_path=new.best_path,
      next_action=new.next_action, dont_do=new.dont_do, confidence=new.confidence,
      opportunity_low=new.opportunity_low, opportunity_high=new.opportunity_high,
      intro_state=new.intro_state, joined=new.joined, is_demo=new.is_demo
    where id = old.id;
    return new;
  else
    delete from public.members_base where id = old.id;
    return old;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.sync_member_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_name text := coalesce(nullif(btrim(new.name), ''), 'Member');
  v_initials text; v_strength int; v_level int; v_summary text := '';
begin
  v_initials := coalesce(nullif(btrim(new.initials), ''),
    upper(left(split_part(v_name,' ',1),1) || coalesce(nullif(left(split_part(v_name,' ',2),1),''), '')));
  v_strength := coalesce(public.member_profile_strength(new.id), 0);
  select coalesce(verification_level,0) into v_level from public.member_verifications where user_id = new.id;

  if coalesce(btrim(new.can_help_with),'') <> '' then
    v_summary := 'Can help with: ' || new.can_help_with;
  end if;
  if coalesce(btrim(new.looking_for),'') <> '' then
    v_summary := v_summary || case when v_summary <> '' then ' ' else '' end || 'Looking for: ' || new.looking_for;
  end if;

  -- writes go to the base table: "members" is now a view and cannot take ON CONFLICT
  insert into public.members_base (
    id, name, initials, title, company, location, role, industry,
    bio, focus, thesis, availability, expertise, needs, offers,
    why_them, score_total, confidence, radar, relationship_status, is_demo
  ) values (
    new.id::text, v_name, v_initials,
    coalesce(new.title,''), coalesce(new.company,''), coalesce(new.location,''),
    coalesce(nullif(btrim(new.title),''), 'Member'), coalesce((new.industries)[1],''),
    coalesce(new.bio,''), coalesce(new.focus,''), coalesce(new.thesis,''), coalesce(new.availability,''),
    coalesce(new.expertise,'{}'),
    case when coalesce(btrim(new.looking_for),'')='' then '{}'::text[] else array[new.looking_for] end,
    case when coalesce(btrim(new.can_help_with),'')='' then '{}'::text[] else array[new.can_help_with] end,
    v_summary, v_strength, least(100, v_strength),
    case when v_level >= 1 then 'verified' else 'unverified' end,
    case when new.onboarded then 'active' else 'new' end,
    false
  )
  on conflict (id) do update set
    name=excluded.name, initials=excluded.initials, title=excluded.title,
    company=excluded.company, location=excluded.location, role=excluded.role,
    industry=excluded.industry, bio=excluded.bio, focus=excluded.focus,
    thesis=excluded.thesis, availability=excluded.availability,
    expertise=excluded.expertise, needs=excluded.needs, offers=excluded.offers,
    why_them=excluded.why_them, score_total=excluded.score_total,
    confidence=excluded.confidence, radar=excluded.radar,
    relationship_status=excluded.relationship_status, is_demo=false;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.open_verification_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_email text;
begin
  select u.email into v_email from auth.users u where u.id = new.id;
  insert into public.member_verifications
    (user_id, legal_name, display_name, business_name, work_email, status, submitted_at)
  values
    (new.id, coalesce(new.name,''), coalesce(new.name,''), coalesce(new.company,''),
     coalesce(v_email,''), 'pending'::verification_status, now())
  on conflict do nothing;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.auto_verify_invited(p_uid uuid, p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.member_verifications (user_id, work_email, status, verification_level, decision_reason, verified_at, submitted_at)
  values (p_uid, coalesce(p_email,''), 'verified', 1, 'Auto-verified: joined with a valid member invite code', now(), now())
  on conflict (user_id) do update set
    status = 'verified',
    verification_level = greatest(member_verifications.verification_level, 1),
    decision_reason = case when member_verifications.status = 'verified' then member_verifications.decision_reason
                           else 'Auto-verified: joined with a valid member invite code' end,
    verified_at = coalesce(member_verifications.verified_at, now())
  where member_verifications.status in ('pending','scanning','manual_review','needs_more_proof');
end $function$;
REVOKE ALL ON FUNCTION public.auto_verify_invited(uuid, text) FROM PUBLIC, anon, authenticated;

-- Live version: invite verification moved into auto_verify_invited() (repo 0021 inlined it).
CREATE OR REPLACE FUNCTION public.claim_early_access(p_invite_code text DEFAULT NULL::text)
 RETURNS TABLE(status text, founding_member_number integer, mode text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_mode text;
  v_next integer;
  v_code text := nullif(trim(coalesce(p_invite_code, '')), '');
  v_existing public.early_access_members;
  v_invite public.invitations;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select e.* into v_existing from public.early_access_members e where e.user_id = v_uid;
  if found and v_existing.status in ('approved','suspended','denied') then
    if v_existing.status = 'approved' and v_existing.source = 'invite' then
      perform public.auto_verify_invited(v_uid, v_existing.email);
    end if;
    return query select v_existing.status, v_existing.founding_member_number,
      (select s.mode from public.launch_settings s where s.id = 1);
    return;
  end if;

  select u.email, coalesce(v_code, nullif(trim(u.raw_user_meta_data->>'invite_code'), ''))
    into v_email, v_code from auth.users u where u.id = v_uid;
  select s.mode into v_mode from public.launch_settings s where s.id = 1 for update;

  if v_code is not null then
    select i.* into v_invite from public.invitations i
    where lower(i.code) = lower(v_code)
      and i.revoked = false and i.uses < i.max_uses
      and (i.expires_at is null or i.expires_at > now())
      and (i.email is null or lower(i.email) = lower(v_email))
    for update;
  end if;

  if v_invite.id is null then
    insert into public.early_access_members (user_id, email, status, source)
    values (v_uid, v_email, 'pending', 'code_required')
    on conflict (user_id) do update set status = 'pending', source = 'code_required', updated_at = now();
    return query select 'pending'::text, null::integer, v_mode;
    return;
  end if;

  select coalesce(max(e.founding_member_number), 0) + 1 into v_next from public.early_access_members e;

  insert into public.early_access_members
    (user_id, email, status, source, founding_member_number, approved_at, invite_id)
  values (v_uid, v_email, 'approved', 'invite', v_next, now(), v_invite.id)
  on conflict (user_id) do update set
    status = 'approved',
    source = 'invite',
    founding_member_number = coalesce(early_access_members.founding_member_number, v_next),
    approved_at = coalesce(early_access_members.approved_at, now()),
    invite_id = coalesce(v_invite.id, early_access_members.invite_id),
    updated_at = now();

  update public.invitations i set uses = i.uses + 1 where i.id = v_invite.id;
  delete from public.waitlist_entries w where w.user_id = v_uid;

  perform public.auto_verify_invited(v_uid, v_email);

  return query select e.status, e.founding_member_number, v_mode
  from public.early_access_members e where e.user_id = v_uid;
end $function$;

-- Live version: every member is connected to every other member (repo linked new members to
-- the launch owner only).
CREATE OR REPLACE FUNCTION public.connect_new_member_to_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_other uuid;
begin
  -- Early-access topology: every real member is connected to every other real
  -- member, in both directions. Previously this only linked to the launch
  -- owner, which left members invisible to each other.
  for v_other in
    select p.id from public.profiles p where p.id <> new.id
  loop
    insert into public.relationships (user_id, member_id, kind)
    values (new.id, v_other::text, 'connection')
    on conflict (user_id, member_id, kind) do nothing;

    insert into public.relationships (user_id, member_id, kind)
    values (v_other, new.id::text, 'connection')
    on conflict (user_id, member_id, kind) do nothing;

    insert into public.follows (follower_id, followee_id, kind)
    values (new.id, v_other, 'connection')
    on conflict (follower_id, followee_id, kind) do nothing;

    insert into public.follows (follower_id, followee_id, kind)
    values (v_other, new.id, 'connection')
    on conflict (follower_id, followee_id, kind) do nothing;
  end loop;

  return new;
end $function$;
REVOKE ALL ON FUNCTION public.connect_new_member_to_owner() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_verification_scan(p_user uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v record;
  v_login_email text;
  v_login_domain text;
  v_biz_domain text;
  v_work_domain text;
  v_consumer boolean;
  v_level int := 0;
  v_flags jsonb := '[]'::jsonb;
  v_reason text := '';
  v_status verification_status;
begin
  select * into v from public.member_verifications where user_id = p_user;
  if not found then return 'no_record'; end if;

  -- never overwrite a decided record
  if v.status in ('verified','rejected','suspended') then
    return 'skipped (' || v.status::text || ')';
  end if;

  select u.email into v_login_email from auth.users u
   where u.id = p_user and u.email_confirmed_at is not null;

  v_login_domain := lower(split_part(coalesce(v_login_email,''), '@', 2));
  v_consumer := v_login_domain in ('gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','aol.com','proton.me');

  v_biz_domain := lower(regexp_replace(coalesce(v.business_domain,''), '^https?://(www\.)?|/.*$', '', 'g'));
  if v_biz_domain = '' and v_login_domain <> '' and not v_consumer then
    v_biz_domain := v_login_domain;
  end if;
  v_work_domain := lower(split_part(coalesce(v.work_email,''), '@', 2));

  if v_login_domain <> '' and v_biz_domain <> '' and v_login_domain = v_biz_domain then
    v_level := 1;
    v_reason := 'Confirmed login address on business domain (' || v_biz_domain || ')';
  end if;

  if v_level >= 1 and v_work_domain = v_biz_domain then
    v_level := 2;
    v_reason := v_reason || '; work email corroborates the same domain';
  end if;

  if v_consumer then v_flags := v_flags || jsonb_build_array('consumer_email_domain'); end if;
  if coalesce(v.professional_url,'') = '' then v_flags := v_flags || jsonb_build_array('no_professional_url'); end if;
  if v_login_email is null then
    v_flags := v_flags || jsonb_build_array('email_unconfirmed');
    v_level := 0;
  end if;

  v_status := case when v_level >= 1 then 'verified'::verification_status
                   else 'manual_review'::verification_status end;
  if v_level = 0 then
    v_reason := 'No domain evidence linking the account to a business; routed to manual review';
  end if;

  update public.member_verifications
     set status = v_status,
         verification_level = greatest(verification_level, v_level),
         business_domain = case when coalesce(business_domain,'') = '' then v_biz_domain else business_domain end,
         risk_flags = v_flags,
         decision_reason = v_reason,
         scanned_at = now(),
         verified_at = case when v_status = 'verified' then coalesce(verified_at, now()) else verified_at end,
         updated_at = now()
   where user_id = p_user;

  return v_status::text || ' (L' || v_level || ')';
end $function$;

CREATE OR REPLACE FUNCTION public.nudge_incomplete_onboarding()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_count int;
begin
  with targets as (
    select p.id from profiles p
    where not p.onboarded
      and exists (select 1 from member_verifications v where v.user_id=p.id and v.status='verified')
      and not exists (
        select 1 from notifications n
        where n.user_id = p.id and n.kind = 'onboarding_incomplete'
          and n.created_at > now() - interval '3 days')
  )
  insert into notifications (user_id, kind, text, link)
  select t.id, 'onboarding_incomplete',
         'Your profile is verified but incomplete. Members cannot be matched to you until you add what you are looking for and what you can help with.',
         '/onboarding'
  from targets t;
  get diagnostics v_count = row_count;
  return v_count;
end $function$;

CREATE OR REPLACE FUNCTION public.network_brief(p_user uuid, p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v jsonb;
begin
  select jsonb_build_object(
    'generated_at', now(),
    'window_days', p_days,
    'you', (select jsonb_build_object('name', name, 'profile_strength',
              public.member_profile_strength(p_user),
              'onboarded', onboarded) from profiles where id = p_user),
    'network_size', (select count(*) from members_base where not is_demo and id <> p_user::text),
    'activity', (
      select coalesce(jsonb_object_agg(type, n), '{}'::jsonb) from (
        select type, count(*) as n from events
        where user_id = p_user and occurred_at > now() - (p_days || ' days')::interval
        group by type) t),
    'new_members', (
      select coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'company', p.company,
               'joined', e.occurred_at, 'profile_strength', public.member_profile_strength(p.id))
               order by e.occurred_at desc), '[]'::jsonb)
      from events e join profiles p on p.id = e.user_id
      where e.type = 'member.joined' and e.user_id <> p_user
        and e.occurred_at > now() - (p_days || ' days')::interval),
    'pending_intros', (
      select coalesce(jsonb_agg(jsonb_build_object('with', pr.name, 'status', i.status,
               'reason', i.reason, 'since', i.created_at)), '[]'::jsonb)
      from intro_requests i left join profiles pr on pr.id = i.target_user_id
      where (i.user_id = p_user or i.target_user_id = p_user) and i.status = 'requested'),
    'incomplete_profiles', (
      select coalesce(jsonb_agg(jsonb_build_object('name', p.name,
               'strength', public.member_profile_strength(p.id))), '[]'::jsonb)
      from profiles p where p.onboarded = false and p.id <> p_user),
    'top_matches', (
      select coalesce(jsonb_agg(m order by (m->>'score')::int desc), '[]'::jsonb)
      from (
        select public.match_reasoning(p_user, b.id::uuid) || jsonb_build_object('name', b.name) as m
        from members_base b
        where not b.is_demo and b.id <> p_user::text
          and b.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        limit 10) s
      where (m->>'score')::int > 0)
  ) into v;
  return v;
end $function$;

CREATE OR REPLACE FUNCTION public.network_health()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
select jsonb_build_object(
  'checked_at', now(),
  'members', jsonb_build_object(
    'total', (select count(*) from profiles),
    'onboarded', (select count(*) from profiles where onboarded),
    'verified', (select count(*) from member_verifications where status='verified'),
    'blocked', (select count(*) from profiles p where not exists (
        select 1 from member_verifications v where v.user_id=p.id and v.status='verified'))),

  'incomplete_profiles', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.name, 'email', p.email, 'strength', public.member_profile_strength(p.id),
      'joined', p.created_at::date, 'last_sign_in', u.last_sign_in_at::date,
      'days_since_sign_in', extract(day from now() - u.last_sign_in_at)::int)
      order by p.created_at), '[]'::jsonb)
    from profiles p join auth.users u on u.id=p.id where not p.onboarded),

  'likely_duplicates', (
    select coalesce(jsonb_agg(d), '[]'::jsonb) from (
      select jsonb_build_object('name', a.name, 'accounts',
               jsonb_agg(jsonb_build_object('email', a.email, 'strength',
                 public.member_profile_strength(a.id), 'onboarded', a.onboarded))) as d
      from profiles a group by a.name having count(*) > 1) x),

  'suspect_field_values', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.name, 'field', f.field, 'value', f.val, 'issue', f.issue)), '[]'::jsonb)
    from profiles p
    cross join lateral (
      select 'company' as field, p.company as val, 'country name in company field' as issue
        where lower(btrim(p.company)) in ('united states','usa','united kingdom','uk','canada','australia')
      union all
      select 'location', p.location, 'country used where a city is expected'
        where lower(btrim(p.location)) in ('united states','usa','united kingdom','uk','canada','australia')
      union all
      select 'looking_for', p.looking_for, 'trailing comma suggests truncated input'
        where btrim(p.looking_for) like '%,'
    ) f),

  'isolated_members', (
    select coalesce(jsonb_agg(p.name), '[]'::jsonb) from profiles p
    where not exists (select 1 from relationships r where r.user_id = p.id)),

  'stalled_verifications', (
    select coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'status', v.status::text,
      'days', extract(day from now() - v.submitted_at)::int)), '[]'::jsonb)
    from member_verifications v join profiles p on p.id=v.user_id
    where v.status in ('pending','scanning','manual_review','needs_more_proof')),

  'marketplace', jsonb_build_object(
    'live_asks', (select count(*) from asks where not is_demo),
    'open_intros', (select count(*) from intro_requests where status='requested'),
    'demo_rows_still_present', (select count(*) from members_base where is_demo))
);
$function$;

-- ── The members view (security_invoker: RLS on members_base applies to the caller) ─────
CREATE OR REPLACE VIEW public.members WITH (security_invoker = true) AS
 SELECT b.id,
    b.name,
    b.initials,
    b.title,
    b.company,
    b.location,
    b.role,
    b.industry,
    b.bio,
    b.tags,
    b.expertise,
    b.needs,
    b.offers,
    b.focus,
    b.thesis,
    b.availability,
    b.mutuals,
    b.last_interaction_days,
    b.relationship_status,
    b.score,
    COALESCE((r.j ->> 'score'::text)::integer, b.score_total) AS score_total,
    b.radar,
    COALESCE(NULLIF(r.j ->> 'why_them'::text, ''::text), b.why_them) AS why_them,
    COALESCE(NULLIF(r.j ->> 'why_you'::text, ''::text), b.why_you) AS why_you,
    COALESCE(NULLIF(r.j ->> 'why_now'::text, ''::text), b.why_now) AS why_now,
    b.best_path,
    b.next_action,
    b.dont_do,
    b.confidence,
    b.opportunity_low,
    b.opportunity_high,
    b.intro_state,
    b.joined,
    b.created_at,
    b.is_demo
   FROM members_base b
     LEFT JOIN LATERAL ( SELECT match_reasoning(auth.uid(), b.id::uuid) AS j
          WHERE auth.uid() IS NOT NULL AND NOT b.is_demo AND b.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text AND b.id <> auth.uid()::text) r ON true;

-- ── Triggers ───────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS members_view_insert ON public.members;
CREATE TRIGGER members_view_insert INSTEAD OF INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION members_view_write();
DROP TRIGGER IF EXISTS members_view_update ON public.members;
CREATE TRIGGER members_view_update INSTEAD OF UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION members_view_write();
DROP TRIGGER IF EXISTS members_view_delete ON public.members;
CREATE TRIGGER members_view_delete INSTEAD OF DELETE ON public.members FOR EACH ROW EXECUTE FUNCTION members_view_write();

DROP TRIGGER IF EXISTS asks_before_write_trg ON public.asks;
CREATE TRIGGER asks_before_write_trg BEFORE INSERT ON public.asks FOR EACH ROW EXECUTE FUNCTION asks_before_write();
DROP TRIGGER IF EXISTS asks_event ON public.asks;
CREATE TRIGGER asks_event AFTER INSERT ON public.asks FOR EACH ROW EXECUTE FUNCTION emit_event();

DROP TRIGGER IF EXISTS posts_before_write_trg ON public.posts;
CREATE TRIGGER posts_before_write_trg BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION posts_before_write();
DROP TRIGGER IF EXISTS posts_event ON public.posts;
CREATE TRIGGER posts_event AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION emit_event();

DROP TRIGGER IF EXISTS memories_before_insert_trg ON public.memories;
CREATE TRIGGER memories_before_insert_trg BEFORE INSERT ON public.memories FOR EACH ROW EXECUTE FUNCTION memories_before_insert();
DROP TRIGGER IF EXISTS memories_event ON public.memories;
CREATE TRIGGER memories_event AFTER INSERT ON public.memories FOR EACH ROW EXECUTE FUNCTION emit_event();

DROP TRIGGER IF EXISTS intro_requests_block_demo ON public.intro_requests;
CREATE TRIGGER intro_requests_block_demo BEFORE INSERT OR UPDATE ON public.intro_requests FOR EACH ROW EXECUTE FUNCTION block_demo_intro();
DROP TRIGGER IF EXISTS intro_requests_set_target ON public.intro_requests;
CREATE TRIGGER intro_requests_set_target BEFORE INSERT OR UPDATE ON public.intro_requests FOR EACH ROW EXECUTE FUNCTION set_intro_target();
DROP TRIGGER IF EXISTS intro_requests_event ON public.intro_requests;
CREATE TRIGGER intro_requests_event AFTER INSERT OR UPDATE ON public.intro_requests FOR EACH ROW EXECUTE FUNCTION emit_event();
DROP TRIGGER IF EXISTS intro_requests_notify ON public.intro_requests;
CREATE TRIGGER intro_requests_notify AFTER INSERT OR UPDATE ON public.intro_requests FOR EACH ROW EXECUTE FUNCTION notify_intro_activity();

DROP TRIGGER IF EXISTS relationships_event ON public.relationships;
CREATE TRIGGER relationships_event AFTER INSERT ON public.relationships FOR EACH ROW EXECUTE FUNCTION emit_event();
DROP TRIGGER IF EXISTS verifications_event ON public.member_verifications;
CREATE TRIGGER verifications_event AFTER INSERT OR UPDATE ON public.member_verifications FOR EACH ROW EXECUTE FUNCTION emit_event();

DROP TRIGGER IF EXISTS profiles_event ON public.profiles;
CREATE TRIGGER profiles_event AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION emit_event();
DROP TRIGGER IF EXISTS profiles_member_sync ON public.profiles;
CREATE TRIGGER profiles_member_sync AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION sync_member_record();
DROP TRIGGER IF EXISTS profiles_open_verification ON public.profiles;
CREATE TRIGGER profiles_open_verification AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION open_verification_record();

DROP TRIGGER IF EXISTS crm_activities_owner_freeze ON public.crm_activities;
CREATE TRIGGER crm_activities_owner_freeze BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION freeze_columns('owner_id');
DROP TRIGGER IF EXISTS crm_companies_owner_freeze ON public.crm_companies;
CREATE TRIGGER crm_companies_owner_freeze BEFORE UPDATE ON public.crm_companies FOR EACH ROW EXECUTE FUNCTION freeze_columns('owner_id');
DROP TRIGGER IF EXISTS crm_notes_owner_freeze ON public.crm_notes;
CREATE TRIGGER crm_notes_owner_freeze BEFORE UPDATE ON public.crm_notes FOR EACH ROW EXECUTE FUNCTION freeze_columns('owner_id');
DROP TRIGGER IF EXISTS crm_opportunities_owner_freeze ON public.crm_opportunities;
CREATE TRIGGER crm_opportunities_owner_freeze BEFORE UPDATE ON public.crm_opportunities FOR EACH ROW EXECUTE FUNCTION freeze_columns('owner_id');
DROP TRIGGER IF EXISTS crm_people_owner_freeze ON public.crm_people;
CREATE TRIGGER crm_people_owner_freeze BEFORE UPDATE ON public.crm_people FOR EACH ROW EXECUTE FUNCTION freeze_columns('owner_id');
DROP TRIGGER IF EXISTS crm_tasks_owner_freeze ON public.crm_tasks;
CREATE TRIGGER crm_tasks_owner_freeze BEFORE UPDATE ON public.crm_tasks FOR EACH ROW EXECUTE FUNCTION freeze_columns('owner_id');
