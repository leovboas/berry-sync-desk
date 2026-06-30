CREATE TABLE IF NOT EXISTS public.chatwoot_events (
  id        BIGSERIAL PRIMARY KEY,
  event_type TEXT      NOT NULL,
  account_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chatwoot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read chatwoot_events"
  ON public.chatwoot_events FOR SELECT
  TO authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chatwoot_events;
