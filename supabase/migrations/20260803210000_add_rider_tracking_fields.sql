-- 1. Add rider assignment and tracking columns to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rider_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rider_lat numeric,
  ADD COLUMN IF NOT EXISTS rider_lng numeric;

-- 2. Add constraint checks on rider status
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_rider_status,
  ADD CONSTRAINT chk_rider_status CHECK (rider_status IN ('pending', 'accepted', 'picked_up', 'delivered'));

-- 3. Recreate RLS SELECT policy for assigned riders
DROP POLICY IF EXISTS "Riders can view assigned orders" ON public.orders;
CREATE POLICY "Riders can view assigned orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    rider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.store_id = orders.store_id
        AND store_staff.user_id = auth.uid()
        AND store_staff.role = 'rider'
    )
  );

-- 4. Recreate RLS UPDATE policy for assigned riders
DROP POLICY IF EXISTS "Riders can update assigned orders" ON public.orders;
CREATE POLICY "Riders can update assigned orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid());
