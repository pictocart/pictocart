import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Package, Truck } from 'lucide-react';
import type { Order } from '@/hooks/useOrders';
import type { Store } from '@/hooks/useStore';

interface ShipOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  store: Store;
  onShipped: (waybill: string) => void;
}

interface CustomerAddress {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

const ShipOrderDialog = ({ open, onOpenChange, order, store, onShipped }: ShipOrderDialogProps) => {
  const [weight, setWeight] = useState('500');
  const [shipping, setShipping] = useState(false);

  const settings = store.settings as any;
  const shippingConfig = settings?.shipping;
  const isConfigured = !!shippingConfig?.api_token && !!shippingConfig?.pickup?.pincode;

  const handleShip = async () => {
    if (!isConfigured) {
      toast.error('Configure shipping settings first');
      return;
    }

    setShipping(true);
    try {
      const address = order.customer_address as unknown as CustomerAddress;
      const pickup = shippingConfig.pickup;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/delhivery-proxy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-shipment',
            api_token: shippingConfig.api_token,
            test_mode: shippingConfig.test_mode ?? true,
            shipment: {
              order_number: order.order_number,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              customer_address: address?.address || '',
              customer_city: address?.city || '',
              customer_state: address?.state || '',
              customer_pincode: address?.pincode || '',
              payment_mode: order.payment_method === 'cod' ? 'COD' : 'Pre-paid',
              cod_amount: order.payment_method === 'cod' ? order.total || 0 : 0,
              total_amount: order.total || 0,
              weight: parseInt(weight) || 500,
              seller_name: store.name,
              pickup_name: pickup.name,
              pickup_phone: pickup.phone,
              pickup_address: pickup.address,
              pickup_city: pickup.city,
              pickup_state: pickup.state,
              pickup_pincode: pickup.pincode,
            },
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.waybill) {
        toast.error(data.error || 'Failed to create shipment');
        setShipping(false);
        return;
      }

      toast.success(`Shipment created! AWB: ${data.waybill}`);
      onShipped(data.waybill);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create shipment');
    }
    setShipping(false);
  };

  if (!isConfigured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shipping Not Configured</DialogTitle>
            <DialogDescription>
              Please configure your Delhivery API token and pickup address in Settings → Shipping before creating shipments.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Ship Order #{order.order_number}
          </DialogTitle>
          <DialogDescription>
            Create a Delhivery shipment and get an AWB tracking number
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
            <p><strong>Customer:</strong> {order.customer_name}</p>
            <p><strong>Phone:</strong> {order.customer_phone}</p>
            <p><strong>Payment:</strong> {order.payment_method?.toUpperCase() || 'N/A'}</p>
            <p><strong>Total:</strong> ₹{order.total?.toLocaleString('en-IN')}</p>
          </div>

          <div className="space-y-2">
            <Label>Package Weight (grams)</Label>
            <Input
              type="number"
              placeholder="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min={1}
            />
            <p className="text-xs text-muted-foreground">
              Enter the total weight of the package in grams
            </p>
          </div>

          <div className="rounded-lg border p-3 space-y-1 text-sm">
            <p className="font-medium flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> Pickup from
            </p>
            <p className="text-muted-foreground">
              {shippingConfig.pickup.address}, {shippingConfig.pickup.city}, {shippingConfig.pickup.state} - {shippingConfig.pickup.pincode}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleShip} disabled={shipping}>
            {shipping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
            Create Shipment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShipOrderDialog;
