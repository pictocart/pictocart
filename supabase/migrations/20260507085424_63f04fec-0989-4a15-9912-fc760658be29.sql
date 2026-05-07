-- Push tokens for seller mobile app
CREATE TABLE IF NOT EXISTS public.seller_push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  device_id TEXT,
  app_version TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_seller_push_tokens_user ON public.seller_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_push_tokens_store ON public.seller_push_tokens(store_id);

ALTER TABLE public.seller_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own push tokens"
  ON public.seller_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers insert own push tokens"
  ON public.seller_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers update own push tokens"
  ON public.seller_push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers delete own push tokens"
  ON public.seller_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_seller_push_tokens_updated_at
  BEFORE UPDATE ON public.seller_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();