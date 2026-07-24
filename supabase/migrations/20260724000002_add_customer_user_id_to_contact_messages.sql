-- Link contact messages to authenticated customers so they can view their history
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contact_messages_customer_user_id_idx
  ON public.contact_messages (customer_user_id, created_at DESC);
