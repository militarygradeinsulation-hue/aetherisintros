-- Synthetic-only prerequisites for the OBSERVED 2026-10-26 live schema.
-- Never deploy or journal this file. Historical Drizzle 0072/0075 create
-- referral_suggestions and syndication_members, but the later live-only 0100
-- reconciliation targets a different older syndication_room_members
-- structure. These compatibility objects exist in the observed Ask Intros
-- database, not in an unmodified source-history replay.
--
-- This fixture only fills that provenance gap for PGlite. It does not prove
-- the 0100 migration is safe to run against production or fix its permissions.
ALTER TABLE public.referral_suggestions
  ADD COLUMN IF NOT EXISTS for_member_id uuid,
  ADD COLUMN IF NOT EXISTS suggested_member_id uuid,
  ADD COLUMN IF NOT EXISTS score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS context jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS actioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.referral_requests
  ADD COLUMN IF NOT EXISTS target_member_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.syndication_rooms
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

CREATE TABLE IF NOT EXISTS public.syndication_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  room_id uuid NOT NULL REFERENCES public.syndication_rooms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'investor',
  commitment_amount numeric,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES public.profiles(id),
  joined_at timestamptz,
  UNIQUE (room_id, member_id)
);
ALTER TABLE public.syndication_room_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.syndication_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  room_id uuid NOT NULL REFERENCES public.syndication_rooms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_level text NOT NULL DEFAULT 'exploring',
  intended_amount numeric,
  notes text,
  follow_up_date timestamptz,
  UNIQUE (room_id, member_id)
);
ALTER TABLE public.syndication_interests ENABLE ROW LEVEL SECURITY;
