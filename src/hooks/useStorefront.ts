import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStorefront = (slug: string) => {
  const storeQuery = useQuery({
    queryKey: ['storefront', slug],
    queryFn: async () => {
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

  const productsQuery = useQuery({
    queryKey: ['storefront-products', storeQuery.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeQuery.data!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
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
  return useQuery({
    queryKey: ['storefront-product', storeId, productId],
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
      return data;
    },
    enabled: !!storeId && !!productId,
  });
};
