CREATE TABLE IF NOT EXISTS public.trial_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  store_id uuid NOT NULL,
  stage text NOT NULL CHECK (stage IN ('day_3', 'day_1')),
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, stage)
);

ALTER TABLE public.trial_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view trial reminders"
ON public.trial_reminders_sent FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_trial_reminders_subscription ON public.trial_reminders_sent(subscription_id);