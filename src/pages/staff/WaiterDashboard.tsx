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
  Loader2, Check, X, Edit3, Volume2, VolumeX, Bell, AlertTriangle, Utensils, ArrowRight, LogOut, Plus, Minus, Trash2, Search
} from 'lucide-react';
import { toast } from 'sonner';

export default function WaiterDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [staffUser, setStaffUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // sound alerts state
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Edit Order modal state
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  // Verify staff session & load store
  useEffect(() => {
    async function checkStaff() {
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

        if ((staff as any).role !== 'waiter' && (staff as any).role !== 'manager') {
          toast.error('Unauthorized. Waiter dashboard is for waiters and managers only.');
          navigate('/auth');
          return;
        }

        // Verify store slug matches the staff member's store
        const staffStoreSlug = (staff as any).stores?.slug;
        if (slug && slug !== staffStoreSlug) {
          toast.error(`Access Denied. You are registered to store: ${staffStoreSlug}`);
          navigate(`/store/${staffStoreSlug}/waiter`);
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
    checkStaff();
  }, [slug, navigate]);

  const storeId = staffUser?.store_id;

  // Realtime subscription for orders & assistance calls
  useEffect(() => {
    if (!storeId) return;

    const ordersChannel = supabase
      .channel('waiter-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['waiter-pending-orders', storeId] });
          qc.invalidateQueries({ queryKey: ['waiter-active-orders', storeId] });
          if (payload.eventType === 'INSERT' && soundEnabled) {
            playNotificationSound();
            toast.info('New dine-in order received!');
          }
        }
      )
      .subscribe();

    const assistanceChannel = supabase
      .channel('waiter-assistance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_assistance_requests', filter: `store_id=eq.${storeId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['waiter-assistance-requests', storeId] });
          if (payload.eventType === 'INSERT' && soundEnabled) {
            playNotificationSound(800, 0.4); // higher pitched sound for assistance
            toast.warning(`Table ${payload.new.table_label} is calling for assistance!`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(assistanceChannel);
    };
  }, [storeId, soundEnabled, qc]);

  // Notification Sound Generator
  const playNotificationSound = (frequency = 600, duration = 0.3) => {
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
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio alert blocked or unsupported', e);
    }
  };

  // Queries
  const { data: pendingOrders = [], isLoading: loadingPending } = useQuery({
    queryKey: ['waiter-pending-orders', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .eq('waiter_status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!storeId,
  });

  const { data: activeOrders = [], isLoading: loadingActive } = useQuery({
    queryKey: ['waiter-active-orders', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .eq('waiter_status', 'approved')
        .not('prep_status', 'is', null)
        .not('prep_status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!storeId,
  });

  const { data: assistanceRequests = [], isLoading: loadingAssistance } = useQuery({
    queryKey: ['waiter-assistance-requests', storeId],
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

  const { data: storeProducts = [] } = useQuery({
    queryKey: ['waiter-products', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, title, price, images')
        .eq('store_id', storeId)
        .eq('is_active', true);
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
          waiter_id: staffUser.id
        })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Order approved and sent to kitchen');
      qc.invalidateQueries({ queryKey: ['waiter-pending-orders', storeId] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders', storeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve order');
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
      toast.success('Order rejected and cancelled');
      qc.invalidateQueries({ queryKey: ['waiter-pending-orders', storeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reject order');
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
      qc.invalidateQueries({ queryKey: ['waiter-assistance-requests', storeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to resolve assistance call');
    }
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Order items editing handlers
  const openEditModal = (order: any) => {
    setEditingOrder(order);
    setEditItems(JSON.parse(JSON.stringify(order.items || []))); // deep copy
  };

  const updateItemQty = (index: number, change: number) => {
    const updated = [...editItems];
    updated[index].quantity = Math.max(1, updated[index].quantity + change);
    setEditItems(updated);
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const addProductToOrder = (product: any) => {
    // Check if product already in items
    const existingIndex = editItems.findIndex((item: any) => item.productId === product.id);
    if (existingIndex > -1) {
      updateItemQty(existingIndex, 1);
    } else {
      setEditItems([
        ...editItems,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          quantity: 1,
          image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
        }
      ]);
    }
    toast.success(`${product.title} added`);
  };

  const saveEditedOrder = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      toast.error('Order must contain at least one item');
      return;
    }

    setSavingOrder(true);
    try {
      // Recalculate totals
      const subtotal = editItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const total = subtotal; // can apply discount/taxes if present in original order

      const { error } = await (supabase as any)
        .from('orders')
        .update({
          items: editItems,
          total: total,
          subtotal: subtotal
        })
        .eq('id', editingOrder.id);

      if (error) throw error;

      toast.success('Order items updated successfully');
      setEditingOrder(null);
      qc.invalidateQueries({ queryKey: ['waiter-pending-orders', storeId] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders', storeId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    } finally {
      setSavingOrder(false);
    }
  };

  // Filter products for adding
  const filteredProducts = storeProducts.filter(p =>
    (p as any).title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Utensils className="h-6 w-6 text-orange-500" />
            <div>
              <h1 className="font-bold text-lg leading-tight capitalize">
                {staffUser?.stores?.name} Waiter Panel
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Logged in: {staffUser?.name} ({staffUser?.role})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle sound notifications */}
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
        {/* Assistance Calls Alerts Section */}
        {assistanceRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-md font-bold text-orange-600 flex items-center gap-1.5 animate-pulse">
              <Bell className="h-5 w-5" />
              Active Waiter Call Requests ({assistanceRequests.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {assistanceRequests.map((req: any) => (
                <Card key={req.id} className="border-l-4 border-l-orange-500 bg-orange-50/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-bold text-lg text-orange-950">Table: {req.table_label}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested: {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
                      onClick={() => resolveAssistanceMutation.mutate(req.id)}
                      disabled={resolveAssistanceMutation.isPending}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Resolve
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Work Split Screen (Orders & Active Queue) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waiter Order Confirmation Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>Dine-In Approvals Queue</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {pendingOrders.length} New
                </Badge>
              </h2>
            </div>

            {loadingPending ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingOrders.length === 0 ? (
              <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <Check className="h-10 w-10 text-green-500 mb-2 opacity-50" />
                <p className="font-semibold text-sm">All set!</p>
                <p className="text-xs">No pending storefront orders waiting for confirmation.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order: any) => (
                  <Card key={order.id} className="overflow-hidden shadow border-l-4 border-l-blue-500">
                    <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between space-y-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-md text-blue-900">
                            Table: {order.table_label || 'Takeaway/Delivery'}
                          </span>
                          <Badge variant="outline" className="capitalize">
                            {order.fulfillment_mode}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Order #{order.order_number} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-md text-blue-900">₹{order.total}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">
                          {order.payment_method}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {/* Items List */}
                      <div className="space-y-1 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm py-1 font-medium">
                            <span className="text-zinc-800">
                              {item.title} <span className="text-xs text-muted-foreground font-bold">x{item.quantity}</span>
                            </span>
                            <span className="font-semibold">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Control Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => openEditModal(order)}
                        >
                          <Edit3 className="mr-1.5 h-4 w-4" />
                          Edit Order
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Reject and cancel this order?')) {
                              rejectOrderMutation.mutate(order.id);
                            }
                          }}
                          disabled={rejectOrderMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-500 font-bold"
                          onClick={() => approveOrderMutation.mutate(order.id)}
                          disabled={approveOrderMutation.isPending}
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Send to Kitchen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Kitchen Preparation Tracker */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>Kitchen Prep Monitor</span>
              <Badge className="bg-green-600 text-white font-bold">
                {activeOrders.length}
              </Badge>
            </h2>

            {loadingActive ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeOrders.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground border-dashed">
                <p className="font-medium text-sm">No active preparation orders.</p>
                <p className="text-xs">Once you approve orders, they show up here with chef updates.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order: any) => (
                  <Card key={order.id} className="p-3 shadow-sm border-l-2 border-l-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-zinc-900">Table: {order.table_label}</p>
                        <p className="text-xs text-muted-foreground">Order #{order.order_number}</p>
                      </div>
                      <Badge
                        className={`capitalize font-bold ${
                          order.prep_status === 'ready'
                            ? 'bg-emerald-600 text-white animate-bounce'
                            : order.prep_status === 'cooking'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-500 text-white'
                        }`}
                      >
                        {order.prep_status === 'received' ? 'In Queue' : order.prep_status}
                      </Badge>
                    </div>

                    <div className="mt-2 text-xs border-t pt-2 space-y-1">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between font-medium">
                          <span>{item.title} <span className="text-muted-foreground font-bold">x{item.quantity}</span></span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Order Modal */}
      <Dialog open={!!editingOrder} onOpenChange={(val) => !val && setEditingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>Edit Order #{editingOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Adjust item quantities, remove items, or add new products to this order.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y my-2 pr-1">
            {/* Left: Current Items list */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-zinc-800">Order Items</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {editItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 border rounded-lg bg-zinc-50/50">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-full"
                        onClick={() => updateItemQty(idx, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-full"
                        onClick={() => updateItemQty(idx, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                <span className="font-bold text-sm">New Total:</span>
                <span className="font-black text-lg text-blue-900">
                  ₹{editItems.reduce((acc, item) => acc + item.price * item.quantity, 0)}
                </span>
              </div>
            </div>

            {/* Right: Product search & select */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l md:pl-4 pt-4 md:pt-0 flex flex-col">
              <h3 className="font-bold text-sm text-zinc-800">Add Menu Items</h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="flex-1 overflow-y-auto max-h-[35vh] space-y-1.5 pr-1">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground p-4">No matching products found</p>
                ) : (
                  filteredProducts.map((p) => (
                    <div key={p.id} className="flex justify-between items-center p-2 border rounded-lg hover:bg-zinc-50 transition-colors">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-zinc-800 truncate">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground">₹{p.price}</p>
                      </div>
                      <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs bg-zinc-100 hover:bg-zinc-200" onClick={() => addProductToOrder(p)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingOrder(null)} disabled={savingOrder}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              onClick={saveEditedOrder}
              disabled={savingOrder}
            >
              {savingOrder ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
