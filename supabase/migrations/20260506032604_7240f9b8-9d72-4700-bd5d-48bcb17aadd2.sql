CREATE POLICY "Owners insert own wallet"
ON public.ai_credit_wallets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = ai_credit_wallets.store_id AND s.user_id = auth.uid()
  )
);