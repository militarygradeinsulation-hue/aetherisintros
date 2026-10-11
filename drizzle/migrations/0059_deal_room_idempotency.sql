-- Deal room creation is idempotent under concurrency.
-- One live room may exist for a source at a time. Closed/cancelled rooms release the source.
-- This closes the SELECT-then-INSERT race in create_deal_room without changing normal behavior.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.deal_rooms
     WHERE source_kind <> 'manual'
       AND source_id IS NOT NULL
       AND stage NOT IN ('closed', 'cancelled')
     GROUP BY source_kind, source_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enable deal-room idempotency: duplicate active source rooms already exist';
  END IF;
END $$;

CREATE UNIQUE INDEX deal_rooms_one_active_source_idx
  ON public.deal_rooms (source_kind, source_id)
  WHERE source_kind <> 'manual'
    AND source_id IS NOT NULL
    AND stage NOT IN ('closed', 'cancelled');
