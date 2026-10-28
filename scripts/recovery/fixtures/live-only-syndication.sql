-- SYNTHETIC TEST FIXTURE ONLY — DO NOT APPLY AS A PRODUCTION MIGRATION.
--
-- The live Ask Intros database has syndication_room_members and
-- syndication_interests. The frozen Drizzle source migration 0075 instead
-- creates syndication_members, and migration 0100 assumes the live table
-- names. This fixture models *only* the missing legacy tables/columns before
-- executing the unchanged 0100 migration in the offline security suite.
--
-- This is a compatibility test against a known live-catalog difference,
-- not proof that pristine historical source migrations replay successfully.
ALTER TABLE public.syndication_rooms
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.syndication_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.syndication_rooms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'investor',
  commitment_amount numeric,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, member_id)
);
ALTER TABLE public.syndication_room_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.syndication_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.syndication_rooms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_level text NOT NULL DEFAULT 'exploring',
  intended_amount numeric,
  notes text,
  follow_up_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, member_id)
);
ALTER TABLE public.syndication_interests ENABLE ROW LEVEL SECURITY;
