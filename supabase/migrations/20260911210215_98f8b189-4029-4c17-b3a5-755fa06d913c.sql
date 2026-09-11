drop policy if exists "ask author reads responses" on public.ask_responses;
create policy "ask author reads responses" on public.ask_responses for select to authenticated
  using (exists (select 1 from public.asks a where a.id = ask_responses.ask_id and a.author_id = auth.uid()));