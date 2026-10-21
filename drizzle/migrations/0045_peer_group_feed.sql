-- Peer group feed: adds stage/industry metadata to groups, a role column to members,
-- and a kind+pinned taxonomy to posts for the async board-of-advisors feed.
-- New RPC helpers expose everything through SECURITY DEFINER functions.

-- ── Schema extensions ──────────────────────────────────────────────────────────────────

ALTER TABLE public.peer_groups
  ADD COLUMN IF NOT EXISTS stage_label       text,
  ADD COLUMN IF NOT EXISTS industry_focus    text,
  ADD COLUMN IF NOT EXISTS max_members       int DEFAULT 8,
  ADD COLUMN IF NOT EXISTS archived          boolean DEFAULT false;

ALTER TABLE public.peer_group_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('facilitator','member'));

-- Back-fill: the original facilitator_id on the group maps to the facilitator role.
UPDATE public.peer_group_members pgm
SET role = 'facilitator'
FROM public.peer_groups pg
WHERE pg.id = pgm.group_id
  AND pg.facilitator_id = pgm.user_id
  AND pgm.role = 'member';

-- Grant INSERT on new columns so authenticated can write them.
GRANT INSERT (role) ON public.peer_group_members TO authenticated;
GRANT UPDATE (role) ON public.peer_group_members TO authenticated;
GRANT INSERT (stage_label, industry_focus, max_members, archived) ON public.peer_groups TO authenticated;
GRANT UPDATE (stage_label, industry_focus, max_members, archived) ON public.peer_groups TO authenticated;

ALTER TABLE public.peer_group_posts
  ADD COLUMN IF NOT EXISTS kind   text NOT NULL DEFAULT 'update'
    CHECK (kind IN ('update','ask','win','block','insight')),
  ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;

GRANT INSERT (kind, pinned) ON public.peer_group_posts TO authenticated;
GRANT UPDATE (kind, pinned) ON public.peer_group_posts TO authenticated;

-- ── Feed RPCs ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_my_peer_groups()
RETURNS TABLE(
  id             uuid,
  name           text,
  description    text,
  stage_label    text,
  industry_focus text,
  role           text,
  member_count   bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pg.id,
         pg.name,
         pg.description,
         pg.stage_label,
         pg.industry_focus,
         pgm.role,
         (SELECT COUNT(*) FROM public.peer_group_members m WHERE m.group_id = pg.id) AS member_count
  FROM   public.peer_groups pg
  JOIN   public.peer_group_members pgm ON pgm.group_id = pg.id
  WHERE  pgm.user_id  = auth.uid()
    AND  coalesce(pg.archived, false) = false
  ORDER  BY pg.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.list_my_peer_groups() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_peer_groups() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_peer_group(
  p_name           text,
  p_description    text,
  p_stage_label    text,
  p_industry_focus text
)
RETURNS public.peer_groups
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.peer_groups;
BEGIN
  INSERT INTO public.peer_groups (name, description, stage_label, industry_focus, created_by, facilitator_id)
  VALUES (p_name, p_description, p_stage_label, p_industry_focus, auth.uid(), auth.uid())
  RETURNING * INTO g;

  INSERT INTO public.peer_group_members (group_id, user_id, role, agreement_accepted_at)
  VALUES (g.id, auth.uid(), 'facilitator', now());

  RETURN g;
END;
$$;
REVOKE ALL ON FUNCTION public.create_peer_group(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_peer_group(text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.post_to_peer_group(
  p_group_id uuid,
  p_kind     text,
  p_body     text
)
RETURNS public.peer_group_posts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.peer_group_posts;
BEGIN
  IF NOT public.is_peer_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;
  INSERT INTO public.peer_group_posts (group_id, author_id, kind, body)
  VALUES (p_group_id, auth.uid(), p_kind, p_body)
  RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.post_to_peer_group(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_to_peer_group(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_peer_group_feed(p_group_id uuid)
RETURNS TABLE(
  id              uuid,
  kind            text,
  body            text,
  created_at      timestamptz,
  pinned          boolean,
  author_name     text,
  author_initials text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pgp.id,
         pgp.kind,
         pgp.body,
         pgp.created_at,
         coalesce(pgp.pinned, false),
         coalesce(nullif(btrim(p.name),''), 'Member'),
         coalesce(p.initials, '?')
  FROM   public.peer_group_posts pgp
  JOIN   public.profiles p ON p.id = pgp.author_id
  WHERE  pgp.group_id = p_group_id
    AND  public.is_peer_group_member(p_group_id)
    AND  pgp.parent_id IS NULL
  ORDER  BY coalesce(pgp.pinned,false) DESC, pgp.created_at DESC
  LIMIT  50;
$$;
REVOKE ALL ON FUNCTION public.get_peer_group_feed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_peer_group_feed(uuid) TO authenticated;
