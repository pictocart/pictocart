ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;
CREATE INDEX IF NOT EXISTS idx_customers_store_email ON public.customers (store_id, lower(email));
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_store_customer boolean := COALESCE((NEW.raw_user_meta_data->>'is_customer')::boolean, false);
  customer_store_slug text := NULLIF(NEW.raw_user_meta_data->>'store_slug', '');
  customer_store_id uuid;
  real_customer_email text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'customer_email', ''), NEW.email);
BEGIN
  IF is_store_customer THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT DO NOTHING;

    IF customer_store_slug IS NOT NULL THEN
      SELECT id INTO customer_store_id
      FROM public.stores
      WHERE slug = customer_store_slug
      LIMIT 1;

      IF customer_store_id IS NOT NULL THEN
        INSERT INTO public.customers (user_id, store_id, name, email, phone)
        VALUES (
          NEW.id,
          customer_store_id,
          NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
          real_customer_email,
          NULLIF(COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'), '')
        )
        ON CONFLICT (user_id, store_id) DO UPDATE SET
          name = COALESCE(public.customers.name, EXCLUDED.name),
          email = COALESCE(public.customers.email, EXCLUDED.email),
          phone = COALESCE(public.customers.phone, EXCLUDED.phone),
          updated_at = now();
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'seller')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'customer'::public.app_role
FROM auth.users u
WHERE COALESCE((u.raw_user_meta_data->>'is_customer')::boolean, false) = true
ON CONFLICT DO NOTHING;
DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND ur.role = 'seller'
  AND COALESCE((u.raw_user_meta_data->>'is_customer')::boolean, false) = true
  AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.user_id = u.id);
DELETE FROM public.profiles p
USING auth.users u
WHERE p.user_id = u.id
  AND COALESCE((u.raw_user_meta_data->>'is_customer')::boolean, false) = true
  AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.user_id = u.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'admin'
  );
INSERT INTO public.customers (user_id, store_id, name, email, phone)
SELECT
  u.id,
  s.id,
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'customer_email', ''), u.email),
  NULLIF(COALESCE(u.phone, u.raw_user_meta_data->>'phone'), '')
FROM auth.users u
JOIN public.stores s ON s.slug = NULLIF(u.raw_user_meta_data->>'store_slug', '')
WHERE COALESCE((u.raw_user_meta_data->>'is_customer')::boolean, false) = true
ON CONFLICT (user_id, store_id) DO UPDATE SET
  name = COALESCE(public.customers.name, EXCLUDED.name),
  email = COALESCE(public.customers.email, EXCLUDED.email),
  phone = COALESCE(public.customers.phone, EXCLUDED.phone),
  updated_at = now();
INSERT INTO public.customers (user_id, store_id, name, email, phone)
SELECT
  u.id,
  s.id,
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  u.email,
  NULLIF(COALESCE(u.phone, u.raw_user_meta_data->>'phone'), '')
FROM auth.users u
JOIN public.stores s ON s.slug = 'indilipi'
WHERE lower(u.email) = 'antarikshadvertising@gmail.com'
ON CONFLICT (user_id, store_id) DO UPDATE SET
  name = COALESCE(public.customers.name, EXCLUDED.name),
  email = COALESCE(public.customers.email, EXCLUDED.email),
  phone = COALESCE(public.customers.phone, EXCLUDED.phone),
  updated_at = now();
