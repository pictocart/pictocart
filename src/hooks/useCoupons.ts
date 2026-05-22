import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { toast } from 'sonner';

export type CouponType = 'percentage' | 'flat' | 'bogo' | 'tiered';

export interface CouponTier {
  min_subtotal: number;
  type: 'percentage' | 'flat';
  value: number;
}

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  auto_apply?: boolean;
  bogo_buy_qty?: number | null;
  bogo_get_qty?: number | null;
  bogo_get_discount_pct?: number | null;
  tiers?: CouponTier[] | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartLine {
  productId: string;
  price: number;
  quantity: number;
}

/** Pure discount calculator usable by checkout + auto-apply. */
export function computeDiscount(coupon: Coupon, subtotal: number, items: CartLine[] = []): number {
  if (!coupon || subtotal <= 0) return 0;
  if (coupon.min_order_amount && subtotal < coupon.min_order_amount) return 0;

  if (coupon.type === 'percentage') {
    return Math.min(subtotal, (subtotal * Number(coupon.value)) / 100);
  }
  if (coupon.type === 'flat') {
    return Math.min(subtotal, Number(coupon.value));
  }
  if (coupon.type === 'tiered' && Array.isArray(coupon.tiers) && coupon.tiers.length > 0) {
    const sorted = [...coupon.tiers].sort((a, b) => Number(b.min_subtotal) - Number(a.min_subtotal));
    const tier = sorted.find((t) => subtotal >= Number(t.min_subtotal));
    if (!tier) return 0;
    return tier.type === 'percentage'
      ? Math.min(subtotal, (subtotal * Number(tier.value)) / 100)
      : Math.min(subtotal, Number(tier.value));
  }
  if (coupon.type === 'bogo') {
    const buy = Math.max(1, Number(coupon.bogo_buy_qty || 1));
    const get = Math.max(1, Number(coupon.bogo_get_qty || 1));
    const pct = Math.max(1, Math.min(100, Number(coupon.bogo_get_discount_pct || 100)));
    // Expand items into unit prices, sort ascending so cheapest are discounted (standard BOGO rule)
    const units: number[] = [];
    items.forEach((i) => { for (let n = 0; n < i.quantity; n++) units.push(Number(i.price)); });
    units.sort((a, b) => a - b);
    const groupSize = buy + get;
    const groups = Math.floor(units.length / groupSize);
    let discount = 0;
    for (let g = 0; g < groups; g++) {
      // Discount the first `get` units in each group
      for (let k = 0; k < get; k++) {
        const unitIdx = g * groupSize + k;
        discount += (units[unitIdx] * pct) / 100;
      }
    }
    return Math.min(subtotal, discount);
  }
  return 0;
}

export const useCoupons = () => {
  const { store } = useStore();
  const qc = useQueryClient();

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Coupon[];
    },
    enabled: !!store?.id,
  });

  const createCoupon = useMutation({
    mutationFn: async (coupon: Partial<Coupon>) => {
      const { error } = await supabase.from('coupons').insert({
        store_id: store!.id,
        code: coupon.code!.toUpperCase(),
        type: coupon.type || 'percentage',
        value: coupon.value || 0,
        min_order_amount: coupon.min_order_amount || 0,
        max_uses: coupon.max_uses || null,
        starts_at: coupon.starts_at || new Date().toISOString(),
        expires_at: coupon.expires_at || null,
        is_active: coupon.is_active ?? true,
        auto_apply: coupon.auto_apply ?? false,
        bogo_buy_qty: coupon.bogo_buy_qty ?? null,
        bogo_get_qty: coupon.bogo_get_qty ?? null,
        bogo_get_discount_pct: coupon.bogo_get_discount_pct ?? null,
        tiers: coupon.tiers ?? null,
        description: coupon.description ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create coupon'),
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Coupon> & { id: string }) => {
      const { error } = await supabase.from('coupons').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update coupon'),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete coupon'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });

  return { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon, toggleActive };
};

// Hook for storefront coupon validation
export const useValidateCoupon = () => {
  const validateCoupon = async (storeId: string, code: string, subtotal: number, items: CartLine[] = []) => {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('store_id', storeId)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return { valid: false, error: 'Invalid coupon code' };

    const coupon = data as unknown as Coupon;

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, error: 'Coupon has expired' };
    }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return { valid: false, error: `Minimum order ₹${coupon.min_order_amount} required` };
    }

    const discount = computeDiscount(coupon, subtotal, items);
    if (discount <= 0) {
      return { valid: false, error: 'Cart does not qualify for this coupon' };
    }

    return { valid: true, coupon, discount };
  };

  /** Find the best auto-apply coupon for the current cart. */
  const findBestAutoCoupon = async (storeId: string, subtotal: number, items: CartLine[] = []) => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .eq('auto_apply', true);
    if (!data?.length) return null;
    let best: { coupon: Coupon; discount: number } | null = null;
    for (const raw of data as any[]) {
      const c = raw as Coupon;
      if (c.expires_at && new Date(c.expires_at) < new Date()) continue;
      if (c.max_uses && c.used_count >= c.max_uses) continue;
      const d = computeDiscount(c, subtotal, items);
      if (d > 0 && (!best || d > best.discount)) best = { coupon: c, discount: d };
    }
    return best;
  };

  // Safe coupon usage increment — requires a matching recent order on the same store.
  // The legacy increment_coupon_usage RPC was locked down to service_role only.
  const incrementUsage = async (couponId: string, orderId?: string) => {
    if (!orderId) return;
    await supabase.rpc('apply_coupon_to_recent_order' as any, { _coupon_id: couponId, _order_id: orderId });
  };

  return { validateCoupon, findBestAutoCoupon, incrementUsage };
};
