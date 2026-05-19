import { useEffect } from 'react';
import { useLowStockProducts } from '@/hooks/useAccounts';
import { useStore } from '@/hooks/useStore';
import { toast } from 'sonner';

/**
 * One-shot in-app notification (toast + Notification API) when there are
 * products at/below reorder level. Shown at most once per browser session per store.
 */
export const useLowStockNotifications = () => {
  const { store } = useStore();
  const { data: low = [] } = useLowStockProducts();

  useEffect(() => {
    if (!store?.id || !low.length) return;
    const key = `lowstock-notified:${store.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    const titles = low.slice(0, 3).map((p: any) => p.title).join(', ');
    const more = low.length > 3 ? ` and ${low.length - 3} more` : '';
    const msg = `${low.length} product(s) low on stock: ${titles}${more}`;

    toast.warning(msg, {
      duration: 8000,
      action: { label: 'View', onClick: () => { window.location.href = '/accounts/inventory'; } },
    });

    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Low stock alert', { body: msg });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') new Notification('Low stock alert', { body: msg });
          });
        }
      }
    } catch { /* ignore */ }
  }, [store?.id, low]);
};
