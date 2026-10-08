-- Company relationship continuity (shared-only model).
-- A member chooses which relationships to share with their company workspace. While they
-- are active they can withdraw any share. When they leave, the company keeps exactly what
-- was shared plus a handover note the leaver wrote and approved; nothing else ever moves.

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  domain text NOT NULL DEFAULT '' CHECK (char_length(domain) <= 253),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.org_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','departed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  departed_at timestamptz,
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE public.org_invites (
  code text PRIMARY KEY CHECK (char_length(code) BETWEEN 8 AND 64),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 500),
  uses integer NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.org_shared_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_member_id uuid,
  contact_name text NOT NULL CHECK (char_length(trim(contact_name)) BETWEEN 1 AND 160),
  contact_company text NOT NULL DEFAULT '' CHECK (char_length(contact_company) <= 160),
  strength text NOT NULL DEFAULT 'working' CHECK (strength IN ('acquainted','working','trusted')),
  context text NOT NULL DEFAULT '' CHECK (char_length(context) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX org_shared_relationships_org_idx ON public.org_shared_relationships (org_id, contact_name);

CREATE TABLE public.org_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 4000),
  open_loops text NOT NULL DEFAULT '' CHECK (char_length(open_loops) <= 4000),
  approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, author_id)
);

-- Membership helpers (SECURITY DEFINER so policies do not recurse through org_members RLS).
CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = p_org AND m.user_id = auth.uid() AND m.status = 'active')
$$;
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = p_org AND m.user_id = auth.uid() AND m.status = 'active' AND m.role = 'admin')
$$;
REVOKE ALL ON FUNCTION public.is_org_member(uuid), public.is_org_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid), public.is_org_admin(uuid) TO authenticated;

-- Grants: reads through RLS; every membership change goes through the RPCs below.
REVOKE ALL ON public.organizations, public.org_members, public.org_invites, public.org_shared_relationships, public.org_handovers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organizations, public.org_members, public.org_invites, public.org_shared_relationships, public.org_handovers TO service_role;
GRANT SELECT ON public.organizations, public.org_members, public.org_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_shared_relationships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.org_handovers TO authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_shared_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read their organizations" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY "members read the roster" ON public.org_members FOR SELECT TO authenticated
  USING (public.is_org_member(org_id) OR user_id = auth.uid());
CREATE POLICY "admins read invites" ON public.org_invites FOR SELECT TO authenticated
  USING (public.is_org_admin(org_id));

-- Shared relationships: the whole active team reads them; only an active owner adds,
-- edits or withdraws their own. After departure the record stays with the company.
CREATE POLICY "team reads shared relationships" ON public.org_shared_relationships FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "active member shares" ON public.org_shared_relationships FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_org_member(org_id));
CREATE POLICY "active owner edits" ON public.org_shared_relationships FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.is_org_member(org_id))
  WITH CHECK (owner_id = auth.uid() AND public.is_org_member(org_id));
CREATE POLICY "active owner withdraws" ON public.org_shared_relationships FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND public.is_org_member(org_id));
CREATE TRIGGER org_shared_relationships_freeze BEFORE UPDATE ON public.org_shared_relationships
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('org_id','owner_id','created_at');
CREATE TRIGGER org_shared_relationships_touch BEFORE UPDATE ON public.org_shared_relationships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Handovers: the author drafts and approves; admins see only approved handovers.
CREATE POLICY "author manages handover" ON public.org_handovers FOR ALL TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid() AND (public.is_org_member(org_id)));
CREATE POLICY "admins read approved handovers" ON public.org_handovers FOR SELECT TO authenticated
  USING (approved AND public.is_org_admin(org_id));
CREATE OR REPLACE FUNCTION public.org_handover_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.org_id := OLD.org_id; NEW.author_id := OLD.author_id; NEW.created_at := OLD.created_at;
    -- An approved handover is final: it is what the company was promised.
    IF OLD.approved THEN
      NEW.note := OLD.note; NEW.open_loops := OLD.open_loops; NEW.approved := true; NEW.approved_at := OLD.approved_at;
    END IF;
  END IF;
  NEW.approved_at := CASE WHEN NEW.approved THEN coalesce(NEW.approved_at, now()) END;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER org_handover_guard BEFORE INSERT OR UPDATE ON public.org_handovers
  FOR EACH ROW EXECUTE FUNCTION public.org_handover_guard();

