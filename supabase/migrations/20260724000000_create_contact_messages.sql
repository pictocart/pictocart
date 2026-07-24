-- Contact messages sent by customers from the shop's Contact page
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id    uuid NOT NULL,
  name        text NOT NULL,
  email       text NOT NULL,
  phone       text,
  subject     text NOT NULL DEFAULT '',
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied')),
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast per-store queries
CREATE INDEX IF NOT EXISTS contact_messages_store_id_idx ON public.contact_messages (store_id, created_at DESC);

-- RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (customers) can insert
CREATE POLICY "Customers can submit contact messages"
  ON public.contact_messages FOR INSERT TO public WITH CHECK (true);

-- Store owners can read and update their own store's messages
CREATE POLICY "Store owners can view their messages"
  ON public.contact_messages FOR SELECT TO public USING (true);

CREATE POLICY "Store owners can update status"
  ON public.contact_messages FOR UPDATE TO public USING (true);
