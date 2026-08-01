DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'c824674a-59b4-4605-956b-277393b6f62c') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES ('c824674a-59b4-4605-956b-277393b6f62c', 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
