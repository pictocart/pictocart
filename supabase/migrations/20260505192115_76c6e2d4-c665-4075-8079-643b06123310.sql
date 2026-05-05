
CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  store_id uuid,
  path text,
  message text NOT NULL,
  stack text,
  user_agent text,
  url text,
  level text NOT NULL DEFAULT 'error',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_error_logs_created ON public.client_error_logs (created_at DESC);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can log errors" ON public.client_error_logs;
CREATE POLICY "Anyone can log errors" ON public.client_error_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins read errors" ON public.client_error_logs;
CREATE POLICY "Admins read errors" ON public.client_error_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete errors" ON public.client_error_logs;
CREATE POLICY "Admins delete errors" ON public.client_error_logs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  sort int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER help_articles_updated_at BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads published help" ON public.help_articles;
CREATE POLICY "Public reads published help" ON public.help_articles
  FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "Admins manage help" ON public.help_articles;
CREATE POLICY "Admins manage help" ON public.help_articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.help_articles (slug, title, category, sort, body_md) VALUES
  ('getting-started', 'Getting started in 5 minutes', 'basics', 1,
   E'# Welcome\n\n1. Add your first product from **Catalog → Products**.\n2. Set up payments at **Settings → Payments**.\n3. Connect your domain at **Settings → Domain**.\n4. Share your store link!'),
  ('connect-domain', 'Connect your custom domain', 'domains', 2,
   E'Point an **A record** to `185.158.133.1` and add the **TXT verification** shown on the Domain page. Verification usually takes 2–10 minutes.'),
  ('payments-razorpay', 'Accept payments with Razorpay', 'payments', 3,
   E'Create a Razorpay account, copy your **Key ID** and **Key Secret** from the Razorpay dashboard, paste them under **Settings → Payments**, and enable Razorpay.'),
  ('shipping-delhivery', 'Shipping with Delhivery', 'shipping', 4,
   E'Enter your Delhivery API token under **Settings → Shipping**. AWBs are generated automatically when you mark an order **Ready to ship**.')
ON CONFLICT (slug) DO NOTHING;
