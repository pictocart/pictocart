
-- 1. Tenancy guard trigger on auth.users
CREATE OR REPLACE FUNCTION public.guard_customer_tenant_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_store_customer boolean := COALESCE((NEW.raw_user_meta_data->>'is_customer')::boolean, false);
  store_slug text := NULLIF(NEW.raw_user_meta_data->>'store_slug', '');
  expected_suffix text;
BEGIN
  IF is_store_customer THEN
    IF store_slug IS NULL THEN
      RAISE EXCEPTION 'Customer signup requires store_slug metadata';
    END IF;
    expected_suffix := '@' || store_slug || '.customers.pictocart.in';
    IF NEW.email IS NULL OR position(expected_suffix in lower(NEW.email)) = 0 THEN
      RAISE EXCEPTION 'Customer signup must use tenant-aliased email for store %', store_slug;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_customer_tenant_email_trg ON auth.users;
CREATE TRIGGER guard_customer_tenant_email_trg
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_customer_tenant_email();

-- 2. Ensure handle_new_user trigger is wired
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill: customer rows for tenant-aliased users that lack one
INSERT INTO public.customers (user_id, store_id, name, email, phone)
SELECT u.id, s.id,
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'customer_email', ''), u.email),
  NULLIF(COALESCE(u.phone, u.raw_user_meta_data->>'phone'), '')
FROM auth.users u
JOIN public.stores s
  ON s.slug = NULLIF(u.raw_user_meta_data->>'store_slug', '')
WHERE COALESCE((u.raw_user_meta_data->>'is_customer')::boolean, false) = true
  AND u.email LIKE '%.customers.pictocart.in'
ON CONFLICT (user_id, store_id) DO NOTHING;

-- 4. Throwaway QA storefronts (idempotent)
INSERT INTO public.stores (user_id, name, slug, description, theme, settings, is_published, onboarding_step)
SELECT '8cd4e055-b538-4c9d-943c-56ac3f9240fb'::uuid,
       'QA Test Store A',
       'qa-test-store-a',
       'Throwaway store for multi-tenant auth testing.',
       '{"theme_id":"bazaar","name":"bazaar"}'::jsonb,
       '{}'::jsonb,
       true,
       7
WHERE NOT EXISTS (SELECT 1 FROM public.stores WHERE slug = 'qa-test-store-a');

INSERT INTO public.stores (user_id, name, slug, description, theme, settings, is_published, onboarding_step)
SELECT '8cd4e055-b538-4c9d-943c-56ac3f9240fb'::uuid,
       'QA Test Store B',
       'qa-test-store-b',
       'Throwaway store for multi-tenant auth testing.',
       '{"theme_id":"bazaar","name":"bazaar"}'::jsonb,
       '{}'::jsonb,
       true,
       7
WHERE NOT EXISTS (SELECT 1 FROM public.stores WHERE slug = 'qa-test-store-b');
