-- Deal workspaces: a private business workspace a member opens from an existing conversation
-- (dm_threads) or an accepted introduction (intro_requests). It adds a lifecycle, versioned
-- proposals, shared next steps and a role-based roster on top of the entities that already exist:
-- the source keeps living where it is and the workspace only stores a reference (type + id),
-- never the messages or capsule text. Reported deal value stays in intro_deals (0042). A member's
-- own CRM opportunity is linked privately per member and is never shared with the room.
--
-- Accepting an introduction (or replying in a conversation) is NOT consent to a project: the other
-- person is only *invited*, and an invitation grants no access until they accept it themselves.
--
-- Every write goes through a SECURITY DEFINER function that takes the actor from auth.uid();
-- no client can name an actor, change the roster directly or jump the lifecycle. Reads are
-- limited to ACTIVE roster members (invited, declined and removed people read nothing).

-- ── Role / action matrix: the one place that says who may do what ──────────────────────
--   owner         edit_draft, submit_proposal, move_stage, manage_roster, step, next_action
--   counterparty  approve_proposal, decline_proposal, accept_delivery, step, next_action, leave
-- The owner proposes and delivers; the designated counterparty approves terms and accepts
-- delivery. Nobody can approve their own proposal or accept their own delivery.
CREATE OR REPLACE FUNCTION public.deal_workspace_role_may(p_role text, p_action text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_role
    WHEN 'owner' THEN p_action IN ('edit_draft', 'submit_proposal', 'move_stage', 'manage_roster', 'step', 'next_action')
    WHEN 'counterparty' THEN p_action IN ('approve_proposal', 'decline_proposal', 'accept_delivery', 'step', 'next_action', 'leave')
    ELSE false
  END
$$;

-- Lifecycle graph. Moves into "proposal" go through submit_workspace_proposal, into "agreed"
-- through approve_workspace_proposal and into "accepted" through accept_workspace_delivery;
-- the trigger below additionally demands the matching approval record.
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
  -- Version of the effective scope/budget/dates. Any change to them bumps it (trigger-enforced).
  scope_version integer NOT NULL DEFAULT 1,
  -- Optimistic-lock counter: +1 on every update. Writers pass the version they loaded.
  row_version integer NOT NULL DEFAULT 1,
  delivered_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (budget_cents IS NULL OR currency IS NOT NULL),
  UNIQUE (source_type, source_id)
);

CREATE TABLE public.deal_workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'counterparty')),
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

-- Versioned proposals. The terms in force only change when the counterparty approves a version.
CREATE TABLE public.deal_workspace_proposals (
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  version integer NOT NULL,
  scope text NOT NULL CHECK (char_length(btrim(scope)) BETWEEN 1 AND 4000),
  budget_cents bigint CHECK (budget_cents BETWEEN 0 AND 100000000000),
  currency text CHECK (currency ~ '^[a-z]{3}$'),
  due_on date,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'declined', 'superseded')),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  PRIMARY KEY (workspace_id, version),
  CHECK (budget_cents IS NULL OR currency IS NOT NULL)
);

-- Append-only activity history: who (authenticated actor), when, previous/new state, scope version.
CREATE TABLE public.deal_workspace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  prev_status text,
  new_status text,
  scope_version integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deal_workspace_events_ws_idx ON public.deal_workspace_events (workspace_id, created_at);

