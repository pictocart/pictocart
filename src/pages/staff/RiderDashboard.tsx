// Storefront Delivery Rider Dashboard Component
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Truck, Navigation, LogOut, MessageCircle, MapPin, Bell, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

export default function RiderDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [staffUser, setStaffUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound generator
  const playNotificationSound = (frequency = 523.25, duration = 0.3) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio Context block:', e);
    }
  };

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please log in first');
          navigate('/auth');
          return;
        }

        const { data: staff, error } = await (supabase as any)
          .from('store_staff')
          .select('id, name, role, store_id, stores(slug, name, id)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error || !staff) {
          toast.error('Unauthorized access. Staff credentials not found.');
          navigate('/auth');
          return;
        }

        if (staff.role !== 'rider' && staff.role !== 'manager') {
          toast.error('Unauthorized. Rider dashboard is for delivery riders only.');
          navigate('/auth');
          return;
        }

        const staffStoreSlug = staff.stores?.slug;
        if (slug && slug !== staffStoreSlug) {
          toast.error(`Access Denied. Registered to store: ${staffStoreSlug}`);
          navigate(`/store/${staffStoreSlug}/rider`);
          return;
        }

        setStaffUser(staff);
      } catch (err) {
        console.error(err);
        toast.error('Authentication check failed');
        navigate('/auth');
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [slug, navigate]);

  const storeId = staffUser?.store_id;
  const riderUserId = staffUser?.id === 'owner' ? null : staffUser?.user_id;

  // Realtime subscription for assigned orders
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('rider-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['rider-assigned-orders', storeId] });
          if (payload.eventType === 'UPDATE' && payload.new.rider_id === staffUser?.user_id) {
            playNotificationSound(600, 0.4);
            toast.info('Order assignment updated!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, staffUser]);

  // Fetch assigned active orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['rider-assigned-orders', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .eq('rider_id', staffUser?.user_id)
        .not('rider_status', 'eq', 'delivered')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!storeId && !!staffUser?.user_id,
  });

  // Background Geolocation updates for active delivery
  useEffect(() => {
    const activeOrder = orders.find((o: any) => o.rider_status === 'accepted' || o.rider_status === 'picked_up');
    if (!activeOrder) return;

    const interval = setInterval(() => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });

          // Update rider coordinates in active order row
          await (supabase as any)
            .from('orders')
            .update({ rider_lat: latitude, rider_lng: longitude })
            .eq('id', activeOrder.id);
        },
        (err) => {
          console.warn('Rider geolocation failed:', err.message);
        },
        { enableHighAccuracy: true }
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [orders]);

  // Status mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const updates: any = { rider_status: status };
      if (status === 'picked_up') {
        updates.prep_status = 'ready'; // confirm ready for pickup
      } else if (status === 'delivered') {
        updates.prep_status = 'served'; // fully complete
        updates.status = 'completed';
      }

      const { error } = await (supabase as any)
        .from('orders')
        .update(updates)
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      playNotificationSound(800, 0.25);
      toast.success(`Order marked as ${variables.status.replace('_', ' ')}!`);
      qc.invalidateQueries({ queryKey: ['rider-assigned-orders', storeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update order status');
    }
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-stone-50 dark:bg-stone-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Authenticating rider session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/50 dark:bg-stone-950/50 pb-16 font-sans">
      {/* Header bar */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200/60 dark:border-stone-800 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-base font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider">Rider Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="p-2 text-stone-500 hover:text-stone-700 rounded-lg"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <Button variant="ghost" size="sm" className="text-destructive font-bold text-xs" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1.5" /> Sign out
          </Button>
        </div>
      </header>

      {/* Main content body */}
      <main className="max-w-md mx-auto p-4 space-y-6">
        <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-2">
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Logged in agent</p>
          <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">{staffUser?.name}</h2>
          <p className="text-xs text-muted-foreground">Store: {staffUser?.stores?.name}</p>
          {currentCoords && (
            <div className="pt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-wider animate-pulse">
              <Navigation className="h-3 w-3 shrink-0" /> Live GPS: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
            </div>
          )}
        </div>

        {/* Assigned Orders List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 uppercase tracking-widest">Assigned deliveries</h3>
            <Badge variant="outline" className="font-extrabold text-[10px] bg-primary/10 text-primary uppercase border-primary/20">
              {orders.length} Active
            </Badge>
          </div>

          {loadingOrders ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <Card className="border-dashed py-16 text-center border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-900">
              <CardContent className="space-y-2">
                <Truck className="h-10 w-10 mx-auto text-stone-300 dark:text-stone-700" />
                <p className="text-sm font-bold text-stone-700 dark:text-stone-400">All caught up!</p>
                <p className="text-xs text-muted-foreground">No active delivery assignments found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => (
                <Card key={order.id} className="border-l-4 border-l-orange-500 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-stone-50/50 dark:bg-stone-900/50 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <h4 className="font-black text-xs text-orange-700 uppercase tracking-wider">
                        Order #{order.order_number}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge className="text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 capitalize">
                      {order.rider_status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    
                    {/* Customer info */}
                    <div className="text-xs space-y-2 border-b border-dashed pb-3 border-stone-200 dark:border-stone-800">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-stone-900 dark:text-stone-100">Delivery Address</p>
                          <p className="text-stone-600 dark:text-stone-400 mt-0.5">{order.delivery_address || 'Customer Location'}</p>
                        </div>
                      </div>
                      {order.customer_phone && (
                        <div className="flex items-center gap-1.5 pt-1.5">
                          <MessageCircle className="h-4 w-4 text-stone-400 shrink-0" />
                          <a 
                            href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="font-extrabold text-stone-800 dark:text-stone-300 underline"
                          >
                            WhatsApp Customer: {order.customer_phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Order items */}
                    <div className="text-xs space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Items list</p>
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between font-medium text-stone-700 dark:text-stone-300">
                          <span>{item.title} × {item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status update actions */}
                    <div className="pt-2 flex gap-2">
                      {order.rider_status === 'pending' && (
                        <Button 
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'accepted' })}
                          disabled={updateStatusMutation.isPending}
                          className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition-colors"
                        >
                          Accept Delivery
                        </Button>
                      )}
                      {order.rider_status === 'accepted' && (
                        <Button 
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'picked_up' })}
                          disabled={updateStatusMutation.isPending}
                          className="w-full h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs transition-colors"
                        >
                          Pick Up from Store
                        </Button>
                      )}
                      {order.rider_status === 'picked_up' && (
                        <Button 
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}
                          disabled={updateStatusMutation.isPending}
                          className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors animate-pulse"
                        >
                          <Check className="h-4 w-4 mr-1 stroke-[3px]" /> Complete Delivery
                        </Button>
                      )}
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
