-- =============================================
-- STEP 4: STORAGE BUCKETS + RLS POLICIES
-- Paste this in NEW Supabase SQL Editor
-- Run AFTER 03_rls_policies.sql
-- =============================================

-- 3 buckets create karo
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-images', 'product-images', true),
  ('store-assets', 'store-assets', true),
  ('product-media', 'product-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies — product-images
CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Auth upload product-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Auth update product-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Auth delete product-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images');

-- Storage RLS policies — store-assets
CREATE POLICY "Public read store-assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'store-assets');

CREATE POLICY "Auth upload store-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Auth update store-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'store-assets');

CREATE POLICY "Auth delete store-assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'store-assets');

-- Storage RLS policies — product-media
CREATE POLICY "Public read product-media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-media');

CREATE POLICY "Auth upload product-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-media');

CREATE POLICY "Auth update product-media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-media');

CREATE POLICY "Auth delete product-media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-media');
