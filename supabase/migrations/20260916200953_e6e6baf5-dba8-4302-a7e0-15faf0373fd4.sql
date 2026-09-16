create policy "proof owner uploads own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-proof' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "proof owner reads own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-proof'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')));

create policy "proof owner removes own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'verification-proof' and (storage.foldername(name))[1] = auth.uid()::text);