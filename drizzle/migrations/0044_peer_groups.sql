-- Peer groups: small, confidential groups of members (6–12, at most 16) who meet monthly.
-- Admins create groups and manage membership. Inside a group, each member accepts a
-- confidentiality agreement once; only then do they see sessions, the discussion board and
-- issue processing. Nobody outside the group sees anything, admins included for the
-- confidential content (admins manage groups, members and sessions, not the conversation).

-- ── Groups ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.peer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  cadence text NOT NULL DEFAULT '' CHECK (char_length(cadence) <= 160),
  facilitator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  max_size integer NOT NULL DEFAULT 12 CHECK (max_size BETWEEN 2 AND 16),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.peer_group_members (
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  agreement_accepted_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX peer_group_members_user_idx ON public.peer_group_members (user_id);

-- Helpers used by every policy below. SECURITY DEFINER so policies on peer_group_members
-- can ask about membership without recursing into themselves.
CREATE OR REPLACE FUNCTION public.is_peer_group_member(p_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.peer_group_members m WHERE m.group_id = p_group AND m.user_id = auth.uid())
$$;
-- Member AND has accepted the confidentiality agreement: the gate for all group content.
CREATE OR REPLACE FUNCTION public.can_read_peer_group(p_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.peer_group_members m WHERE m.group_id = p_group AND m.user_id = auth.uid()
                   AND m.agreement_accepted_at IS NOT NULL)
$$;
CREATE OR REPLACE FUNCTION public.is_peer_group_facilitator(p_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.peer_groups g WHERE g.id = p_group AND g.facilitator_id = auth.uid())
     AND public.is_peer_group_member(p_group)
$$;
REVOKE ALL ON FUNCTION public.is_peer_group_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_peer_group(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_peer_group_facilitator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_peer_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_peer_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_peer_group_facilitator(uuid) TO authenticated;

REVOKE ALL ON public.peer_groups FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_groups TO service_role;
GRANT SELECT, DELETE ON public.peer_groups TO authenticated;
GRANT INSERT (name, description, cadence, facilitator_id, max_size) ON public.peer_groups TO authenticated;
GRANT UPDATE (name, description, cadence, facilitator_id, max_size) ON public.peer_groups TO authenticated;
ALTER TABLE public.peer_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members see their groups, admins all" ON public.peer_groups FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_peer_group_member(id));
CREATE POLICY "admins create groups" ON public.peer_groups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins edit groups" ON public.peer_groups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete groups" ON public.peer_groups FOR DELETE TO authenticated USING (public.is_admin());

REVOKE ALL ON public.peer_group_members FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_members TO service_role;
GRANT SELECT, DELETE ON public.peer_group_members TO authenticated;
GRANT INSERT (group_id, user_id) ON public.peer_group_members TO authenticated;
ALTER TABLE public.peer_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group members and admins see the roster" ON public.peer_group_members FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_peer_group_member(group_id));
CREATE POLICY "admins add members" ON public.peer_group_members FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins remove members, members leave" ON public.peer_group_members FOR DELETE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- Size limit: checked under a lock on the group so two admins cannot overfill it at once.
CREATE OR REPLACE FUNCTION public.peer_group_members_size_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_max integer; v_count integer;
BEGIN
  SELECT max_size INTO v_max FROM public.peer_groups WHERE id = NEW.group_id FOR UPDATE;
  IF v_max IS NULL THEN RAISE EXCEPTION 'Group not found' USING errcode = '22023'; END IF;
  SELECT count(*) INTO v_count FROM public.peer_group_members WHERE group_id = NEW.group_id;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'This group is full (% members)', v_max USING errcode = '23514';
  END IF;
  NEW.agreement_accepted_at := NULL;
  NEW.joined_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER peer_group_members_size_guard BEFORE INSERT ON public.peer_group_members
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_members_size_guard();

CREATE OR REPLACE FUNCTION public.peer_group_members_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  SELECT name INTO v_name FROM public.peer_groups WHERE id = NEW.group_id;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
    VALUES (NEW.user_id, 'peer_group_added',
            'You were added to the peer group ' || coalesce(v_name, '') || '. Accept the confidentiality agreement to see what the group shares.',
            auth.uid(), '/app');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER peer_group_members_notify AFTER INSERT ON public.peer_group_members
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_members_notify();

-- A removed facilitator stops being the facilitator.
CREATE OR REPLACE FUNCTION public.peer_group_members_after_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.peer_groups SET facilitator_id = NULL WHERE id = OLD.group_id AND facilitator_id = OLD.user_id;
  RETURN OLD;
END $$;
CREATE TRIGGER peer_group_members_after_delete AFTER DELETE ON public.peer_group_members
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_members_after_delete();

-- Groups cannot shrink below their current membership.
CREATE OR REPLACE FUNCTION public.peer_groups_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT count(*) INTO v_count FROM public.peer_group_members WHERE group_id = NEW.id;
    IF NEW.max_size < v_count THEN
      RAISE EXCEPTION 'The group already has % members', v_count USING errcode = '23514';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER peer_groups_guard BEFORE INSERT OR UPDATE ON public.peer_groups
  FOR EACH ROW EXECUTE FUNCTION public.peer_groups_guard();

-- The facilitator is always a member of the group (added, and told, when named).
CREATE OR REPLACE FUNCTION public.peer_groups_facilitator_member() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.facilitator_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.peer_group_members WHERE group_id = NEW.id AND user_id = NEW.facilitator_id) THEN
    INSERT INTO public.peer_group_members (group_id, user_id) VALUES (NEW.id, NEW.facilitator_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER peer_groups_facilitator_member AFTER INSERT OR UPDATE OF facilitator_id ON public.peer_groups
  FOR EACH ROW EXECUTE FUNCTION public.peer_groups_facilitator_member();

-- A member accepts the confidentiality agreement once per group.
CREATE OR REPLACE FUNCTION public.accept_peer_group_agreement(p_group uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at timestamptz;
BEGIN
  UPDATE public.peer_group_members SET agreement_accepted_at = coalesce(agreement_accepted_at, now())
   WHERE group_id = p_group AND user_id = auth.uid() RETURNING agreement_accepted_at INTO v_at;
  IF v_at IS NULL THEN RAISE EXCEPTION 'You are not in this group' USING errcode = '42501'; END IF;
  RETURN v_at;
END $$;
REVOKE ALL ON FUNCTION public.accept_peer_group_agreement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_peer_group_agreement(uuid) TO authenticated;

-- ── Requests to join ──────────────────────────────────────────────────────────────────
CREATE TABLE public.peer_group_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(btrim(note)) BETWEEN 10 AND 600),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  group_id uuid REFERENCES public.peer_groups(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX peer_group_requests_one_pending ON public.peer_group_requests (user_id) WHERE status = 'pending';
REVOKE ALL ON public.peer_group_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_requests TO service_role;
GRANT SELECT, DELETE ON public.peer_group_requests TO authenticated;
GRANT INSERT (note) ON public.peer_group_requests TO authenticated;
ALTER TABLE public.peer_group_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests, admins all" ON public.peer_group_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "members ask to join" ON public.peer_group_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "members withdraw pending requests" ON public.peer_group_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE OR REPLACE FUNCTION public.admin_decide_peer_group_request(p_request uuid, p_accept boolean, p_group uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised' USING errcode = '42501'; END IF;
  SELECT user_id INTO v_user FROM public.peer_group_requests WHERE id = p_request AND status = 'pending' FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Request not found or already decided' USING errcode = '22023'; END IF;
  IF p_accept THEN
    IF p_group IS NULL THEN RAISE EXCEPTION 'Pick a group' USING errcode = '22023'; END IF;
    IF EXISTS (SELECT 1 FROM public.peer_group_members WHERE group_id = p_group AND user_id = v_user) THEN
      RAISE EXCEPTION 'Already in this group' USING errcode = '22023';
    END IF;
    INSERT INTO public.peer_group_members (group_id, user_id) VALUES (p_group, v_user);
    UPDATE public.peer_group_requests SET status = 'accepted', group_id = p_group, decided_by = auth.uid(), decided_at = now() WHERE id = p_request;
    RETURN 'accepted';
  END IF;
  UPDATE public.peer_group_requests SET status = 'declined', decided_by = auth.uid(), decided_at = now() WHERE id = p_request;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (v_user, 'peer_group_request', 'There is no peer group place for you right now. The team has kept your note and may come back to you.', auth.uid(), '/app');
  RETURN 'declined';
END $$;
REVOKE ALL ON FUNCTION public.admin_decide_peer_group_request(uuid, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_peer_group_request(uuid, boolean, uuid) TO authenticated;

-- ── Sessions ──────────────────────────────────────────────────────────────────────────
CREATE TABLE public.peer_group_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  agenda text NOT NULL DEFAULT '' CHECK (char_length(agenda) <= 2000),
  meeting_url text CHECK (meeting_url IS NULL OR (char_length(meeting_url) <= 500 AND meeting_url ~* '^(https?://|/)')),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX peer_group_sessions_group_idx ON public.peer_group_sessions (group_id, starts_at);
REVOKE ALL ON public.peer_group_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_sessions TO service_role;
GRANT SELECT, DELETE ON public.peer_group_sessions TO authenticated;
GRANT INSERT (group_id, starts_at, agenda, meeting_url) ON public.peer_group_sessions TO authenticated;
GRANT UPDATE (starts_at, agenda, meeting_url) ON public.peer_group_sessions TO authenticated;
ALTER TABLE public.peer_group_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreed members and admins see sessions" ON public.peer_group_sessions FOR SELECT TO authenticated
  USING (public.is_admin() OR public.can_read_peer_group(group_id));
CREATE POLICY "facilitator and admins schedule" ON public.peer_group_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_peer_group_facilitator(group_id));
CREATE POLICY "facilitator and admins edit sessions" ON public.peer_group_sessions FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_peer_group_facilitator(group_id))
  WITH CHECK (public.is_admin() OR public.is_peer_group_facilitator(group_id));
CREATE POLICY "facilitator and admins cancel sessions" ON public.peer_group_sessions FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_peer_group_facilitator(group_id));

CREATE OR REPLACE FUNCTION public.peer_group_sessions_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  SELECT name INTO v_name FROM public.peer_groups WHERE id = NEW.group_id;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  SELECT m.user_id, 'peer_group_session',
         'New ' || coalesce(v_name, 'peer group') || ' session on ' || to_char(NEW.starts_at AT TIME ZONE 'UTC', 'FMDD Mon YYYY, HH24:MI') || ' UTC.',
         auth.uid(), '/app'
    FROM public.peer_group_members m
   WHERE m.group_id = NEW.group_id AND m.user_id IS DISTINCT FROM auth.uid();
  RETURN NEW;
END $$;
CREATE TRIGGER peer_group_sessions_notify AFTER INSERT ON public.peer_group_sessions
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_sessions_notify();

-- ── Discussion board ──────────────────────────────────────────────────────────────────
-- Posts and one level of replies. Only members who accepted the agreement read or write.
CREATE TABLE public.peer_group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.peer_group_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX peer_group_posts_group_idx ON public.peer_group_posts (group_id, created_at);
CREATE INDEX peer_group_posts_parent_idx ON public.peer_group_posts (parent_id);
REVOKE ALL ON public.peer_group_posts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_posts TO service_role;
GRANT SELECT, DELETE ON public.peer_group_posts TO authenticated;
GRANT INSERT (group_id, parent_id, body) ON public.peer_group_posts TO authenticated;
GRANT UPDATE (body) ON public.peer_group_posts TO authenticated;
ALTER TABLE public.peer_group_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreed members read posts" ON public.peer_group_posts FOR SELECT TO authenticated
  USING (public.can_read_peer_group(group_id));
CREATE POLICY "agreed members post" ON public.peer_group_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_read_peer_group(group_id));
CREATE POLICY "authors edit their posts" ON public.peer_group_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.can_read_peer_group(group_id))
  WITH CHECK (author_id = auth.uid() AND public.can_read_peer_group(group_id));
