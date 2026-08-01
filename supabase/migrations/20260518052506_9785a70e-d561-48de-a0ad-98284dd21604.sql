DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '1c6bef8e-42e5-4cea-a1d2-9d15fd74fa14') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES ('1c6bef8e-42e5-4cea-a1d2-9d15fd74fa14', 'admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;
