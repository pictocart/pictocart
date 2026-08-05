DROP POLICY IF EXISTS "Store owners can view subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Store owners, staff, and admins can view subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Users can view own newsletter subscription" ON public.newsletter_subscribers;

CREATE POLICY "Store owners, staff, and admins can view subscribers" ON public.newsletter_subscribers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = newsletter_subscribers.store_id 
    AND (
      stores.user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM store_staff 
        WHERE store_staff.store_id = stores.id AND store_staff.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view own newsletter subscription" ON public.newsletter_subscribers FOR SELECT
USING (auth.jwt()->>'email' = email);

-- Secure RPC function to check subscription status
CREATE OR REPLACE FUNCTION public.check_newsletter_subscription(p_store_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.newsletter_subscribers 
    WHERE store_id = p_store_id 
      AND LOWER(email) = LOWER(TRIM(p_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_newsletter_subscription(uuid, text) TO anon, authenticated;
