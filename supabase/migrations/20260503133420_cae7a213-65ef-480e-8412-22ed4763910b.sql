
-- Wipe all test data except admin antarikshdwivedi@gmail.com
DO $$
DECLARE
  admin_id uuid := 'c824674a-59b4-4605-956b-277393b6f62c';
BEGIN
  -- Delete all data scoped by store/user except admin's
  DELETE FROM public.subscription_events WHERE subscription_id IN (
    SELECT id FROM public.subscriptions WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id)
  );
  DELETE FROM public.subscriptions WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.theme_purchases WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.reviews WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.wishlists WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.orders WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.customers WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.coupons WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.categories WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.blog_posts WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.products WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.newsletter_subscribers WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.store_secrets WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.store_email_domains WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.store_email_templates WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.domain_health_log WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.domain_connect_sessions WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.agent_incidents WHERE store_id IN (SELECT id FROM public.stores WHERE user_id <> admin_id);
  DELETE FROM public.stores WHERE user_id <> admin_id;

  -- Also wipe wishlists/reviews/customers tied directly to non-admin users (defensive)
  DELETE FROM public.wishlists WHERE user_id <> admin_id;
  DELETE FROM public.reviews WHERE user_id <> admin_id;
  DELETE FROM public.customers WHERE user_id <> admin_id;

  -- Drop user_roles + profiles for non-admin users
  DELETE FROM public.user_roles WHERE user_id <> admin_id;
  DELETE FROM public.profiles WHERE user_id <> admin_id;

  -- Finally delete auth.users (other than admin)
  DELETE FROM auth.users WHERE id <> admin_id;

  -- Ensure admin keeps both seller + admin roles
  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'seller') ON CONFLICT DO NOTHING;
END $$;
