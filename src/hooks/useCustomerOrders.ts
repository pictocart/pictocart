import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerOrders = (userId: string | undefined, storeId: string | undefined) => {
  return useQuery({
    queryKey: ['customer-orders', userId, storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_user_id', userId!)
        .eq('store_id', storeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!storeId,
  });
};
