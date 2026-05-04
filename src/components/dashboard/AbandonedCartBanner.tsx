import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props { storeId: string }

/**
 * In-dashboard abandoned cart insight.
 * Counts sessions in the last 24h with `add_to_cart` or `checkout_start`
 * but no matching `purchase` event from the same session.
 */
const AbandonedCartBanner = ({ storeId }: Props) => {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['abandoned-carts', storeId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, session_id, value')
        .eq('store_id', storeId)
        .gte('created_at', since)
        .in('event_type', ['add_to_cart', 'checkout_start', 'purchase']);

      const sessions = new Map<string, { cart: boolean; checkout: boolean; purchased: boolean; value: number }>();
      (events || []).forEach((e: any) => {
        if (!e.session_id) return;
        const s = sessions.get(e.session_id) || { cart: false, checkout: false, purchased: false, value: 0 };
        if (e.event_type === 'add_to_cart') s.cart = true;
        if (e.event_type === 'checkout_start') { s.checkout = true; s.value = Math.max(s.value, Number(e.value || 0)); }
        if (e.event_type === 'purchase') s.purchased = true;
        sessions.set(e.session_id, s);
      });

      let abandoned = 0, lostValue = 0;
      sessions.forEach(s => {
        if ((s.cart || s.checkout) && !s.purchased) {
          abandoned++;
          lostValue += s.value;
        }
      });
      return { abandoned, lostValue };
    },
    enabled: !!storeId,
    refetchInterval: 5 * 60 * 1000,
  });

  if (!data || data.abandoned === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 shrink-0">
            <ShoppingBag className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {data.abandoned} {data.abandoned === 1 ? 'cart' : 'carts'} left without checkout (24h)
            </p>
            <p className="text-xs text-muted-foreground">
              Approx. ₹{Math.round(data.lostValue).toLocaleString('en-IN')} in potential revenue. Set up a discount coupon to recover them.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/coupons')} className="shrink-0 gap-1.5">
          Create recovery coupon <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default AbandonedCartBanner;
