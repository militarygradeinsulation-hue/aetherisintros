-- Deal workspaces: a private business workspace a member opens from an existing conversation
-- (dm_threads) or an accepted introduction (intro_requests). It adds a lifecycle, a shared
-- next-step list and a role-based roster on top of the entities that already exist: the source
-- keeps living where it is and the workspace only stores a reference (type + id), never the
-- messages or capsule text. Reported deal value stays in intro_deals (0042); a member's own CRM
-- opportunity is linked privately per member.
--
-- Every write goes through a SECURITY DEFINER function that takes the actor from auth.uid();
-- no client can name an actor, change the roster directly or jump the lifecycle. Reads are
-- limited to people on the roster.

-- Lifecycle graph, in one place. "agreed" and "accepted" are reached only through
-- confirm_workspace_milestone (every participant must confirm); nothing here records payment.
CREATE OR REPLACE FUNCTION public.deal_workspace_transition_allowed(p_from text, p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_from
    WHEN 'qualified'   THEN p_to IN ('proposal', 'cancelled')
    WHEN 'proposal'    THEN p_to IN ('agreed', 'qualified', 'cancelled')
    WHEN 'agreed'      THEN p_to IN ('in_progress', 'cancelled')
    WHEN 'in_progress' THEN p_to IN ('delivered', 'cancelled')
    WHEN 'delivered'   THEN p_to IN ('accepted', 'in_progress', 'cancelled')
    WHEN 'accepted'    THEN p_to IN ('closed')
    ELSE false
  END
$$;

CREATE TABLE public.deal_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('dm_thread', 'intro_request')),
  source_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  scope text NOT NULL DEFAULT '' CHECK (char_length(scope) <= 4000),
  next_action text NOT NULL DEFAULT '' CHECK (char_length(next_action) <= 500),
  budget_cents bigint CHECK (budget_cents BETWEEN 0 AND 100000000000),
  currency text CHECK (currency ~ '^[a-z]{3}$'),
  due_on date,
  status text NOT NULL DEFAULT 'qualified'
    CHECK (status IN ('qualified', 'proposal', 'agreed', 'in_progress', 'delivered', 'accepted', 'closed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (budget_cents IS NULL OR currency IS NOT NULL),
  UNIQUE (source_type, source_id)
);

CREATE TABLE public.deal_workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'collaborator')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'declined', 'removed')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX deal_workspace_members_user_idx ON public.deal_workspace_members (user_id);

CREATE TABLE public.deal_workspace_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 300),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  done boolean NOT NULL DEFAULT false,
  done_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz
);
CREATE INDEX deal_workspace_steps_ws_idx ON public.deal_workspace_steps (workspace_id, created_at);

-- Each participant's own confirmation of a milestone. Cleared when the terms change.
CREATE TABLE public.deal_workspace_confirmations (
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone text NOT NULL CHECK (milestone IN ('agreed', 'accepted')),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id, milestone)
);

-- Append-only record of who did what.
CREATE TABLE public.deal_workspace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deal_workspace_events_ws_idx ON public.deal_workspace_events (workspace_id, created_at);

-- A member's own CRM opportunity linked to a workspace. Private: the other side never sees it.
CREATE TABLE public.deal_workspace_crm_links (
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_opportunity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Grants: read-only for members; every write is an RPC.
REVOKE ALL ON public.deal_workspaces, public.deal_workspace_members, public.deal_workspace_steps,
  public.deal_workspace_confirmations, public.deal_workspace_events, public.deal_workspace_crm_links
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.deal_workspaces, public.deal_workspace_members, public.deal_workspace_steps,
  public.deal_workspace_confirmations, public.deal_workspace_events, public.deal_workspace_crm_links TO service_role;
GRANT SELECT ON public.deal_workspaces, public.deal_workspace_members, public.deal_workspace_steps,
  public.deal_workspace_confirmations, public.deal_workspace_events, public.deal_workspace_crm_links TO authenticated;
ALTER TABLE public.deal_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_crm_links ENABLE ROW LEVEL SECURITY;

-- Membership check used by the policies and the RPCs. p_active_only = false also admits people
-- who are invited and have not answered yet (they may read the workspace to decide).
CREATE OR REPLACE FUNCTION public.is_deal_workspace_member(p_ws uuid, p_active_only boolean DEFAULT true)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.deal_workspace_members m
                  WHERE m.workspace_id = p_ws AND m.user_id = auth.uid()
                    AND (m.status = 'active' OR (NOT p_active_only AND m.status = 'invited')))
