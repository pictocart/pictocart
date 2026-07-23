import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSiteOffer, isOfferActive, applyOfferToProduct } from '@/hooks/useSiteOffer';
import { deriveLegacyThemeFields, type StorefrontManifestInput } from '@/lib/storefrontManifest';

export const useStorefront = (slug: string, ownerPreview = false) => {
  const storeQuery = useQuery({
    queryKey: ['storefront', slug, ownerPreview],
    queryFn: async () => {
      if (ownerPreview) {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', slug)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Store not found');
        return deriveLegacyThemeFields(data);
      }

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Onboarding preview fallback (load store regardless of published status)
        const { data: unpublishedData, error: err2 } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        if (err2) throw err2;
        return unpublishedData ? deriveLegacyThemeFields(unpublishedData) : ({
          id: 'mock-store-id-1',
          user_id: null,
          name: 'Demo Onboarding Shop',
          slug,
          description: null,
          logo_url: null,
          banner_url: null,
          category: null,
          theme: { name: 'theme-style-9' },
          settings: {},
          is_published: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          home_page_kind: 'default',
          home_page_id: null,
          home_page_product_id: null,
        } satisfies StorefrontManifestInput);
      }
      return deriveLegacyThemeFields(data);
    },
    enabled: !!slug,
  });

  const { data: offer } = useStoreSiteOffer(storeQuery.data?.id);
  const offerPct = isOfferActive(offer) ? Number(offer!.percent_off) : 0;

  const productsQuery = useQuery({
    queryKey: ['storefront-products', storeQuery.data?.id, offerPct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeQuery.data!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      return offerPct > 0 ? rows.map((p) => applyOfferToProduct(p as any, offerPct)) : rows;
    },
    enabled: !!storeQuery.data?.id,
  });

  return {
    store: storeQuery.data,
    products: productsQuery.data || [],
    loading: storeQuery.isLoading || productsQuery.isLoading,
    error: storeQuery.error,
  };
};

export const useStorefrontProduct = (storeId: string | undefined, productId: string) => {
  const { data: offer } = useStoreSiteOffer(storeId);
  const offerPct = isOfferActive(offer) ? Number(offer!.percent_off) : 0;

  const cleanProductId = productId ? productId.replace(/-theme-style-\d+$/, '') : '';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanProductId);

  return useQuery({
    queryKey: ['storefront-product', storeId, productId, offerPct],
    queryFn: async () => {
      if (!isUuid) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', cleanProductId)
        .eq('store_id', storeId!)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data ? (offerPct > 0 ? applyOfferToProduct(data as any, offerPct) : data) : null;
    },
    enabled: !!storeId && !!productId,
  });
};
