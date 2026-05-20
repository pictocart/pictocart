import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from './useStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

declare global {
  interface Window { Razorpay: any }
}

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export interface ThemeOrderInfo {
  intent_id: string;
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount: number; // paise
  currency: string;
  base_price: number;
  discount: number;
  final_amount: number;
  is_launch_offer: boolean;
  theme_name: string;
  store_name: string;
}

export function usePremiumThemePurchase() {
  const { store } = useStore();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  /** Opens the Razorpay sheet for a theme. Resolves true on captured payment. */
  const purchase = useCallback(async (theme_kind: 'pack' | 'master', theme_ref: string): Promise<boolean> => {
    if (!store) {
      toast.error('Store not loaded');
      return false;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<ThemeOrderInfo>(
        'create-theme-purchase-order',
        { body: { store_id: store.id, theme_kind, theme_ref } },
      );
      if (error || !data) throw new Error(error?.message || 'Could not create order');

      const ok = await loadRazorpay();
      if (!ok) throw new Error('Razorpay failed to load');

      return await new Promise<boolean>((resolve) => {
        const rzp = new window.Razorpay({
          key: data.razorpay_key_id,
          amount: data.amount,
          currency: data.currency,
          name: 'PicToCart',
          description: `${data.theme_name} — Premium theme`,
          order_id: data.razorpay_order_id,
          prefill: {
            email: user?.email,
            contact: (store.settings as any)?.phone || '',
            name: data.store_name,
          },
          theme: { color: '#F97316' },
          handler: async () => {
            toast.success('Payment received — unlocking your theme…');
            // Poll intent until webhook flips it (max ~12s)
            for (let i = 0; i < 12; i++) {
              await new Promise((r) => setTimeout(r, 1000));
              const { data: intent } = await supabase
                .from('theme_purchase_intents')
                .select('status')
                .eq('id', data.intent_id)
                .maybeSingle();
              if (intent?.status === 'paid') break;
            }
            qc.invalidateQueries({ queryKey: ['theme-purchases'] });
            qc.invalidateQueries({ queryKey: ['store'] });
            // Force refetch of store
            await supabase.from('stores').select('settings').eq('id', store.id).maybeSingle();
            resolve(true);
          },
          modal: {
            ondismiss: () => {
              toast.message('Payment cancelled');
              resolve(false);
            },
          },
          notes: { intent_id: data.intent_id },
        });
        rzp.open();
      });
    } catch (e: any) {
      toast.error(e.message || 'Purchase failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [store, user, qc]);

  return { purchase, loading };
}

/** Is the given master theme premium AND unpaid for the current store? */
export function isMasterThemeLocked(themeId: string, isPremium: boolean, purchasedThemes: string[] = []): boolean {
  if (!isPremium) return false;
  return !purchasedThemes.includes(themeId);
}