-- A member's own CRM opportunity linked to a workspace. Personal and owner-only: it is not a
-- shared room, and the other side can neither see nor infer it.
CREATE TABLE public.deal_workspace_crm_links (
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_opportunity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Grants: read-only for members; every write is an RPC.
REVOKE ALL ON public.deal_workspaces, public.deal_workspace_members, public.deal_workspace_steps,
  public.deal_workspace_proposals, public.deal_workspace_events, public.deal_workspace_crm_links
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.deal_workspaces, public.deal_workspace_members, public.deal_workspace_steps,
  public.deal_workspace_proposals, public.deal_workspace_events, public.deal_workspace_crm_links TO service_role;
GRANT SELECT ON public.deal_workspaces, public.deal_workspace_members, public.deal_workspace_steps,
  public.deal_workspace_proposals, public.deal_workspace_events, public.deal_workspace_crm_links TO authenticated;
ALTER TABLE public.deal_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_crm_links ENABLE ROW LEVEL SECURITY;

-- Active members only: a pending, declined or removed invitation grants no access.
CREATE OR REPLACE FUNCTION public.is_deal_workspace_member(p_ws uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.deal_workspace_members m
                  WHERE m.workspace_id = p_ws AND m.user_id = auth.uid() AND m.status = 'active')
$$;
REVOKE ALL ON FUNCTION public.is_deal_workspace_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_deal_workspace_member(uuid) TO authenticated;

CREATE POLICY "active members read workspace" ON public.deal_workspaces FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(id));
-- Everyone can see their own membership row (that is how an invitation is answered);
-- the rest of the roster is for active members.
CREATE POLICY "own row, active members read roster" ON public.deal_workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_deal_workspace_member(workspace_id));
CREATE POLICY "active members read steps" ON public.deal_workspace_steps FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(workspace_id));
CREATE POLICY "active members read proposals" ON public.deal_workspace_proposals FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(workspace_id));
CREATE POLICY "active members read events" ON public.deal_workspace_events FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(workspace_id));
CREATE POLICY "own crm link" ON public.deal_workspace_crm_links FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── Triggers: rules that hold for every writer, including the service role ─────────────
CREATE TRIGGER deal_workspaces_freeze BEFORE UPDATE ON public.deal_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.freeze_columns('id', 'created_by', 'source_type', 'source_id', 'created_at');

CREATE OR REPLACE FUNCTION public.deal_workspaces_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'This workspace is % and can no longer change', OLD.status USING errcode = '22023';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.deal_workspace_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'A % workspace cannot move to %', OLD.status, NEW.status USING errcode = '22023';
  END IF;
  -- Material terms only change together with a version bump, and never silently.
  IF (NEW.scope, NEW.budget_cents, NEW.currency, NEW.due_on) IS DISTINCT FROM (OLD.scope, OLD.budget_cents, OLD.currency, OLD.due_on)
     AND NEW.scope_version <= OLD.scope_version THEN
    RAISE EXCEPTION 'Changing scope, budget or dates needs a new scope version' USING errcode = '22023';
  END IF;
  IF NEW.scope_version < OLD.scope_version THEN
    RAISE EXCEPTION 'The scope version cannot go back' USING errcode = '22023';
  END IF;
  -- "agreed" only with an approved proposal for exactly this scope version, approved by an
  -- active counterparty (never the owner).
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'agreed' THEN
    IF NOT EXISTS (SELECT 1 FROM public.deal_workspace_proposals p
                     JOIN public.deal_workspace_members m ON m.workspace_id = p.workspace_id AND m.user_id = p.decided_by
                    WHERE p.workspace_id = NEW.id AND p.version = NEW.scope_version AND p.status = 'approved'
                      AND m.role = 'counterparty' AND m.status = 'active') THEN
      RAISE EXCEPTION 'The counterparty must approve this proposal version first' USING errcode = '22023';
    END IF;
  END IF;
  -- "accepted" only by an active counterparty recorded on the same update.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'accepted' THEN
    IF NEW.accepted_by IS NULL OR NOT EXISTS (SELECT 1 FROM public.deal_workspace_members m
         WHERE m.workspace_id = NEW.id AND m.user_id = NEW.accepted_by AND m.role = 'counterparty' AND m.status = 'active') THEN
      RAISE EXCEPTION 'Only the designated recipient can accept delivery' USING errcode = '22023';
    END IF;
  END IF;
  NEW.row_version := OLD.row_version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER deal_workspaces_guard BEFORE UPDATE ON public.deal_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspaces_guard();

-- History is append-only: no rewrite, and no delete except as part of removing its workspace
-- (an FK cascade runs one trigger level deeper than a direct statement).
CREATE OR REPLACE FUNCTION public.deal_workspace_events_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Workspace history cannot be changed' USING errcode = '42501';
END $$;
CREATE TRIGGER deal_workspace_events_immutable BEFORE UPDATE OR DELETE ON public.deal_workspace_events
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspace_events_immutable();

