-- Richer peer-group feed layered on the existing confidential peer-groups model.
ALTER TABLE public.peer_groups
  ADD COLUMN IF NOT EXISTS stage_label text,
  ADD COLUMN IF NOT EXISTS industry_focus text,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.peer_group_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member' CHECK (role IN ('facilitator','member'));
UPDATE public.peer_group_members m SET role='facilitator'
  FROM public.peer_groups g WHERE g.id=m.group_id AND g.facilitator_id=m.user_id;
ALTER TABLE public.peer_group_posts
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'update' CHECK (kind IN ('update','ask','win','block','insight')),
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

-- Existing table grants remain restrictive; only safe content columns are added.
GRANT INSERT (kind) ON public.peer_group_posts TO authenticated;
GRANT UPDATE (kind) ON public.peer_group_posts TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_peer_groups()
RETURNS TABLE(id uuid,name text,description text,stage_label text,industry_focus text,role text,member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT g.id,g.name,g.description,g.stage_label,g.industry_focus,m.role,
         (SELECT count(*) FROM public.peer_group_members x WHERE x.group_id=g.id)
    FROM public.peer_groups g
    JOIN public.peer_group_members m ON m.group_id=g.id
   WHERE m.user_id=auth.uid() AND NOT g.archived
   ORDER BY g.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.create_peer_group(
  p_name text,p_description text,p_cadence text,p_max_size integer,p_stage_label text,p_industry_focus text
)
RETURNS public.peer_groups
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.peer_groups;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_live_member() THEN RAISE EXCEPTION 'Not authorised' USING errcode='42501'; END IF;
  IF char_length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Invalid group name' USING errcode='22023'; END IF;
  IF coalesce(p_max_size,8) NOT BETWEEN 4 AND 16 THEN RAISE EXCEPTION 'Invalid group size' USING errcode='22023'; END IF;
  INSERT INTO public.peer_groups(name,description,cadence,max_size,stage_label,industry_focus,facilitator_id,created_by)
  VALUES (
    left(btrim(p_name),80),left(coalesce(p_description,''),1000),left(coalesce(p_cadence,''),160),coalesce(p_max_size,8),
    left(coalesce(p_stage_label,''),120),left(coalesce(p_industry_focus,''),160),auth.uid(),auth.uid()
  )
  RETURNING * INTO g;
  RETURN g;
END $$;

CREATE OR REPLACE FUNCTION public.create_peer_group(p_name text,p_description text,p_stage_label text,p_industry_focus text)
RETURNS public.peer_groups
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT public.create_peer_group(p_name,p_description,'',8,p_stage_label,p_industry_focus)
$$;

CREATE OR REPLACE FUNCTION public.post_to_peer_group(p_group_id uuid,p_kind text,p_body text)
RETURNS public.peer_group_posts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.peer_group_posts;
BEGIN
  IF NOT public.can_read_peer_group(p_group_id) THEN RAISE EXCEPTION 'Not authorised' USING errcode='42501'; END IF;
  IF p_kind NOT IN ('update','ask','win','block','insight') THEN RAISE EXCEPTION 'Invalid post kind' USING errcode='22023'; END IF;
  INSERT INTO public.peer_group_posts(group_id,author_id,kind,body)
  VALUES(p_group_id,auth.uid(),p_kind,left(btrim(p_body),4000)) RETURNING * INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_peer_group_feed(p_group_id uuid)
RETURNS TABLE(id uuid,kind text,body text,created_at timestamptz,pinned boolean,author_name text,author_initials text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p.id,p.kind,p.body,p.created_at,p.pinned,
         coalesce(nullif(btrim(pr.name),''),'Member'),coalesce(nullif(pr.initials,''),'?')
    FROM public.peer_group_posts p
    JOIN public.profiles pr ON pr.id=p.author_id
   WHERE p.group_id=p_group_id AND p.parent_id IS NULL AND public.can_read_peer_group(p_group_id)
   ORDER BY p.pinned DESC,p.created_at DESC LIMIT 50
$$;

REVOKE ALL ON FUNCTION public.list_my_peer_groups() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_peer_group(text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_peer_group(text,text,text,integer,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.post_to_peer_group(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_peer_group_feed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_peer_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_peer_group(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_peer_group(text,text,text,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_to_peer_group(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_peer_group_feed(uuid) TO authenticated;
