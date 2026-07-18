-- Seed the Couture fashion theme into theme_master_projects
INSERT INTO public.theme_master_projects (theme_id, name, description, category, is_default, is_active, is_premium, price, compare_at_price, preview_image, client_patch_prompt)
VALUES (
  'couture',
  'Couture — Fashion Edit',
  'Dark editorial theme with full-screen hero, lookbook, and hover-reveal cards. Made for clothing & fashion brands.',
  'bold',
  false,
  true,
  false,
  0,
  NULL,
  '/theme-previews/couture.svg',
  ''
)
ON CONFLICT (theme_id) DO NOTHING;
