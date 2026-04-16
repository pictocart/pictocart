import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCart } from '@/hooks/useCart';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, ChevronLeft, CreditCard, Banknote, Smartphone, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import PincodeChecker from '@/components/storefront/PincodeChecker';
import SEOHead from '@/components/storefront/SEOHead';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const StorefrontCheckout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { store, loading } = useStorefront(slug || '');
  const { items, totalPrice, clearCart } = useCart(slug || '');
  const { user } = useCustomerAuth(slug || '');
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [razorpayAvailable, setRazorpayAvailable] = useState(false);
  const { validateCoupon, incrementUsage } = useValidateCoupon();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'cod',
  });

  // Check if store has Razorpay configured
  useEffect(() => {
    const settings = store?.settings as any;
    if (settings?.razorpay?.key_id) {
      setRazorpayAvailable(true);
    }
  }, [store]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) return null;

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;

  const handleField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const discount = appliedCoupon?.discount || 0;
  const finalTotal = Math.max(0, totalPrice - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const result = await validateCoupon(store.id, couponCode, totalPrice);
    if (result.valid && result.coupon) {
      setAppliedCoupon({ id: result.coupon.id, code: result.coupon.code, discount: result.discount! });
      toast.success(`Coupon applied! You save ₹${result.discount!.toLocaleString('en-IN')}`);
    } else {
      toast.error(result.error || 'Invalid coupon');
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const createOrder = async () => {
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const orderItems = items.map((i) => ({
      product_id: i.productId,
      title: i.title,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
      variant: i.variant || null,
    }));

    const { data, error } = await supabase.from('orders').insert({
      store_id: store.id,
      order_number: orderNumber,
      items: orderItems,
      subtotal: totalPrice,
      tax: 0,
      shipping: 0,
      total: finalTotal,
      notes: appliedCoupon ? `Coupon: ${appliedCoupon.code} (-₹${discount})` : null,
      customer_name: form.name,
      customer_email: form.email || null,
      customer_phone: form.phone,
      customer_address: {
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      },
      payment_method: form.paymentMethod,
      payment_status: form.paymentMethod === 'cod' ? 'cod' : 'pending',
      status: 'pending',
      customer_user_id: user?.id || null,
    } as any).select('id, order_number').single();

    if (error) throw error;
    return data;
  };

  const handleRazorpayPayment = async () => {
    setPlacing(true);
    try {
      // 1. Create order in DB first
      const order = await createOrder();

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        setPlacing(false);
        return;
      }

      // 3. Create Razorpay order via edge function
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-razorpay-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: store.id,
            amount: finalTotal,
            order_number: order.order_number,
            customer_name: form.name,
            customer_email: form.email,
            customer_phone: form.phone,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Payment gateway error');
        setPlacing(false);
        return;
      }

      const { razorpay_order_id, razorpay_key_id } = await res.json();

      // 4. Open Razorpay checkout modal
      const options = {
        key: razorpay_key_id,
        amount: Math.round(finalTotal * 100),
        currency: 'INR',
        name: store.name,
        description: `Order ${order.order_number}`,
        order_id: razorpay_order_id,
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: colors.primary },
        handler: async (response: any) => {
          // 5. Verify payment
          const verifyRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/verify-razorpay-payment`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: order.id,
                store_id: store.id,
              }),
            }
          );

          if (verifyRes.ok) {
            if (appliedCoupon) await incrementUsage(appliedCoupon.id);
            // Send email notifications
            const pid = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            fetch(`https://${pid}.supabase.co/functions/v1/send-order-notification`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'order_confirmed', order_id: order.id, store_id: store.id }),
            }).catch(() => {});
            fetch(`https://${pid}.supabase.co/functions/v1/send-order-notification`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'new_order_seller', order_id: order.id, store_id: store.id }),
            }).catch(() => {});
            clearCart();
            setOrderPlaced(order.order_number);
          } else {
            toast.error('Payment verification failed. Contact support.');
          }
          setPlacing(false);
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. Your order is saved — you can pay later.');
            setPlacing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
      setPlacing(false);
    }
  };

  const handleCODOrder = async () => {
    setPlacing(true);
    try {
      const order = await createOrder();
      if (appliedCoupon) await incrementUsage(appliedCoupon.id);
      // Send notification
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/send-order-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'order_confirmed', order_id: order.id, store_id: store.id }),
      }).catch(() => {});
      fetch(`https://${projectId}.supabase.co/functions/v1/send-order-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_order_seller', order_id: order.id, store_id: store.id }),
      }).catch(() => {});
      clearCart();
      setOrderPlaced(order.order_number);
    } catch (err) {
      console.error(err);
      toast.error('Failed to place order. Please try again.');
    }
    setPlacing(false);
  };

  const handlePlaceOrder = () => {
    if (!form.name || !form.phone || !form.address || !form.city || !form.pincode) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (form.paymentMethod === 'cod') {
      handleCODOrder();
    } else {
      handleRazorpayPayment();
    }
  };

  if (orderPlaced) {
    return (
      <StorefrontLayout store={store}>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div
            className="h-16 w-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.primary + '20' }}
          >
            <Check className="h-8 w-8" style={{ color: colors.primary }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>
            Order Placed Successfully!
          </h1>
          <p className="text-sm opacity-60 mb-2">Your order number is</p>
          <p className="text-lg font-bold mb-6" style={{ color: colors.primary }}>
            {orderPlaced}
          </p>
          <p className="text-sm opacity-50 mb-8">
            We'll notify you when your order ships. Thank you for shopping with us!
          </p>
          <Link
            to={`/store/${slug}`}
            className="inline-block px-6 py-2.5 text-sm font-semibold"
            style={{
              backgroundColor: colors.primary,
              color: '#fff',
              borderRadius: `${borderRadius}px`,
            }}
          >
            Continue Shopping
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  const inputStyle = {
    backgroundColor: colors.card,
    borderColor: colors.secondary,
    borderRadius: `${borderRadius / 2}px`,
    color: colors.text,
  };

  const paymentMethods = [
    { id: 'cod', label: 'Cash on Delivery', icon: Banknote, always: true },
    { id: 'upi', label: 'UPI (GPay, PhonePe, Paytm)', icon: Smartphone, always: false },
    { id: 'online', label: 'Cards & Net Banking', icon: CreditCard, always: false },
  ];

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to={`/store/${slug}/cart`}
          className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back to cart
        </Link>

        <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: fonts.heading }}>
          Checkout
        </h1>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Form */}
          <div className="md:col-span-3 space-y-5">
            <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: fonts.heading }}>
              Contact Information
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Full Name *"
                value={form.name}
                onChange={(e) => handleField('name', e.target.value)}
                className="col-span-2 w-full px-3 py-2.5 text-sm border"
                style={inputStyle}
              />
              <input
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) => handleField('phone', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border"
                style={inputStyle}
              />
              <input
                placeholder="Email"
                value={form.email}
                onChange={(e) => handleField('email', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border"
                style={inputStyle}
              />
            </div>

            <h2 className="text-sm font-semibold mb-3 pt-3" style={{ fontFamily: fonts.heading }}>
              Shipping Address
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Address *"
                value={form.address}
                onChange={(e) => handleField('address', e.target.value)}
                className="col-span-2 w-full px-3 py-2.5 text-sm border"
                style={inputStyle}
              />
              <input
                placeholder="City *"
                value={form.city}
                onChange={(e) => handleField('city', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border"
                style={inputStyle}
              />
              <input
                placeholder="State"
                value={form.state}
                onChange={(e) => handleField('state', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border"
                style={inputStyle}
              />
              <input
                placeholder="Pincode *"
                value={form.pincode}
                onChange={(e) => handleField('pincode', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border"
                style={inputStyle}
              />
            </div>

            {/* Pincode Delivery Check */}
            {(() => {
              const settings = store?.settings as any;
              const shipping = settings?.shipping;
              if (shipping?.api_token && shipping?.pickup?.pincode) {
                return (
                  <PincodeChecker
                    storeId={store.id}
                    apiToken={shipping.api_token}
                    testMode={shipping.test_mode ?? true}
                    originPincode={shipping.pickup.pincode}
                    colors={colors}
                    borderRadius={borderRadius}
                  />
                );
              }
              return null;
            })()}

            <h2 className="text-sm font-semibold mb-3 pt-3" style={{ fontFamily: fonts.heading }}>
              Payment Method
            </h2>
            <div className="space-y-2">
              {paymentMethods.map((pm) => {
                const disabled = !pm.always && !razorpayAvailable;
                return (
                  <label
                    key={pm.id}
                    className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={{
                      borderColor: form.paymentMethod === pm.id ? colors.primary : colors.secondary,
                      borderRadius: `${borderRadius / 2}px`,
                      backgroundColor: form.paymentMethod === pm.id ? colors.primary + '10' : 'transparent',
                    }}
                    onClick={(e) => {
                      if (disabled) e.preventDefault();
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={pm.id}
                      checked={form.paymentMethod === pm.id}
                      onChange={(e) => !disabled && handleField('paymentMethod', e.target.value)}
                      disabled={disabled}
                      className="sr-only"
                    />
                    <div
                      className="h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: form.paymentMethod === pm.id ? colors.primary : colors.secondary }}
                    >
                      {form.paymentMethod === pm.id && (
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: colors.primary }}
                        />
                      )}
                    </div>
                    <pm.icon className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="text-sm">{pm.label}</span>
                    {disabled && (
                      <span className="ml-auto text-[10px] opacity-60">Not available</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-2">
            <div
              className="p-4 space-y-4 sticky top-24"
              style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
            >
              <h2 className="text-sm font-semibold" style={{ fontFamily: fonts.heading }}>
                Order Summary
              </h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={`${item.productId}_${item.variant || ''}`} className="flex justify-between text-sm">
                    <span className="truncate pr-2">{item.title} × {item.quantity}</span>
                    <span className="shrink-0 font-medium">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Code */}
              <div className="pt-2">
                {appliedCoupon ? (
                  <div
                    className="flex items-center justify-between p-2 text-sm"
                    style={{ backgroundColor: colors.primary + '15', borderRadius: `${borderRadius / 2}px` }}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5" style={{ color: colors.primary }} />
                      <span className="font-mono font-medium">{appliedCoupon.code}</span>
                      <span style={{ color: colors.primary }}>-₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
                    </div>
                    <button onClick={removeCoupon} className="opacity-60 hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 text-sm border font-mono"
                      style={inputStyle}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-3 py-2 text-xs font-semibold disabled:opacity-40"
                      style={{
                        backgroundColor: colors.primary,
                        color: '#fff',
                        borderRadius: `${borderRadius / 2}px`,
                      }}
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-2 border-t" style={{ borderColor: colors.text + '15' }}>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm" style={{ color: colors.primary }}>
                    <span>Discount</span>
                    <span>-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2">
                  <span>Total</span>
                  <span style={{ color: colors.primary }}>₹{finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  backgroundColor: colors.primary,
                  color: '#fff',
                  borderRadius: `${borderRadius}px`,
                }}
              >
                {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {placing
                  ? 'Processing...'
                  : form.paymentMethod === 'cod'
                  ? 'Place Order (COD)'
                  : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default StorefrontCheckout;
