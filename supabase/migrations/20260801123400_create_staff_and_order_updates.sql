-- Create store_staff table
CREATE TABLE IF NOT EXISTS public.store_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('waiter', 'chef', 'manager')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

-- Create store_assistance_requests table for table assistance (Call Waiter)
CREATE TABLE IF NOT EXISTS public.store_assistance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  table_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add waiter tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waiter_status TEXT DEFAULT 'pending' CHECK (waiter_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.store_staff(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_assistance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_staff
CREATE POLICY "Store owners can manage staff" ON public.store_staff
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = store_staff.store_id 
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view staff records for routing" ON public.store_staff
  FOR SELECT TO public
  USING (true);

-- RLS Policies for store_assistance_requests
CREATE POLICY "Anyone can create assistance requests" ON public.store_assistance_requests
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Staff can view and update assistance requests" ON public.store_assistance_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = store_assistance_requests.store_id 
      AND (
        stores.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.store_staff 
          WHERE store_staff.store_id = stores.id 
          AND store_staff.user_id = auth.uid()
        )
      )
    )
  );

-- Create SECURITY DEFINER function to create staff auth users
CREATE OR REPLACE FUNCTION public.create_store_staff_member(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_store_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Generate new UUID for user
  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    phone_change,
    phone_change_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    json_build_object('full_name', p_name)::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    ''
  );

  -- Insert into public.store_staff
  INSERT INTO public.store_staff (
    user_id,
    store_id,
    name,
    role
  ) VALUES (
    v_user_id,
    p_store_id,
    p_name,
    p_role
  );

  RETURN json_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Allow staff members to view and update orders of their assigned store
CREATE POLICY "Staff can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.store_id = orders.store_id
      AND store_staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.store_id = orders.store_id
      AND store_staff.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_staff
      WHERE store_staff.store_id = orders.store_id
      AND store_staff.user_id = auth.uid()
    )
  );

-- Drop the previous view if it exists
DROP VIEW IF EXISTS public.store_staff_with_email;

-- Create SECURITY DEFINER function to query staff list with emails securely
CREATE OR REPLACE FUNCTION public.get_store_staff_with_email(_store_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  store_id uuid,
  name text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  auth_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Check if caller is owner of the store or registered staff member of the store
  IF EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = _store_id 
    AND (
      stores.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.store_staff
        WHERE store_staff.store_id = _store_id
        AND store_staff.user_id = auth.uid()
      )
    )
  ) THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.user_id,
      s.store_id,
      s.name,
      s.role,
      s.created_at,
      s.updated_at,
      u.email::text AS auth_email
    FROM public.store_staff s
    LEFT JOIN auth.users u ON u.id = s.user_id
    WHERE s.store_id = _store_id
    ORDER BY s.created_at DESC;
  END IF;
END;
$$;
