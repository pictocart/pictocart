alter table public.stores
  add column if not exists theme_id text,
  add column if not exists theme_tokens jsonb,
  add column if not exists resolved_storefront_manifest jsonb;

update public.stores
set
  theme_id = coalesce(theme_id, theme->>'theme_id', theme->>'name'),
  theme_tokens = coalesce(theme_tokens, theme),
  resolved_storefront_manifest = coalesce(
    resolved_storefront_manifest,
    jsonb_build_object(
      'schema_version', 1,
      'theme_id', coalesce(theme_id, theme->>'theme_id', theme->>'name'),
      'theme_tokens', coalesce(theme_tokens, theme),
      'store', jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'logo_url', logo_url,
        'banner_url', banner_url,
        'category', category
      ),
      'home_page', jsonb_build_object(
        'kind', home_page_kind,
        'id', home_page_id,
        'product_id', home_page_product_id
      ),
      'config', jsonb_build_object(
        'homepage_sections', coalesce(settings->'homepage_sections', '[]'::jsonb),
        'header', settings->'header',
        'footer', settings->'footer',
        'promo_ticker', settings->'promo_ticker',
        'theme_overrides', settings->'theme_overrides',
        'features', settings->'features',
        'show_all_products_grid', settings->'show_all_products_grid'
      ),
      'manifest', null,
      'generated_at', now()
    )
  );
