-- Migration: Fix infinite recursion in RLS policies for stores and store_staff

-- 1. Create a security definer helper function to check store ownership
CREATE OR REPLACE FUNCTION public.is_store_owner(p_store_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND user_id = p_user_id
  );
END;
$$;


-- 2. Drop the recursive policy on public.store_staff
DROP POLICY IF EXISTS "Store owners can manage staff" ON public.store_staff;


-- 3. Recreate the policy on public.store_staff using the helper function
CREATE POLICY "Store owners can manage staff"
  ON public.store_staff FOR ALL
  TO authenticated
  USING (
    public.is_store_owner(store_id, auth.uid())
  )
  WITH CHECK (
    public.is_store_owner(store_id, auth.uid())
  );