$$;
REVOKE ALL ON FUNCTION public.is_deal_workspace_member(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_deal_workspace_member(uuid, boolean) TO authenticated;

CREATE POLICY "roster reads workspace" ON public.deal_workspaces FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(id, false));
CREATE POLICY "roster reads roster" ON public.deal_workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_deal_workspace_member(workspace_id, false));
CREATE POLICY "active members read steps" ON public.deal_workspace_steps FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(workspace_id));
CREATE POLICY "active members read confirmations" ON public.deal_workspace_confirmations FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(workspace_id));
CREATE POLICY "active members read events" ON public.deal_workspace_events FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(workspace_id));
CREATE POLICY "own crm link" ON public.deal_workspace_crm_links FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Identity and source never change; the lifecycle only follows the graph; terms are frozen once
-- the workspace is closed or cancelled. Applies to every writer, including the service role.
CREATE TRIGGER deal_workspaces_freeze BEFORE UPDATE ON public.deal_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('id', 'created_by', 'source_type', 'source_id', 'created_at');

CREATE OR REPLACE FUNCTION public.deal_workspaces_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.deal_workspace_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'A % workspace cannot move to %', OLD.status, NEW.status USING errcode = '22023';
  END IF;
  IF OLD.status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'This workspace is % and can no longer change', OLD.status USING errcode = '22023';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER deal_workspaces_guard BEFORE UPDATE ON public.deal_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspaces_guard();

-- Rows that are history cannot be rewritten or removed by anyone but the cascade from the workspace.
CREATE OR REPLACE FUNCTION public.deal_workspace_events_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Workspace history cannot be changed' USING errcode = '42501'; END $$;
CREATE TRIGGER deal_workspace_events_immutable BEFORE UPDATE ON public.deal_workspace_events
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspace_events_immutable();

-- ── RPCs ────────────────────────────────────────────────────────────────────────────────

