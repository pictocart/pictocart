
CREATE TABLE IF NOT EXISTS public.plan_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan subscription_plan NOT NULL UNIQUE,
  display_name text NOT NULL,
  price_inr integer NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 0,
  razorpay_plan_id text,
  trial_days integer NOT NULL DEFAULT 0,
  product_limit integer NOT NULL DEFAULT 10,
  theme_limit integer NOT NULL DEFAULT 1,
  custom_domain boolean NOT NULL DEFAULT false,
  razorpay_payments boolean NOT NULL DEFAULT false,
  shipping boolean NOT NULL DEFAULT false,
  blog boolean NOT NULL DEFAULT false,
  coupons boolean NOT NULL DEFAULT false,
  analytics boolean NOT NULL DEFAULT false,
  seo boolean NOT NULL DEFAULT false,
  email_branding boolean NOT NULL DEFAULT false,
  premium_themes boolean NOT NULL DEFAULT false,
  multi_domain boolean NOT NULL DEFAULT false,
  early_access boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated reads active plans"
  ON public.plan_configs FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Anon reads active plans"
  ON public.plan_configs FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Admins manage plan configs"
  ON public.plan_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_plan_configs_updated
  BEFORE UPDATE ON public.plan_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plan_configs (plan, display_name, price_inr, commission_percent, trial_days, product_limit, theme_limit, custom_domain, razorpay_payments, shipping, blog, coupons, analytics, seo, email_branding, premium_themes, multi_domain, early_access, sort_order)
VALUES
  ('free'::subscription_plan,    'Free',    0,    3.0, 0,  10,         1,          false, false, false, false, false, false, false, false, false, false, false, 1),
  ('starter'::subscription_plan, 'Starter', 499,  2.0, 0,  100,        3,          true,  true,  true,  true,  true,  true,  true,  false, false, false, false, 2),
  ('growth'::subscription_plan,  'Growth',  1499, 1.0, 14, 1000,       10,         true,  true,  true,  true,  true,  true,  true,  true,  true,  false, false, 3),
  ('scale'::subscription_plan,   'Scale',   4999, 0.0, 0,  2147483647, 2147483647, true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  4)
ON CONFLICT (plan) DO NOTHING;