CREATE POLICY "authors delete their posts" ON public.peer_group_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() AND public.is_peer_group_member(group_id));

-- Runs as the member (not SECURITY DEFINER): a parent they cannot read does not exist for them.
CREATE OR REPLACE FUNCTION public.peer_group_posts_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_group uuid; v_grandparent uuid;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    SELECT group_id, parent_id INTO v_group, v_grandparent FROM public.peer_group_posts WHERE id = NEW.parent_id;
    IF v_group IS NULL THEN RAISE EXCEPTION 'Post not found' USING errcode = '22023'; END IF;
    IF v_grandparent IS NOT NULL THEN RAISE EXCEPTION 'Reply to the original post' USING errcode = '22023'; END IF;
    NEW.group_id := v_group;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER peer_group_posts_guard BEFORE INSERT OR UPDATE ON public.peer_group_posts
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_posts_guard();

-- ── Issue processing ──────────────────────────────────────────────────────────────────
CREATE TABLE public.peer_group_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  context text NOT NULL DEFAULT '' CHECK (char_length(context) <= 4000),
  help_needed text NOT NULL DEFAULT '' CHECK (char_length(help_needed) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  outcome text CHECK (outcome IS NULL OR char_length(outcome) <= 1000),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'open' OR char_length(btrim(coalesce(outcome, ''))) >= 3)
);
CREATE INDEX peer_group_issues_group_idx ON public.peer_group_issues (group_id, created_at);
REVOKE ALL ON public.peer_group_issues FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_issues TO service_role;
GRANT SELECT, DELETE ON public.peer_group_issues TO authenticated;
GRANT INSERT (group_id, title, context, help_needed) ON public.peer_group_issues TO authenticated;
GRANT UPDATE (title, context, help_needed, status, outcome) ON public.peer_group_issues TO authenticated;
ALTER TABLE public.peer_group_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreed members read issues" ON public.peer_group_issues FOR SELECT TO authenticated
  USING (public.can_read_peer_group(group_id));
