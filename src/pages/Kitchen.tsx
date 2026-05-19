import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChefHat, Clock, MapPin, Phone, Utensils, Bell, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type PrepStatus = 'received' | 'preparing' | 'ready' | 'served' | 'out_for_delivery' | 'completed' | 'cancelled';

type KitchenOrder = {
  id: string;
  order_number: string;
  fulfillment_mode: 'dine_in' | 'takeaway' | 'delivery';
  prep_status: PrepStatus | null;
  table_label: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: any;
  total: number;
  created_at: string;
  guest_tracking_code: string | null;
  customer_address: any;
};

const MODE_LABEL: Record<string, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
};

const MODE_COLOR: Record<string, string> = {
  dine_in: 'bg-blue-100 text-blue-800 border-blue-200',
  takeaway: 'bg-amber-100 text-amber-800 border-amber-200',
  delivery: 'bg-purple-100 text-purple-800 border-purple-200',
};

const NEXT_STATUS: Record<string, { next: PrepStatus; label: string }[]> = {
  received: [{ next: 'preparing', label: 'Start preparing' }],
  preparing: [{ next: 'ready', label: 'Mark ready' }],
  ready: [
    { next: 'served', label: 'Served' },
    { next: 'out_for_delivery', label: 'Out for delivery' },
  ],
  served: [{ next: 'completed', label: 'Complete' }],
  out_for_delivery: [{ next: 'completed', label: 'Delivered' }],
};

const COLUMNS: { key: PrepStatus; label: string; tone: string }[] = [
  { key: 'received', label: 'New orders', tone: 'border-orange-400' },
  { key: 'preparing', label: 'Preparing', tone: 'border-blue-400' },
  { key: 'ready', label: 'Ready', tone: 'border-emerald-500' },
];

const Kitchen = () => {
  const { store } = useStore();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Soft 2-tone beep encoded as data URI
    audioRef.current = new Audio(
      'data:audio/wav;base64,UklGRoQGAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YWAGAAAAAB' +
        'gJMRJFG1Mh' + 'A'.repeat(800),
    );
  }, []);

  const playPing = () => {
    if (!soundOnRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.start();
      o.stop(ctx.currentTime + 0.45);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!store?.id) return;
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_number, fulfillment_mode, prep_status, table_label, customer_name, customer_phone, items, total, created_at, guest_tracking_code, customer_address',
        )
        .eq('store_id', store.id)
        .not('prep_status', 'is', null)
        .not('prep_status', 'in', '(completed,cancelled)')
        .order('created_at', { ascending: true });
      if (!mounted) return;
      if (error) {
        toast.error(error.message);
      } else {
        setOrders((data as any) ?? []);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`kitchen-${store.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.id}` },
        (payload) => {
          const row: any = payload.new ?? payload.old;
          if (!row?.prep_status) return;
          if (payload.eventType === 'INSERT') {
            playPing();
            toast.success(`New ${MODE_LABEL[row.fulfillment_mode]} order #${row.order_number}`);
            setOrders((prev) => [...prev, row]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) => {
              const isDone = ['completed', 'cancelled'].includes(row.prep_status);
              if (isDone) return prev.filter((o) => o.id !== row.id);
              const exists = prev.find((o) => o.id === row.id);
              return exists ? prev.map((o) => (o.id === row.id ? { ...o, ...row } : o)) : [...prev, row];
            });
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== (payload.old as any).id));
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [store?.id]);

  const advance = async (order: KitchenOrder, next: PrepStatus) => {
    const patch: any = { prep_status: next };
    if (next === 'completed') patch.status = 'delivered';
    if (next === 'out_for_delivery') patch.status = 'shipped';
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (error) toast.error(error.message);
  };

  const grouped = useMemo(() => {
    const g: Record<string, KitchenOrder[]> = { received: [], preparing: [], ready: [] };
    for (const o of orders) {
      const k = (o.prep_status === 'out_for_delivery' || o.prep_status === 'served' ? 'ready' : o.prep_status) as string;
      if (g[k]) g[k].push(o);
    }
    return g;
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary"><ChefHat className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold">Kitchen Desk</h1>
            <p className="text-sm text-muted-foreground">Live orders update automatically. Tap to advance status.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSoundOn((s) => !s)}>
          {soundOn ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
          Sound {soundOn ? 'on' : 'off'}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading orders…</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className={`rounded-xl border-t-4 ${col.tone} bg-card p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">{col.label}</h2>
                <Badge variant="secondary">{grouped[col.key]?.length ?? 0}</Badge>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-auto pr-1">
                {(grouped[col.key] ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No orders</p>
                )}
                {(grouped[col.key] ?? []).map((order) => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const actions = NEXT_STATUS[order.prep_status as string] ?? [];
                  return (
                    <Card key={order.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={MODE_COLOR[order.fulfillment_mode]} variant="outline">
                            {MODE_LABEL[order.fulfillment_mode]}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">#{order.order_number}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: false })}
                        </span>
                      </div>

                      {order.table_label && (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <Utensils className="h-3 w-3" /> Table {order.table_label}
                        </div>
                      )}
                      {order.fulfillment_mode === 'takeaway' && order.customer_phone && (
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="h-3 w-3" /> {order.customer_phone}
                        </div>
                      )}
                      {order.fulfillment_mode === 'delivery' && order.customer_address && (
                        <div className="flex items-start gap-1 text-xs text-muted-foreground line-clamp-2">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>
                            {[order.customer_address?.line1, order.customer_address?.city]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}

                      <ul className="text-sm space-y-0.5 border-t pt-2">
                        {items.map((it: any, i: number) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span className="truncate">
                              <span className="font-semibold">{it.quantity}×</span> {it.name || it.product_name}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {actions.map((a) => (
                          <Button
                            key={a.next}
                            size="sm"
                            variant={a.next === 'ready' || a.next === 'completed' ? 'default' : 'secondary'}
                            onClick={() => advance(order, a.next)}
                            className="flex-1 min-w-[120px]"
                          >
                            {a.label}
                          </Button>
                        ))}
                        {order.prep_status === 'received' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => advance(order, 'cancelled')}
                            className="text-destructive"
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Kitchen;
