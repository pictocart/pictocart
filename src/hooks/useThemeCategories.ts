import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ThemeCategoryBrief {
  id: string;
  vertical: string;
  subcategory: string;
  display_name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  merchant_facing: boolean;
}

/**
 * Single source of truth for theme categories.
 * Used by:
 *  - Admin Theme master edit form (category dropdown)
 *  - Admin theme generator (vertical/subcategory selection)
 *  - Merchant onboarding (recommend themes that match merchant vertical)
 *  - Admin Categories CRUD tab
 */
export const useThemeCategories = (opts: { adminAll?: boolean } = {}) => {
  return useQuery({
    queryKey: ['theme-categories', opts.adminAll ? 'all' : 'active'],
    queryFn: async () => {
      let q = supabase
        .from('theme_category_briefs')
        .select('id, vertical, subcategory, display_name, icon, sort_order, is_active, merchant_facing')
        .order('sort_order', { ascending: true })
        .order('vertical', { ascending: true });
      if (!opts.adminAll) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ThemeCategoryBrief[];
    },
    staleTime: 60_000,
  });
};

/**
 * Distinct verticals from the briefs table — used by the master theme
 * create/edit form's category dropdown.
 */
export const useThemeVerticals = () => {
  const { data, ...rest } = useThemeCategories();
  const verticals = Array.from(new Set((data ?? []).map((b) => b.vertical))).sort();
  // Always include 'general' as a fallback so the dropdown is never empty.
  if (!verticals.includes('general')) verticals.push('general');
  return { verticals, ...rest };
};
