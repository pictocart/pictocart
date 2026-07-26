-- Add created_by column to theme_master_projects
ALTER TABLE public.theme_master_projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create store_theme_snapshots table to store merchant customizations before theme switches
CREATE TABLE IF NOT EXISTS public.store_theme_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  theme_id text NOT NULL,
  theme jsonb,
  theme_tokens jsonb,
  resolved_storefront_manifest jsonb,
  settings jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(store_id, theme_id)
);

-- Enable RLS for store_theme_snapshots
ALTER TABLE public.store_theme_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual store owner read/write snapshots" ON public.store_theme_snapshots
  FOR ALL TO authenticated USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to update their own custom themes
CREATE POLICY "Authenticated users can update their own custom theme projects" ON public.theme_master_projects
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update their own custom theme versions" ON public.theme_master_versions
  FOR UPDATE TO authenticated USING (theme_id LIKE 'custom-theme-%') WITH CHECK (theme_id LIKE 'custom-theme-%');
