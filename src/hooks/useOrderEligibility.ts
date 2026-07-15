import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderEligibility {
  order_id: string;
  status: string;
  payment_status: string;
  delivered_at: string | null;
  canCancel: boolean;
  canReturn: boolean;
  canExchange: boolean;
  canReview: boolean;
  canDownloadInvoice: boolean;
  canTrack: boolean;
  canBuyAgain: boolean;
  cancelReason?: string | null;
  returnReason?: string | null;
  exchangeReason?: string | null;
  existingReturnId?: string | null;
  existingExchangeId?: string | null;
}

export const useOrderEligibility = (orderId?: string) => {
  return useQuery({
    queryKey: ['order-eligibility', orderId],
    queryFn: async (): Promise<OrderEligibility | null> => {
      if (!orderId) return null;
      const { data, error } = await supabase.rpc('get_order_eligibility' as any, { _order_id: orderId });
      if (error) throw error;
      return data as unknown as OrderEligibility;
    },
    enabled: !!orderId,
    staleTime: 30_000,
  });
};
