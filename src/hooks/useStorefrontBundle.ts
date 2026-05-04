import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StorefrontBundle {
  store: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    logo_url?: string | null;
    banner_url?: string | null;
    custom_domain?: string | null;
    category?: string | null;
    settings?: Record<string, unknown>;
  };
  theme: { theme_id: string; [k: string]: unknown };
  content: Record<string, unknown>;
  content_version: number;
  products: {
    featured: Array<{
      id: string;
      title: string;
      price: number;
      compare_at_price?: number | null;
      images?: string[];
      short_description?: string | null;
      inventory_count?: number | null;
    }>;
    all_count: number;
  };
  categories: Array<{ id: string; name: string; parent_id: string | null; sort_order: number }>;
  blog_recent: Array<{
    id: string;
    title: string;
    slug: string;
    cover_image: string | null;
    thumbnail_image: string | null;
    seo_description: string | null;
    created_at: string;
  }>;
}

export const useStorefrontBundle = (opts: { slug?: string; host?: string }) => {
  return useQuery<StorefrontBundle>({
    queryKey: ['storefront-bundle', opts.slug, opts.host],
    enabled: !!(opts.slug || opts.host),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-storefront-bundle', {
        body: { slug: opts.slug, host: opts.host },
      });
      if (error) throw error;
      return data as StorefrontBundle;
    },
  });
};
