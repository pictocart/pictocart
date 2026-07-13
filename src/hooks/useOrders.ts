import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';
import { toast } from 'sonner';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

export type Order = Tables<'orders'>;
export type OrderUpdate = TablesUpdate<'orders'>;

export type OrderStatus = 'new' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cod';

export const ORDER_STATUSES: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'new',        label: 'New',        color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'pending',    label: 'Pending',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'confirmed',  label: 'Confirmed',  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'shipped',    label: 'Shipped',    color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'delivered',  label: 'Delivered',  color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'rejected',   label: 'Rejected',   color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'cancelled',  label: 'Cancelled',  color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'returned',   label: 'Returned',   color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
  { value: 'cod', label: 'COD', color: 'bg-orange-100 text-orange-800' },
];

export const useOrders = () => {
  const { store } = useStore();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['orders', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!store?.id,
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...updates }: OrderUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', store?.id] });
      toast.success('Order updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['orders', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Order status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectOrder = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'rejected', notes: reason } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', store?.id] });
      toast.success('Order rejected');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    orders: ordersQuery.data ?? [],
    loading: ordersQuery.isLoading,
    updateOrder,
    updateStatus,
    rejectOrder,
  };
};

export const useOrder = (id: string | undefined) => {
  const { store } = useStore();
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Order;
    },
    enabled: !!id && !!store?.id,
  });
};
