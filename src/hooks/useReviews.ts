import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Review {
  id: string;
  store_id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  is_verified_purchase: boolean;
  created_at: string;
}

export const useProductReviews = (productId: string) => {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Review[];
    },
    enabled: !!productId,
  });
};

export const useSubmitReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (review: {
      store_id: string;
      product_id: string;
      user_id: string;
      rating: number;
      title?: string;
      body?: string;
    }) => {
      // Check if verified purchase
      const { data: orders } = await supabase
        .from('orders')
        .select('id, items')
        .eq('customer_user_id', review.user_id)
        .eq('store_id', review.store_id);

      const isVerified = (orders || []).some((order: any) => {
        const items = Array.isArray(order.items) ? order.items : [];
        return items.some((item: any) => item.product_id === review.product_id);
      });

      const { data, error } = await supabase.from('reviews').insert({
        store_id: review.store_id,
        product_id: review.product_id,
        user_id: review.user_id,
        rating: review.rating,
        title: review.title || null,
        body: review.body || null,
        is_verified_purchase: isVerified,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.product_id] });
    },
  });
};

export const getAverageRating = (reviews: Review[]) => {
  if (!reviews.length) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
};
