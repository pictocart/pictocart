import { supabase } from '@/integrations/supabase/client';
import { buildResolvedStorefrontManifest, getStorefrontConfig } from '@/lib/storefrontManifest';

/**
 * Apply a master theme (theme-xxxxxx) to a store. Sets the store.theme
 * pointer and seeds resolved_storefront_manifest.config.theme_overrides with
 * the manifest's default copy/images so the Customise screen can edit (and
 * the user can delete) the theme's stock assets.
 *
 * `theme_overrides` is rendering config, so it is written ONLY into
 * `resolved_storefront_manifest.config` — `stores.settings` keeps holding
 * just the non-theme business data the caller passed in as `currentSettings`
 * (payments/shipping/fssai/policies/etc), so the same config doesn't end up
 * duplicated in two columns.
 *
 * Returns the new (theme, settings) for optimistic UI updates.
 */
export async function applyMasterTheme(storeId: string, themeId: string, currentSettings: any = {}) {
  const { data: ver, error: verErr } = await supabase
    .from('theme_master_versions')
    .select('files_manifest, version')
    .eq('theme_id', themeId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (verErr) throw verErr;
  if (!ver?.files_manifest) throw new Error('Theme has no published version yet');

  // Need the full store row so the resolved manifest snapshot doesn't lose
  // fields like slug/banner_url/category/resolved_storefront_manifest that
  // aren't part of this function's job to change.
  const { data: store } = await supabase
    .from('stores')
    .select('name, logo_url, slug, banner_url, category, resolved_storefront_manifest, home_page_kind, home_page_id, home_page_product_id')
    .eq('id', storeId)
    .maybeSingle();

  const manifest: any = ver.files_manifest;
  const dna = manifest?.dna ?? {};
  const palette = dna.palette ?? {};
  const fonts = dna.fonts ?? {};
  const home = manifest?.pages?.home?.sections ?? [];

  // Build per-section seed: copy all props so user sees them as editable defaults.
  const seedSections: Record<string, any> = {};
  home.forEach((s: any, i: number) => {
    seedSections[i] = { ...(s.props ?? {}) };
  });

  const themeOverrides = {
    brand_name: store?.name ?? dna.name,
    logo_url:   store?.logo_url ?? null,
    palette:    { ...palette },
    fonts:      { ...fonts },
    sections:   seedSections,
  };

  // `theme_overrides` is rendering config — stays out of `stores.settings`,
  // goes only into resolved_storefront_manifest.config below.
  const newSettings: any = { ...currentSettings };

  // If the merchant switched away from a premium theme they had reserved
  // on a free trial, clear the pending entry so the trial banner stops
  // hanging around on the dashboard.
  const pending = currentSettings?.pending_premium_theme;
  if (pending && pending.theme_id !== themeId) {
    delete newSettings.pending_premium_theme;
  }

  const newTheme = {
    theme_id: themeId,
    name: themeId,
    manifest_ref: themeId,
    version: ver.version,
    primary_color: palette.primary,
    colors: {
      primary: palette.primary,
      secondary: palette.surface,
      accent: palette.accent,
      background: palette.bg,
      text: palette.fg,
      card: palette.surface,
    },
    fonts: { heading: fonts.heading, body: fonts.body },
  };

  const newConfig = {
    ...getStorefrontConfig(store as any),
    theme_overrides: themeOverrides,
  };

  const resolved_storefront_manifest = await buildResolvedStorefrontManifest({
    id: storeId,
    name: store?.name ?? dna.name ?? '',
    slug: store?.slug ?? '',
    logo_url: store?.logo_url ?? null,
    banner_url: store?.banner_url ?? null,
    category: store?.category ?? null,
    theme: newTheme,
    theme_id: themeId,
    theme_tokens: newTheme,
    home_page_kind: store?.home_page_kind ?? null,
    home_page_id: store?.home_page_id ?? null,
    home_page_product_id: store?.home_page_product_id ?? null,
  } as any, newConfig as any);

  const { error } = await supabase
    .from('stores')
    .update({ theme: newTheme as any, theme_id: themeId, theme_tokens: newTheme as any, settings: newSettings as any, resolved_storefront_manifest: resolved_storefront_manifest as any })
    .eq('id', storeId);
  if (error) throw error;

  return { theme: newTheme, settings: newSettings };
}
