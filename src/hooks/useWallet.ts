import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';

export interface Wallet {
  store_id: string;
  balance: number;
  lifetime_purchased: number;
  lifetime_used: number;
  lifetime_saved_inr: number;
  lifetime_saved_minutes: number;
  auto_recharge_enabled: boolean;
  loyalty_tier: string;
}

export interface CreditTransaction {
  id: string;
  type: 'debit' | 'credit' | 'bonus' | 'refund' | 'grant';
  action_key: string | null;
  credits: number;
  inr_value: number;
  manual_cost_inr: number;
  manual_minutes: number;
  cache_hit: boolean;
  promo_code: string | null;
  reason: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

export const useWallet = () => {
  const { store } = useStore();

  const walletQuery = useQuery({
    queryKey: ['wallet', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      // Ensure wallet row exists (idempotent insert via upsert)
      await supabase.from('ai_credit_wallets').upsert({ store_id: store!.id }, { onConflict: 'store_id', ignoreDuplicates: true });
      const { data, error } = await supabase
        .from('ai_credit_wallets')
        .select('*')
        .eq('store_id', store!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Wallet | null;
    },
    refetchInterval: 30_000,
  });

  const txQuery = useQuery({
    queryKey: ['wallet-tx', store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_credit_transactions')
        .select('*')
        .eq('store_id', store!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as CreditTransaction[];
    },
  });

  return {
    wallet: walletQuery.data,
    transactions: txQuery.data || [],
    loading: walletQuery.isLoading,
    refetch: () => {
      walletQuery.refetch();
      txQuery.refetch();
    },
  };
};

export const usePacks = () => useQuery({
  queryKey: ['credit-packs'],
  queryFn: async () => {
    const { data } = await supabase
      .from('ai_credit_packs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    return data || [];
  },
});

export const useCreditSettings = () => useQuery({
  queryKey: ['credit-settings'],
  queryFn: async () => {
    const { data } = await supabase.from('platform_credit_settings').select('*').eq('id', 1).maybeSingle();
    return data;
  },
});