CREATE POLICY "agreed members bring issues" ON public.peer_group_issues FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.can_read_peer_group(group_id));
CREATE POLICY "owners update their issues" ON public.peer_group_issues FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.can_read_peer_group(group_id))
  WITH CHECK (owner_id = auth.uid() AND public.can_read_peer_group(group_id));
CREATE POLICY "owners delete their issues" ON public.peer_group_issues FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND public.is_peer_group_member(group_id));

CREATE OR REPLACE FUNCTION public.peer_group_issues_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_resolving boolean;
BEGIN
  v_resolving := NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved';
  IF v_resolving THEN NEW.resolved_at := now(); END IF;
  IF NEW.status = 'open' THEN NEW.resolved_at := NULL; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER peer_group_issues_touch BEFORE UPDATE ON public.peer_group_issues
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_issues_touch();

-- The notification names the person and the group, never the issue: it may show on a lock screen.
CREATE OR REPLACE FUNCTION public.peer_group_issues_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_owner text;
BEGIN
  SELECT name INTO v_name FROM public.peer_groups WHERE id = NEW.group_id;
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_owner FROM public.profiles WHERE id = NEW.owner_id;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  SELECT m.user_id, 'peer_group_issue',
         coalesce(v_owner, 'A member') || ' brought a new issue to ' || coalesce(v_name, 'your peer group') || '.',
         NEW.owner_id, '/app'
    FROM public.peer_group_members m
   WHERE m.group_id = NEW.group_id AND m.user_id <> NEW.owner_id;
  RETURN NEW;