-- The other person in a source the caller belongs to, or NULL when the caller may not use it.
CREATE OR REPLACE FUNCTION public.deal_workspace_source_counterpart(p_type text, p_id uuid, p_uid uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_other uuid;
BEGIN
  IF p_type = 'dm_thread' THEN
    SELECT CASE WHEN t.member_a = p_uid THEN t.member_b ELSE t.member_a END INTO v_other
      FROM public.dm_threads t WHERE t.id = p_id AND p_uid IN (t.member_a, t.member_b);
  ELSIF p_type = 'intro_request' THEN
    SELECT CASE WHEN r.user_id = p_uid THEN r.target_user_id ELSE r.user_id END INTO v_other
      FROM public.intro_requests r
     WHERE r.id = p_id AND r.requester_opt_in AND r.member_opt_in AND p_uid IN (r.user_id, r.target_user_id);
  END IF;
  RETURN v_other;
END $$;
REVOKE ALL ON FUNCTION public.deal_workspace_source_counterpart(text, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.deal_workspace_log(p_ws uuid, p_kind text, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.deal_workspace_events (workspace_id, actor_id, kind, detail) VALUES (p_ws, auth.uid(), p_kind, left(p_detail, 300))
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_log(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Role of the caller on a workspace (active members only), or NULL.
CREATE OR REPLACE FUNCTION public.deal_workspace_role(p_ws uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.deal_workspace_members m
   WHERE m.workspace_id = p_ws AND m.user_id = auth.uid() AND m.status = 'active'
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_role(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_deal_workspace(
  p_source_type text, p_source_id uuid, p_title text, p_scope text DEFAULT '', p_next_action text DEFAULT '',
  p_budget_cents bigint DEFAULT NULL, p_currency text DEFAULT NULL, p_due_on date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_other uuid; v_id uuid; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to open a workspace' USING errcode = '42501'; END IF;
  v_other := public.deal_workspace_source_counterpart(p_source_type, p_source_id, v_uid);
  IF v_other IS NULL THEN
    RAISE EXCEPTION 'Workspaces open from your own conversations and accepted introductions' USING errcode = '42501';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 3 AND 160 THEN
    RAISE EXCEPTION 'Give the workspace a title of 3 to 160 characters' USING errcode = '22023';
  END IF;
  IF p_budget_cents IS NOT NULL AND (p_currency IS NULL OR p_currency !~ '^[a-z]{3}$') THEN
    RAISE EXCEPTION 'A budget needs a three-letter currency' USING errcode = '22023';
  END IF;
  -- One workspace per source: a second submit, or the other person, gets the existing one.
  SELECT w.id INTO v_id FROM public.deal_workspaces w WHERE w.source_type = p_source_type AND w.source_id = p_source_id;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_id, 'created', false);
  END IF;
  INSERT INTO public.deal_workspaces (created_by, source_type, source_id, title, scope, next_action, budget_cents, currency, due_on)
  VALUES (v_uid, p_source_type, p_source_id, btrim(p_title), btrim(coalesce(p_scope, '')), btrim(coalesce(p_next_action, '')),
          p_budget_cents, CASE WHEN p_budget_cents IS NULL THEN NULL ELSE p_currency END, p_due_on)
  ON CONFLICT (source_type, source_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT w.id INTO v_id FROM public.deal_workspaces w WHERE w.source_type = p_source_type AND w.source_id = p_source_id;
    RETURN jsonb_build_object('id', v_id, 'created', false);
  END IF;
  INSERT INTO public.deal_workspace_members (workspace_id, user_id, role, status, invited_by, responded_at)
  VALUES (v_id, v_uid, 'owner', 'active', v_uid, now()),
         (v_id, v_other, 'collaborator', 'invited', v_uid, NULL);
  PERFORM public.deal_workspace_log(v_id, 'created', btrim(p_title));
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (v_other, 'workspace_invite', v_name || ' invited you to the workspace "' || left(btrim(p_title), 120) || '"', v_uid, '/app');
  RETURN jsonb_build_object('id', v_id, 'created', true);
END $$;
REVOKE ALL ON FUNCTION public.create_deal_workspace(text, uuid, text, text, text, bigint, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_deal_workspace(text, uuid, text, text, text, bigint, text, date) TO authenticated;

-- Invitation answer: only the invited person, only for themselves.
CREATE OR REPLACE FUNCTION public.respond_workspace_invite(p_ws uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_n int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  UPDATE public.deal_workspace_members
     SET status = CASE WHEN p_accept THEN 'active' ELSE 'declined' END, responded_at = now()
   WHERE workspace_id = p_ws AND user_id = v_uid AND status = 'invited';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'No pending invitation' USING errcode = '42501'; END IF;
  PERFORM public.deal_workspace_log(p_ws, CASE WHEN p_accept THEN 'invite_accepted' ELSE 'invite_declined' END);
END $$;
REVOKE ALL ON FUNCTION public.respond_workspace_invite(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_workspace_invite(uuid, boolean) TO authenticated;

-- Owner re-invites someone who declined or left. Only the other person from the source can be
-- on the roster: nothing here reaches outside the conversation or introduction.
CREATE OR REPLACE FUNCTION public.invite_workspace_member(p_ws uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); w public.deal_workspaces; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  IF public.deal_workspace_role(p_ws) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can invite' USING errcode = '42501';
  END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws;
  IF w.status IN ('closed', 'cancelled') THEN RAISE EXCEPTION 'This workspace is %', w.status USING errcode = '22023'; END IF;
  IF p_user IS DISTINCT FROM public.deal_workspace_source_counterpart(w.source_type, w.source_id, v_uid) THEN
    RAISE EXCEPTION 'Only the other person from the source can be invited' USING errcode = '42501';
  END IF;
  INSERT INTO public.deal_workspace_members (workspace_id, user_id, role, status, invited_by)
  VALUES (p_ws, p_user, 'collaborator', 'invited', v_uid)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET status = 'invited', invited_by = v_uid, responded_at = NULL
    WHERE public.deal_workspace_members.status IN ('declined', 'removed');
  PERFORM public.deal_workspace_log(p_ws, 'invited');
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (p_user, 'workspace_invite', v_name || ' invited you to the workspace "' || left(w.title, 120) || '"', v_uid, '/app');
END $$;
REVOKE ALL ON FUNCTION public.invite_workspace_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_workspace_member(uuid, uuid) TO authenticated;

-- Owner removes a collaborator, or a collaborator leaves. The owner cannot be removed.
CREATE OR REPLACE FUNCTION public.remove_workspace_member(p_ws uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_n int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  IF p_user IS DISTINCT FROM v_uid AND public.deal_workspace_role(p_ws) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can remove someone else' USING errcode = '42501';
  END IF;
  UPDATE public.deal_workspace_members SET status = 'removed', responded_at = now()
   WHERE workspace_id = p_ws AND user_id = p_user AND role = 'collaborator' AND status IN ('invited', 'active');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'Nobody to remove' USING errcode = '22023'; END IF;
  DELETE FROM public.deal_workspace_confirmations WHERE workspace_id = p_ws AND user_id = p_user;
  PERFORM public.deal_workspace_log(p_ws, CASE WHEN p_user = v_uid THEN 'left' ELSE 'removed' END);
END $$;
REVOKE ALL ON FUNCTION public.remove_workspace_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_workspace_member(uuid, uuid) TO authenticated;

-- Terms: owner only. Changing scope or money after someone confirmed "agreed" voids the confirmations.
CREATE OR REPLACE FUNCTION public.update_workspace_details(
  p_ws uuid, p_title text, p_scope text, p_budget_cents bigint, p_currency text, p_due_on date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces;
BEGIN
  IF public.deal_workspace_role(p_ws) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can change the terms' USING errcode = '42501';
  END IF;
  IF p_budget_cents IS NOT NULL AND (p_currency IS NULL OR p_currency !~ '^[a-z]{3}$') THEN
    RAISE EXCEPTION 'A budget needs a three-letter currency' USING errcode = '22023';
  END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws FOR UPDATE;
  UPDATE public.deal_workspaces SET title = btrim(p_title), scope = btrim(coalesce(p_scope, '')),
         budget_cents = p_budget_cents, currency = CASE WHEN p_budget_cents IS NULL THEN NULL ELSE p_currency END, due_on = p_due_on
   WHERE id = p_ws;
  IF (w.scope, w.budget_cents, w.currency, w.due_on) IS DISTINCT FROM
     (btrim(coalesce(p_scope, '')), p_budget_cents, CASE WHEN p_budget_cents IS NULL THEN NULL ELSE p_currency END, p_due_on) THEN
    DELETE FROM public.deal_workspace_confirmations WHERE workspace_id = p_ws AND milestone = 'agreed';
  END IF;
  PERFORM public.deal_workspace_log(p_ws, 'terms_updated');
END $$;
REVOKE ALL ON FUNCTION public.update_workspace_details(uuid, text, text, bigint, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_workspace_details(uuid, text, text, bigint, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_workspace_next_action(p_ws uuid, p_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.deal_workspace_role(p_ws) IS NULL THEN RAISE EXCEPTION 'Not on this workspace' USING errcode = '42501'; END IF;
  UPDATE public.deal_workspaces SET next_action = btrim(coalesce(p_text, '')) WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'next_action', coalesce(p_text, ''));
END $$;
REVOKE ALL ON FUNCTION public.set_workspace_next_action(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workspace_next_action(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_workspace_step(p_ws uuid, p_text text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF public.deal_workspace_role(p_ws) IS NULL THEN RAISE EXCEPTION 'Not on this workspace' USING errcode = '42501'; END IF;
  IF (SELECT status FROM public.deal_workspaces WHERE id = p_ws) IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'This workspace is finished' USING errcode = '22023';
  END IF;
  INSERT INTO public.deal_workspace_steps (workspace_id, text, created_by) VALUES (p_ws, btrim(p_text), auth.uid()) RETURNING id INTO v_id;
  PERFORM public.deal_workspace_log(p_ws, 'step_added', p_text);
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.add_workspace_step(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_workspace_step(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_workspace_step_done(p_step uuid, p_done boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.deal_workspace_steps;
BEGIN
  SELECT * INTO s FROM public.deal_workspace_steps WHERE id = p_step;
  IF s.id IS NULL OR public.deal_workspace_role(s.workspace_id) IS NULL THEN RAISE EXCEPTION 'Not on this workspace' USING errcode = '42501'; END IF;
  IF (SELECT status FROM public.deal_workspaces WHERE id = s.workspace_id) IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'This workspace is finished' USING errcode = '22023';
  END IF;
  UPDATE public.deal_workspace_steps SET done = p_done, done_by = CASE WHEN p_done THEN auth.uid() END,
         done_at = CASE WHEN p_done THEN now() END WHERE id = p_step;
  PERFORM public.deal_workspace_log(s.workspace_id, CASE WHEN p_done THEN 'step_done' ELSE 'step_reopened' END, s.text);
END $$;
REVOKE ALL ON FUNCTION public.set_workspace_step_done(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workspace_step_done(uuid, boolean) TO authenticated;

-- Owner-driven lifecycle moves. "agreed" and "accepted" need every participant: see below.
CREATE OR REPLACE FUNCTION public.transition_workspace_status(p_ws uuid, p_to text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces;
BEGIN
  IF public.deal_workspace_role(p_ws) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can change the stage' USING errcode = '42501';
  END IF;
  IF p_to IN ('agreed', 'accepted') THEN
    RAISE EXCEPTION 'Every participant must confirm "%" themselves', p_to USING errcode = '42501';
  END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws FOR UPDATE;
  IF NOT public.deal_workspace_transition_allowed(w.status, p_to) THEN
    RAISE EXCEPTION 'A % workspace cannot move to %', w.status, p_to USING errcode = '22023';
  END IF;
  IF p_to = 'proposal' AND w.status = 'qualified' AND w.scope = '' THEN
    RAISE EXCEPTION 'Describe the scope before sending a proposal stage' USING errcode = '22023';
  END IF;
  IF p_to = 'qualified' THEN
    DELETE FROM public.deal_workspace_confirmations WHERE workspace_id = p_ws AND milestone = 'agreed';
  END IF;
  IF p_to = 'in_progress' AND w.status = 'delivered' THEN
    DELETE FROM public.deal_workspace_confirmations WHERE workspace_id = p_ws AND milestone = 'accepted';
  END IF;
  UPDATE public.deal_workspaces SET status = p_to WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'status', w.status || ' -> ' || p_to);
END $$;
REVOKE ALL ON FUNCTION public.transition_workspace_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_workspace_status(uuid, text) TO authenticated;

-- Each participant confirms for themselves. When every active participant (at least two) has
-- confirmed, the workspace moves to "agreed" (from proposal) or "accepted" (from delivered).
-- This records the participants' confirmations only; it is not a contract, nor a payment.
CREATE OR REPLACE FUNCTION public.confirm_workspace_milestone(p_ws uuid, p_milestone text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_active int; v_confirmed int; v_needs text;
BEGIN
  IF public.deal_workspace_role(p_ws) IS NULL THEN RAISE EXCEPTION 'Not on this workspace' USING errcode = '42501'; END IF;
  IF p_milestone NOT IN ('agreed', 'accepted') THEN RAISE EXCEPTION 'Unknown milestone' USING errcode = '22023'; END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws FOR UPDATE;
  v_needs := CASE p_milestone WHEN 'agreed' THEN 'proposal' ELSE 'delivered' END;
  IF w.status <> v_needs THEN
    RAISE EXCEPTION 'A % workspace cannot be confirmed as %', w.status, p_milestone USING errcode = '22023';
  END IF;
  INSERT INTO public.deal_workspace_confirmations (workspace_id, user_id, milestone) VALUES (p_ws, auth.uid(), p_milestone)
  ON CONFLICT DO NOTHING;
  PERFORM public.deal_workspace_log(p_ws, 'confirmed', p_milestone);
  SELECT count(*) INTO v_active FROM public.deal_workspace_members WHERE workspace_id = p_ws AND status = 'active';
  SELECT count(*) INTO v_confirmed FROM public.deal_workspace_confirmations c
    JOIN public.deal_workspace_members m ON m.workspace_id = c.workspace_id AND m.user_id = c.user_id AND m.status = 'active'
   WHERE c.workspace_id = p_ws AND c.milestone = p_milestone;
  IF v_active >= 2 AND v_confirmed = v_active THEN
    UPDATE public.deal_workspaces SET status = p_milestone WHERE id = p_ws;
    PERFORM public.deal_workspace_log(p_ws, 'status', w.status || ' -> ' || p_milestone);
    RETURN p_milestone;
  END IF;
  RETURN w.status;
END $$;
REVOKE ALL ON FUNCTION public.confirm_workspace_milestone(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_workspace_milestone(uuid, text) TO authenticated;

-- Link one of the caller's own CRM opportunities (private to them).
CREATE OR REPLACE FUNCTION public.link_workspace_opportunity(p_ws uuid, p_opportunity uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.deal_workspace_role(p_ws) IS NULL THEN RAISE EXCEPTION 'Not on this workspace' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.crm_opportunities o WHERE o.id = p_opportunity AND o.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'That opportunity is not yours' USING errcode = '42501';
  END IF;
  INSERT INTO public.deal_workspace_crm_links (workspace_id, user_id, crm_opportunity_id) VALUES (p_ws, auth.uid(), p_opportunity)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET crm_opportunity_id = EXCLUDED.crm_opportunity_id;
END $$;
REVOKE ALL ON FUNCTION public.link_workspace_opportunity(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_workspace_opportunity(uuid, uuid) TO authenticated;
