import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Package, Truck, Wallet, ArrowLeft, Check, AlertTriangle } from 'lucide-react';
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
  const settings = store.settings as any;
  const shippingConfig = settings?.shipping;
  const isConfigured = !!shippingConfig?.configured && !!shippingConfig?.pickup?.pincode;

  const [step, setStep] = useState<'specs' | 'couriers'>('specs');
  const [weight, setWeight] = useState('100');
  const [length, setLength] = useState('15');
  const [breadth, setBreadth] = useState('15');
  const [height, setHeight] = useState('15');
  
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [shipping, setShipping] = useState(false);

  useEffect(() => {
    if (open && isConfigured) {
      setStep('specs');
      fetchWalletBalance();
    }
  }, [open, isConfigured]);

  const fetchWalletBalance = async () => {
    setLoadingBalance(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'get-wallet-balance',
          store_id: store.id
        }
      });
      if (error || !data) {
        console.error(error);
      } else {
        setWalletBalance(data.balance);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingBalance(false);
  };

  const handleFetchRates = async () => {
    setLoadingCouriers(true);
    setStep('couriers');
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const address = order.customer_address as unknown as CustomerAddress;
      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'get-courier-rates',
          store_id: store.id,
          delivery_pincode: address?.pincode || '',
          weight: (parseInt(weight) || 500) / 1000,
          cod: order.payment_method === 'cod' ? 1 : 0,
          length: parseInt(length) || 15,
          breadth: parseInt(breadth) || 15,
          height: parseInt(height) || 15,
          declared_value: order.total || 100
        }
      });

      if (error || !data || !data.couriers) {
        toast.error(error?.message || data?.error || 'Failed to fetch courier rates');
        setStep('specs');
      } else {
        const available = data.couriers || [];
        // Sort by rate ascending
        const sorted = [...available].sort((a, b) => Number(a.rate) - Number(b.rate));
        setCouriers(sorted);
        if (sorted.length > 0) {
          setSelectedCourier(sorted[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch courier rates');
      setStep('specs');
    }
    setLoadingCouriers(false);
  };

  // Find cheapest and fastest couriers in the list
  const cheapestCourierId = couriers.length > 0 ? couriers[0].courier_company_id : null;
  const fastestCourierId = couriers.length > 0 
    ? [...couriers].sort((a, b) => {
        const aDays = a.estimated_delivery_days ? parseInt(String(a.estimated_delivery_days)) : 99;
        const bDays = b.estimated_delivery_days ? parseInt(String(b.estimated_delivery_days)) : 99;
        return aDays - bDays;
      })[0].courier_company_id
    : null;

  const handleShip = async () => {
    if (!selectedCourier) {
      toast.error('Please select a courier partner');
      return;
    }

    setShipping(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const address = order.customer_address as unknown as CustomerAddress;
      const pickup = shippingConfig.pickup;

      const { data, error } = await supabase.functions.invoke('shiprocket-proxy', {
        body: {
          action: 'create-shipment',
          store_id: store.id,
          courier_id: selectedCourier.courier_company_id,
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
            length: parseInt(length) || 15,
            breadth: parseInt(breadth) || 15,
            height: parseInt(height) || 15,
            seller_name: store.name,
            pickup_name: shippingConfig.shiprocket_pickup_name || pickup.name || 'Primary',
            pickup_phone: pickup.phone,
            pickup_address: pickup.address,
            pickup_city: pickup.city,
            pickup_state: pickup.state,
            pickup_pincode: pickup.pincode,
          },
        },
      });

      if (error || !data || !data.waybill) {
        toast.error(error?.message || data?.error || 'Failed to create shipment');
        setShipping(false);
        return;
      }

      // Save waybill, provider, and shipment metadata to order
      const metadata = {
        shiprocket_order_id: data.order_id,
        shiprocket_shipment_id: data.shipment_id,
        courier_name: data.courier_name || selectedCourier.courier_name,
        courier_id: selectedCourier.courier_company_id,
        weight_grams: weight,
        dimensions: `${length}x${breadth}x${height} cm`,
        shipped_at: new Date().toISOString()
      };

      await supabase
        .from('orders')
        .update({ 
          courier_provider: 'shiprocket',
          tracking_number: data.waybill,
          status: 'shipped',
          courier_response: metadata as any
        } as any)
        .eq('id', order.id);

      toast.success(`Shipment created on Shiprocket! AWB: ${data.waybill}`);
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
            <DialogTitle>Shiprocket Not Configured</DialogTitle>
            <DialogDescription>
              Please add your Shiprocket API-User credentials and pickup address in Settings → Shipping before creating shipments.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Truck className="h-5 w-5 text-primary" /> Ship Order #{order.order_number}
          </DialogTitle>
          <DialogDescription>
            Configure package details and choose from available Shiprocket couriers
          </DialogDescription>
        </DialogHeader>

        {/* Wallet Balance Checker Widget */}
        <div className="flex items-center justify-between rounded-lg bg-secondary/40 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Shiprocket Wallet Balance:</span>
          </div>
          {loadingBalance ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : walletBalance !== null ? (
            <div className="flex items-center gap-1.5 font-semibold">
              <span className={walletBalance < 150 ? "text-destructive" : "text-emerald-600"}>
                ₹{walletBalance.toFixed(2)}
              </span>
              {walletBalance < 150 && (
                <span title="Low Balance! Shipments may fail.">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs italic">Unavailable</span>
          )}
        </div>

        {step === 'specs' ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-card p-3 space-y-1 text-xs">
              <p><strong>Recipient:</strong> {order.customer_name} ({order.customer_phone})</p>
              <p><strong>Destination Pincode:</strong> {(order.customer_address as any)?.pincode || 'N/A'}</p>
              <p><strong>Payment Mode:</strong> {order.payment_method?.toUpperCase() || 'N/A'}</p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Weight (grams)</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Length (cm)</Label>
                  <Input
                    type="number"
                    placeholder="15"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Breadth (cm)</Label>
                  <Input
                    type="number"
                    placeholder="15"
                    value={breadth}
                    onChange={(e) => setBreadth(e.target.value)}
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (cm)</Label>
                  <Input
                    type="number"
                    placeholder="15"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    min={1}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleFetchRates} disabled={loadingBalance}>
                Calculate Rates
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-3">
            <button 
              onClick={() => setStep('specs')} 
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to specifications
            </button>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Select Courier Partner</Label>
              {loadingCouriers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 border rounded-lg bg-muted/20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Checking courier serviceability...</span>
                </div>
              ) : couriers.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-destructive/5 text-destructive text-sm font-medium">
                  No couriers serviceable to destination pincode for the specified weight/dimensions.
                </div>
              ) : (
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-2">
                    {couriers.map((c) => {
                      const isSelected = selectedCourier?.courier_company_id === c.courier_company_id;
                      const isCheapest = c.courier_company_id === cheapestCourierId;
                      const isFastest = c.courier_company_id === fastestCourierId;
                      
                      return (
                        <div 
                          key={c.courier_company_id}
                          onClick={() => setSelectedCourier(c)}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                              : 'hover:bg-muted/30 border-muted'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{c.courier_name}</span>
                              {isCheapest && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1">Cheapest</Badge>}
                              {isFastest && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 px-1">Fastest</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ETA: {c.etd || `${c.estimated_delivery_days || '3-5'} days`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-foreground">₹{c.rate}</span>
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-white' : 'border-muted'}`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button 
                onClick={handleShip} 
                disabled={shipping || couriers.length === 0 || (walletBalance !== null && walletBalance < (selectedCourier?.rate || 0))}
              >
                {shipping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                Confirm & Ship (₹{selectedCourier?.rate || 0})
              </Button>
            </div>
            {walletBalance !== null && selectedCourier && walletBalance < selectedCourier.rate && (
              <p className="text-xs text-destructive text-center font-medium">
                Insufficient Shiprocket wallet balance to book this courier. Please recharge your wallet.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShipOrderDialog;
