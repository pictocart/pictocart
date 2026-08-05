import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useOrder, useOrders, ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus } from '@/hooks/useOrders';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, MapPin, Phone, Mail, Package, Truck, Loader2, FileText, Printer, Banknote, Smartphone, CreditCard, CheckCircle2, AlertCircle, History } from 'lucide-react';
import OrderHistoryDialog from '@/components/orders/OrderHistoryDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ShipOrderDialog from '@/components/orders/ShipOrderDialog';
import RefundPanel from '@/components/orders/RefundPanel';
import OrderRelatedCards from '@/components/orders/OrderRelatedCards';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Json } from '@/integrations/supabase/types';

interface OrderItem {
  title: string;
  quantity: number;
  price: number;
  image?: string;
  variant?: string;
}

interface CustomerAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// Forward-only progression order (excluding terminal states)
const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
// Terminal statuses — once reached, no further change allowed
const TERMINAL_STATUSES: string[] = ['delivered', 'rejected', 'cancelled', 'returned'];
// All selectable statuses in order (for dropdown)
// Note: 'returned' is intentionally excluded — returns must be initiated by the customer and
// flow through the Returns section. The order is automatically marked 'returned' when the
// merchant processes the return there.
const SELECTABLE_STATUSES: OrderStatus[] = ['new', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'rejected', 'cancelled'];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: order, isLoading, refetch } = useOrder(id);
  const { updateStatus } = useOrders();
  const { store } = useStore();
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const { data: paymentEvent } = useQuery({
    queryKey: ['payment-event', order?.id],
    queryFn: async () => {
      if (!order?.id || order.payment_method?.toLowerCase() !== 'razorpay') return null;
      const { data, error } = await supabase
        .from('payment_events')
        .select('*')
        .eq('order_id', order.id)
        .in('event_type', ['payment.captured', 'order.paid'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Error fetching payment event:', error);
        return null;
      }
      return data;
    },
    enabled: !!order?.id && order.payment_method?.toLowerCase() === 'razorpay',
  });

  const rzpPayment = useMemo(() => {
    if (!paymentEvent?.payload) return null;
    const payload = paymentEvent.payload as any;
    return payload?.payload?.payment?.entity || null;
  }, [paymentEvent]);

  // Offline payment modes available for "Collect Payment" at counter.
  // F&B stores get all three on by default; other shops respect merchant choice.
  const FNB_KEYWORDS = ['food', 'food_beverages', 'food-and-beverages', 'restaurant', 'cafe'];
  const isFnB = !!store?.category && FNB_KEYWORDS.includes(String(store.category).toLowerCase());
  const offlineCfg = (store?.settings as any)?.offline_payments;
  const enabledOffline = useMemo(() => {
    const defaults = { cash: true, upi: isFnB, card: isFnB };
    const cfg = offlineCfg ?? defaults;
    return {
      cash: cfg.cash !== false,
      upi: cfg.upi !== false ? (isFnB || !!cfg.upi) : false,
      card: cfg.card !== false ? (isFnB || !!cfg.card) : false,
    };
  }, [offlineCfg, isFnB]);
  const offlineModes = [
    enabledOffline.cash && { id: 'cash', label: 'Cash', icon: Banknote },
    enabledOffline.upi && { id: 'upi', label: 'UPI', icon: Smartphone },
    enabledOffline.card && { id: 'card', label: 'Card', icon: CreditCard },
  ].filter(Boolean) as Array<{ id: string; label: string; icon: any }>;

  const [collectMode, setCollectMode] = useState<string>(offlineModes[0]?.id || 'cash');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleTrack = async () => {
    if (!order?.tracking_number || !store) return;
    const settings = store?.settings as any;
    const shippingConfig = settings?.shipping;
    if (!shippingConfig?.configured && !shippingConfig?.api_token) {
      toast.error('Configure shipping settings first');
      return;
    }
    setTrackingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'track',
          store_id: store.id,
          waybill: order.tracking_number,
        },
      });
      if (error) throw error;
      setTrackingData(data);
      if (data?.status && data.status !== order.status) {
        refetch();
      }
    } catch {
      toast.error('Failed to fetch tracking info');
    }
    setTrackingLoading(false);
  };

  const [downloadingLabel, setDownloadingLabel] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [cancellingShipment, setCancellingShipment] = useState(false);
  const [downloadingManifest, setDownloadingManifest] = useState(false);
  const [requestingPickup, setRequestingPickup] = useState(false);

  const handleDownloadManifest = async () => {
    const orderMetadata = order?.courier_response as any;
    const shipmentId = orderMetadata?.shiprocket_shipment_id;
    if (!shipmentId) {
      toast.error('Shiprocket shipment ID not found.');
      return;
    }
    setDownloadingManifest(true);
    try {
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'generate-manifest',
          store_id: store?.id,
          shipment_id: shipmentId
        }
      });
      if (error || !data || !data.manifest_url) {
        toast.error(error?.message || data?.error || 'Failed to generate manifest');
      } else {
        toast.success('Manifest generated successfully!');
        window.open(data.manifest_url, '_blank');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate manifest');
    }
    setDownloadingManifest(false);
  };

  const handleRequestPickup = async () => {
    const orderMetadata = order?.courier_response as any;
    const shipmentId = orderMetadata?.shiprocket_shipment_id;
    if (!shipmentId) {
      toast.error('Shiprocket shipment ID not found.');
      return;
    }
    setRequestingPickup(true);
    try {
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'request-pickup',
          store_id: store?.id,
          shipment_id: shipmentId
        }
      });
      if (error || !data) {
        toast.error(error?.message || data?.error || 'Failed to request pickup');
      } else {
        toast.success('Pickup request submitted successfully to Shiprocket!');
        refetch();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to request pickup');
    }
    setRequestingPickup(false);
  };

  const handleDownloadLabel = async () => {
    const orderMetadata = order?.courier_response as any;
    const shipmentId = orderMetadata?.shiprocket_shipment_id;
    if (!shipmentId) {
      toast.error('Shiprocket shipment ID not found. Ensure the order was shipped using the new courier selection flow.');
      return;
    }
    setDownloadingLabel(true);
    try {
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'generate-label',
          store_id: store?.id,
          shipment_id: shipmentId
        }
      });
      if (error || !data || !data.label_url) {
        toast.error(error?.message || data?.error || 'Failed to generate label');
      } else {
        toast.success('Label generated successfully!');
        window.open(data.label_url, '_blank');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate label');
    }
    setDownloadingLabel(false);
  };

  const handleDownloadInvoice = async () => {
    const orderMetadata = order?.courier_response as any;
    const orderId = orderMetadata?.shiprocket_order_id;
    if (!orderId) {
      toast.error('Shiprocket order ID not found. Ensure the order was shipped using the new courier selection flow.');
      return;
    }
    setDownloadingInvoice(true);
    try {
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'generate-invoice',
          store_id: store?.id,
          order_id: orderId
        }
      });
      if (error || !data || !data.invoice_url) {
        toast.error(error?.message || data?.error || 'Failed to generate invoice');
      } else {
        toast.success('Invoice generated successfully!');
        window.open(data.invoice_url, '_blank');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate invoice');
    }
    setDownloadingInvoice(false);
  };

  const handleCancelShipment = () => {
    const orderMetadata = order?.courier_response as any;
    const orderId = orderMetadata?.shiprocket_order_id;
    if (!orderId) {
      toast.error('Shiprocket order ID not found. Ensure the order was shipped using the new courier selection flow.');
      return;
    }
    setCancelDialogOpen(true);
  };

  const confirmCancelShipment = async () => {
    const orderMetadata = order?.courier_response as any;
    const orderId = orderMetadata?.shiprocket_order_id;
    if (!orderId) return;

    setCancelDialogOpen(false);
    setCancellingShipment(true);
    try {
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'cancel-shipment',
          store_id: store?.id,
          order_id: orderId
        }
      });
      if (error || !data) {
        toast.error(error?.message || data?.error || 'Failed to cancel shipment');
      } else {
        await supabase
          .from('orders')
          .update({
            tracking_number: null,
            courier_provider: null,
            status: 'confirmed',
            courier_response: null
          } as any)
          .eq('id', order.id);

        toast.success('Shipment cancelled successfully on Shiprocket! Order reset to Confirmed status.');
        setTrackingData(null);
        refetch();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel shipment');
    }
    setCancellingShipment(false);
  };

  useEffect(() => {
    if (order?.tracking_number && store && !hasAutoSynced) {
      setHasAutoSynced(true);
      handleTrack();
    }
  }, [order?.tracking_number, store, hasAutoSynced]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Button variant="link" onClick={() => navigate('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const items = (Array.isArray(order.items) ? order.items : []) as unknown as OrderItem[];
  const address = order.customer_address as unknown as CustomerAddress | null;
  const currentStatusIndex = STATUS_ORDER.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'cancelled' || order.status === 'returned';

  const sendOrderNotification = async (type: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const { data: { session } } = await supabase.auth.getSession();
    fetch(`https://${projectId}.supabase.co/functions/v1/send-order-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ type, order_id: order.id, store_id: order.store_id }),
    }).catch(() => {});
  };

  const STATUS_NOTIFICATION_MAP: Record<string, string> = {
    confirmed: 'order_confirmed',
    shipped: 'order_shipped',
    delivered: 'order_delivered',
  };

  const handleStatusChange = (status: string) => {
    // Intercept reject — open popup instead
    if (status === 'rejected') {
      setRejectDialogOpen(true);
      return;
    }

    // Forward-only: block going back
    const currentIdx = SELECTABLE_STATUSES.indexOf(order.status as OrderStatus);
    const newIdx = SELECTABLE_STATUSES.indexOf(status as OrderStatus);
    if (newIdx < currentIdx) {
      toast.error('Cannot move order back to a previous status');
      return;
    }

    setPendingStatus(status);
  };

  const confirmStatusChange = () => {
    if (!pendingStatus) return;
    updateStatus.mutate(
      { id: order.id, status: pendingStatus as OrderStatus },
      {
        onSuccess: () => {
          refetch();
          toast.success(`Order status changed to ${pendingStatus}`);
          setPendingStatus(null);
        },
        onError: (err: any) => {
          toast.error(err.message);
          setPendingStatus(null);
        }
      }
    );
    const notificationType = STATUS_NOTIFICATION_MAP[pendingStatus];
    if (notificationType) {
      sendOrderNotification(notificationType);
    }
  };

  const handleShipped = async (waybill: string) => {
    await supabase
      .from('orders')
      .update({ tracking_number: waybill, status: 'shipped' })
      .eq('id', order.id);
    sendOrderNotification('order_shipped');
    refetch();
    toast.success('Order marked as shipped — customer notified');
  };

  const handleShipClick = async () => {
    if (!(order as any).invoice_number) {
      toast('Invoice not generated', {
        description: 'Generating an invoice is required before shipping. Generate now?',
        action: {
          label: 'Generate & Ship',
          onClick: async () => {
            const { data, error } = await (supabase as any).rpc('next_invoice_number', {
              _store_id: order.store_id,
              _prefix: 'INV',
            });
            if (error) { toast.error(error.message); return; }
            await supabase.from('orders').update({ invoice_number: data } as any).eq('id', order.id);
            toast.success(`Invoice ${data} generated`);
            refetch();
            setShipDialogOpen(true);
          }
        },
      });
      return;
    }
    setShipDialogOpen(true);
  };
  const confirmCollectPayment = async () => {
    setCollecting(true);
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_method: collectMode,
      } as any)
      .eq('id', order.id);
    setCollecting(false);
    setConfirmOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payment received via ${collectMode.toUpperCase()}`);
    // Invalidate dashboard + order list caches so revenue updates immediately
    qc.invalidateQueries({ queryKey: ['dashboard-orders'] });
    qc.invalidateQueries({ queryKey: ['orders'] });
    refetch();
  };


  const handleRejectConfirmed = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    setRejecting(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'rejected', notes: rejectReason.trim() } as any)
      .eq('id', order.id);
    setRejecting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Order rejected');
    setRejectConfirmOpen(false);
    setRejectDialogOpen(false);
    setRejectReason('');
    qc.invalidateQueries({ queryKey: ['orders'] });
    refetch();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Order #{order.order_number}</h1>
              {(() => {
                const activeReturn = Array.isArray((order as any).returns) && (order as any).returns.length > 0 
                  ? (order as any).returns.find((r: any) => r.status !== 'cancelled') 
                  : null;
                if (activeReturn) {
                  const isExchange = activeReturn.request_type === 'exchange';
                  const prefix = isExchange ? 'Exchange' : 'Return';
                  let label = `${prefix} Requested`;
                  let color = 'bg-orange-100 text-orange-800 border-orange-200';
                  
                  if (activeReturn.status === 'approved') {
                    label = `${prefix} Approved`;
                    color = 'bg-blue-100 text-blue-800 border-blue-200';
                  } else if (activeReturn.status === 'rejected') {
                    label = `${prefix} Rejected`;
                    color = 'bg-red-100 text-red-800 border-red-200';
                  } else if (activeReturn.status === 'pickup_scheduled') {
                    label = `Pickup Scheduled`;
                    color = 'bg-cyan-100 text-cyan-800 border-cyan-200';
                  } else if (activeReturn.status === 'picked_up') {
                    label = `Item Picked Up`;
                    color = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                  } else if (activeReturn.status === 'received') {
                    label = `Delivered to Warehouse/Store`;
                    color = 'bg-purple-100 text-purple-800 border-purple-200';
                  } else if (activeReturn.status === 'refund_initiated' || activeReturn.status === 'refund_completed' || activeReturn.status === 'refunded') {
                    label = isExchange ? 'Exchange Completed' : 'Returned';
                    color = 'bg-green-100 text-green-800 border-green-200';
                  } else if (activeReturn.status === 'replacement_shipped') {
                    label = 'Replacement Shipped';
                    color = 'bg-cyan-100 text-cyan-800 border-cyan-200';
                  } else if (activeReturn.status === 'replacement_delivered') {
                    label = 'Exchange Completed';
                    color = 'bg-green-100 text-green-800 border-green-200';
                  }
                  return (
                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', color)}>
                      {label}
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
              {(order as any).invoice_number && (
                <span className="ml-2 font-mono text-xs">· {(order as any).invoice_number}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4 mr-1" /> View History
          </Button>
          {!(order as any).invoice_number && (
            <Button
              data-tour="order-invoice"
              variant="outline"
              size="sm"
              onClick={async () => {
                const { data, error } = await (supabase as any).rpc('next_invoice_number', {
                  _store_id: order.store_id,
                  _prefix: 'INV',
                });
                if (error) { toast.error(error.message); return; }
                await supabase.from('orders').update({ invoice_number: data } as any).eq('id', order.id);
                toast.success(`Invoice ${data} generated`, {
                  description: (
                    <span>
                      View it in{' '}
                      <a
                        href="/invoices"
                        className="underline font-medium text-primary"
                        onClick={(e) => { e.preventDefault(); window.location.href = '/invoices'; }}
                      >
                        Accounts → Invoices
                      </a>
                    </span>
                  ) as any,
                  duration: 6000,
                });
                refetch();
              }}
            >
              <FileText className="h-4 w-4 mr-1" /> Generate Invoice #
            </Button>
          )}
          {!order.tracking_number && store && (
            <Button data-tour="order-ship" variant="outline" size="sm" onClick={handleShipClick}>
              <Truck className="h-4 w-4 mr-1" /> Ship Order
            </Button>
          )}
          <Select
            value={(order.status as string) || 'pending'}
            onValueChange={handleStatusChange}
            disabled={TERMINAL_STATUSES.includes(order.status as string)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.filter((s) => {
                const currentIdx = SELECTABLE_STATUSES.indexOf(order.status as OrderStatus);
                const sIdx = SELECTABLE_STATUSES.indexOf(s.value);
                // Always show current status; for others only show forward + reject/cancel/returned
                if (s.value === order.status) return true;
                if (['rejected', 'cancelled', 'returned'].includes(s.value)) return true;
                return sIdx > currentIdx;
              }).map((s) => (
                <SelectItem
                  key={s.value}
                  value={s.value}
                  className={s.value === 'rejected' ? 'text-orange-600 focus:text-orange-600' : ''}
                >
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rejection reason banner */}
      {order.status === 'rejected' && order.notes && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Order Rejected</p>
              <p className="text-sm text-orange-700 mt-0.5"><span className="font-medium">Reason:</span> {order.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Return/Exchange Request Banner */}
      {(() => {
        const activeReturn = Array.isArray((order as any).returns) && (order as any).returns.length > 0 
          ? (order as any).returns.find((r: any) => r.status !== 'cancelled') 
          : null;
        if (activeReturn) {
          const isExchange = activeReturn.request_type === 'exchange';
          const prefix = isExchange ? 'Exchange' : 'Return';
          const linkPath = isExchange ? '/exchanges' : '/returns';
          
          let statusText = 'Requested';
          let borderCls = 'border-orange-300 bg-orange-50 text-orange-800';
          
          if (activeReturn.status === 'approved') {
            statusText = 'Approved';
            borderCls = 'border-blue-300 bg-blue-50 text-blue-800';
          } else if (activeReturn.status === 'rejected') {
            statusText = 'Rejected';
            borderCls = 'border-red-300 bg-red-50 text-red-800';
          } else if (activeReturn.status === 'pickup_scheduled') {
            statusText = 'Pickup Scheduled';
            borderCls = 'border-cyan-300 bg-cyan-50 text-cyan-800';
          } else if (activeReturn.status === 'picked_up') {
            statusText = 'Item Picked Up';
            borderCls = 'border-indigo-300 bg-indigo-50 text-indigo-800';
          } else if (activeReturn.status === 'received') {
            statusText = 'Delivered to Warehouse/Store';
            borderCls = 'border-purple-300 bg-purple-50 text-purple-800';
          } else if (activeReturn.status === 'refund_initiated' || activeReturn.status === 'refund_completed' || activeReturn.status === 'refunded') {
            statusText = isExchange ? 'Exchange Completed' : 'Returned';
            borderCls = 'border-green-300 bg-green-50 text-green-800';
          } else if (activeReturn.status === 'replacement_shipped') {
            statusText = 'Replacement Shipped';
            borderCls = 'border-cyan-300 bg-cyan-50 text-cyan-800';
          } else if (activeReturn.status === 'replacement_delivered') {
            statusText = 'Exchange Completed';
            borderCls = 'border-green-300 bg-green-50 text-green-800';
          }
          
          return (
            <Card className={borderCls}>
              <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{prefix} {statusText}</p>
                    <p className="text-xs opacity-90 mt-0.5">
                      This order has an active {prefix.toLowerCase()} request. Manage it under the {prefix} module.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="bg-transparent border-current hover:bg-black/5" onClick={() => navigate(linkPath)}>
                  Manage {prefix}
                </Button>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      {/* Status timeline */}
      {!isCancelled && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              {STATUS_ORDER.map((status, i) => {
                const info = ORDER_STATUSES.find((s) => s.value === status)!;
                const isCompleted = i <= currentStatusIndex;
                const isCurrent = i === currentStatusIndex;
                return (
                  <div key={status} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors',
                          isCompleted
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30 text-muted-foreground'
                        )}
                      >
                        {i + 1}
                      </div>
                      <span className={cn('text-xs font-medium hidden sm:block', isCurrent ? 'text-primary' : 'text-muted-foreground')}>
                        {info.label}
                      </span>
                    </div>
                    {i < STATUS_ORDER.length - 1 && (
                      <div className={cn('mx-1 h-0.5 flex-1', i < currentStatusIndex ? 'bg-primary' : 'bg-muted')} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isCancelled && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-destructive">
              This order has been {order.status}.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items in this order.</p>
              ) : (
                items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">₹{item.price * item.quantity}</p>
                      <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                    </div>
                  </div>
                ))
              )}

              {/* Totals */}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{order.subtotal ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>₹{order.shipping ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>₹{order.tax ?? 0}</span>
                </div>
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total</span>
                  <span>₹{order.total ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking */}
          {order.tracking_number && (() => {
            const metadata = order.courier_response as any;
            const isShiprocket = order.courier_provider === 'shiprocket' || !!metadata?.shiprocket_shipment_id;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" /> 
                      {isShiprocket ? 'Shiprocket Logistics' : 'Shipping'}
                    </span>
                    {isShiprocket && (
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">
                        Shiprocket
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shipment Info */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AWB (Waybill)</span>
                      <span className="font-mono font-medium">{order.tracking_number}</span>
                    </div>
                    {metadata?.courier_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Courier Partner</span>
                        <span className="font-medium">{metadata.courier_name}</span>
                      </div>
                    )}
                    {metadata?.dimensions && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Package Size</span>
                        <span className="font-medium text-xs">{metadata.dimensions} ({metadata.weight_grams}g)</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Panel */}
                  {isShiprocket && (
                    <div className="grid grid-cols-2 gap-2 border-y py-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownloadLabel} 
                        disabled={downloadingLabel}
                        className="text-xs"
                      >
                        {downloadingLabel ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Printer className="h-3.5 w-3.5 mr-1" />}
                        Print Label
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownloadInvoice} 
                        disabled={downloadingInvoice}
                        className="text-xs"
                      >
                        {downloadingInvoice ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
                        Print Invoice
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownloadManifest} 
                        disabled={downloadingManifest}
                        className="text-xs"
                      >
                        {downloadingManifest ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
                        Print Manifest
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRequestPickup} 
                        disabled={requestingPickup}
                        className="text-xs"
                      >
                        {requestingPickup ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Truck className="h-3.5 w-3.5 mr-1" />}
                        Request Pickup
                      </Button>
                      {metadata?.shiprocket_order_id && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={handleCancelShipment} 
                          disabled={cancellingShipment}
                          className="col-span-2 text-xs h-8 bg-destructive/10 hover:bg-destructive/20 text-destructive border-none"
                        >
                          {cancellingShipment ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertCircle className="h-3.5 w-3.5 mr-1" />}
                          Cancel Shipment
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Tracking Button & Logs */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Real-time status tracking</span>
                    <Button variant="outline" size="sm" onClick={handleTrack} disabled={trackingLoading} className="h-8">
                      {trackingLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Refresh Status
                    </Button>
                  </div>

                  {trackingData && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Courier Status</span>
                        <Badge variant="outline" className="capitalize">{trackingData.status}</Badge>
                      </div>
                      {trackingData.location && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Location</span>
                          <span className="font-medium">{trackingData.location}</span>
                        </div>
                      )}
                      {trackingData.expected_delivery && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Expected Delivery</span>
                          <span className="font-medium">{trackingData.expected_delivery}</span>
                        </div>
                      )}
                      {trackingData.scans?.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Transit Log</p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {trackingData.scans.slice(0, 5).map((scan: any, i: number) => (
                              <div key={i} className="text-[11px] p-2 rounded bg-muted/60 space-y-0.5 border">
                                <p className="font-semibold text-foreground">{scan?.ScanDetail?.Scan || 'Status Update'}</p>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>{scan?.ScanDetail?.ScannedLocation || 'Location N/A'}</span>
                                  <span>{scan?.ScanDetail?.ScanDateTime ? format(new Date(scan.ScanDetail.ScanDateTime), 'dd MMM, p') : ''}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Customer & Payment sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{order.customer_name || 'Walk-in Customer'}</span>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{order.customer_phone}</span>
                </div>
              )}
              {order.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{order.customer_email}</span>
                </div>
              )}
              {address && (address.line1 || address.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div>
                    {address.line1 && <p>{address.line1}</p>}
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{order.payment_method || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                {(() => {
                  const ps = PAYMENT_STATUSES.find((s) => s.value === order.payment_status);
                  return ps ? (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ps.color)}>
                      {ps.label}
                    </span>
                  ) : (
                    <span>—</span>
                  );
                })()}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="font-semibold">
                  ₹{['paid', 'refund_requested', 'refund_in_process', 'refunded'].includes((order.payment_status as any) || '') ? 0 : Number(order.total || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {order.status !== 'cancelled' && order.status !== 'rejected' && order.status !== 'returned' &&
               (order.payment_status as any) !== 'paid' && (order.payment_status as any) !== 'refund_requested' && 
               (order.payment_status as any) !== 'refund_in_process' && (order.payment_status as any) !== 'refunded' && 
               offlineModes.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Collect Payment</p>
                  <div className={cn('grid gap-2', offlineModes.length === 1 ? 'grid-cols-1' : offlineModes.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                    {offlineModes.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setCollectMode(m.id)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-md border-2 p-2 transition-colors',
                          collectMode === m.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40 text-muted-foreground'
                        )}
                      >
                        <m.icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Payment Received
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    Manage offline modes in <a href="/settings/payments" className="underline">Settings → Payments → Offline</a>
                  </p>
                </div>
              )}

              {order.payment_status === 'paid' && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Payment received</span>
                </div>
              )}

              {rzpPayment && (
                <div className="rounded-lg border border-muted bg-muted/30 p-3 space-y-2 mt-2 text-xs">
                  <p className="font-semibold text-foreground border-b pb-1 mb-1">Razorpay Details</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment ID</span>
                    <span className="font-mono select-all font-medium text-right break-all ml-4">{rzpPayment.id}</span>
                  </div>
                  {rzpPayment.order_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order ID</span>
                      <span className="font-mono select-all font-medium text-right break-all ml-4">{rzpPayment.order_id}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Mode</span>
                    <span className="capitalize font-medium">{rzpPayment.method}</span>
                  </div>
                  {rzpPayment.method === 'upi' && rzpPayment.vpa && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">UPI ID (VPA)</span>
                      <span className="font-medium select-all text-right break-all ml-4">{rzpPayment.vpa}</span>
                    </div>
                  )}
                  {rzpPayment.method === 'card' && rzpPayment.card && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Card Details</span>
                      <span className="font-medium text-right ml-4">
                        {rzpPayment.card.network} ending in {rzpPayment.card.last4}
                      </span>
                    </div>
                  )}
                  {rzpPayment.method === 'netbanking' && rzpPayment.bank && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium text-right ml-4">{rzpPayment.bank}</span>
                    </div>
                  )}
                  {rzpPayment.method === 'wallet' && rzpPayment.wallet && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wallet</span>
                      <span className="font-medium text-right ml-4 capitalize">{rzpPayment.wallet}</span>
                    </div>
                  )}
                  {(() => {
                    const transId = rzpPayment.acquirer_data?.upi_transaction_id || 
                                    rzpPayment.acquirer_data?.bank_transaction_id || 
                                    rzpPayment.acquirer_data?.transaction_id ||
                                    rzpPayment.acquirer_data?.rrn;
                    return transId ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ref / Txn No.</span>
                        <span className="font-mono select-all font-medium text-right break-all ml-4">{transId}</span>
                      </div>
                    ) : null;
                  })()}
                  {(rzpPayment.email || rzpPayment.contact) && (
                    <div className="border-t pt-1.5 mt-1.5 space-y-1 text-[11px] text-muted-foreground">
                      {rzpPayment.email && <div>Email: {rzpPayment.email}</div>}
                      {rzpPayment.contact && <div>Phone: {rzpPayment.contact}</div>}
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`/invoices/${order.id}/print`, '_blank')}
              >
                <Printer className="h-4 w-4 mr-1" /> Print Invoice
              </Button>

              <RefundPanel
                orderId={order.id}
                total={Number(order.total ?? 0)}
                amountRefunded={Number((order as any).amount_refunded ?? 0)}
                hasRazorpayPayment={Boolean((order as any).razorpay_payment_id)}
                paymentStatus={order.payment_status}
                onRefunded={() => refetch()}
              />
            </CardContent>
          </Card>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm payment received?</AlertDialogTitle>
                <AlertDialogDescription>
                  You're marking ₹{Number(order.total || 0).toLocaleString('en-IN')} as received via{' '}
                  <span className="font-semibold uppercase">{collectMode}</span>. This will update the
                  order's payment status to <span className="font-semibold">Paid</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={collecting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmCollectPayment} disabled={collecting}>
                  {collecting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Yes, payment received
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>


          {order.notes && (order.status as string) !== 'rejected' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          <OrderRelatedCards
            orderId={order.id}
            courier={(order as any).courier}
            awb={(order as any).awb}
            trackingNumber={order.tracking_number}
            deliveredAt={(order as any).delivered_at}
            shippingLabelUrl={(order as any).shipping_label_url}
            podUrl={(order as any).pod_url}
            deliveryAttempts={(order as any).delivery_attempts}
          />
        </div>
      </div>

      {store && (
        <ShipOrderDialog
          open={shipDialogOpen}
          onOpenChange={setShipDialogOpen}
          order={order}
          store={store}
          onShipped={handleShipped}
        />
      )}

      {/* Reject reason dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={(o) => { setRejectDialogOpen(o); if (!o) setRejectReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Order #{order.order_number}</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this order. This reason will be visible to the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter rejection reason (required)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason('')}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => {
                if (!rejectReason.trim()) { toast.error('Reason is required'); return; }
                setRejectDialogOpen(false);
                setRejectConfirmOpen(true);
              }}
            >
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject confirmation dialog */}
      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to reject this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Order <span className="font-semibold">#{order.order_number}</span> will be marked as{' '}
              <span className="font-semibold text-orange-700">Rejected</span> with reason:
              <br />
              <span className="mt-1 block italic text-foreground">"{rejectReason}"</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejecting} onClick={() => { setRejectConfirmOpen(false); setRejectDialogOpen(true); }}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleRejectConfirmed}
              disabled={rejecting}
            >
              {rejecting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Yes, Reject Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingStatus} onOpenChange={(o) => { if (!o) setPendingStatus(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Order Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status of order <span className="font-semibold">#{order.order_number}</span> to <span className="font-semibold capitalize">{pendingStatus}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Yes, Change Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel shipment on Shiprocket?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this shipment on Shiprocket? This will cancel the courier pickup request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingShipment}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelShipment} 
              disabled={cancellingShipment}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {cancellingShipment ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Yes, Cancel Shipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrderHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} orderId={order.id} />
    </div>
  );
};

export default OrderDetail;
