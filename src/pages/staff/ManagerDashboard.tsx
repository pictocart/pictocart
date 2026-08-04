import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Check, X, Edit3, Volume2, VolumeX, Bell, AlertTriangle, Utensils, LogOut, Plus, Minus, Trash2, Printer, CheckCircle, PlusCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ManagerDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [staffUser, setStaffUser] = useState<any>(null);
  const [isMerchant, setIsMerchant] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // sound alerts state
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Settle Bill Modal state
  const [activeBillOrder, setActiveBillOrder] = useState<any>(null);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');
  const [billItems, setBillItems] = useState<any[]>([]);

  // Verify staff session or merchant owner status
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please log in first');
          navigate('/auth');
          return;
        }

        // Check if staff member
        const { data: staff, error: staffErr } = await (supabase as any)
          .from('store_staff')
          .select('id, name, role, store_id, stores(slug, name, id, user_id)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staff) {
          if ((staff as any).role !== 'manager') {
            toast.error('Unauthorized access. Manager dashboard is for managers only.');
            navigate('/auth');
            return;
          }
          const staffStoreSlug = (staff as any).stores?.slug;
          if (slug && slug !== staffStoreSlug) {
            toast.error(`Access Denied. You are registered to store: ${staffStoreSlug}`);
            navigate(`/store/${staffStoreSlug}/manager`);
            return;
          }
          setStaffUser(staff);
        } else {
          // Check if merchant owner
          const { data: storeOwner, error: ownerErr } = await supabase
            .from('stores')
            .select('id, name, slug, user_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (storeOwner) {
            if (slug && slug !== storeOwner.slug) {
              toast.error(`Access Denied. You own store: ${storeOwner.slug}`);
              navigate(`/store/${storeOwner.slug}/manager`);
              return;
            }
            setIsMerchant(true);
            setStaffUser({
              id: 'owner',
              name: 'Owner',
              role: 'manager',
              store_id: storeOwner.id,
              stores: storeOwner
            });
          } else {
            toast.error('Unauthorized access.');
            navigate('/auth');
            return;
          }
        }
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

  // Realtime subscription
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('manager-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['manager-waiter-orders', storeId] });
          qc.invalidateQueries({ queryKey: ['manager-kitchen-orders', storeId] });
          if (payload.eventType === 'INSERT' && soundEnabled) {
            playNotificationSound(550, 0.35);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_assistance_requests', filter: `store_id=eq.${storeId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['manager-assistance', storeId] });
          if (payload.eventType === 'INSERT' && soundEnabled) {
            playNotificationSound(800, 0.4);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, soundEnabled, qc]);

  const playNotificationSound = (frequency = 600, duration = 0.3) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
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
      console.warn(e);
    }
  };

  // Queries
  const { data: waiterOrders = [], isLoading: loadingWaiter } = useQuery({
    queryKey: ['manager-waiter-orders', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .eq('waiter_status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const filtered = (data ?? []).filter((order: any) => {
        const isOnline = ['razorpay', 'upi', 'card'].includes(order.payment_method);
        const isUnpaid = order.payment_status === 'pending';
        return !(isOnline && isUnpaid);
      });
      
      return filtered;
    },
    enabled: !!storeId,
  });

  const { data: kitchenOrders = [], isLoading: loadingKitchen } = useQuery({
    queryKey: ['manager-kitchen-orders', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .not('prep_status', 'is', null)
        .not('prep_status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!storeId,
  });

  const { data: assistanceRequests = [], isLoading: loadingAssistance } = useQuery({
    queryKey: ['manager-assistance', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('store_assistance_requests')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!storeId,
  });

  const { data: riders = [] } = useQuery({
    queryKey: ['manager-riders', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('store_staff')
        .select('user_id, name')
        .eq('store_id', storeId)
        .eq('role', 'rider');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!storeId,
  });

  // Action Mutations
  const approveOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({
          waiter_status: 'approved',
          prep_status: 'received',
          waiter_id: staffUser.id === 'owner' ? null : staffUser.id
        })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Order approved (Waiter Override)');
      qc.invalidateQueries({ queryKey: ['manager-waiter-orders', storeId] });
      qc.invalidateQueries({ queryKey: ['manager-kitchen-orders', storeId] });
    }
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({
          waiter_status: 'rejected',
          prep_status: 'cancelled',
          status: 'cancelled'
        })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Order cancelled');
      qc.invalidateQueries({ queryKey: ['manager-waiter-orders', storeId] });
    }
  });

  const advanceKitchenMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: string }) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({ prep_status: nextStatus })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Kitchen status advanced (Chef Override)');
      qc.invalidateQueries({ queryKey: ['manager-kitchen-orders', storeId] });
    }
  });

  const assignRiderMutation = useMutation({
    mutationFn: async ({ orderId, riderId }: { orderId: string; riderId: string | null }) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({ 
          rider_id: riderId || null,
          rider_status: riderId ? 'pending' : null 
        })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rider assigned successfully!');
      qc.invalidateQueries({ queryKey: ['manager-kitchen-orders', storeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to assign rider');
    }
  });

  const resolveAssistanceMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await (supabase as any)
        .from('store_assistance_requests')
        .update({ status: 'resolved' })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Assistance call resolved');
      qc.invalidateQueries({ queryKey: ['manager-assistance', storeId] });
    }
  });

  const settleBillMutation = useMutation({
    mutationFn: async ({ orderId, updatedItems, total }: { orderId: string; updatedItems: any[]; total: number }) => {
      const { error } = await (supabase as any)
        .from('orders')
        .update({
          items: updatedItems,
          total: total,
          subtotal: total,
          payment_status: 'paid',
          prep_status: 'completed',
          status: 'completed'
        })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bill settled successfully!');
      setActiveBillOrder(null);
      qc.invalidateQueries({ queryKey: ['manager-kitchen-orders', storeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to settle payment');
    }
  });

  // Billing Drawer handlers
  const openBillDrawer = (order: any) => {
    setActiveBillOrder(order);
    setBillItems(JSON.parse(JSON.stringify(order.items || [])));
  };

  const addCustomItem = () => {
    if (!customItemName || !customItemPrice) {
      toast.error('Enter custom item details');
      return;
    }
    const price = Number(customItemPrice);
    const qty = Number(customItemQty || '1');
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
      toast.error('Invalid price or quantity');
      return;
    }

    setBillItems([
      ...billItems,
      {
        productId: `custom-${Date.now()}`,
        title: customItemName.trim(),
        price: price,
        quantity: qty
      }
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    toast.success('Custom item added');
  };

  const removeBillItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const getBillTotal = () => {
    return billItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  };

  // Thermal print trigger
  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      toast.error('Blocker prevented invoice window from opening');
      return;
    }

    const itemsRows = billItems.map(
      (item) => `
      <tr>
        <td style="text-align: left; padding: 4px 0;">${item.title}<br/><small>${item.quantity} x ₹${item.price}</small></td>
        <td style="text-align: right; padding: 4px 0; vertical-align: bottom;">₹${item.price * item.quantity}</td>
      </tr>
    `
    ).join('');

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice #${activeBillOrder?.order_number}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; line-height: 1.4; color: #000; }
              table { width: 100%; border-collapse: collapse; }
              hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
            }
            body { padding: 40px; font-family: monospace; max-width: 400px; margin: 0 auto; border: 1px solid #ccc; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; }
            hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <span class="font-bold" style="font-size: 16px;">${staffUser?.stores?.name}</span><br/>
            Dine-In Invoice / Receipt<br/>
            -------------------------------------
          </div>
          <div>
            Order: #${activeBillOrder?.order_number}<br/>
            Table: ${activeBillOrder?.table_label || 'N/A'}<br/>
            Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}<br/>
          </div>
          <hr/>
          <table>
            <thead>
              <tr>
                <th style="text-align: left; border-bottom: 1px dashed #000; padding-bottom: 4px;">Item</th>
                <th style="text-align: right; border-bottom: 1px dashed #000; padding-bottom: 4px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <hr/>
          <table style="font-weight: bold;">
            <tr>
              <td>Subtotal</td>
              <td style="text-align: right;">₹${getBillTotal()}</td>
            </tr>
            <tr>
              <td>Grand Total</td>
              <td style="text-align: right; font-size: 14px;">₹${getBillTotal()}</td>
            </tr>
          </table>
          <hr/>
          <div class="text-center font-bold" style="margin-top: 12px;">
            Thank you for dining with us!<br/>
            Please visit again soon.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Utensils className="h-6 w-6 text-purple-600 animate-spin-slow" />
            <div>
              <h1 className="font-bold text-lg leading-tight capitalize">
                {staffUser?.stores?.name} Manager Monitor
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Admin Role: {staffUser?.name} ({isMerchant ? 'Owner' : 'Manager'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className={soundEnabled ? 'text-green-600 bg-green-50' : 'text-gray-400'}
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playNotificationSound(600, 0.1);
              }}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6 space-y-6">
        {/* Call Waiter Alerts */}
        {assistanceRequests.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-l-orange-500 p-4 rounded-r-lg space-y-3">
            <div className="flex items-center gap-2 text-orange-800 font-bold">
              <Bell className="h-5 w-5 animate-bounce" />
              <span>Assistance Calls Pending ({assistanceRequests.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {assistanceRequests.map((req: any) => (
                <div key={req.id} className="bg-white p-3 rounded-lg border border-orange-200 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="font-extrabold text-sm block">Table: {req.table_label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Button size="sm" variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200" onClick={() => resolveAssistanceMutation.mutate(req.id)}>
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Split Screen Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Waiter Approvals Queue */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Waiter Approvals Queue</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-bold">
                {waiterOrders.length} Pending
              </Badge>
            </h2>

            {loadingWaiter ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : waiterOrders.length === 0 ? (
              <Card className="p-8 text-center border-dashed text-muted-foreground flex flex-col items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500 mb-2 opacity-50" />
                <p className="font-semibold text-sm">Approvals Queue Empty</p>
                <p className="text-xs">No guest orders are pending waiter approval.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {waiterOrders.map((order: any) => (
                  <Card key={order.id} className="border-l-4 border-l-orange-500">
                    <CardHeader className="py-2.5 px-4 border-b bg-zinc-50/50 flex flex-row items-center justify-between space-y-0">
                      <div>
                        <span className="font-bold text-sm text-zinc-800">
                          Table: {order.table_label || 'Takeaway'} • Order #{order.order_number}
                        </span>
                      </div>
                      <span className="font-black text-sm text-zinc-950">₹{order.total}</span>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="text-xs space-y-1">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between font-medium">
                            <span>{item.title} x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-red-500 border-red-200" onClick={() => rejectOrderMutation.mutate(order.id)}>
                          Cancel
                        </Button>
                        <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold" onClick={() => approveOrderMutation.mutate(order.id)}>
                          Approve (Send to Kitchen)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Kitchen Monitor & Billing */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Active KOT Prep Monitor</span>
              <Badge className="bg-purple-600 text-white font-bold">
                {kitchenOrders.length} Active
              </Badge>
            </h2>

            {loadingKitchen ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : kitchenOrders.length === 0 ? (
              <Card className="p-8 text-center border-dashed text-muted-foreground">
                <p className="font-medium text-sm">No active orders in kitchen.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {kitchenOrders.map((order: any) => (
                  <Card key={order.id} className="border-l-4 border-l-purple-500">
                    <CardHeader className="py-2.5 px-4 border-b bg-zinc-50/50 flex flex-row items-center justify-between space-y-0">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-purple-900">
                            {order.fulfillment_mode === 'delivery' ? 'Delivery 🚚' : order.fulfillment_mode === 'takeaway' ? 'Takeaway 🛍️' : `Table: ${order.table_label || '—'}`} • Order #{order.order_number}
                          </span>
                          <Badge variant="outline" className="capitalize text-[10px] py-0">
                            {order.prep_status}
                          </Badge>
                        </div>
                      </div>
                      <span className="font-black text-sm text-zinc-950">₹{order.total}</span>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="text-xs space-y-1">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between font-medium">
                            <span>{item.title} x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {order.fulfillment_mode === 'delivery' && (
                        <div className="pt-2 border-t border-dashed mt-2 space-y-1.5">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Delivery Rider</Label>
                          <div className="flex gap-2 items-center">
                            <Select
                              value={order.rider_id || "unassigned"}
                              onValueChange={(val) => {
                                assignRiderMutation.mutate({
                                  orderId: order.id,
                                  riderId: val === "unassigned" ? null : val
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white dark:bg-stone-950 flex-1">
                                <SelectValue placeholder="Assign Rider..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {riders.map((r: any) => (
                                  <SelectItem key={r.user_id} value={r.user_id}>
                                    {r.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {order.rider_status && (
                              <Badge className="text-[10px] uppercase shrink-0 font-bold bg-amber-50 text-amber-700 border border-amber-250 capitalize">
                                {order.rider_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Overrides and Settle Actions */}
                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        {order.prep_status === 'received' && (
                          <Button size="sm" variant="secondary" className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700" onClick={() => advanceKitchenMutation.mutate({ orderId: order.id, nextStatus: 'preparing' })}>
                            Start Prep
                          </Button>
                        )}
                        {order.prep_status === 'preparing' && (
                          <Button size="sm" variant="secondary" className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold" onClick={() => advanceKitchenMutation.mutate({ orderId: order.id, nextStatus: 'ready' })}>
                            Mark Ready
                          </Button>
                        )}
                        {order.prep_status === 'ready' && (
                          <Button size="sm" variant="secondary" className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 font-semibold animate-pulse" onClick={() => advanceKitchenMutation.mutate({ orderId: order.id, nextStatus: 'served' })}>
                            Mark Served
                          </Button>
                        )}
                        <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold" onClick={() => openBillDrawer(order)}>
                          Settle Bill
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settle Bill Drawer/Dialog */}
      <Dialog open={!!activeBillOrder} onOpenChange={(val) => !val && setActiveBillOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>Settle Bill - Order #{activeBillOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Add extra charges (e.g. water, extras) on-the-fly, print receipt, and settle payment.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y my-2 pr-1">
            {/* Current Billing list */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-zinc-800">Bill Summary</h3>
              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                {billItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-2 border rounded-lg bg-zinc-50/50">
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.quantity} x ₹{item.price}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs">₹{item.price * item.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeBillItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Balance */}
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex justify-between items-center">
                <span className="font-bold text-sm text-purple-950">Grand Total:</span>
                <span className="font-black text-xl text-purple-900">₹{getBillTotal()}</span>
              </div>
            </div>

            {/* Add custom charges on-the-fly */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l md:pl-4 pt-4 md:pt-0">
              <h3 className="font-bold text-sm text-zinc-800">Add Extra Charges</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="custom-item-name" className="text-xs">Item Name</Label>
                  <Input
                    id="custom-item-name"
                    placeholder="e.g. Mineral Water, Extra Sauce"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="custom-item-price" className="text-xs">Price (₹)</Label>
                    <Input
                      id="custom-item-price"
                      type="number"
                      placeholder="20"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custom-item-qty" className="text-xs">Qty</Label>
                    <Input
                      id="custom-item-qty"
                      type="number"
                      placeholder="1"
                      value={customItemQty}
                      onChange={(e) => setCustomItemQty(e.target.value)}
                    />
                  </div>
                </div>
                <Button size="sm" type="button" className="w-full bg-zinc-800 hover:bg-zinc-900 text-white" onClick={addCustomItem}>
                  <PlusCircle className="mr-1.5 h-4 w-4" /> Add Item
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" className="border-zinc-300 text-zinc-700 hover:bg-zinc-50" onClick={handlePrintReceipt}>
              <Printer className="mr-1.5 h-4 w-4" /> Print Invoice
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveBillOrder(null)}>
                Close
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white font-extrabold"
                onClick={() => settleBillMutation.mutate({ orderId: activeBillOrder.id, updatedItems: billItems, total: getBillTotal() })}
                disabled={settleBillMutation.isPending}
              >
                {settleBillMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Settle...
                  </>
                ) : (
                  'Settle & Close Bill'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
