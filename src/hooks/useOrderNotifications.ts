import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Periodically refreshes orders for the store. We deliberately do NOT use Supabase
 * Realtime here because the orders table contains customer PII (name, email, phone,
 * address) and Realtime channels are not subject to fine-grained per-row auth.
 */
export const useOrderNotifications = (storeId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] });
      queryClient.invalidateQueries({ queryKey: ['order-stats', storeId] });
    };

    const interval = window.setInterval(refresh, 30_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [storeId, queryClient]);
};
