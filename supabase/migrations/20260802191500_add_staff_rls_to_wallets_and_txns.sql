-- 1. Drop existing policies for SELECT and UPDATE on ai_credit_wallets
DROP POLICY IF EXISTS "Owners view own wallet" ON public.ai_credit_wallets;
DROP POLICY IF EXISTS "Owners update own wallet prefs" ON public.ai_credit_wallets;

-- Recreate policies for SELECT and UPDATE on ai_credit_wallets
CREATE POLICY "Owners and staff view own wallet" ON public.ai_credit_wallets 
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = ai_credit_wallets.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Owners and staff update own wallet prefs" ON public.ai_credit_wallets 
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = ai_credit_wallets.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );

-- 2. Drop existing policy for SELECT on ai_credit_transactions
DROP POLICY IF EXISTS "Owners view own txns" ON public.ai_credit_transactions;

-- Recreate policy for SELECT on ai_credit_transactions
CREATE POLICY "Owners and staff view own txns" ON public.ai_credit_transactions 
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = ai_credit_transactions.store_id 
      AND (
        s.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff ss 
          WHERE ss.store_id = s.id 
          AND ss.user_id = auth.uid()
        )
      )
    )
  );
