
-- 1. theme_master_projects
CREATE TABLE public.theme_master_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  lovable_project_url text,
  remix_url text,
  client_patch_prompt text NOT NULL DEFAULT '',
  preview_image text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.theme_master_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage theme masters" ON public.theme_master_projects
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read active theme masters" ON public.theme_master_projects
  FOR SELECT TO authenticated USING (is_active = true);
CREATE TRIGGER trg_tmp_updated BEFORE UPDATE ON public.theme_master_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. provision_requests
CREATE TABLE public.provision_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  theme_master_id uuid REFERENCES public.theme_master_projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  client_patch_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_patch_prompt text DEFAULT '',
  new_project_url text,
  new_project_subdomain text,
  notes text,
  error text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prov_status ON public.provision_requests(status);
CREATE INDEX idx_prov_store ON public.provision_requests(store_id);
ALTER TABLE public.provision_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage provision requests" ON public.provision_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Store owners read own provision requests" ON public.provision_requests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = provision_requests.store_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Service role manages provision requests" ON public.provision_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_prov_updated BEFORE UPDATE ON public.provision_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. store_content
CREATE TABLE public.store_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  section_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, section_key)
);
CREATE INDEX idx_store_content_store ON public.store_content(store_id);
ALTER TABLE public.store_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners manage own content" ON public.store_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_content.store_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_content.store_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Public reads content of published stores" ON public.store_content
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_content.store_id AND s.is_published = true)
  );
CREATE TRIGGER trg_store_content_updated BEFORE UPDATE ON public.store_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
