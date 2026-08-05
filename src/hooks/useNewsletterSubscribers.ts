import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewsletterSubscriber {
  id: string;
  store_id: string;
  email: string;
  subscribed_at: string;
}

export const useNewsletterSubscribers = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ['newsletter-subscribers', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('store_id', storeId)
        .order('subscribed_at', { ascending: false });
      if (error) throw error;
      return data as NewsletterSubscriber[];
    },
    enabled: !!storeId,
  });
};

export const useSubscribeNewsletter = () => {
  return useMutation({
    mutationFn: async ({ store_id, email }: { store_id: string; email: string }) => {
      const { error } = await supabase.from('newsletter_subscribers').insert({ store_id, email });
      if (error) {
        if (error.code === '23505') {
          return { alreadySubscribed: true };
        }
        throw error;
      }
      return { alreadySubscribed: false };
    },
  });
};
