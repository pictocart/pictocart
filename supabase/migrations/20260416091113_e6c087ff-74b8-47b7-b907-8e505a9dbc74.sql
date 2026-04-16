-- Subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'premium');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'incomplete');

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  razorpay_subscription_id TEXT,
  razorpay_plan_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Store owners can view own subscription
CREATE POLICY "Store owners can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stores WHERE stores.id = subscriptions.store_id AND stores.user_id = auth.uid()
  ));

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Subscription events (billing history)
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  razorpay_event_id TEXT,
  amount NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own events"
  ON public.subscription_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.stores st ON st.id = s.store_id
    WHERE s.id = subscription_events.subscription_id AND st.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all events"
  ON public.subscription_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create free subscription for existing stores
INSERT INTO public.subscriptions (store_id, plan, status)
SELECT id, 'free', 'active' FROM public.stores
ON CONFLICT (store_id) DO NOTHING;

-- Trigger to auto-create free subscription on new store
CREATE OR REPLACE FUNCTION public.handle_new_store_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (store_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (store_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_store_created_subscription
  AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_store_subscription();

-- Updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();