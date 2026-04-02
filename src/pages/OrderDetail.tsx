import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder, useOrders, ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus } from '@/hooks/useOrders';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, MapPin, Phone, Mail, Package, Truck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ShipOrderDialog from '@/components/orders/ShipOrderDialog';
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

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading, refetch } = useOrder(id);
  const { updateStatus } = useOrders();
  const { store } = useStore();
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

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

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ id: order.id, status: status as OrderStatus });
  };

  const handleShipped = async (waybill: string) => {
    // Save tracking number and update status to shipped
    await supabase
      .from('orders')
      .update({ tracking_number: waybill, status: 'shipped' })
      .eq('id', order.id);
    refetch();
    toast.success('Order marked as shipped');
  };

  const handleTrack = async () => {
    if (!order.tracking_number) return;
    const settings = store?.settings as any;
    const shippingConfig = settings?.shipping;
    if (!shippingConfig?.api_token) {
      toast.error('Configure shipping settings first');
      return;
    }
    setTrackingLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/delhivery-proxy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'track',
            api_token: shippingConfig.api_token,
            test_mode: shippingConfig.test_mode ?? true,
            waybill: order.tracking_number,
          }),
        }
      );
      const data = await res.json();
      setTrackingData(data);
    } catch {
      toast.error('Failed to fetch tracking info');
    }
    setTrackingLoading(false);
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
            <h1 className="text-xl font-bold tracking-tight">Order #{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!order.tracking_number && store && (
            <Button variant="outline" size="sm" onClick={() => setShipDialogOpen(true)}>
              <Truck className="h-4 w-4 mr-1" /> Ship Order
            </Button>
          )}
          <Select value={order.status || 'pending'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
          {order.tracking_number && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" /> Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    AWB: <span className="font-medium font-mono">{order.tracking_number}</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={handleTrack} disabled={trackingLoading}>
                    {trackingLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Track
                  </Button>
                </div>
                {trackingData && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline">{trackingData.status}</Badge>
                    </div>
                    {trackingData.location && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Location</span>
                        <span>{trackingData.location}</span>
                      </div>
                    )}
                    {trackingData.expected_delivery && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expected Delivery</span>
                        <span>{trackingData.expected_delivery}</span>
                      </div>
                    )}
                    {trackingData.scans?.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Recent Scans</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {trackingData.scans.slice(0, 5).map((scan: any, i: number) => (
                            <div key={i} className="text-xs p-2 rounded bg-muted">
                              <span className="font-medium">{scan?.ScanDetail?.Scan || 'Scan'}</span>
                              {scan?.ScanDetail?.ScannedLocation && (
                                <span className="text-muted-foreground ml-1">— {scan.ScanDetail.ScannedLocation}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
            <CardContent className="space-y-2 text-sm">
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
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
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
    </div>
  );
};

export default OrderDetail;
