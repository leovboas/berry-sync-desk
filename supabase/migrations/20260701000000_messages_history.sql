-- Unified message history per contact, across all Chatwoot conversations
CREATE TABLE public.messages_history (
  id                  bigserial PRIMARY KEY,
  chatwoot_message_id integer NOT NULL,
  conversation_id     integer NOT NULL,
  contact_phone       text NOT NULL,
  message_type        integer NOT NULL,  -- 0=incoming, 1=outgoing, 2=activity
  content             text,
  status              text,              -- sent, delivered, read, failed
  content_attributes  jsonb DEFAULT '{}'::jsonb,
  attachments         jsonb DEFAULT '[]'::jsonb,
  sender_name         text,
  sender_type         text,              -- user, contact, agent_bot
  created_at_chatwoot timestamptz NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_history_unique UNIQUE (chatwoot_message_id)
);

CREATE INDEX messages_history_phone_idx ON public.messages_history (contact_phone, created_at_chatwoot);
CREATE INDEX messages_history_conv_idx  ON public.messages_history (conversation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages_history TO authenticated;
GRANT ALL ON public.messages_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.messages_history_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.messages_history_id_seq TO service_role;

ALTER TABLE public.messages_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_history read all"   ON public.messages_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_history insert all" ON public.messages_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "messages_history update all" ON public.messages_history FOR UPDATE TO authenticated USING (true);
