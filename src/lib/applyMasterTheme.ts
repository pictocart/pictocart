import { supabase } from '@/integrations/supabase/client';

/**
 * Apply a master theme (theme-xxxxxx) to a store. Sets the store.theme
 * pointer and seeds store.settings.theme_overrides with the manifest's
 * default copy/images so the Customise screen can edit (and the user
 * can delete) the theme's stock assets.
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

  const newSettings = {
    ...currentSettings,
    theme_overrides: {
      brand_name: dna.name,
      sections: seedSections,
    },
  };

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

  const { error } = await supabase
    .from('stores')
    .update({ theme: newTheme as any, settings: newSettings as any })
    .eq('id', storeId);
  if (error) throw error;

  return { theme: newTheme, settings: newSettings };
}
