CREATE POLICY "dm participants read files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dm-files' AND public.is_uuid_text((storage.foldername(name))[1]) AND EXISTS (
  SELECT 1 FROM public.dm_threads t WHERE t.id::text = (storage.foldername(name))[1] AND auth.uid() IN (t.member_a, t.member_b)));
CREATE POLICY "dm participants upload files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dm-files' AND owner = auth.uid() AND public.is_live_member() AND public.is_uuid_text((storage.foldername(name))[1]) AND EXISTS (
  SELECT 1 FROM public.dm_threads t WHERE t.id::text = (storage.foldername(name))[1] AND auth.uid() IN (t.member_a, t.member_b)));