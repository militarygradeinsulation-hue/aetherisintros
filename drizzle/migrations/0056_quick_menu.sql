-- Quick Menu: the actions a member sees when they right-click in the app, in the order they
-- chose. One row per member, private to them, removed with the account.
CREATE TABLE public.member_quick_menu (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  items text[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(items) <= 12 AND array_position(items, NULL) IS NULL),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Item ids are short slugs; the app ignores any it does not recognise.
ALTER TABLE public.member_quick_menu ADD CONSTRAINT member_quick_menu_item_format
  CHECK (array_to_string(items, ',') ~ '^([a-z][a-z0-9-]{1,31}(,[a-z][a-z0-9-]{1,31})*)?$');
REVOKE ALL ON public.member_quick_menu FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_quick_menu TO service_role;
GRANT SELECT, DELETE ON public.member_quick_menu TO authenticated;
GRANT INSERT (items), UPDATE (items, updated_at) ON public.member_quick_menu TO authenticated;
ALTER TABLE public.member_quick_menu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quick menu read" ON public.member_quick_menu FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own quick menu create" ON public.member_quick_menu FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own quick menu change" ON public.member_quick_menu FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own quick menu reset" ON public.member_quick_menu FOR DELETE TO authenticated USING (user_id = auth.uid());