-- RPCs ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_organization(p_name text, p_domain text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  INSERT INTO public.organizations (name, domain, created_by) VALUES (trim(p_name), lower(trim(coalesce(p_domain, ''))), v_uid) RETURNING id INTO v_id;
  INSERT INTO public.org_members (org_id, user_id, role) VALUES (v_id, v_uid, 'admin');
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_org_invite(p_org uuid, p_max_uses integer DEFAULT 1)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text;
BEGIN
  IF NOT public.is_org_admin(p_org) THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  INSERT INTO public.org_invites (code, org_id, created_by, max_uses) VALUES (v_code, p_org, auth.uid(), greatest(1, least(coalesce(p_max_uses, 1), 500)));
  RETURN v_code;
END $$;

CREATE OR REPLACE FUNCTION public.join_organization(p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_inv public.org_invites;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING errcode = '42501'; END IF;
  SELECT * INTO v_inv FROM public.org_invites
   WHERE code = upper(trim(p_code)) AND NOT revoked AND uses < max_uses AND expires_at > now()
   FOR UPDATE;
  IF v_inv.code IS NULL THEN RAISE EXCEPTION 'That invitation is not valid' USING errcode = '22023'; END IF;
  -- Already an active member: keep their role (never demote an admin) and do not use up the code.
  IF public.is_org_member(v_inv.org_id) THEN RETURN v_inv.org_id; END IF;
  -- A departed member rejoining starts fresh as a member; their old shares stayed with the company.
  INSERT INTO public.org_members (org_id, user_id, role, status) VALUES (v_inv.org_id, v_uid, 'member', 'active')
  ON CONFLICT (org_id, user_id) DO UPDATE SET status = 'active', role = 'member', joined_at = now(), departed_at = NULL;
  UPDATE public.org_invites SET uses = uses + 1 WHERE code = v_inv.code;
  RETURN v_inv.org_id;
END $$;

-- Departure: the member leaves, or an admin records that they left. Shared records stay
-- with the company; the person loses access to the workspace.
CREATE OR REPLACE FUNCTION public.record_org_departure(p_org uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT (v_uid = p_user AND public.is_org_member(p_org) OR public.is_org_admin(p_org)) THEN
    RAISE EXCEPTION 'Not authorised' USING errcode = '42501';
  END IF;
  -- Lock the roster so concurrent departures or demotions cannot both pass the last-admin check.
  PERFORM 1 FROM public.org_members WHERE org_id = p_org FOR UPDATE;
  IF (SELECT count(*) FROM public.org_members WHERE org_id = p_org AND role = 'admin' AND status = 'active' AND user_id <> p_user) = 0
     AND EXISTS (SELECT 1 FROM public.org_members WHERE org_id = p_org AND user_id = p_user AND role = 'admin' AND status = 'active') THEN
    RAISE EXCEPTION 'Make another member an admin before the last admin leaves' USING errcode = '22023';
  END IF;
  UPDATE public.org_members SET status = 'departed', departed_at = now()
   WHERE org_id = p_org AND user_id = p_user AND status = 'active';
END $$;

CREATE OR REPLACE FUNCTION public.set_org_role(p_org uuid, p_user uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_org_admin(p_org) THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  IF p_role NOT IN ('admin','member') THEN RAISE EXCEPTION 'Unknown role' USING errcode = '22023'; END IF;
  -- Lock the roster so concurrent departures or demotions cannot both pass the last-admin check.
  PERFORM 1 FROM public.org_members WHERE org_id = p_org FOR UPDATE;
  IF p_role = 'member'
     AND (SELECT count(*) FROM public.org_members WHERE org_id = p_org AND role = 'admin' AND status = 'active' AND user_id <> p_user) = 0 THEN
    RAISE EXCEPTION 'An organization needs at least one admin' USING errcode = '22023';
  END IF;
  UPDATE public.org_members SET role = p_role WHERE org_id = p_org AND user_id = p_user AND status = 'active';
END $$;

-- Continuity view: which shared relationships the company could lose. A contact is
-- 'at_risk' when no active member holds it (every owner has left) and 'single_owner'
-- when exactly one active member does.
CREATE OR REPLACE FUNCTION public.org_relationship_coverage(p_org uuid)
RETURNS TABLE(contact_key text, contact_name text, contact_company text, contact_member_id uuid, active_owners integer, departed_owners integer, coverage text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH rows AS (
    SELECT coalesce(s.contact_member_id::text, lower(trim(s.contact_name)) || '|' || lower(trim(s.contact_company))) AS k,
           s.contact_name, s.contact_company, s.contact_member_id, s.owner_id, m.status
      FROM public.org_shared_relationships s
      JOIN public.org_members m ON m.org_id = s.org_id AND m.user_id = s.owner_id
     WHERE s.org_id = p_org AND public.is_org_member(p_org)
  )
  SELECT k, min(contact_name), min(contact_company), (array_agg(contact_member_id) FILTER (WHERE contact_member_id IS NOT NULL))[1],
         -- Distinct people, not share rows: one person sharing a contact twice is still one holder.
         count(DISTINCT owner_id) FILTER (WHERE status = 'active')::int, count(DISTINCT owner_id) FILTER (WHERE status = 'departed')::int,
         CASE WHEN count(DISTINCT owner_id) FILTER (WHERE status = 'active') = 0 THEN 'at_risk'
              WHEN count(DISTINCT owner_id) FILTER (WHERE status = 'active') = 1 THEN 'single_owner'
              ELSE 'covered' END
    FROM rows GROUP BY k
   ORDER BY CASE WHEN count(DISTINCT owner_id) FILTER (WHERE status = 'active') = 0 THEN 0 WHEN count(DISTINCT owner_id) FILTER (WHERE status = 'active') = 1 THEN 1 ELSE 2 END, min(contact_name)
$$;

REVOKE ALL ON FUNCTION public.create_organization(text, text), public.create_org_invite(uuid, integer), public.join_organization(text),
  public.record_org_departure(uuid, uuid), public.set_org_role(uuid, uuid, text), public.org_relationship_coverage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text), public.create_org_invite(uuid, integer), public.join_organization(text),
  public.record_org_departure(uuid, uuid), public.set_org_role(uuid, uuid, text), public.org_relationship_coverage(uuid) TO authenticated;
