import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FulfillmentMode = 'dine_in' | 'takeaway' | 'delivery';

export interface FulfillmentSettings {
  store_id: string;
  dine_in_enabled: boolean;
  takeaway_enabled: boolean;
  delivery_enabled: boolean;
  dine_in_requires_table: boolean;
  takeaway_min_phone_only: boolean;
  delivery_radius_km: number;
  delivery_min_order: number;
  delivery_fee_flat: number;
  auto_accept: boolean;
  kitchen_prep_minutes: number;
  dine_in_payment_modes: string[];
  takeaway_payment_modes: string[];
  tables: Array<{ label: string; qr_token?: string }>;
}

export const DEFAULT_FULFILLMENT: Omit<FulfillmentSettings, 'store_id'> = {
  dine_in_enabled: false,
  takeaway_enabled: false,
  delivery_enabled: true,
  dine_in_requires_table: true,
  takeaway_min_phone_only: true,
  delivery_radius_km: 0,
  delivery_min_order: 0,
  delivery_fee_flat: 0,
  auto_accept: false,
  kitchen_prep_minutes: 20,
  dine_in_payment_modes: ['cash'],
  takeaway_payment_modes: ['razorpay', 'cash'],
  tables: [],
};

export const useFulfillment = (storeId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['fulfillment', storeId],
    queryFn: async (): Promise<FulfillmentSettings | null> => {
      if (!storeId) return null;
      const { data } = await supabase
        .from('store_fulfillment_settings' as any)
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();
      return (data as any) ?? null;
    },
    enabled: !!storeId,
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<FulfillmentSettings>) => {
      if (!storeId) throw new Error('No store');
      const payload = { ...DEFAULT_FULFILLMENT, ...(query.data ?? {}), ...patch, store_id: storeId };
      const { error } = await supabase
        .from('store_fulfillment_settings' as any)
        .upsert(payload, { onConflict: 'store_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fulfillment', storeId] });
      toast.success('Fulfillment settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settings: FulfillmentSettings = {
    ...DEFAULT_FULFILLMENT,
    store_id: storeId ?? '',
    ...(query.data ?? {}),
  };

  const enabledModes: FulfillmentMode[] = [
    settings.dine_in_enabled && 'dine_in',
    settings.takeaway_enabled && 'takeaway',
    settings.delivery_enabled && 'delivery',
  ].filter(Boolean) as FulfillmentMode[];

  return { settings, enabledModes, loading: query.isLoading, save: upsert.mutateAsync, saving: upsert.isPending };
};
