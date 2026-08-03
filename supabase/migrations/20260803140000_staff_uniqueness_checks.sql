-- Migration: Enforce global uniqueness constraints for staff email and Employee ID

-- 1. Redefine create_store_staff_member with uniqueness checks
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
  -- 1. Check if email already exists in auth.users (globally unique)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object('success', false, 'message', 'This email address is already in use by another user.');
  END IF;

  -- 2. Auto-generate or check unique employee ID (globally unique)
  IF v_emp_id IS NULL OR v_emp_id = '' THEN
    v_emp_id := 'EMP-' || upper(substring(md5(random()::text) from 1 for 6));
  ELSE
    IF EXISTS (SELECT 1 FROM public.store_staff WHERE employee_id = v_emp_id) THEN
      RETURN json_build_object('success', false, 'message', 'This Employee ID is already in use.');
    END IF;
  END IF;

  -- Generate new UUID for user
  v_user_id := gen_random_uuid();
  -- Use 10 rounds of blowfish (bcrypt) to match standard GoTrue hash parameters
  v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

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
    json_build_object('full_name', p_name, 'email_verified', true)::jsonb,
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


-- 2. Redefine update_store_staff_member with uniqueness checks
CREATE OR REPLACE FUNCTION public.update_store_staff_member(
  p_staff_id uuid,
  p_email text,
  p_password text, -- Pass NULL or empty to keep current password
  p_name text,
  p_role text,
  p_employee_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id
  SELECT user_id INTO v_user_id FROM public.store_staff WHERE id = p_staff_id;
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Staff member not found');
  END IF;

  -- 1. Check if email already exists in auth.users for a DIFFERENT user
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email AND id <> v_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'This email address is already in use by another user.');
  END IF;

  -- 2. Check if employee_id already exists in store_staff for a DIFFERENT staff member
  IF p_employee_id IS NOT NULL AND p_employee_id <> '' THEN
    IF EXISTS (SELECT 1 FROM public.store_staff WHERE employee_id = p_employee_id AND id <> p_staff_id) THEN
      RETURN json_build_object('success', false, 'message', 'This Employee ID is already in use.');
    END IF;
  END IF;

  -- Update email and password in auth.users
  IF p_password IS NOT NULL AND p_password <> '' THEN
    UPDATE auth.users
    SET email = p_email,
        encrypted_password = crypt(p_password, gen_salt('bf', 10)),
        raw_user_meta_data = json_build_object('full_name', p_name, 'email_verified', true)::jsonb,
        email_change = '',
        email_change_token_new = '',
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    UPDATE auth.users
    SET email = p_email,
        raw_user_meta_data = json_build_object('full_name', p_name, 'email_verified', true)::jsonb,
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Update public.store_staff details
  UPDATE public.store_staff
  SET name = p_name,
      role = p_role,
      employee_id = p_employee_id,
      updated_at = now()
  WHERE id = p_staff_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


-- 3. Define helper RPC to check if an email exists globally
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text, p_exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = p_email 
      AND (p_exclude_user_id IS NULL OR id <> p_exclude_user_id)
  );
END;
$$;


-- 4. Define helper RPC to check if an Employee ID exists globally
CREATE OR REPLACE FUNCTION public.check_employee_id_exists(p_employee_id text, p_exclude_staff_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_employee_id IS NULL OR p_employee_id = '' THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.store_staff 
    WHERE employee_id = p_employee_id 
      AND (p_exclude_staff_id IS NULL OR id <> p_exclude_staff_id)
  );
END;
$$;
