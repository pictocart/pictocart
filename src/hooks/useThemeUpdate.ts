import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { getStoreThemeId } from '@/lib/storefrontManifest';

export interface ThemeVersion {
  id: string;
  version: string;
  summary: string;
  changelog: string;
  released_at: string;
}

export interface ThemeUpdateInfo {
  themeMasterId: string;
  themeId: string;
  themeName: string;
  installedVersion: string | null;
  currentVersion: string;
  hasUpdate: boolean;
  newerVersions: ThemeVersion[];
  dismissedVersion: string | null;
}

export const useThemeUpdate = () => {
  const { store } = useStore();
  const activeThemeId = getStoreThemeId(store);

  return useQuery({
    queryKey: ['theme-update', store?.id, activeThemeId],
    enabled: !!store?.id && !!activeThemeId,
    queryFn: async (): Promise<ThemeUpdateInfo | null> => {
      const { data: master, error: mErr } = await supabase
        .from('theme_master_projects')
        .select('id, theme_id, name, current_version')
        .eq('theme_id', activeThemeId)
        .maybeSingle();
      if (mErr || !master) return null;

      const installedVersion = (store as any)?.installed_theme_version || null;
      const dismissedVersion = (store as any)?.theme_update_dismissed_version || null;

      const { data: versions } = await supabase
        .from('theme_versions')
        .select('*')
        .eq('theme_master_id', master.id)
        .order('released_at', { ascending: false });

      const newerVersions = installedVersion
        ? (versions || []).filter((v) => v.version !== installedVersion)
        : (versions || []);

      // Treat any release that doesn't match installed as newer
      const hasUpdate =
        installedVersion !== master.current_version &&
        master.current_version !== dismissedVersion;

      return {
        themeMasterId: master.id,
        themeId: master.theme_id,
        themeName: master.name,
        installedVersion,
        currentVersion: master.current_version,
        hasUpdate,
        newerVersions,
        dismissedVersion,
      };
    },
  });
};
