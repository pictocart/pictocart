import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';
import { toast } from 'sonner';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'qc_pending'
  | 'qc_passed'
  | 'qc_failed'
  | 'received'
  | 'refund_initiated'
  | 'refund_completed'
  | 'refunded'
  | 'replacement_packed'
  | 'replacement_shipped'
  | 'replacement_delivered'
  | 'cancelled';

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
  request_type: 'return' | 'exchange';
  exchange_details: Record<string, any> | null;
  pickup_scheduled_at: string | null;
  picked_up_at: string | null;
  pickup_awb: string | null;
  pickup_courier: string | null;
  qc_status: 'pending' | 'passed' | 'failed' | null;
  qc_notes: string | null;
  qc_photos: any;
  customer_photos: any;
  refund_status: 'pending' | 'processing' | 'completed' | 'failed' | null;
  refund_initiated_at: string | null;
  refund_completed_at: string | null;
  replacement_product_id: string | null;
  replacement_awb: string | null;
  replacement_courier: string | null;
  replacement_shipped_at: string | null;
  replacement_delivered_at: string | null;
  timeline: any;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const RETURN_STATUSES: { value: ReturnStatus; label: string; color: string }[] = [
  { value: 'requested',             label: 'Requested',             color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'approved',              label: 'Approved',              color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'rejected',              label: 'Rejected',              color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'pickup_scheduled',      label: 'Pickup Scheduled',      color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { value: 'picked_up',             label: 'Picked Up',             color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'qc_pending',            label: 'QC Pending',            color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'qc_passed',             label: 'QC Passed',             color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'qc_failed',             label: 'QC Failed',             color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'received',              label: 'Received',              color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'refund_initiated',      label: 'Refund Initiated',      color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'refund_completed',      label: 'Refund Completed',      color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'refunded',              label: 'Refunded',              color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'replacement_packed',    label: 'Replacement Packed',    color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { value: 'replacement_shipped',   label: 'Replacement Shipped',   color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'replacement_delivered', label: 'Replacement Delivered', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'cancelled',             label: 'Cancelled',             color: 'bg-gray-100 text-gray-800 border-gray-200' },
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
    mutationFn: async ({ id, status, seller_notes, order_id }: { id: string; status: ReturnStatus; seller_notes?: string; order_id?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (seller_notes !== undefined) updates.seller_notes = seller_notes;
      const { error } = await supabase.from('returns' as any).update(updates).eq('id', id);
      if (error) throw error;
      // When merchant confirms the physical return is received or refunded, mark the order as returned
      if (order_id && (status === 'received' || status === 'refunded')) {
        await supabase.from('orders').update({ status: 'returned' }).eq('id', order_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns', store?.id] });
      qc.invalidateQueries({ queryKey: ['orders', store?.id] });
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
      request_type?: 'return' | 'exchange';
      exchange_details?: Record<string, unknown>;
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
