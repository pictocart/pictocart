CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_store_customer boolean := COALESCE((NEW.raw_user_meta_data->>'is_customer')::boolean, false);
  customer_store_slug text := NULLIF(NEW.raw_user_meta_data->>'store_slug', '');
  customer_store_id uuid;
  real_customer_email text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'customer_email', ''), NEW.email);
  resolved_name text := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    TRIM(CONCAT_WS(' ',
      NEW.raw_user_meta_data->>'given_name',
      NEW.raw_user_meta_data->>'family_name'
    )),
    ''
  )), '');
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
          resolved_name,
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
  VALUES (NEW.id, COALESCE(resolved_name, ''))
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'seller')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;