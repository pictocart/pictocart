
CREATE TABLE public.merchant_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mct_user ON public.merchant_chat_threads(user_id, last_message_at DESC);

CREATE TABLE public.merchant_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.merchant_chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mcm_thread ON public.merchant_chat_messages(thread_id, created_at);

ALTER TABLE public.merchant_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own threads select" ON public.merchant_chat_threads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own threads insert" ON public.merchant_chat_threads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own threads update" ON public.merchant_chat_threads FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own threads delete" ON public.merchant_chat_threads FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own messages select" ON public.merchant_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchant_chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE POLICY "own messages insert" ON public.merchant_chat_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchant_chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

CREATE TRIGGER trg_mct_updated BEFORE UPDATE ON public.merchant_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
