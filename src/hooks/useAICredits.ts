import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/hooks/useStore';

interface AIMeta {
  cache_hit: boolean;
  credits_charged: number;
  credits_saved: number;
  minutes_saved: number;
  inr_saved: number;
  new_balance: number;
}

interface InvokeResult<T> {
  data: T | null;
  meta: AIMeta | null;
  error: string | null;
  insufficient: boolean;
}

/**
 * Wraps supabase.functions.invoke for AI actions.
 * Auto-injects store_id, surfaces savings toast on cache hit,
 * and triggers `onInsufficient` (e.g. open recharge sheet) on 402.
 */
export const useAICredits = (opts?: { onInsufficient?: () => void }) => {
  const { store } = useStore();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  async function invoke<T = any>(fnName: string, body: Record<string, any> = {}): Promise<InvokeResult<T>> {
    if (!store?.id) {
      toast.error('No store selected');
      return { data: null, meta: null, error: 'no-store', insufficient: false };
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { ...body, store_id: store.id },
      });

      // Edge function returned non-2xx (e.g. 402 INSUFFICIENT_CREDITS).
      // supabase-js exposes the response on error.context — parse it.
      let parsedErr: any = null;
      if (error && (error as any).context?.json) {
        try { parsedErr = await (error as any).context.json(); } catch { /* ignore */ }
      } else if (error && (error as any).context instanceof Response) {
        try { parsedErr = await (error as any).context.clone().json(); } catch { /* ignore */ }
      }

      if (error || data?.error || parsedErr?.error) {
        const msg = parsedErr?.error || data?.error || error?.message || 'AI request failed';
        const insufficient = msg === 'INSUFFICIENT_CREDITS';
        if (insufficient) {
          toast.error('Out of AI credits — please recharge your wallet to continue', {
            description: 'Tap "Top up" to add credits.',
            action: { label: 'Top up', onClick: () => opts?.onInsufficient?.() },
          });
          opts?.onInsufficient?.();
        } else {
          toast.error(msg);
        }
        return { data: null, meta: null, error: msg, insufficient };
      }

      const meta: AIMeta | null = data?._meta ?? null;
      if (meta) {
        // refresh wallet balance shown in CreditBadge
        qc.invalidateQueries({ queryKey: ['wallet', store.id] });
        qc.invalidateQueries({ queryKey: ['wallet-tx', store.id] });

        if (meta.cache_hit && meta.credits_saved > 0) {
          toast.success(`♻ Reused — saved ${meta.credits_saved} credits`, {
            description: `Charged just ${meta.credits_charged} cr · balance ${meta.new_balance.toLocaleString()}`,
          });
        } else if (meta.inr_saved > 0) {
          toast.success(`Done — saved you ~₹${Math.round(meta.inr_saved)} & ${meta.minutes_saved}m`, {
            description: `Charged ${meta.credits_charged} cr · balance ${meta.new_balance.toLocaleString()}`,
          });
        }
      }

      return { data: data as T, meta, error: null, insufficient: false };
    } finally {
      setRunning(false);
    }
  }

  return { invoke, running };
};
