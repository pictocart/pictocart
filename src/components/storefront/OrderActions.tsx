import { Link, useParams } from 'react-router-dom';
import { Eye, Truck, Download, XCircle, Undo2, Repeat2, ShoppingCart, MessageCircle, Star, Loader2 } from 'lucide-react';
import { useOrderEligibility } from '@/hooks/useOrderEligibility';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import RequestReturnButton from './RequestReturnButton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSubmitReview } from '@/hooks/useReviews';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

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
  const hasAnyActiveReturnOrExchange = !!order.returns?.some((r: any) => r.status !== 'cancelled') || !!elig?.existingReturnId || !!elig?.existingExchangeId;
  const existingReturnId = order.returns?.find((r: any) => r.request_type === 'return' && r.status !== 'cancelled')?.id || elig?.existingReturnId;
  const existingExchangeId = order.returns?.find((r: any) => r.request_type === 'exchange' && r.status !== 'cancelled')?.id || elig?.existingExchangeId;

  // Debug: log if there's an error
  if (error) {
    console.error('OrderEligibility error:', error);
  }

  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedProductIdx, setSelectedProductIdx] = useState(0);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const submitReview = useSubmitReview();
  const { user } = useCustomerAuth(slug || '');
  const items = Array.isArray(order.items) ? order.items : [];

  const handleReviewSubmit = async () => {
    if (!user?.id) {
      toast.error("Please log in to submit a review");
      return;
    }
    const item = items[selectedProductIdx];
    if (!item || !item.product_id) {
      toast.error("Invalid product selected");
      return;
    }
    setSubmittingReview(true);
    try {
      await submitReview.mutateAsync({
        store_id: order.store_id,
        product_id: item.product_id.replace(/-theme-style-\d+$/, ''),
        user_id: user.id,
        rating,
        title: reviewTitle,
        body: reviewBody,
      });
      toast.success("Review submitted for moderation!");
      setReviewOpen(false);
      // Reset form
      setReviewTitle('');
      setReviewBody('');
      setRating(5);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    const updates: any = { status: 'cancelled' as any };
    if (order.payment_status === 'paid') {
      updates.payment_status = 'refund_requested';
    }
    const { error } = await supabase.from('orders').update(updates).eq('id', order.id);
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
    window.open(`/invoices/${order.id}/print`, '_blank');
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

        {/* {canExchange && (
          <RequestReturnButton order={order} primaryColor={primaryColor} mode="exchange" />
        )} */}

        <Link to={`/store/${slug}/contact`} className={btn}>
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

      {elig.canReturn && !hasAnyActiveReturnOrExchange && (
        <RequestReturnButton order={order} primaryColor={primaryColor} mode="return" />
      )}

      {/* {elig.canExchange && !hasAnyActiveReturnOrExchange && (
        <RequestReturnButton order={order} primaryColor={primaryColor} mode="exchange" />
      )} */}

      {existingReturnId && (
        <Link to={`/store/${slug}/account/returns/${existingReturnId}`} className={btn}>
          <Undo2 className="h-3.5 w-3.5" /> View Return
        </Link>
      )}

      {/* {existingExchangeId && (
        <Link to={`/store/${slug}/account/returns/${existingExchangeId}`} className={btn}>
          <Repeat2 className="h-3.5 w-3.5" /> View Exchange
        </Link>
      )} */}

      {elig.canReview && (
        <>
          <button 
            type="button" 
            onClick={() => setReviewOpen(true)} 
            className={btn}
            style={{ borderColor: primaryColor + '40', color: primaryColor }}
          >
            <Star className="h-3.5 w-3.5" /> Write Review
          </button>

          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogContent 
              className="sm:max-w-md max-h-[90vh] overflow-y-auto"
              style={{ 
                background: "var(--bg, #ffffff)", 
                color: "var(--fg, #111827)", 
                borderColor: "var(--bd, #e5e7eb)" 
              }}
            >
              <DialogHeader>
                <DialogTitle style={{ color: "var(--fg, #111827)" }}>Write a Review</DialogTitle>
                <DialogDescription style={{ color: "var(--fg, #111827)", opacity: 0.7 }}>
                  Share your experience with this purchase to help other shoppers.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Product Selector if multiple products exist in the order */}
                {items.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: "var(--fg, #111827)" }}>Select Product</label>
                    <select 
                      value={selectedProductIdx} 
                      onChange={(e) => setSelectedProductIdx(Number(e.target.value))} 
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      style={{ background: "var(--bg, #ffffff)", color: "var(--fg, #111827)", borderColor: "var(--bd, #e5e7eb)" }}
                    >
                      {items.map((it: any, i: number) => (
                        <option key={i} value={i} style={{ background: "var(--bg, #ffffff)", color: "var(--fg, #111827)" }}>
                          {it.title || 'Product'} (Qty {it.quantity || 1})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rating selection (Stars) */}
                <div className="space-y-2 text-center">
                  <label className="text-sm font-medium block text-left" style={{ color: "var(--fg, #111827)" }}>Rating</label>
                  <div className="flex gap-1.5 justify-center py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star
                          className="h-8 w-8"
                          style={{
                            fill: star <= rating ? "var(--p, #6366f1)" : "transparent",
                            color: star <= rating ? "var(--p, #6366f1)" : "var(--bd, #e5e7eb)",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "var(--fg, #111827)" }}>Review Title (optional)</label>
                  <Input 
                    value={reviewTitle} 
                    onChange={(e) => setReviewTitle(e.target.value)} 
                    placeholder="Summarize your experience…" 
                    style={{ background: "var(--bg, #ffffff)", color: "var(--fg, #111827)", borderColor: "var(--bd, #e5e7eb)" }}
                  />
                </div>

                {/* Review Body */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "var(--fg, #111827)" }}>Review Details</label>
                  <Textarea 
                    value={reviewBody} 
                    onChange={(e) => setReviewBody(e.target.value)} 
                    placeholder="What did you like or dislike? How was the quality?…" 
                    rows={4}
                    style={{ background: "var(--bg, #ffffff)", color: "var(--fg, #111827)", borderColor: "var(--bd, #e5e7eb)" }}
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--bd, #e5e7eb)" }}>
                  <Button variant="outline" onClick={() => setReviewOpen(false)} style={{ color: "var(--fg, #111827)", borderColor: "var(--bd, #e5e7eb)", background: "transparent" }}>
                    Cancel
                  </Button>
                  <Button onClick={handleReviewSubmit} disabled={submittingReview} style={{ background: "var(--p, #6366f1)", color: "var(--pf, #ffffff)" }}>
                    {submittingReview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit Review
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {elig.canBuyAgain && (
        <button onClick={buyAgain} className={btn} style={{ borderColor: primaryColor + '40', color: primaryColor }}>
          <ShoppingCart className="h-3.5 w-3.5" /> Buy Again
        </button>
      )}

      <Link to={`/store/${slug}/contact`} className={btn}>
        <MessageCircle className="h-3.5 w-3.5" /> Support
      </Link>
    </div>
  );
};

export default OrderActions;
