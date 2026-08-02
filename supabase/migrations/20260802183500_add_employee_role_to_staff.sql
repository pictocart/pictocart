-- Add employee_id column to store_staff
ALTER TABLE public.store_staff ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- Drop the old role check constraint
ALTER TABLE public.store_staff DROP CONSTRAINT IF EXISTS store_staff_role_check;

-- Add the new check constraint supporting 'employee'
ALTER TABLE public.store_staff ADD CONSTRAINT store_staff_role_check CHECK (role IN ('waiter', 'chef', 'manager', 'employee'));

-- Re-create staff creation function supporting employee_id
CREATE OR REPLACE FUNCTION public.create_store_staff_member(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_store_id uuid,
  p_employee_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_emp_id text := p_employee_id;
BEGIN
  -- Generate new UUID for user
  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Auto-generate employee ID if not provided
  IF v_emp_id IS NULL OR v_emp_id = '' THEN
    v_emp_id := 'EMP-' || upper(substring(md5(random()::text) from 1 for 6));
  END IF;

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
    role,
    employee_id
  ) VALUES (
    v_user_id,
    p_store_id,
    p_name,
    p_role,
    v_emp_id
  );

  RETURN json_build_object('success', true, 'user_id', v_user_id, 'employee_id', v_emp_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Drop function first to prevent return type mismatch error
DROP FUNCTION IF EXISTS public.get_store_staff_with_email(uuid);

-- Re-create get_store_staff_with_email to return employee_id
CREATE OR REPLACE FUNCTION public.get_store_staff_with_email(_store_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  store_id uuid,
  name text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  auth_email text,
  employee_id text
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
      u.email::text as auth_email,
      s.employee_id
    FROM public.store_staff s
    JOIN auth.users u ON u.id = s.user_id
    WHERE s.store_id = _store_id;
  END IF;
END;
$$;