-- ── Internal helpers (no EXECUTE for clients) ───────────────────────────────────────────

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

-- Writes one history row for the authenticated caller, stamped with the current scope version.
CREATE OR REPLACE FUNCTION public.deal_workspace_log(p_ws uuid, p_kind text, p_detail text DEFAULT '', p_prev text DEFAULT NULL, p_new text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.deal_workspace_events (workspace_id, actor_id, kind, detail, prev_status, new_status, scope_version)
  VALUES (p_ws, auth.uid(), p_kind, left(coalesce(p_detail, ''), 300), p_prev, p_new,
          (SELECT scope_version FROM public.deal_workspaces WHERE id = p_ws))
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_log(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- In-app notice to the other active participants (nothing leaves the app).
CREATE OR REPLACE FUNCTION public.deal_workspace_notify(p_ws uuid, p_text text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  SELECT m.user_id, 'workspace', left(p_text, 300), auth.uid(), '/app'
    FROM public.deal_workspace_members m
   WHERE m.workspace_id = p_ws AND m.status = 'active' AND m.user_id <> auth.uid()
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_notify(uuid, text) FROM PUBLIC, anon, authenticated;

-- Active role of the caller, or NULL.
CREATE OR REPLACE FUNCTION public.deal_workspace_role(p_ws uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.deal_workspace_members m
   WHERE m.workspace_id = p_ws AND m.user_id = auth.uid() AND m.status = 'active'
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_role(uuid) FROM PUBLIC, anon, authenticated;

-- Checks the caller's role against the matrix, locks the row and rejects a stale writer
-- (optimistic concurrency: the caller passes the row_version it loaded).
CREATE OR REPLACE FUNCTION public.deal_workspace_begin(p_ws uuid, p_action text, p_expected integer)
RETURNS public.deal_workspaces LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text := public.deal_workspace_role(p_ws); w public.deal_workspaces;
BEGIN
  IF v_role IS NULL OR NOT public.deal_workspace_role_may(v_role, p_action) THEN
    RAISE EXCEPTION 'You cannot do that on this workspace' USING errcode = '42501';
  END IF;
  IF p_expected IS NULL THEN RAISE EXCEPTION 'Pass the version you loaded' USING errcode = '22023'; END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws FOR UPDATE;
  IF w.row_version <> p_expected THEN
    RAISE EXCEPTION 'This workspace changed since you loaded it. Reload and try again.' USING errcode = '40001';
  END IF;
  RETURN w;
END $$;
REVOKE ALL ON FUNCTION public.deal_workspace_begin(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- ── Client RPCs ─────────────────────────────────────────────────────────────────────────

-- Idempotent and atomic: the advisory lock serialises concurrent creators of the same source, so
-- exactly one workspace and one roster exist; everyone else gets {created:false}.
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
  PERFORM pg_advisory_xact_lock(hashtextextended('deal_workspace:' || p_source_type || ':' || p_source_id::text, 0));
  SELECT w.id INTO v_id FROM public.deal_workspaces w WHERE w.source_type = p_source_type AND w.source_id = p_source_id;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_id, 'created', false);
  END IF;
  INSERT INTO public.deal_workspaces (created_by, source_type, source_id, title, scope, next_action, budget_cents, currency, due_on)
  VALUES (v_uid, p_source_type, p_source_id, btrim(p_title), btrim(coalesce(p_scope, '')), btrim(coalesce(p_next_action, '')),
          p_budget_cents, CASE WHEN p_budget_cents IS NULL THEN NULL ELSE p_currency END, p_due_on)
  RETURNING id INTO v_id;
  INSERT INTO public.deal_workspace_members (workspace_id, user_id, role, status, invited_by, responded_at)
  VALUES (v_id, v_uid, 'owner', 'active', v_uid, now()),
         (v_id, v_other, 'counterparty', 'invited', v_uid, NULL);
  PERFORM public.deal_workspace_log(v_id, 'created', btrim(p_title), NULL, 'qualified');
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (v_other, 'workspace_invite', v_name || ' invited you to the workspace "' || left(btrim(p_title), 120) || '"', v_uid, '/app');
  RETURN jsonb_build_object('id', v_id, 'created', true);
END $$;
REVOKE ALL ON FUNCTION public.create_deal_workspace(text, uuid, text, text, text, bigint, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_deal_workspace(text, uuid, text, text, text, bigint, text, date) TO authenticated;

-- What a pending invitation may show: the title and who invited you. No scope, terms, steps or history.
CREATE OR REPLACE FUNCTION public.my_workspace_invitations()
RETURNS TABLE (workspace_id uuid, title text, invited_by_name text, invited_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.workspace_id, w.title, coalesce(nullif(btrim(p.name), ''), 'A member'), m.created_at
    FROM public.deal_workspace_members m
    JOIN public.deal_workspaces w ON w.id = m.workspace_id
    LEFT JOIN public.profiles p ON p.id = m.invited_by
   WHERE m.user_id = auth.uid() AND m.status = 'invited' AND w.status NOT IN ('closed', 'cancelled')
   ORDER BY m.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.my_workspace_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_workspace_invitations() TO authenticated;

-- Invitation answer: only the invited person, only for themselves. Accepting grants access to
-- the workspace; it does not agree to anything in it.
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
  IF p_accept THEN
    PERFORM public.deal_workspace_log(p_ws, 'invite_accepted');
    PERFORM public.deal_workspace_notify(p_ws, 'Your invitation to the workspace was accepted. Nothing is agreed yet.');
  ELSE
    -- A decliner has no access, so the owner is told through a notice and the history shows it.
    PERFORM public.deal_workspace_log(p_ws, 'invite_declined');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.respond_workspace_invite(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_workspace_invite(uuid, boolean) TO authenticated;

-- Owner re-invites the other person from the source after a decline or removal.
CREATE OR REPLACE FUNCTION public.invite_workspace_member(p_ws uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); w public.deal_workspaces; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  IF NOT public.deal_workspace_role_may(public.deal_workspace_role(p_ws), 'manage_roster') THEN
    RAISE EXCEPTION 'Only the workspace owner can invite' USING errcode = '42501';
  END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws;
  IF w.status IN ('closed', 'cancelled') THEN RAISE EXCEPTION 'This workspace is %', w.status USING errcode = '22023'; END IF;
  IF p_user IS DISTINCT FROM public.deal_workspace_source_counterpart(w.source_type, w.source_id, v_uid) THEN
    RAISE EXCEPTION 'Only the other person from the source can be invited' USING errcode = '42501';
  END IF;
  INSERT INTO public.deal_workspace_members (workspace_id, user_id, role, status, invited_by)
  VALUES (p_ws, p_user, 'counterparty', 'invited', v_uid)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET status = 'invited', invited_by = v_uid, responded_at = NULL
    WHERE public.deal_workspace_members.status IN ('declined', 'removed');
  PERFORM public.deal_workspace_log(p_ws, 'invited');
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (p_user, 'workspace_invite', v_name || ' invited you to the workspace "' || left(w.title, 120) || '"', v_uid, '/app');
END $$;
REVOKE ALL ON FUNCTION public.invite_workspace_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_workspace_member(uuid, uuid) TO authenticated;

-- Owner removes the counterparty, or the counterparty leaves. The owner cannot be removed.
CREATE OR REPLACE FUNCTION public.remove_workspace_member(p_ws uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_role text := public.deal_workspace_role(p_ws); v_n int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  IF NOT (public.deal_workspace_role_may(v_role, 'manage_roster') OR (p_user = v_uid AND public.deal_workspace_role_may(v_role, 'leave'))) THEN
    RAISE EXCEPTION 'Only the workspace owner can remove someone else' USING errcode = '42501';
  END IF;
  UPDATE public.deal_workspace_members SET status = 'removed', responded_at = now()
   WHERE workspace_id = p_ws AND user_id = p_user AND role = 'counterparty' AND status IN ('invited', 'active');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'Nobody to remove' USING errcode = '22023'; END IF;
  PERFORM public.deal_workspace_log(p_ws, CASE WHEN p_user = v_uid THEN 'left' ELSE 'removed' END);
END $$;
REVOKE ALL ON FUNCTION public.remove_workspace_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_workspace_member(uuid, uuid) TO authenticated;

-- Draft edits by the owner. Before a proposal (qualified) the terms are a draft and may change,
-- each change bumping the scope version. After that, scope, budget, currency and dates change
-- only through a versioned proposal the counterparty approves; the title is not material.
CREATE OR REPLACE FUNCTION public.update_workspace_details(
  p_ws uuid, p_expected integer, p_title text, p_scope text, p_budget_cents bigint, p_currency text, p_due_on date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_cur text; v_scope text := btrim(coalesce(p_scope, '')); v_changed boolean;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'edit_draft', p_expected);
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 3 AND 160 THEN
    RAISE EXCEPTION 'Give the workspace a title of 3 to 160 characters' USING errcode = '22023';
  END IF;
  IF p_budget_cents IS NOT NULL AND (p_currency IS NULL OR p_currency !~ '^[a-z]{3}$') THEN
    RAISE EXCEPTION 'A budget needs a three-letter currency' USING errcode = '22023';
  END IF;
  v_cur := CASE WHEN p_budget_cents IS NULL THEN NULL ELSE p_currency END;
  v_changed := (w.scope, w.budget_cents, w.currency, w.due_on) IS DISTINCT FROM (v_scope, p_budget_cents, v_cur, p_due_on);
  IF v_changed AND w.status <> 'qualified' THEN
    RAISE EXCEPTION 'Changes to scope, budget or dates now need a new proposal version' USING errcode = '22023';
  END IF;
  UPDATE public.deal_workspaces SET title = btrim(p_title), scope = v_scope, budget_cents = p_budget_cents, currency = v_cur, due_on = p_due_on,
         scope_version = CASE WHEN v_changed THEN scope_version + 1 ELSE scope_version END
   WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'draft_updated');
END $$;
REVOKE ALL ON FUNCTION public.update_workspace_details(uuid, integer, text, text, bigint, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_workspace_details(uuid, integer, text, text, bigint, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_workspace_next_action(p_ws uuid, p_expected integer, p_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.deal_workspace_begin(p_ws, 'next_action', p_expected);
  UPDATE public.deal_workspaces SET next_action = btrim(coalesce(p_text, '')) WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'next_action', coalesce(p_text, ''));
END $$;
REVOKE ALL ON FUNCTION public.set_workspace_next_action(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workspace_next_action(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_workspace_step(p_ws uuid, p_text text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_role text := public.deal_workspace_role(p_ws);
BEGIN
  IF NOT public.deal_workspace_role_may(v_role, 'step') THEN RAISE EXCEPTION 'You cannot do that on this workspace' USING errcode = '42501'; END IF;
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
  SELECT * INTO s FROM public.deal_workspace_steps WHERE id = p_step FOR UPDATE;
  IF s.id IS NULL OR NOT public.deal_workspace_role_may(public.deal_workspace_role(s.workspace_id), 'step') THEN
    RAISE EXCEPTION 'You cannot do that on this workspace' USING errcode = '42501';
  END IF;
  IF (SELECT status FROM public.deal_workspaces WHERE id = s.workspace_id) IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'This workspace is finished' USING errcode = '22023';
  END IF;
  UPDATE public.deal_workspace_steps SET done = p_done, done_by = CASE WHEN p_done THEN auth.uid() END,
         done_at = CASE WHEN p_done THEN now() END WHERE id = p_step;
  PERFORM public.deal_workspace_log(s.workspace_id, CASE WHEN p_done THEN 'step_done' ELSE 'step_reopened' END, s.text);
END $$;
REVOKE ALL ON FUNCTION public.set_workspace_step_done(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workspace_step_done(uuid, boolean) TO authenticated;

-- Owner submits a versioned proposal. Before agreement it replaces the terms under discussion and
-- the stage becomes "proposal". After agreement it is a material change: the terms in force stay
-- as they are until the counterparty approves this version (renewed approval).
CREATE OR REPLACE FUNCTION public.submit_workspace_proposal(
  p_ws uuid, p_expected integer, p_scope text, p_budget_cents bigint, p_currency text, p_due_on date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_ver integer; v_scope text := btrim(coalesce(p_scope, '')); v_cur text;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'submit_proposal', p_expected);
  IF w.status IN ('accepted', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'A % workspace takes no new proposal', w.status USING errcode = '22023';
  END IF;
  IF char_length(v_scope) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Describe the scope (up to 4,000 characters)' USING errcode = '22023'; END IF;
  IF p_budget_cents IS NOT NULL AND (p_budget_cents NOT BETWEEN 0 AND 100000000000 OR p_currency IS NULL OR p_currency !~ '^[a-z]{3}$') THEN
    RAISE EXCEPTION 'A budget needs an amount in range and a three-letter currency' USING errcode = '22023';
  END IF;
  v_cur := CASE WHEN p_budget_cents IS NULL THEN NULL ELSE p_currency END;
  SELECT greatest(coalesce(max(version), 0), w.scope_version) + 1 INTO v_ver FROM public.deal_workspace_proposals WHERE workspace_id = p_ws;
  UPDATE public.deal_workspace_proposals SET status = 'superseded', decided_at = now() WHERE workspace_id = p_ws AND status = 'submitted';
  INSERT INTO public.deal_workspace_proposals (workspace_id, version, scope, budget_cents, currency, due_on, submitted_by)
  VALUES (p_ws, v_ver, v_scope, p_budget_cents, v_cur, p_due_on, auth.uid());
  IF w.status IN ('qualified', 'proposal') THEN
    UPDATE public.deal_workspaces SET scope = v_scope, budget_cents = p_budget_cents, currency = v_cur, due_on = p_due_on,
           scope_version = v_ver, status = 'proposal' WHERE id = p_ws;
  ELSE
    UPDATE public.deal_workspaces SET updated_at = now() WHERE id = p_ws; -- bumps row_version
  END IF;
  PERFORM public.deal_workspace_log(p_ws, 'proposal_submitted', 'version ' || v_ver, w.status, CASE WHEN w.status = 'qualified' THEN 'proposal' ELSE w.status END);
  PERFORM public.deal_workspace_notify(p_ws, 'A proposal (version ' || v_ver || ') is waiting for your approval.');
  RETURN v_ver;
END $$;
REVOKE ALL ON FUNCTION public.submit_workspace_proposal(uuid, integer, text, bigint, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_workspace_proposal(uuid, integer, text, bigint, text, date) TO authenticated;

-- Only the designated counterparty approves, and only the latest submitted version.
CREATE OR REPLACE FUNCTION public.approve_workspace_proposal(p_ws uuid, p_expected integer, p_version integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; p public.deal_workspace_proposals; v_new text;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'approve_proposal', p_expected);
  SELECT * INTO p FROM public.deal_workspace_proposals WHERE workspace_id = p_ws AND version = p_version FOR UPDATE;
  IF p.version IS NULL OR p.status <> 'submitted' THEN RAISE EXCEPTION 'That proposal is no longer open for approval' USING errcode = '22023'; END IF;
  IF w.status NOT IN ('proposal', 'agreed', 'in_progress', 'delivered') THEN RAISE EXCEPTION 'A % workspace takes no approval', w.status USING errcode = '22023'; END IF;
  UPDATE public.deal_workspace_proposals SET status = 'approved', decided_by = auth.uid(), decided_at = now() WHERE workspace_id = p_ws AND version = p_version;
  v_new := CASE w.status WHEN 'proposal' THEN 'agreed' WHEN 'delivered' THEN 'in_progress' ELSE w.status END;
  UPDATE public.deal_workspaces SET scope = p.scope, budget_cents = p.budget_cents, currency = p.currency, due_on = p.due_on,
         scope_version = p.version, status = v_new, delivered_at = CASE WHEN v_new = 'in_progress' THEN NULL ELSE delivered_at END
   WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'proposal_approved', 'version ' || p_version, w.status, v_new);
  PERFORM public.deal_workspace_notify(p_ws, 'Proposal version ' || p_version || ' was approved.');
  RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.approve_workspace_proposal(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_workspace_proposal(uuid, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_workspace_proposal(p_ws uuid, p_expected integer, p_version integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_n int;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'decline_proposal', p_expected);
  UPDATE public.deal_workspace_proposals SET status = 'declined', decided_by = auth.uid(), decided_at = now()
   WHERE workspace_id = p_ws AND version = p_version AND status = 'submitted';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'That proposal is no longer open' USING errcode = '22023'; END IF;
  UPDATE public.deal_workspaces SET updated_at = now() WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'proposal_declined', 'version ' || p_version, w.status, w.status);
  PERFORM public.deal_workspace_notify(p_ws, 'Proposal version ' || p_version || ' was declined.');
END $$;
REVOKE ALL ON FUNCTION public.decline_workspace_proposal(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_workspace_proposal(uuid, integer, integer) TO authenticated;

-- Owner-driven moves that need no counterparty: start work, mark delivered, pull back, cancel, close.
-- "proposal", "agreed" and "accepted" are not reachable here.
CREATE OR REPLACE FUNCTION public.transition_workspace_status(p_ws uuid, p_expected integer, p_to text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'move_stage', p_expected);
  IF p_to IN ('proposal', 'agreed', 'accepted') THEN
    RAISE EXCEPTION 'The stage "%" is reached through a proposal, its approval or the recipient''s acceptance', p_to USING errcode = '42501';
  END IF;
  IF NOT public.deal_workspace_transition_allowed(w.status, p_to) THEN
    RAISE EXCEPTION 'A % workspace cannot move to %', w.status, p_to USING errcode = '22023';
  END IF;
  IF p_to = 'qualified' THEN
    UPDATE public.deal_workspace_proposals SET status = 'superseded', decided_at = now() WHERE workspace_id = p_ws AND status = 'submitted';
  END IF;
  UPDATE public.deal_workspaces SET status = p_to, delivered_at = CASE WHEN p_to = 'delivered' THEN now() WHEN p_to = 'in_progress' THEN NULL ELSE delivered_at END WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'status', '', w.status, p_to);
  IF p_to = 'delivered' THEN PERFORM public.deal_workspace_notify(p_ws, 'Delivery was marked complete and is waiting for your acceptance.'); END IF;
END $$;
REVOKE ALL ON FUNCTION public.transition_workspace_status(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_workspace_status(uuid, integer, text) TO authenticated;

-- Only the designated recipient accepts delivery; whoever delivered cannot accept their own work.
-- This records the recipient's acceptance. It is not a payment and does not move money.
CREATE OR REPLACE FUNCTION public.accept_workspace_delivery(p_ws uuid, p_expected integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'accept_delivery', p_expected);
  IF w.status <> 'delivered' THEN RAISE EXCEPTION 'Only delivered work can be accepted' USING errcode = '22023'; END IF;
  UPDATE public.deal_workspaces SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now() WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'delivery_accepted', '', w.status, 'accepted');
  PERFORM public.deal_workspace_notify(p_ws, 'Delivery was accepted.');
END $$;
REVOKE ALL ON FUNCTION public.accept_workspace_delivery(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_delivery(uuid, integer) TO authenticated;

-- Link one of the caller's own CRM opportunities. Personal and owner-only; unrelated to the shared room.
CREATE OR REPLACE FUNCTION public.link_workspace_opportunity(p_ws uuid, p_opportunity uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.deal_workspace_role(p_ws) IS NULL THEN RAISE EXCEPTION 'You cannot do that on this workspace' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.crm_opportunities o WHERE o.id = p_opportunity AND o.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'That opportunity is not yours' USING errcode = '42501';
  END IF;
  INSERT INTO public.deal_workspace_crm_links (workspace_id, user_id, crm_opportunity_id) VALUES (p_ws, auth.uid(), p_opportunity)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET crm_opportunity_id = EXCLUDED.crm_opportunity_id;
END $$;
REVOKE ALL ON FUNCTION public.link_workspace_opportunity(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_workspace_opportunity(uuid, uuid) TO authenticated;
