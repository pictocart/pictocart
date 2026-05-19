import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FulfillmentMode } from './useCart';

export interface MenuMeta {
  diet?: 'veg' | 'non_veg' | 'egg';
  spice_level?: 0 | 1 | 2 | 3;
  allergens?: string[];
  prep_minutes?: number;
  available_modes?: FulfillmentMode[];
  daily_window?: { from: string; to: string };
}

export interface MenuVariantOption { name: string; values: string[] }
export interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  images: string[] | null;
  category_id: string | null;
  menu_meta: MenuMeta;
  is_active: boolean;
  variants: MenuVariantOption[];
}

export interface MenuSection {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

const parseMeta = (raw: any): MenuMeta => (raw && typeof raw === 'object' ? raw : {});

export const useStoreMenu = (storeId: string | undefined, mode?: FulfillmentMode) => {
  return useQuery({
    queryKey: ['store-menu', storeId, mode],
    queryFn: async (): Promise<MenuSection[]> => {
      if (!storeId) return [];
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeId).order('sort_order'),
        supabase.from('products').select('*').eq('store_id', storeId).eq('is_active', true).order('created_at'),
      ]);
      const sections: MenuSection[] = (cats || []).filter((c: any) => !c.parent_id).map((c: any) => ({
        id: c.id, name: c.name, sort_order: c.sort_order, items: [],
      }));
      const uncategorized: MenuSection = { id: '__uncat__', name: 'Other', sort_order: 9999, items: [] };

      for (const p of prods || []) {
        const meta = parseMeta((p as any).menu_meta);
        if (mode && meta.available_modes && meta.available_modes.length > 0 && !meta.available_modes.includes(mode)) continue;
        const rawVariants = (p as any).variants;
        const variants: MenuVariantOption[] = Array.isArray(rawVariants)
          ? rawVariants.filter((v: any) => v && v.name && Array.isArray(v.values))
          : [];
        const item: MenuItem = {
          id: p.id,
          title: p.title,
          description: p.description,
          price: Number(p.price) || 0,
          image_url: (p as any).image_url ?? (Array.isArray((p as any).images) && (p as any).images[0]) ?? null,
          images: Array.isArray((p as any).images) ? (p as any).images : null,
          category_id: (p as any).category_id ?? null,
          menu_meta: meta,
          is_active: p.is_active ?? true,
          variants,
        };
        const target = sections.find((s) => s.id === item.category_id);
        if (target) target.items.push(item);
        else uncategorized.items.push(item);
      }
      const result = [...sections.filter((s) => s.items.length > 0)];
      if (uncategorized.items.length > 0) result.push(uncategorized);
      return result;
    },
    enabled: !!storeId,
  });
};
