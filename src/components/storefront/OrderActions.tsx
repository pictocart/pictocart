import { Link, useParams } from 'react-router-dom';
import { Eye, Truck, Download, XCircle, Undo2, Repeat2, ShoppingCart, MessageCircle, Star, Loader2 } from 'lucide-react';
import { useOrderEligibility } from '@/hooks/useOrderEligibility';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import RequestReturnButton from './RequestReturnButton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Props {
  order: any;
  primaryColor?: string;
  variant?: 'inline' | 'stacked';
  onChanged?: () => void;
}

const btn = "text-xs font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed";

const OrderActions = ({ order, primaryColor = '#6366f1', variant = 'inline', onChanged }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const { data: elig, isLoading, error } = useOrderEligibility(order.id);
  const [cancelling, setCancelling] = useState(false);

  // Debug: log if there's an error
  if (error) {
    console.error('OrderEligibility error:', error);
  }

  const cancel = async () => {
    setCancelling(true);
    const { error } = await supabase.from('orders').update({ status: 'cancelled' as any }).eq('id', order.id);
    setCancelling(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Order cancelled');
    onChanged?.();
  };

  const buyAgain = () => {
    // Add first item to cart-like localStorage; storefront cart is per-store
    try {
      const key = `cart_${order.store_id}`;
      const raw = localStorage.getItem(key);
      const cart = raw ? JSON.parse(raw) : [];
      (order.items || []).forEach((it: any) => {
        cart.push({ ...it });
      });
      localStorage.setItem(key, JSON.stringify(cart));
      toast.success('Items added to cart');
    } catch {
      toast.error('Could not add to cart');
    }
  };

  const downloadInvoice = async () => {
    // Reuse existing invoice URL if present; otherwise open printable page
    if ((order as any).invoice_url) {
      window.open((order as any).invoice_url, '_blank');
      return;
    }
    window.print();
  };

  if (isLoading) {
    return <span className="text-xs opacity-40 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading actions…</span>;
  }

  // If error or no data, show basic actions as fallback with client-side logic
  if (!elig || error) {
    console.warn('Order eligibility unavailable, using client-side fallback');
    const wrapCls = variant === 'stacked' ? 'flex flex-col gap-2 items-stretch' : 'flex flex-wrap items-center gap-2';
    
    // Simple client-side eligibility
    const canCancel = ['pending', 'new', 'confirmed', 'processing', 'packed'].includes(order.status);
    const canTrack = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes(order.status);
    const isDelivered = order.status === 'delivered' || order.delivered_at;
    const canReturn = isDelivered && order.payment_status !== 'refunded';
    const canExchange = isDelivered;
    
    return (
      <div className={wrapCls}>
        <Link to={`/store/${slug}/account/orders/${order.id}`} className={btn} style={{ borderColor: primaryColor + '40', color: primaryColor }}>
          <Eye className="h-3.5 w-3.5" /> View Details
        </Link>

        {canTrack && (
          <Link to={`/store/${slug}/account/orders/${order.id}`} className={btn}>
            <Truck className="h-3.5 w-3.5" /> Track Order
          </Link>
        )}

        {order.payment_status === 'paid' && (
          <button onClick={downloadInvoice} className={btn}>
            <Download className="h-3.5 w-3.5" /> Invoice
          </button>
        )}

        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className={btn} style={{ borderColor: '#ef444440', color: '#ef4444' }}>
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  Order {order.order_number} will be cancelled. If already paid, refund will be initiated per store policy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Order</AlertDialogCancel>
                <AlertDialogAction disabled={cancelling} onClick={cancel}>
                  {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {canReturn && (
          <RequestReturnButton order={order} primaryColor={primaryColor} mode="return" />
        )}

        {canExchange && (
          <RequestReturnButton order={order} primaryColor={primaryColor} mode="exchange" />
        )}

        <Link to={`/store/${slug}/account/support?order=${order.id}`} className={btn}>
          <MessageCircle className="h-3.5 w-3.5" /> Support
        </Link>
      </div>
    );
  }

  const wrapCls = variant === 'stacked' ? 'flex flex-col gap-2 items-stretch' : 'flex flex-wrap items-center gap-2';

  const canCancel = ['pending', 'confirmed', 'new'].includes(order.status);
  const canReturn = order.status === 'delivered';
  const canExchange = order.status === 'delivered';

  return (
    <div className={wrapCls}>
      <Link to={`/store/${slug}/account/orders/${order.id}`} className={btn} style={{ borderColor: primaryColor + '40', color: primaryColor }}>
        <Eye className="h-3.5 w-3.5" /> View Details
      </Link>

      {elig.canTrack && (
        <Link to={`/store/${slug}/account/orders/${order.id}`} className={btn}>
          <Truck className="h-3.5 w-3.5" /> Track Order
        </Link>
      )}

      {elig.canDownloadInvoice && (
        <button onClick={downloadInvoice} className={btn}>
          <Download className="h-3.5 w-3.5" /> Invoice
        </button>
      )}

      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className={btn} style={{ borderColor: '#ef444440', color: '#ef4444' }}>
              <XCircle className="h-3.5 w-3.5" /> Cancel Order
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
              <AlertDialogDescription>
                Order {order.order_number} will be cancelled. If already paid, refund will be initiated per store policy.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Order</AlertDialogCancel>
              <AlertDialogAction disabled={cancelling} onClick={cancel}>
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {canReturn ? (
        <RequestReturnButton order={order} primaryColor={primaryColor} mode="return" />
      ) : elig.status === 'delivered' && elig.returnReason ? (
        <button className={btn} disabled title={elig.returnReason || undefined}>
          <Undo2 className="h-3.5 w-3.5" /> Return
        </button>
      ) : null}

      {canExchange ? (
        <RequestReturnButton order={order} primaryColor={primaryColor} mode="exchange" />
      ) : elig.status === 'delivered' && elig.exchangeReason ? (
        <button className={btn} disabled title={elig.exchangeReason || undefined}>
          <Repeat2 className="h-3.5 w-3.5" /> Exchange
        </button>
      ) : null}

      {elig.existingReturnId && (
        <Link to={`/store/${slug}/account/returns/${elig.existingReturnId}`} className={btn}>
          <Undo2 className="h-3.5 w-3.5" /> View Return
        </Link>
      )}

      {elig.canReview && (
        <Link to={`/store/${slug}/account/orders/${order.id}#review`} className={btn}>
          <Star className="h-3.5 w-3.5" /> Write Review
        </Link>
      )}

      {elig.canBuyAgain && (
        <button onClick={buyAgain} className={btn} style={{ borderColor: primaryColor + '40', color: primaryColor }}>
          <ShoppingCart className="h-3.5 w-3.5" /> Buy Again
        </button>
      )}

      <Link to={`/store/${slug}/account/support?order=${order.id}`} className={btn}>
        <MessageCircle className="h-3.5 w-3.5" /> Support
      </Link>
    </div>
  );
};

export default OrderActions;
