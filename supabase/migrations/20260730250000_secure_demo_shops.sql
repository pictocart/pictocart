-- Migration: Secure Demo Shops (Block Password Changes, Domain/Slug modifications, and Custom Payments)

-- 1. Create function to block password updates for demo accounts in auth.users
CREATE OR REPLACE FUNCTION public.block_demo_password_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user is a demo shop account
  IF EXISTS (
    SELECT 1 
    FROM public.partner_demo_shops 
    WHERE LOWER(shop_id) = LOWER(OLD.email)
  ) THEN
    -- Block if the password hash is being updated
    IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
      RAISE EXCEPTION 'Password changes are disabled for demo accounts.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to auth.users
DROP TRIGGER IF EXISTS trg_block_demo_password_change ON auth.users;
CREATE TRIGGER trg_block_demo_password_change
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.block_demo_password_change();


-- 3. Create function to protect stores table (block delete, slug changes, domain changes, or transfer)
CREATE OR REPLACE FUNCTION public.protect_demo_stores()
RETURNS TRIGGER AS $$
DECLARE
  v_is_demo BOOLEAN;
  v_owner_email TEXT;
  v_target_user_id UUID;
BEGIN
  -- Determine which user ID to check
  IF TG_OP = 'DELETE' THEN
    v_target_user_id := OLD.user_id;
  ELSE
    v_target_user_id := OLD.user_id;
  END IF;

  -- Get email of owner
  SELECT email INTO v_owner_email FROM auth.users WHERE id = v_target_user_id;

  -- Check if owner is a demo shop
  SELECT EXISTS (
    SELECT 1 FROM public.partner_demo_shops WHERE LOWER(shop_id) = LOWER(v_owner_email)
  ) INTO v_is_demo;

  IF v_is_demo THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Demo stores cannot be deleted.';
    ELSIF TG_OP = 'UPDATE' THEN
      -- Prevent transferring user_id ownership
      IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'Ownership of a demo store cannot be transferred.';
      END IF;
      -- Prevent modifying slug
      IF OLD.slug IS DISTINCT FROM NEW.slug THEN
        RAISE EXCEPTION 'Changing the URL slug of a demo store is not allowed.';
      END IF;
      -- Prevent modifying custom domain
      IF OLD.custom_domain IS DISTINCT FROM NEW.custom_domain THEN
        RAISE EXCEPTION 'Connecting a custom domain to a demo store is not allowed.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger to public.stores
DROP TRIGGER IF EXISTS trg_protect_demo_stores ON public.stores;
CREATE TRIGGER trg_protect_demo_stores
  BEFORE UPDATE OR DELETE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_demo_stores();


-- 5. Create function to protect payment credentials for demo stores
CREATE OR REPLACE FUNCTION public.protect_demo_secrets()
RETURNS TRIGGER AS $$
DECLARE
  v_is_demo BOOLEAN;
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Find owner of the store
  SELECT s.user_id INTO v_user_id 
  FROM public.stores s 
  WHERE s.id = COALESCE(NEW.store_id, OLD.store_id);

  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    
    SELECT EXISTS (
      SELECT 1 FROM public.partner_demo_shops WHERE LOWER(shop_id) = LOWER(v_email)
    ) INTO v_is_demo;

    IF v_is_demo THEN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Demo store credentials cannot be deleted.';
      ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Prevent changing key_id or key_secret to connect custom payments
        IF (OLD.razorpay_key_id IS DISTINCT FROM NEW.razorpay_key_id AND NEW.razorpay_key_id <> '') OR 
           (OLD.razorpay_key_secret IS DISTINCT FROM NEW.razorpay_key_secret AND NEW.razorpay_key_secret <> '') THEN
          RAISE EXCEPTION 'Modifying payment credentials on demo stores is not allowed.';
        END IF;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger to public.store_secrets
DROP TRIGGER IF EXISTS trg_protect_demo_secrets ON public.store_secrets;
CREATE TRIGGER trg_protect_demo_secrets
  BEFORE INSERT OR UPDATE OR DELETE ON public.store_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_demo_secrets();
