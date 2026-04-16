import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';

export interface Subscription {
  id: string;
  store_id: string;
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete';
  razorpay_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export const PLAN_LIMITS = {
  free: {
    products: 10,
    themes: 1,
    customDomain: false,
    razorpay: false,
    shipping: false,
    blog: false,
    coupons: false,
    analytics: false,
    seo: false,
  },
  premium: {
    products: Infinity,
    themes: Infinity,
    customDomain: true,
    razorpay: true,
    shipping: true,
    blog: true,
    coupons: true,
    analytics: true,
    seo: true,
  },
} as const;

export const useSubscription = () => {
  const { store } = useStore();

  const query = useQuery({
    queryKey: ['subscription', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('store_id', store.id)
        .single();
      if (error) {
        // No subscription row yet — treat as free
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as Subscription;
    },
    enabled: !!store?.id,
  });

  const plan = (query.data?.plan || 'free') as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan];
  const isPremium = plan === 'premium';
  const isActive = query.data?.status === 'active' || query.data?.status === 'trialing';

  const canUse = (feature: keyof typeof PLAN_LIMITS['free']) => {
    return limits[feature] === true || (typeof limits[feature] === 'number' && limits[feature] > 0);
  };

  return {
    subscription: query.data,
    plan,
    isPremium,
    isActive,
    limits,
    canUse,
    loading: query.isLoading,
  };
};
