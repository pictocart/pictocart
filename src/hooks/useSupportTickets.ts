import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCustomerTickets = (userId?: string, storeId?: string) => {
  return useQuery({
    queryKey: ['support-tickets', userId, storeId],
    queryFn: async () => {
      if (!userId || !storeId) return [];
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .eq('customer_user_id', userId)
        .eq('store_id', storeId)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!userId && !!storeId,
  });
};

export const useTicket = (ticketId?: string) => {
  return useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const [t, m] = await Promise.all([
        supabase.from('support_tickets' as any).select('*').eq('id', ticketId).maybeSingle(),
        supabase.from('support_ticket_messages' as any).select('*').eq('ticket_id', ticketId).order('created_at'),
      ]);
      if (t.error) throw t.error;
      if (m.error) throw m.error;
      return { ticket: t.data as any, messages: (m.data as any[]) || [] };
    },
    enabled: !!ticketId,
  });
};

export const useCreateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      store_id: string;
      customer_user_id: string;
      subject: string;
      category?: string;
      priority?: string;
      order_id?: string | null;
      body: string;
    }) => {
      const { data: t, error } = await supabase
        .from('support_tickets' as any)
        .insert({
          store_id: input.store_id,
          customer_user_id: input.customer_user_id,
          subject: input.subject,
          category: input.category || 'general',
          priority: input.priority || 'normal',
          order_id: input.order_id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      const ticket: any = t;
      await supabase.from('support_ticket_messages' as any).insert({
        ticket_id: ticket.id,
        sender_type: 'customer',
        sender_user_id: input.customer_user_id,
        body: input.body,
      } as any);
      return ticket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Support ticket created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useSendTicketMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ticket_id: string; sender_user_id: string; body: string; sender_type?: string }) => {
      const { error } = await supabase.from('support_ticket_messages' as any).insert({
        ticket_id: input.ticket_id,
        sender_type: input.sender_type || 'customer',
        sender_user_id: input.sender_user_id,
        body: input.body,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['support-ticket', v.ticket_id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
