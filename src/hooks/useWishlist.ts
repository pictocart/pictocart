import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useWishlist = (storeId: string | undefined, userId: string | undefined) => {
  const queryClient = useQueryClient();
  const key = ['wishlist', storeId, userId];

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlists' as any)
        .select('*')
        .eq('store_id', storeId!)
        .eq('user_id', userId!);
      if (error) throw error;
      return (data || []) as unknown as Array<{ id: string; product_id: string; store_id: string; user_id: string; created_at: string }>;
    },
    enabled: !!storeId && !!userId,
  });

  const wishlistProductIds = new Set(wishlistItems.map((w) => w.product_id));

  const toggleMutation = useMutation({
    mutationFn: async (productId: string) => {
      const existing = wishlistItems.find((w) => w.product_id === productId);
      if (existing) {
        const { error } = await supabase.from('wishlists' as any).delete().eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const };
      } else {
        const { error } = await supabase.from('wishlists' as any).insert({
          user_id: userId!,
          product_id: productId,
          store_id: storeId!,
        });
        if (error) throw error;
        return { action: 'added' as const };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    wishlistItems,
    wishlistProductIds,
    isLoading,
    toggle: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
};
