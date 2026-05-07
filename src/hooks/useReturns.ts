import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';
import { toast } from 'sonner';

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';

export interface ReturnRequest {
  id: string;
  order_id: string;
  store_id: string;
  customer_user_id: string | null;
  reason: string;
  items: any;
  refund_amount: number;
  status: ReturnStatus;
  seller_notes: string | null;
  customer_notes: string | null;
  refund_id: string | null;
  created_at: string;
  updated_at: string;
}

export const RETURN_STATUSES: { value: ReturnStatus; label: string; color: string }[] = [
  { value: 'requested', label: 'Requested', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'approved', label: 'Approved', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'received', label: 'Received', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'refunded', label: 'Refunded', color: 'bg-green-100 text-green-800 border-green-200' },
];

export const useStoreReturns = () => {
  const { store } = useStore();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['returns', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('returns' as any)
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReturnRequest[];
    },
    enabled: !!store?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, seller_notes }: { id: string; status: ReturnStatus; seller_notes?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (seller_notes !== undefined) updates.seller_notes = seller_notes;
      const { error } = await supabase.from('returns' as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns', store?.id] });
      toast.success('Return updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    returns: listQuery.data || [],
    loading: listQuery.isLoading,
    updateStatus,
  };
};

export const useCreateReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      store_id: string;
      customer_user_id: string;
      reason: string;
      items: any[];
      refund_amount: number;
      customer_notes?: string;
    }) => {
      const { error, data } = await supabase
        .from('returns' as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-returns'] });
      toast.success('Return request submitted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
