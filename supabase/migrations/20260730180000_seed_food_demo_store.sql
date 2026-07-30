-- Migration: Seed default food demo store

INSERT INTO public.partner_demo_shops (category, shop_name, shop_id, password, direct_access_url, extra_message)
VALUES (
  'Restaurant',
  'Premium Food Store',
  'premium19@storetips.com',
  'StorePassword19!',
  '/auth',
  'Default food category demo store for merchant demonstrations.'
)
ON CONFLICT DO NOTHING;
