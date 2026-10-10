-- Deal workspaces, business roles. Builds on 0057 (which this migration does not rewrite, so it is
-- safe where 0057 is already applied). Adds:
--   * buyer / provider parties that BOTH people explicitly accept, independent of who opened the room;
--     until they are established every consequential business transition is blocked;
--   * agreement = affirmative approval from BOTH parties of the SAME immutable terms version;
--   * delivery as its own versioned record: only the provider submits it, only the buyer accepts it,
--     referencing the delivery version and the agreed terms version;
--   * a defined re-approval workflow: a material change after agreement pauses work in "proposal"
--     (progression blocked) until both parties approve the new version, or one declines it and the
--     previously approved terms and stage resume;
--   * an explicit invitation message in the minimal pre-acceptance preview;
--   * privileged-write invariants in triggers (they hold for the service role too);
--   * history that records actor, action, previous/new stage, terms and delivery version, and no payloads.
-- Owner/admin status (creator of the room) never approves, delivers or accepts for anybody.

ALTER TABLE public.deal_workspaces
  ADD COLUMN resume_status text CHECK (resume_status IN ('agreed', 'in_progress', 'delivered')),
  ADD COLUMN accepted_delivery_version integer,
  ADD COLUMN party_proposal_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN party_proposal_buyer uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.deal_workspace_members
  ADD COLUMN party text CHECK (party IN ('buyer', 'provider')),
  ADD COLUMN party_accepted_at timestamptz,
  ADD COLUMN invite_message text NOT NULL DEFAULT '' CHECK (char_length(invite_message) <= 500),
  ADD CONSTRAINT deal_workspace_members_party_ck CHECK (party_accepted_at IS NULL OR party IS NOT NULL);

ALTER TABLE public.deal_workspace_events ADD COLUMN delivery_version integer;

-- One approval per (terms version, person). Append-only: a replayed or stale confirmation cannot
-- overwrite or duplicate an earlier one, and the actor is always auth.uid().
CREATE TABLE public.deal_workspace_approvals (
  workspace_id uuid NOT NULL,
  version integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  party text NOT NULL CHECK (party IN ('buyer', 'provider')),
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, version, user_id),
  FOREIGN KEY (workspace_id, version) REFERENCES public.deal_workspace_proposals (workspace_id, version) ON DELETE CASCADE
);

CREATE TABLE public.deal_workspace_deliveries (
  workspace_id uuid NOT NULL REFERENCES public.deal_workspaces(id) ON DELETE CASCADE,
  version integer NOT NULL,
  terms_version integer NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected', 'superseded')),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  PRIMARY KEY (workspace_id, version)
);

REVOKE ALL ON public.deal_workspace_approvals, public.deal_workspace_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.deal_workspace_approvals, public.deal_workspace_deliveries TO service_role;
GRANT SELECT ON public.deal_workspace_approvals, public.deal_workspace_deliveries TO authenticated;
ALTER TABLE public.deal_workspace_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_workspace_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active members read approvals" ON public.deal_workspace_approvals FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(workspace_id));
CREATE POLICY "active members read deliveries" ON public.deal_workspace_deliveries FOR SELECT TO authenticated
  USING (public.is_deal_workspace_member(workspace_id));

-- Privileged-write invariant: an approval can only be recorded for an open version, by the active,
-- role-accepted member whose party it names.
CREATE FUNCTION public.deal_workspace_approvals_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.deal_workspace_proposals p WHERE p.workspace_id = NEW.workspace_id AND p.version = NEW.version AND p.status = 'submitted') THEN
    RAISE EXCEPTION 'That version is not open for approval' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.deal_workspace_members m WHERE m.workspace_id = NEW.workspace_id AND m.user_id = NEW.user_id
                    AND m.status = 'active' AND m.party = NEW.party AND m.party_accepted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Only an active member who accepted that role can approve for it' USING errcode = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER deal_workspace_approvals_guard BEFORE INSERT ON public.deal_workspace_approvals
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspace_approvals_guard();
CREATE TRIGGER deal_workspace_approvals_immutable BEFORE UPDATE OR DELETE ON public.deal_workspace_approvals
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspace_events_immutable();

-- Core columns of a proposal / delivery never change, for any writer (only status + decision do).
CREATE OR REPLACE FUNCTION public.deal_workspace_freeze_always() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY TG_ARGV LOOP
    IF (to_jsonb(NEW) -> c) IS DISTINCT FROM (to_jsonb(OLD) -> c) THEN
      RAISE EXCEPTION 'A submitted version is immutable (%)', c USING errcode = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER deal_workspace_proposals_freeze BEFORE UPDATE ON public.deal_workspace_proposals
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspace_freeze_always('workspace_id', 'version', 'scope', 'budget_cents', 'currency', 'due_on', 'submitted_by', 'submitted_at');
CREATE TRIGGER deal_workspace_deliveries_freeze BEFORE UPDATE ON public.deal_workspace_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspace_freeze_always('workspace_id', 'version', 'terms_version', 'note', 'submitted_by', 'submitted_at');

