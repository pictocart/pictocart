import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch the latest published manifest for a master theme (theme-xxxxxx).
 * Returned object is the `files_manifest` JSONB.
 */
export function useThemeManifest(themeId: string | null | undefined) {
  return useQuery({
    queryKey: ["theme-manifest", themeId],
    enabled: !!themeId && themeId.startsWith("theme-"),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_master_versions")
        .select("files_manifest, version")
        .eq("theme_id", themeId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.files_manifest ?? null;
    },
  });
}
