
CREATE TABLE IF NOT EXISTS public.provisioning_budget (
  id integer PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  hourly_inr_cap numeric NOT NULL DEFAULT 50,
  daily_inr_cap numeric NOT NULL DEFAULT 500,
  per_job_inr_estimate numeric NOT NULL DEFAULT 2,
  current_hour_spent_inr numeric NOT NULL DEFAULT 0,
  current_day_spent_inr numeric NOT NULL DEFAULT 0,
  hour_window_started_at timestamptz NOT NULL DEFAULT now(),
  day_window_started_at timestamptz NOT NULL DEFAULT now(),
  paused_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provisioning_budget_singleton CHECK (id = 1)
);

INSERT INTO public.provisioning_budget (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.provisioning_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage provisioning budget" ON public.provisioning_budget;
CREATE POLICY "Admins manage provisioning budget"
  ON public.provisioning_budget
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