END $$;
CREATE TRIGGER peer_group_issues_notify AFTER INSERT ON public.peer_group_issues
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_issues_notify();

CREATE TABLE public.peer_group_perspectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.peer_group_issues(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.peer_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX peer_group_perspectives_issue_idx ON public.peer_group_perspectives (issue_id, created_at);
REVOKE ALL ON public.peer_group_perspectives FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.peer_group_perspectives TO service_role;
GRANT SELECT, DELETE ON public.peer_group_perspectives TO authenticated;
GRANT INSERT (issue_id, body) ON public.peer_group_perspectives TO authenticated;
GRANT UPDATE (body) ON public.peer_group_perspectives TO authenticated;
ALTER TABLE public.peer_group_perspectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreed members read perspectives" ON public.peer_group_perspectives FOR SELECT TO authenticated
  USING (public.can_read_peer_group(group_id));
CREATE POLICY "agreed members add perspectives" ON public.peer_group_perspectives FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_read_peer_group(group_id));
CREATE POLICY "authors edit perspectives" ON public.peer_group_perspectives FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.can_read_peer_group(group_id))
  WITH CHECK (author_id = auth.uid() AND public.can_read_peer_group(group_id));
CREATE POLICY "authors delete perspectives" ON public.peer_group_perspectives FOR DELETE TO authenticated
  USING (author_id = auth.uid() AND public.is_peer_group_member(group_id));

-- Runs as the member: the group comes from an issue they can read, or the insert fails.
CREATE OR REPLACE FUNCTION public.peer_group_perspectives_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_group uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT group_id INTO v_group FROM public.peer_group_issues WHERE id = NEW.issue_id;
    IF v_group IS NULL THEN RAISE EXCEPTION 'Issue not found' USING errcode = '22023'; END IF;
    NEW.group_id := v_group;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER peer_group_perspectives_guard BEFORE INSERT OR UPDATE ON public.peer_group_perspectives
  FOR EACH ROW EXECUTE FUNCTION public.peer_group_perspectives_guard();
