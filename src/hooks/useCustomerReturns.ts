import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerReturns = (userId: string | undefined, storeId: string | undefined) => {
  return useQuery({
    queryKey: ['customer-returns', userId, storeId],
    queryFn: async () => {
      if (!userId || !storeId) return [];
      const { data, error } = await supabase
        .from('returns' as any)
        .select('*')
        .eq('customer_user_id', userId)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!userId && !!storeId,
  });
};

export const useCustomerReturn = (returnId: string | undefined) => {
  return useQuery({
    queryKey: ['customer-return', returnId],
    queryFn: async () => {
      if (!returnId) return null;
      const { data, error } = await supabase
        .from('returns' as any)
        .select('*')
        .eq('id', returnId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!returnId,
  });
};
