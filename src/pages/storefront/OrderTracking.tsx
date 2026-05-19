import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, ChefHat, Bell, Truck, Utensils } from 'lucide-react';

const PREP_STEPS = [
  { key: 'received', label: 'Received', icon: Check },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Bell },
  { key: 'served', label: 'Served / Out', icon: Truck },
];

const OrderTracking = () => {
  const { code } = useParams<{ code: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, prep_status, fulfillment_mode, table_label, total, items, created_at, store_id, guest_tracking_code')
        .eq('guest_tracking_code', code)
        .maybeSingle();
      setOrder(data);
      setLoading(false);
    };
    load();
    // Realtime
    const channel = supabase
      .channel(`track-${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if ((payload.new as any)?.guest_tracking_code === code) setOrder(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [code]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Order not found</div>;

  const currentIdx = Math.max(0, PREP_STEPS.findIndex((s) => s.key === order.prep_status));

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Utensils className="h-10 w-10 mx-auto text-primary mb-2" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Order</p>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          {order.table_label && <p className="text-sm text-muted-foreground mt-1">Table {order.table_label}</p>}
        </div>

        <div className="border rounded-xl p-5 bg-card space-y-4">
          {PREP_STEPS.map((s, i) => {
            const done = i <= currentIdx;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${done ? '' : 'text-muted-foreground'}`}>{s.label}</p>
                </div>
                {i === currentIdx && order.prep_status && <span className="text-xs text-primary animate-pulse">in progress</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-6 border rounded-xl p-4 bg-card">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Items</p>
          {(order.items as any[]).map((it, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{it.title} × {it.quantity}</span>
              <span>₹{(it.price * it.quantity).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold pt-2 mt-2 border-t">
            <span>Total</span><span>₹{Number(order.total).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">This page updates automatically. Keep it open!</p>
      </div>
    </div>
  );
};

export default OrderTracking;
