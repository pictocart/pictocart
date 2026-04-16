
-- 1. Create store_secrets table (owner-only)
CREATE TABLE IF NOT EXISTS public.store_secrets (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  razorpay_key_id text,
  razorpay_key_secret text,
  razorpay_test_mode boolean DEFAULT true,
  delhivery_api_token text,
  delhivery_test_mode boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners manage own secrets"
  ON public.store_secrets
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_secrets.store_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_secrets.store_id AND s.user_id = auth.uid()));

CREATE TRIGGER update_store_secrets_updated_at
  BEFORE UPDATE ON public.store_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Migrate existing credentials from stores.settings -> store_secrets
INSERT INTO public.store_secrets (store_id, razorpay_key_id, razorpay_key_secret, razorpay_test_mode, delhivery_api_token, delhivery_test_mode)
SELECT
  s.id,
  NULLIF(s.settings->'razorpay'->>'key_id', ''),
  NULLIF(s.settings->'razorpay'->>'key_secret', ''),
  COALESCE((s.settings->'razorpay'->>'test_mode')::boolean, true),
  NULLIF(s.settings->'shipping'->>'api_token', ''),
  COALESCE((s.settings->'shipping'->>'test_mode')::boolean, true)
FROM public.stores s
WHERE (s.settings ? 'razorpay') OR (s.settings ? 'shipping')
ON CONFLICT (store_id) DO NOTHING;

-- 3. Strip sensitive fields from public stores.settings
UPDATE public.stores
SET settings =
  CASE
    WHEN settings ? 'razorpay' THEN
      jsonb_set(settings, '{razorpay}',
        (settings->'razorpay') - 'key_secret' - 'key_id'
        || jsonb_build_object('connected', (settings->'razorpay'->>'key_id') IS NOT NULL AND (settings->'razorpay'->>'key_id') <> '')
      )
    ELSE settings
  END
WHERE settings ? 'razorpay';

UPDATE public.stores
SET settings = jsonb_set(settings, '{shipping}', (settings->'shipping') - 'api_token')
WHERE settings ? 'shipping' AND settings->'shipping' ? 'api_token';

-- 4. Storage: tighten INSERT policies so users can only upload to their own folder
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload store assets" ON storage.objects;

CREATE POLICY "Users can upload to own product-images folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to own store-assets folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-assets'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 5. Stop leaking orders PII over Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
