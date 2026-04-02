import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { toast } from 'sonner';

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
      const { error } = await supabase
        .from('coupons')
        .update(updates as any)
        .eq('id', id);
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
      const { error } = await supabase
        .from('coupons')
        .update({ is_active } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });

  return { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon, toggleActive };
};

// Hook for storefront coupon validation
export const useValidateCoupon = () => {
  const validateCoupon = async (storeId: string, code: string, subtotal: number) => {
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

    const discount = coupon.type === 'percentage'
      ? Math.min(subtotal, (subtotal * coupon.value) / 100)
      : Math.min(subtotal, coupon.value);

    return { valid: true, coupon, discount };
  };

  const incrementUsage = async (couponId: string) => {
    await supabase.rpc('increment_coupon_usage' as any, { coupon_id: couponId });
  };

  return { validateCoupon, incrementUsage };
};
