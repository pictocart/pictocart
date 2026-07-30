-- Migration: Prevent the same user (email) from being both a merchant and a partner
--
-- This adds database-level enforcement so that even direct API calls cannot
-- bypass the business rule: one user cannot own a store AND be a partner.
-- The frontend already blocks this in PartnersSignup.tsx and Onboarding.tsx;
-- these triggers are the backend safety net.

-- ================================================================
-- TRIGGER 1: Prevent partner insert if user already owns a store
-- ================================================================
CREATE OR REPLACE FUNCTION public.prevent_partner_if_merchant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check by user_id if available
  IF NEW.user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.stores WHERE user_id = NEW.user_id LIMIT 1) THEN
      RAISE EXCEPTION 'You already own a store. A merchant account cannot also be a partner account. Please use a different email to register as a partner.';
    END IF;
  END IF;

  -- Also check by email (catches cases where user_id is null or different
  -- from the auth users id, e.g. direct API inserts)
  IF NEW.email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.stores WHERE user_id = v_user_id LIMIT 1) THEN
        RAISE EXCEPTION 'This email already owns a store. A merchant account cannot also be a partner account. Please use a different email to register as a partner.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_prevent_partner_if_merchant
  BEFORE INSERT ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_partner_if_merchant();

-- ================================================================
-- TRIGGER 2: Prevent store creation if user is already a partner
--            (unless the store is being created on behalf of a client,
--             i.e. owned_by_partner_id IS NOT NULL)
-- ================================================================
CREATE OR REPLACE FUNCTION public.prevent_store_if_partner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only block if:
  --   a) The user is a partner, AND
  --   b) The store is NOT being built for a client (no owned_by_partner_id)
  -- Partners building stores for clients (NewClientStore flow) set
  -- owned_by_partner_id and are allowed through.
  IF NEW.owned_by_partner_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.partners WHERE user_id = NEW.user_id LIMIT 1) THEN
      RAISE EXCEPTION 'You are already registered as a partner. A partner account cannot also own a store. Please use a different email to create a merchant account.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_prevent_store_if_partner
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_store_if_partner();

