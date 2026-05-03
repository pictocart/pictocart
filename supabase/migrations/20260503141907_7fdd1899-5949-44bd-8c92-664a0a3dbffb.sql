
ALTER TABLE public.provision_requests
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.theme_master_projects
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS theme_master_default_per_category
  ON public.theme_master_projects (category)
  WHERE is_default = true AND is_active = true;

CREATE TABLE IF NOT EXISTS public.provision_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.provision_requests(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL DEFAULT 'info',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provision_job_logs_request_idx
  ON public.provision_job_logs(request_id, created_at DESC);

ALTER TABLE public.provision_job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read job logs"
  ON public.provision_job_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages job logs"
  ON public.provision_job_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Store owners read own job logs"
  ON public.provision_job_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.provision_requests pr
    JOIN public.stores s ON s.id = pr.store_id
    WHERE pr.id = provision_job_logs.request_id AND s.user_id = auth.uid()
  ));
