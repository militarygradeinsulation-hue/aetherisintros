CREATE POLICY "meeting_bg_own_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'meeting-backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "meeting_bg_own_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'meeting-backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "meeting_bg_own_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'meeting-backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);
ALTER TABLE public.autopilot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_ledger_entries ENABLE ROW LEVEL SECURITY;