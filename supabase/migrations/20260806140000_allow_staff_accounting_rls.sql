-- Allow staff members to view and insert into accounting tables (suppliers, purchase_bills, expenses, expense_categories, khata_entries, inventory_movements, accounts_settings)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['suppliers','purchase_bills','expenses','expense_categories','khata_entries','inventory_movements']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner_all_%1$s" ON public.%1$s', t);
    EXECUTE format($p$CREATE POLICY "owner_all_%1$s" ON public.%1$s
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.stores s WHERE s.id = %1$s.store_id AND s.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = %1$s.store_id AND ss.user_id = auth.uid())
        OR public.has_role(auth.uid(),'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.stores s WHERE s.id = %1$s.store_id AND s.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = %1$s.store_id AND ss.user_id = auth.uid())
        OR public.has_role(auth.uid(),'admin')
      )$p$, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "owner_all_accounts_settings" ON public.accounts_settings;
CREATE POLICY "owner_all_accounts_settings" ON public.accounts_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = accounts_settings.store_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = accounts_settings.store_id AND ss.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = accounts_settings.store_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.store_staff ss WHERE ss.store_id = accounts_settings.store_id AND ss.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );
