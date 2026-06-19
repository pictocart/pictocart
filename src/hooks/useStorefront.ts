import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSiteOffer, isOfferActive, applyOfferToProduct } from '@/hooks/useSiteOffer';

export const useStorefront = (slug: string, ownerPreview = false) => {
  const storeQuery = useQuery({
    queryKey: ['storefront', slug, ownerPreview],
    queryFn: async () => {
      if (ownerPreview) {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Store not found');
        return data;
      }

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Store not found');
      return data;
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

  return useQuery({
    queryKey: ['storefront-product', storeId, productId, offerPct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('store_id', storeId!)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Product not found');
      return offerPct > 0 ? applyOfferToProduct(data as any, offerPct) : data;
    },
    enabled: !!storeId && !!productId,
  });
};
