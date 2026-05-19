import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';

export type PlanCode = 'free' | 'starter' | 'growth' | 'scale';

export interface PlanConfig {
  id: string;
  plan: PlanCode;
  display_name: string;
  price_inr: number;
  commission_percent: number;
  razorpay_plan_id: string | null;
  trial_days: number;
  product_limit: number;
  theme_limit: number;
  custom_domain: boolean;
  razorpay_payments: boolean;
  shipping: boolean;
  blog: boolean;
  coupons: boolean;
  analytics: boolean;
  seo: boolean;
  email_branding: boolean;
  premium_themes: boolean;
  multi_domain: boolean;
  early_access: boolean;
  sort_order: number;
  is_active: boolean;
  signup_bonus_credits?: number;
}

export interface Subscription {
  id: string;
  store_id: string;
  plan: PlanCode;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete';
  razorpay_subscription_id: string | null;
  razorpay_plan_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
}

// Feature keys used across the app (kept stable for PremiumGate consumers)
export type FeatureKey =
  | 'products' | 'themes'
  | 'customDomain' | 'razorpay' | 'shipping' | 'blog' | 'coupons'
  | 'analytics' | 'seo' | 'emailBranding' | 'premiumThemes'
  | 'multiDomain' | 'earlyAccess';

const FALLBACK_FREE: PlanConfig = {
  id: 'fallback-free', plan: 'free', display_name: 'Free', price_inr: 0,
  commission_percent: 3, razorpay_plan_id: null, trial_days: 0,
  product_limit: 10, theme_limit: 1,
  custom_domain: false, razorpay_payments: false, shipping: false,
  blog: false, coupons: false, analytics: false, seo: false,
  email_branding: false, premium_themes: false, multi_domain: false,
  early_access: false, sort_order: 1, is_active: true,
};

export const usePlanConfigs = () => {
  return useQuery({
    queryKey: ['plan-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_configs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as PlanConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Backwards-compat export for older callers (PremiumGate types). Mirrors free limits.
export const PLAN_LIMITS = {
  free: {
    products: 10, themes: 1,
    customDomain: false, razorpay: false, shipping: false,
    blog: false, coupons: false, analytics: false, seo: false,
  },
  premium: {
    products: Infinity, themes: Infinity,
    customDomain: true, razorpay: true, shipping: true,
    blog: true, coupons: true, analytics: true, seo: true,
  },
} as const;

export const useSubscription = () => {
  const { store } = useStore();
  const { data: planConfigs = [] } = usePlanConfigs();

  const subQuery = useQuery({
    queryKey: ['subscription', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle();
      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!store?.id,
  });

  const planCode: PlanCode = (subQuery.data?.plan as PlanCode) || 'free';
  const config: PlanConfig =
    planConfigs.find((p) => p.plan === planCode) ?? FALLBACK_FREE;

  const isPaid = planCode !== 'free';
  // Backwards compat: many call sites still ask for `isPremium`
  const isPremium = isPaid;
  const isActive =
    subQuery.data?.status === 'active' || subQuery.data?.status === 'trialing';

  const featureMap: Record<FeatureKey, boolean | number> = {
    products: config.product_limit,
    themes: config.theme_limit,
    customDomain: config.custom_domain,
    razorpay: config.razorpay_payments,
    shipping: config.shipping,
    blog: config.blog,
    coupons: config.coupons,
    analytics: config.analytics,
    seo: config.seo,
    emailBranding: config.email_branding,
    premiumThemes: config.premium_themes,
    multiDomain: config.multi_domain,
    earlyAccess: config.early_access,
  };

  const canUse = (feature: FeatureKey | keyof typeof PLAN_LIMITS['free']) => {
    const v = (featureMap as any)[feature];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v > 0;
    return false;
  };

  // Limits shape preserved for legacy usage
  const limits = {
    products: config.product_limit,
    themes: config.theme_limit,
    customDomain: config.custom_domain,
    razorpay: config.razorpay_payments,
    shipping: config.shipping,
    blog: config.blog,
    coupons: config.coupons,
    analytics: config.analytics,
    seo: config.seo,
  } as const;

  return {
    subscription: subQuery.data,
    plan: planCode,
    planConfig: config,
    allPlans: planConfigs,
    isPremium,
    isPaid,
    isActive,
    limits,
    canUse,
    loading: subQuery.isLoading,
  };
};
