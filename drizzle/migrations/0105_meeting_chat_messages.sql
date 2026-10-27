CREATE TABLE IF NOT EXISTS public.meeting_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meeting_chat_messages_meeting_idx ON public.meeting_chat_messages(meeting_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.meeting_chat_messages TO authenticated;
GRANT ALL ON public.meeting_chat_messages TO service_role;
ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read meeting chat" ON public.meeting_chat_messages FOR SELECT TO authenticated USING (public.is_meeting_participant(meeting_id));
CREATE POLICY "participants send meeting chat" ON public.meeting_chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_meeting_participant(meeting_id));
CREATE POLICY "senders delete own meeting chat" ON public.meeting_chat_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_chat_messages;
ALTER TABLE public.professional_boundary_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reciprocity_signals ENABLE ROW LEVEL SECURITY;