-- ── Matrix ──────────────────────────────────────────────────────────────────────────────
-- Room admin (owner) never confers a business action; the buyer/provider party does.
CREATE OR REPLACE FUNCTION public.deal_workspace_role_may(p_role text, p_action text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_role
    WHEN 'owner' THEN p_action IN ('edit_draft', 'manage_roster', 'move_stage', 'cancel', 'close', 'step', 'next_action', 'propose_parties', 'accept_parties')
    WHEN 'counterparty' THEN p_action IN ('step', 'next_action', 'leave', 'propose_parties', 'accept_parties')
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.deal_workspace_party_may(p_party text, p_action text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_party
    WHEN 'buyer' THEN p_action IN ('submit_proposal', 'approve_proposal', 'decline_proposal', 'accept_delivery', 'reject_delivery')
    WHEN 'provider' THEN p_action IN ('submit_proposal', 'approve_proposal', 'decline_proposal', 'start_work', 'submit_delivery')
    ELSE false
  END
$$;

-- Actions that need both parties established first.
CREATE OR REPLACE FUNCTION public.deal_workspace_action_needs_parties(p_action text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_action IN ('submit_proposal', 'approve_proposal', 'decline_proposal', 'start_work', 'submit_delivery', 'accept_delivery', 'reject_delivery')
$$;

CREATE OR REPLACE FUNCTION public.deal_workspace_transition_allowed(p_from text, p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_from
    WHEN 'qualified'   THEN p_to IN ('proposal', 'cancelled')
    WHEN 'proposal'    THEN p_to IN ('agreed', 'in_progress', 'delivered', 'qualified', 'cancelled')
    WHEN 'agreed'      THEN p_to IN ('in_progress', 'proposal', 'cancelled')
    WHEN 'in_progress' THEN p_to IN ('delivered', 'proposal', 'cancelled')
    WHEN 'delivered'   THEN p_to IN ('accepted', 'in_progress', 'proposal', 'cancelled')
    WHEN 'accepted'    THEN p_to IN ('closed')
    ELSE false
  END
$$;

-- ── Helpers ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deal_workspace_party(p_ws uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.party FROM public.deal_workspace_members m
   WHERE m.workspace_id = p_ws AND m.user_id = auth.uid() AND m.status = 'active' AND m.party_accepted_at IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_party(uuid) FROM PUBLIC, anon, authenticated;

-- Both people active, one buyer and one provider, each having accepted their own role.
CREATE OR REPLACE FUNCTION public.deal_workspace_parties_established(p_ws uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) = 2 AND count(DISTINCT m.party) = 2
    FROM public.deal_workspace_members m
   WHERE m.workspace_id = p_ws AND m.status = 'active' AND m.party IS NOT NULL AND m.party_accepted_at IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_parties_established(uuid) FROM PUBLIC, anon, authenticated;

-- A proposal version is approved only when the current buyer AND the current provider each approved it.
CREATE OR REPLACE FUNCTION public.deal_workspace_terms_approved(p_ws uuid, p_version integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.deal_workspace_proposals p WHERE p.workspace_id = p_ws AND p.version = p_version AND p.status = 'approved')
     AND (SELECT count(DISTINCT a.party) FROM public.deal_workspace_approvals a
            JOIN public.deal_workspace_members m ON m.workspace_id = a.workspace_id AND m.user_id = a.user_id
             AND m.party = a.party AND m.status = 'active' AND m.party_accepted_at IS NOT NULL
           WHERE a.workspace_id = p_ws AND a.version = p_version) = 2
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_terms_approved(uuid, integer) FROM PUBLIC, anon, authenticated;

-- ── Triggers: invariants for every writer, including the service role ───────────────────
CREATE OR REPLACE FUNCTION public.deal_workspaces_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_terms_changed boolean := (NEW.scope, NEW.budget_cents, NEW.currency, NEW.due_on) IS DISTINCT FROM (OLD.scope, OLD.budget_cents, OLD.currency, OLD.due_on);
BEGIN
  IF OLD.status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'This workspace is % and can no longer change', OLD.status USING errcode = '22023';
  END IF;
  IF NEW.scope_version < OLD.scope_version THEN
    RAISE EXCEPTION 'The terms version cannot go back' USING errcode = '22023';
  END IF;
  -- Terms are immutable once a proposal exists: they move only with a new version, and only
  -- when both parties approved that version (the approval step applies them).
  IF v_terms_changed OR NEW.scope_version <> OLD.scope_version THEN
    IF OLD.status NOT IN ('qualified', 'proposal') THEN
      RAISE EXCEPTION 'Agreed terms cannot be edited; submit a new proposal version' USING errcode = '22023';
    END IF;
    IF v_terms_changed AND NEW.scope_version <= OLD.scope_version THEN
      RAISE EXCEPTION 'Changing scope, budget or dates needs a new terms version' USING errcode = '22023';
    END IF;
    IF OLD.status = 'proposal' AND NOT public.deal_workspace_terms_approved(NEW.id, NEW.scope_version) THEN
      RAISE EXCEPTION 'Both parties must approve the same terms version first' USING errcode = '22023';
    END IF;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.deal_workspace_transition_allowed(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'A % workspace cannot move to %', OLD.status, NEW.status USING errcode = '22023';
    END IF;
    IF NEW.status IN ('proposal', 'agreed', 'in_progress', 'delivered', 'accepted') AND NOT public.deal_workspace_parties_established(NEW.id) THEN
      RAISE EXCEPTION 'Buyer and provider roles must be accepted by both people first' USING errcode = '42501';
    END IF;
    IF NEW.status = 'proposal' AND OLD.status IN ('agreed', 'in_progress', 'delivered') AND NEW.resume_status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'A change after agreement must remember the stage to resume' USING errcode = '22023';
    END IF;
    IF OLD.status = 'proposal' AND NEW.status IN ('agreed', 'in_progress', 'delivered') THEN
      IF NEW.status = OLD.resume_status AND NOT v_terms_changed THEN
        NULL; -- declined change: the previously approved terms and stage resume
      ELSIF NEW.status IN ('agreed', 'in_progress') AND public.deal_workspace_terms_approved(NEW.id, NEW.scope_version) THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Both parties must approve the same terms version first' USING errcode = '22023';
      END IF;
    END IF;
    IF NEW.status = 'delivered' AND OLD.status = 'in_progress' THEN
      IF NOT EXISTS (SELECT 1 FROM public.deal_workspace_deliveries d
                       JOIN public.deal_workspace_members m ON m.workspace_id = d.workspace_id AND m.user_id = d.submitted_by
                      WHERE d.workspace_id = NEW.id AND d.status = 'submitted' AND d.terms_version = NEW.scope_version
                        AND m.party = 'provider' AND m.status = 'active' AND m.party_accepted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Only the provider can submit delivery against the current terms' USING errcode = '22023';
      END IF;
    END IF;
    IF NEW.status = 'accepted' THEN
      IF NEW.accepted_by IS NULL OR NEW.accepted_delivery_version IS NULL OR NOT EXISTS (
           SELECT 1 FROM public.deal_workspace_deliveries d
             JOIN public.deal_workspace_members m ON m.workspace_id = d.workspace_id AND m.user_id = d.decided_by
            WHERE d.workspace_id = NEW.id AND d.version = NEW.accepted_delivery_version AND d.status = 'accepted'
              AND d.decided_by = NEW.accepted_by AND d.terms_version = NEW.scope_version
              AND m.party = 'buyer' AND m.status = 'active' AND m.party_accepted_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Only the designated buyer can accept this delivery against the agreed terms' USING errcode = '22023';
      END IF;
    END IF;
    IF NEW.status <> 'proposal' AND NEW.resume_status IS NOT NULL THEN
      RAISE EXCEPTION 'Only a workspace awaiting re-approval remembers a stage to resume' USING errcode = '22023';
    END IF;
  END IF;
  NEW.row_version := OLD.row_version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Roles are locked once terms are agreed: nobody can reassign buyer/provider mid-deal.
CREATE OR REPLACE FUNCTION public.deal_workspace_members_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_status text; v_resume text;
BEGIN
  IF (NEW.party, NEW.party_accepted_at) IS DISTINCT FROM (OLD.party, OLD.party_accepted_at) THEN
    SELECT status, resume_status INTO v_status, v_resume FROM public.deal_workspaces WHERE id = NEW.workspace_id;
    IF v_status IN ('agreed', 'in_progress', 'delivered', 'accepted') OR v_resume IS NOT NULL THEN
      RAISE EXCEPTION 'Buyer and provider roles are locked once terms are agreed' USING errcode = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER deal_workspace_members_guard BEFORE UPDATE ON public.deal_workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.deal_workspace_members_guard();

-- ── Internal helpers ────────────────────────────────────────────────────────────────────
DROP FUNCTION public.deal_workspace_log(uuid, text, text, text, text);
CREATE FUNCTION public.deal_workspace_log(
  p_ws uuid, p_kind text, p_detail text DEFAULT '', p_prev text DEFAULT NULL, p_new text DEFAULT NULL,
  p_scope_version integer DEFAULT NULL, p_delivery_version integer DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.deal_workspace_events (workspace_id, actor_id, kind, detail, prev_status, new_status, scope_version, delivery_version)
  VALUES (p_ws, auth.uid(), p_kind, left(coalesce(p_detail, ''), 300), p_prev, p_new,
          coalesce(p_scope_version, (SELECT scope_version FROM public.deal_workspaces WHERE id = p_ws)), p_delivery_version)
$$;
REVOKE ALL ON FUNCTION public.deal_workspace_log(uuid, text, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;

-- Role + party check, consequential actions blocked until roles are mutually established,
-- row locked, stale writers rejected.
CREATE OR REPLACE FUNCTION public.deal_workspace_begin(p_ws uuid, p_action text, p_expected integer)
RETURNS public.deal_workspaces LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text := public.deal_workspace_role(p_ws); v_party text := public.deal_workspace_party(p_ws); w public.deal_workspaces;
BEGIN
  IF v_role IS NULL THEN RAISE EXCEPTION 'You cannot do that on this workspace' USING errcode = '42501'; END IF;
  IF public.deal_workspace_action_needs_parties(p_action) AND NOT public.deal_workspace_parties_established(p_ws) THEN
    RAISE EXCEPTION 'Buyer and provider roles must be accepted by both people first' USING errcode = '42501';
  END IF;
  IF NOT (public.deal_workspace_role_may(v_role, p_action) OR public.deal_workspace_party_may(v_party, p_action)) THEN
    RAISE EXCEPTION 'Your role cannot do that on this workspace' USING errcode = '42501';
  END IF;
  IF p_expected IS NULL THEN RAISE EXCEPTION 'Pass the version you loaded' USING errcode = '22023'; END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws FOR UPDATE;
  IF w.row_version <> p_expected THEN
    RAISE EXCEPTION 'This workspace changed since you loaded it. Reload and try again.' USING errcode = '40001';
  END IF;
  RETURN w;
END $$;
REVOKE ALL ON FUNCTION public.deal_workspace_begin(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- ── Creation, invitations ───────────────────────────────────────────────────────────────
DROP FUNCTION public.create_deal_workspace(text, uuid, text, text, text, bigint, text, date);
CREATE FUNCTION public.create_deal_workspace(
  p_source_type text, p_source_id uuid, p_title text, p_scope text DEFAULT '', p_next_action text DEFAULT '',
  p_budget_cents bigint DEFAULT NULL, p_currency text DEFAULT NULL, p_due_on date DEFAULT NULL, p_invite_message text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_other uuid; v_id uuid; v_name text; v_msg text := btrim(coalesce(p_invite_message, ''));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to open a workspace' USING errcode = '42501'; END IF;
  v_other := public.deal_workspace_source_counterpart(p_source_type, p_source_id, v_uid);
  IF v_other IS NULL THEN
    RAISE EXCEPTION 'Workspaces open from your own conversations and accepted introductions' USING errcode = '42501';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 3 AND 160 THEN
    RAISE EXCEPTION 'Give the workspace a title of 3 to 160 characters' USING errcode = '22023';
  END IF;
  IF char_length(v_msg) > 500 THEN RAISE EXCEPTION 'Keep the invitation message under 500 characters' USING errcode = '22023'; END IF;
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
  INSERT INTO public.deal_workspace_members (workspace_id, user_id, role, status, invited_by, responded_at, invite_message)
  VALUES (v_id, v_uid, 'owner', 'active', v_uid, now(), ''),
         (v_id, v_other, 'counterparty', 'invited', v_uid, NULL, v_msg);
  PERFORM public.deal_workspace_log(v_id, 'created', '', NULL, 'qualified');
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (v_other, 'workspace_invite', v_name || ' invited you to the workspace "' || left(btrim(p_title), 120) || '"', v_uid, '/app');
  RETURN jsonb_build_object('id', v_id, 'created', true);
END $$;
REVOKE ALL ON FUNCTION public.create_deal_workspace(text, uuid, text, text, text, bigint, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_deal_workspace(text, uuid, text, text, text, bigint, text, date, text) TO authenticated;

-- The whole pre-acceptance disclosure: inviter identity, room title, the explicit invitation message.
-- No scope, budget, due date, steps, proposals, history or roles.
DROP FUNCTION public.my_workspace_invitations();
CREATE FUNCTION public.my_workspace_invitations()
RETURNS TABLE (workspace_id uuid, title text, invited_by uuid, invited_by_name text, invite_message text, invited_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.workspace_id, w.title, m.invited_by, coalesce(nullif(btrim(p.name), ''), 'A member'), m.invite_message, m.created_at
    FROM public.deal_workspace_members m
    JOIN public.deal_workspaces w ON w.id = m.workspace_id
    LEFT JOIN public.profiles p ON p.id = m.invited_by
   WHERE m.user_id = auth.uid() AND m.status = 'invited' AND w.status NOT IN ('closed', 'cancelled')
   ORDER BY m.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.my_workspace_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_workspace_invitations() TO authenticated;

-- Self-only, atomic (a single conditional UPDATE), refused for declined/revoked invitations.
CREATE OR REPLACE FUNCTION public.respond_workspace_invite(p_ws uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_n int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  PERFORM 1 FROM public.deal_workspaces WHERE id = p_ws AND status NOT IN ('closed', 'cancelled') FOR SHARE;
  UPDATE public.deal_workspace_members
     SET status = CASE WHEN p_accept THEN 'active' ELSE 'declined' END, responded_at = now()
   WHERE workspace_id = p_ws AND user_id = v_uid AND status = 'invited'
     AND EXISTS (SELECT 1 FROM public.deal_workspaces w WHERE w.id = p_ws AND w.status NOT IN ('closed', 'cancelled'));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'No pending invitation' USING errcode = '42501'; END IF;
  IF p_accept THEN
    PERFORM public.deal_workspace_log(p_ws, 'invite_accepted');
    PERFORM public.deal_workspace_notify(p_ws, 'Your invitation to the workspace was accepted. Nothing is agreed yet and no roles are set.');
  ELSE
    PERFORM public.deal_workspace_log(p_ws, 'invite_declined');
  END IF;
END $$;

DROP FUNCTION public.invite_workspace_member(uuid, uuid);
CREATE FUNCTION public.invite_workspace_member(p_ws uuid, p_user uuid, p_message text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); w public.deal_workspaces; v_name text; v_msg text := btrim(coalesce(p_message, ''));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  IF NOT public.deal_workspace_role_may(public.deal_workspace_role(p_ws), 'manage_roster') THEN
    RAISE EXCEPTION 'Only the workspace owner can invite' USING errcode = '42501';
  END IF;
  IF char_length(v_msg) > 500 THEN RAISE EXCEPTION 'Keep the invitation message under 500 characters' USING errcode = '22023'; END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws;
  IF w.status IN ('closed', 'cancelled') THEN RAISE EXCEPTION 'This workspace is %', w.status USING errcode = '22023'; END IF;
  IF p_user IS DISTINCT FROM public.deal_workspace_source_counterpart(w.source_type, w.source_id, v_uid) THEN
    RAISE EXCEPTION 'Only the other person from the source can be invited' USING errcode = '42501';
  END IF;
  INSERT INTO public.deal_workspace_members (workspace_id, user_id, role, status, invited_by, invite_message)
  VALUES (p_ws, p_user, 'counterparty', 'invited', v_uid, v_msg)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
     SET status = 'invited', invited_by = v_uid, responded_at = NULL, invite_message = v_msg, party = NULL, party_accepted_at = NULL
   WHERE public.deal_workspace_members.status IN ('declined', 'removed');
  PERFORM public.deal_workspace_log(p_ws, 'invited');
  SELECT coalesce(nullif(btrim(name), ''), 'A member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, kind, text, actor_id, link)
  VALUES (p_user, 'workspace_invite', v_name || ' invited you to the workspace "' || left(w.title, 120) || '"', v_uid, '/app');
END $$;
REVOKE ALL ON FUNCTION public.invite_workspace_member(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_workspace_member(uuid, uuid, text) TO authenticated;

-- Removing or leaving ends the party assignment, and is refused once terms are agreed or while a
-- change awaits re-approval (cancel the workspace instead): approvals must never outlive their parties.
CREATE OR REPLACE FUNCTION public.remove_workspace_member(p_ws uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_role text := public.deal_workspace_role(p_ws); v_n int; w public.deal_workspaces;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING errcode = '42501'; END IF;
  IF NOT (public.deal_workspace_role_may(v_role, 'manage_roster') OR (p_user = v_uid AND public.deal_workspace_role_may(v_role, 'leave'))) THEN
    RAISE EXCEPTION 'Only the workspace owner can remove someone else' USING errcode = '42501';
  END IF;
  SELECT * INTO w FROM public.deal_workspaces WHERE id = p_ws FOR UPDATE;
  IF w.status IN ('agreed', 'in_progress', 'delivered', 'accepted') OR w.resume_status IS NOT NULL THEN
    RAISE EXCEPTION 'Roles are locked once terms are agreed. Cancel the workspace instead.' USING errcode = '22023';
  END IF;
  UPDATE public.deal_workspace_members SET status = 'removed', responded_at = now(), party = NULL, party_accepted_at = NULL
   WHERE workspace_id = p_ws AND user_id = p_user AND role = 'counterparty' AND status IN ('invited', 'active');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'Nobody to remove' USING errcode = '22023'; END IF;
  UPDATE public.deal_workspace_members SET party = NULL, party_accepted_at = NULL WHERE workspace_id = p_ws;
  UPDATE public.deal_workspace_proposals SET status = 'superseded', decided_at = now() WHERE workspace_id = p_ws AND status = 'submitted';
  UPDATE public.deal_workspaces SET party_proposal_by = NULL, party_proposal_buyer = NULL WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, CASE WHEN p_user = v_uid THEN 'left' ELSE 'removed' END);
END $$;

-- ── Buyer / provider assignment (needs both people) ────────────────────────────────────
CREATE FUNCTION public.propose_workspace_parties(p_ws uuid, p_expected integer, p_buyer uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'propose_parties', p_expected);
  IF w.status NOT IN ('qualified', 'proposal') OR w.resume_status IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.deal_workspace_proposals WHERE workspace_id = p_ws AND status = 'submitted') THEN
    RAISE EXCEPTION 'Roles cannot be reassigned while a proposal is open or after terms are agreed' USING errcode = '22023';
  END IF;
  IF (SELECT count(*) FROM public.deal_workspace_members WHERE workspace_id = p_ws AND status = 'active') <> 2 THEN
    RAISE EXCEPTION 'Both people must have accepted the invitation first' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.deal_workspace_members WHERE workspace_id = p_ws AND user_id = p_buyer AND status = 'active') THEN
    RAISE EXCEPTION 'The buyer must be one of the two participants' USING errcode = '22023';
  END IF;
  IF public.deal_workspace_parties_established(p_ws) AND EXISTS (SELECT 1 FROM public.deal_workspace_members WHERE workspace_id = p_ws AND user_id = p_buyer AND party = 'buyer') THEN
    RAISE EXCEPTION 'Those roles are already in place' USING errcode = '22023';
  END IF;
  UPDATE public.deal_workspaces SET party_proposal_by = auth.uid(), party_proposal_buyer = p_buyer WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'parties_proposed');
  PERFORM public.deal_workspace_notify(p_ws, 'Buyer and provider roles were proposed. Nothing changes until you accept them.');
END $$;
REVOKE ALL ON FUNCTION public.propose_workspace_parties(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_workspace_parties(uuid, integer, uuid) TO authenticated;

-- Only the person who did NOT propose can accept: nobody assigns a role to the other side alone.
CREATE FUNCTION public.accept_workspace_parties(p_ws uuid, p_expected integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'accept_parties', p_expected);
  IF w.party_proposal_by IS NULL THEN RAISE EXCEPTION 'No role assignment is waiting for you' USING errcode = '22023'; END IF;
  IF w.party_proposal_by = auth.uid() THEN RAISE EXCEPTION 'The other person has to accept the roles you proposed' USING errcode = '42501'; END IF;
  IF w.status NOT IN ('qualified', 'proposal') OR w.resume_status IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.deal_workspace_proposals WHERE workspace_id = p_ws AND status = 'submitted') THEN
    RAISE EXCEPTION 'Roles cannot be reassigned while a proposal is open or after terms are agreed' USING errcode = '22023';
  END IF;
  UPDATE public.deal_workspace_members SET party = CASE WHEN user_id = w.party_proposal_buyer THEN 'buyer' ELSE 'provider' END,
         party_accepted_at = now()
   WHERE workspace_id = p_ws AND status = 'active';
  UPDATE public.deal_workspaces SET party_proposal_by = NULL, party_proposal_buyer = NULL WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'parties_accepted');
  PERFORM public.deal_workspace_notify(p_ws, 'Buyer and provider roles were accepted.');
END $$;
REVOKE ALL ON FUNCTION public.accept_workspace_parties(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_parties(uuid, integer) TO authenticated;

CREATE FUNCTION public.decline_workspace_parties(p_ws uuid, p_expected integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'accept_parties', p_expected);
  IF w.party_proposal_by IS NULL THEN RAISE EXCEPTION 'No role assignment is pending' USING errcode = '22023'; END IF;
  UPDATE public.deal_workspaces SET party_proposal_by = NULL, party_proposal_buyer = NULL WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'parties_declined');
END $$;
REVOKE ALL ON FUNCTION public.decline_workspace_parties(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_workspace_parties(uuid, integer) TO authenticated;

-- ── Next action / steps: history keeps no payload text ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_workspace_next_action(p_ws uuid, p_expected integer, p_text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.deal_workspace_begin(p_ws, 'next_action', p_expected);
  UPDATE public.deal_workspaces SET next_action = btrim(coalesce(p_text, '')) WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'next_action');
END $$;

CREATE OR REPLACE FUNCTION public.add_workspace_step(p_ws uuid, p_text text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_role text := public.deal_workspace_role(p_ws);
BEGIN
  IF NOT public.deal_workspace_role_may(v_role, 'step') THEN RAISE EXCEPTION 'You cannot do that on this workspace' USING errcode = '42501'; END IF;
  IF (SELECT status FROM public.deal_workspaces WHERE id = p_ws) IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'This workspace is finished' USING errcode = '22023';
  END IF;
  INSERT INTO public.deal_workspace_steps (workspace_id, text, created_by) VALUES (p_ws, btrim(p_text), auth.uid()) RETURNING id INTO v_id;
  PERFORM public.deal_workspace_log(p_ws, 'step_added');
  RETURN v_id;
END $$;

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
  PERFORM public.deal_workspace_log(s.workspace_id, CASE WHEN p_done THEN 'step_done' ELSE 'step_reopened' END);
END $$;

-- ── Proposals: submit, approve (each party for itself), decline ────────────────────────
-- Re-approval workflow: submitting after agreement stops progression. The workspace moves to
-- "proposal", remembers the stage to resume, and keeps the previously approved terms in force.
-- Both parties approve the new version -> its terms apply and work resumes (a delivery made
-- against the old terms is superseded). Either party declines -> the old terms and stage resume.
CREATE OR REPLACE FUNCTION public.submit_workspace_proposal(
  p_ws uuid, p_expected integer, p_scope text, p_budget_cents bigint, p_currency text, p_due_on date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_ver integer; v_scope text := btrim(coalesce(p_scope, '')); v_cur text; v_resume text;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'submit_proposal', p_expected);
  IF w.status IN ('accepted', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'A % workspace takes no new proposal', w.status USING errcode = '22023';
  END IF;
  IF w.party_proposal_by IS NOT NULL THEN
    RAISE EXCEPTION 'Resolve the pending role assignment first' USING errcode = '22023';
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
  IF w.status IN ('agreed', 'in_progress', 'delivered') THEN v_resume := w.status; ELSE v_resume := w.resume_status; END IF;
  UPDATE public.deal_workspaces SET status = 'proposal', resume_status = v_resume WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'proposal_submitted', '', w.status, 'proposal', v_ver);
  PERFORM public.deal_workspace_notify(p_ws, 'Terms version ' || v_ver || ' is waiting for approval from both parties.');
  RETURN v_ver;
END $$;

DROP FUNCTION public.approve_workspace_proposal(uuid, integer, integer);
CREATE FUNCTION public.approve_workspace_proposal(p_ws uuid, p_expected integer, p_version integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; p public.deal_workspace_proposals; v_party text := public.deal_workspace_party(p_ws); v_n int; v_new text;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'approve_proposal', p_expected);
  IF w.status <> 'proposal' THEN RAISE EXCEPTION 'Nothing is awaiting approval' USING errcode = '22023'; END IF;
  SELECT * INTO p FROM public.deal_workspace_proposals WHERE workspace_id = p_ws AND version = p_version FOR UPDATE;
  IF p.version IS NULL OR p.status <> 'submitted' THEN RAISE EXCEPTION 'That version is no longer open for approval' USING errcode = '22023'; END IF;
  INSERT INTO public.deal_workspace_approvals (workspace_id, version, user_id, party) VALUES (p_ws, p_version, auth.uid(), v_party)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'That version was already approved by you or by your side' USING errcode = '22023'; END IF;
  IF (SELECT count(DISTINCT party) FROM public.deal_workspace_approvals WHERE workspace_id = p_ws AND version = p_version) < 2 THEN
    UPDATE public.deal_workspaces SET updated_at = now() WHERE id = p_ws;
    PERFORM public.deal_workspace_log(p_ws, 'proposal_party_approved', v_party, w.status, w.status, p_version);
    RETURN w.status;
  END IF;
  v_new := CASE coalesce(w.resume_status, 'agreed') WHEN 'delivered' THEN 'in_progress' ELSE coalesce(w.resume_status, 'agreed') END;
  UPDATE public.deal_workspace_proposals SET status = 'approved', decided_by = auth.uid(), decided_at = now() WHERE workspace_id = p_ws AND version = p_version;
  UPDATE public.deal_workspace_deliveries SET status = 'superseded', decided_at = now() WHERE workspace_id = p_ws AND status = 'submitted';
  UPDATE public.deal_workspaces SET scope = p.scope, budget_cents = p.budget_cents, currency = p.currency, due_on = p.due_on,
         scope_version = p.version, status = v_new, resume_status = NULL,
         delivered_at = CASE WHEN v_new = 'in_progress' THEN NULL ELSE delivered_at END
   WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'proposal_approved', 'both parties', w.status, v_new, p_version);
  PERFORM public.deal_workspace_notify(p_ws, 'Terms version ' || p_version || ' was approved by both parties.');
  RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.approve_workspace_proposal(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_workspace_proposal(uuid, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_workspace_proposal(p_ws uuid, p_expected integer, p_version integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_n int; v_new text;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'decline_proposal', p_expected);
  UPDATE public.deal_workspace_proposals SET status = 'declined', decided_by = auth.uid(), decided_at = now()
   WHERE workspace_id = p_ws AND version = p_version AND status = 'submitted';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'That version is no longer open' USING errcode = '22023'; END IF;
  v_new := coalesce(w.resume_status, w.status);
  UPDATE public.deal_workspaces SET status = v_new, resume_status = NULL WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'proposal_declined', '', w.status, v_new, p_version);
  PERFORM public.deal_workspace_notify(p_ws, 'Terms version ' || p_version || ' was declined.');
END $$;

-- ── Stage moves that need no counterpart; delivery has its own versioned records ───────
CREATE OR REPLACE FUNCTION public.transition_workspace_status(p_ws uuid, p_expected integer, p_to text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_action text;
BEGIN
  v_action := CASE p_to WHEN 'in_progress' THEN 'start_work' WHEN 'cancelled' THEN 'cancel' WHEN 'closed' THEN 'close' WHEN 'qualified' THEN 'move_stage' END;
  IF v_action IS NULL THEN
    RAISE EXCEPTION 'The stage "%" is reached through proposals, approvals, delivery or its acceptance', p_to USING errcode = '42501';
  END IF;
  w := public.deal_workspace_begin(p_ws, v_action, p_expected);
  IF p_to = 'in_progress' AND w.status <> 'agreed' THEN RAISE EXCEPTION 'Work starts from an agreed workspace' USING errcode = '22023'; END IF;
  IF p_to = 'qualified' AND w.resume_status IS NOT NULL THEN RAISE EXCEPTION 'Resolve the open change first' USING errcode = '22023'; END IF;
  IF NOT public.deal_workspace_transition_allowed(w.status, p_to) THEN
    RAISE EXCEPTION 'A % workspace cannot move to %', w.status, p_to USING errcode = '22023';
  END IF;
  IF p_to IN ('qualified', 'cancelled') THEN
    UPDATE public.deal_workspace_proposals SET status = 'superseded', decided_at = now() WHERE workspace_id = p_ws AND status = 'submitted';
  END IF;
  IF p_to = 'cancelled' THEN
    UPDATE public.deal_workspace_deliveries SET status = 'superseded', decided_at = now() WHERE workspace_id = p_ws AND status = 'submitted';
  END IF;
  UPDATE public.deal_workspaces SET status = p_to, resume_status = NULL WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'status', '', w.status, p_to);
END $$;

CREATE FUNCTION public.submit_workspace_delivery(p_ws uuid, p_expected integer, p_note text DEFAULT '')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_ver integer;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'submit_delivery', p_expected);
  IF w.status <> 'in_progress' THEN RAISE EXCEPTION 'Delivery is submitted from work in progress' USING errcode = '22023'; END IF;
  SELECT coalesce(max(version), 0) + 1 INTO v_ver FROM public.deal_workspace_deliveries WHERE workspace_id = p_ws;
  UPDATE public.deal_workspace_deliveries SET status = 'superseded', decided_at = now() WHERE workspace_id = p_ws AND status = 'submitted';
  INSERT INTO public.deal_workspace_deliveries (workspace_id, version, terms_version, note, submitted_by)
  VALUES (p_ws, v_ver, w.scope_version, left(btrim(coalesce(p_note, '')), 1000), auth.uid());
  UPDATE public.deal_workspaces SET status = 'delivered', delivered_at = now() WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'delivery_submitted', '', w.status, 'delivered', w.scope_version, v_ver);
  PERFORM public.deal_workspace_notify(p_ws, 'Delivery ' || v_ver || ' was submitted and is waiting for the buyer.');
  RETURN v_ver;
END $$;
REVOKE ALL ON FUNCTION public.submit_workspace_delivery(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_workspace_delivery(uuid, integer, text) TO authenticated;

-- Only the designated buyer; it names the delivery version and the agreed terms version it accepts,
-- so a stale acceptance (delivery replaced, terms changed) is refused. Not a payment.
DROP FUNCTION public.accept_workspace_delivery(uuid, integer);
CREATE FUNCTION public.accept_workspace_delivery(p_ws uuid, p_expected integer, p_delivery_version integer, p_terms_version integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; d public.deal_workspace_deliveries;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'accept_delivery', p_expected);
  IF w.status <> 'delivered' THEN RAISE EXCEPTION 'Only delivered work can be accepted' USING errcode = '22023'; END IF;
  SELECT * INTO d FROM public.deal_workspace_deliveries WHERE workspace_id = p_ws AND version = p_delivery_version FOR UPDATE;
  IF d.version IS NULL OR d.status <> 'submitted' THEN RAISE EXCEPTION 'That delivery is no longer open' USING errcode = '22023'; END IF;
  IF p_terms_version IS DISTINCT FROM w.scope_version OR d.terms_version <> w.scope_version THEN
    RAISE EXCEPTION 'The agreed terms changed since this delivery was made' USING errcode = '22023';
  END IF;
  UPDATE public.deal_workspace_deliveries SET status = 'accepted', decided_by = auth.uid(), decided_at = now() WHERE workspace_id = p_ws AND version = p_delivery_version;
  UPDATE public.deal_workspaces SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now(), accepted_delivery_version = p_delivery_version WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'delivery_accepted', '', w.status, 'accepted', w.scope_version, p_delivery_version);
  PERFORM public.deal_workspace_notify(p_ws, 'Delivery ' || p_delivery_version || ' was accepted by the buyer.');
END $$;
REVOKE ALL ON FUNCTION public.accept_workspace_delivery(uuid, integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_delivery(uuid, integer, integer, integer) TO authenticated;

CREATE FUNCTION public.reject_workspace_delivery(p_ws uuid, p_expected integer, p_delivery_version integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.deal_workspaces; v_n int;
BEGIN
  w := public.deal_workspace_begin(p_ws, 'reject_delivery', p_expected);
  IF w.status <> 'delivered' THEN RAISE EXCEPTION 'Only delivered work can be sent back' USING errcode = '22023'; END IF;
  UPDATE public.deal_workspace_deliveries SET status = 'rejected', decided_by = auth.uid(), decided_at = now()
   WHERE workspace_id = p_ws AND version = p_delivery_version AND status = 'submitted';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'That delivery is no longer open' USING errcode = '22023'; END IF;
  UPDATE public.deal_workspaces SET status = 'in_progress', delivered_at = NULL WHERE id = p_ws;
  PERFORM public.deal_workspace_log(p_ws, 'delivery_rejected', '', w.status, 'in_progress', w.scope_version, p_delivery_version);
  PERFORM public.deal_workspace_notify(p_ws, 'Delivery ' || p_delivery_version || ' was sent back for rework.');
END $$;
REVOKE ALL ON FUNCTION public.reject_workspace_delivery(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_workspace_delivery(uuid, integer, integer) TO authenticated;

-- ── Existing records ────────────────────────────────────────────────────────────────────
-- Workspaces created before this migration have no buyer/provider and no approvals from both
-- parties, so no consent is invented. Any that already sat in agreed / in_progress / delivered are
-- moved to "proposal" with the stage remembered, which blocks progression until roles are accepted
-- and both parties approve a terms version (or decline it, resuming the remembered stage).
-- accepted / closed / cancelled workspaces stay as they are. Callable once by the migration and by
-- the test suite; not executable by clients.
CREATE FUNCTION public.deal_workspace_reapproval_backfill() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer;
BEGIN
  ALTER TABLE public.deal_workspaces DISABLE TRIGGER deal_workspaces_guard;
  WITH moved AS (
    UPDATE public.deal_workspaces SET resume_status = status, status = 'proposal', row_version = row_version + 1, updated_at = now()
     WHERE status IN ('agreed', 'in_progress', 'delivered') AND resume_status IS NULL
    RETURNING id, scope_version
  ), ev AS (
    INSERT INTO public.deal_workspace_events (workspace_id, actor_id, kind, prev_status, new_status, scope_version)
    SELECT id, NULL, 'migrated_requires_reapproval', NULL, 'proposal', scope_version FROM moved
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM moved;
  ALTER TABLE public.deal_workspaces ENABLE TRIGGER deal_workspaces_guard;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.deal_workspace_reapproval_backfill() FROM PUBLIC, anon, authenticated;
SELECT public.deal_workspace_reapproval_backfill();
