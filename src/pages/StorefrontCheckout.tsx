import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCart } from '@/hooks/useCart';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useFulfillment } from '@/hooks/useFulfillment';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, ChevronLeft, CreditCard, Banknote, Smartphone, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import PincodeChecker from '@/components/storefront/PincodeChecker';
import SEOHead from '@/components/storefront/SEOHead';
import { useTrackEvent } from '@/hooks/useTrackEvent';

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
  const { items, totalPrice, clearCart, fulfillmentMode, tableLabel } = useCart(slug || '');
  const { settings } = useFulfillment(store?.id);
  const { user } = useCustomerAuth(slug || '');
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{ number: string; trackingCode: string | null } | null>(null);
  const isGuestMode = fulfillmentMode === 'dine_in' || fulfillmentMode === 'takeaway';
  const [razorpayAvailable, setRazorpayAvailable] = useState(false);
  const [codRules, setCodRules] = useState<any | null>(null);
  const [priorOrders, setPriorOrders] = useState<number>(0);
  const { validateCoupon, incrementUsage, findBestAutoCoupon } = useValidateCoupon();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const track = useTrackEvent();
  useEffect(() => {
    if (store?.id && items.length > 0) {
      track({ store_id: store.id, event_type: 'checkout_start', value: totalPrice, metadata: { item_count: items.length } });
    }
    // Auto-apply best coupon (only if user hasn't applied one manually)
    (async () => {
      if (!store?.id || items.length === 0 || appliedCoupon) return;
      const cartLines = items.map((i) => ({ productId: i.productId, price: i.price, quantity: i.quantity }));
      const best = await findBestAutoCoupon(store.id, totalPrice, cartLines);
      if (best) {
        setAppliedCoupon({ id: best.coupon.id, code: best.coupon.code, discount: best.discount });
        setCouponCode(best.coupon.code);
        toast.success(`Auto-applied "${best.coupon.code}" — you save ₹${Math.round(best.discount).toLocaleString('en-IN')}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, items.length, totalPrice]);

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

  // Check if store has Razorpay configured (only `connected` flag is exposed publicly)
  useEffect(() => {
    const settings = store?.settings as any;
    if (settings?.razorpay?.connected || settings?.razorpay?.key_id) {
      setRazorpayAvailable(true);
    }
  }, [store]);

  // Force payment method to match fulfillment mode (dine-in = pay-at-counter only)
  useEffect(() => {
    if (fulfillmentMode === 'dine_in' && form.paymentMethod !== 'pay_at_counter') {
      setForm((f) => ({ ...f, paymentMethod: 'pay_at_counter' }));
    } else if (fulfillmentMode !== 'dine_in' && form.paymentMethod === 'pay_at_counter') {
      setForm((f) => ({ ...f, paymentMethod: 'cod' }));
    }
  }, [fulfillmentMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load COD rules + customer order history (for risk checks)
  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      const { data } = await supabase
        .from('cod_rules' as any)
        .select('*')
        .eq('store_id', store.id)
        .maybeSingle();
      setCodRules(data ?? null);

      if (user?.id) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('customer_user_id', user.id)
          .in('status', ['delivered', 'shipped', 'confirmed']);
        setPriorOrders(count ?? 0);
      } else {
        setPriorOrders(0);
      }
    })();
  }, [store?.id, user?.id]);

  // Determine if COD is allowed for this cart + form
  const codBlockedReason: string | null = (() => {
    if (!codRules) return null; // no rules configured = allow
    if (codRules.enabled === false) return 'Cash on Delivery is disabled by the seller';
    if (codRules.max_order_value && finalTotalForCheck() > Number(codRules.max_order_value))
      return `COD only available for orders up to ₹${Number(codRules.max_order_value).toLocaleString('en-IN')}`;
    if (codRules.min_order_value && finalTotalForCheck() < Number(codRules.min_order_value))
      return `Minimum order for COD is ₹${Number(codRules.min_order_value).toLocaleString('en-IN')}`;
    if (codRules.require_phone_verification && !user) return 'Please sign in to use Cash on Delivery';
    if (codRules.min_prior_orders > 0 && priorOrders < codRules.min_prior_orders)
      return `COD available only after ${codRules.min_prior_orders} successful order(s)`;
    if (form.pincode) {
      const pin = form.pincode.trim();
      if (codRules.pincode_blocklist?.includes(pin)) return 'COD not available for this pincode';
      if (codRules.pincode_allowlist?.length > 0 && !codRules.pincode_allowlist.includes(pin))
        return 'COD not available for this pincode';
    }
    if (form.phone && codRules.blocked_phones?.includes(form.phone.trim()))
      return 'COD is not available for this phone number';
    return null;
  })();
  function finalTotalForCheck() { return Math.max(0, totalPrice - (appliedCoupon?.discount || 0)); }


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
    const cartLines = items.map((i) => ({ productId: i.productId, price: i.price, quantity: i.quantity }));
    const result = await validateCoupon(store.id, couponCode, totalPrice, cartLines);
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

    const trackingCode = isGuestMode
      ? Math.random().toString(36).slice(2, 8).toUpperCase()
      : null;

    const paymentMethod = fulfillmentMode === 'dine_in' ? 'pay_at_counter' : form.paymentMethod;
    const paymentStatus = fulfillmentMode === 'dine_in'
      ? 'pending'
      : paymentMethod === 'cod' ? 'cod' : 'pending';

    const { data, error } = await supabase.from('orders').insert({
      store_id: store.id,
      order_number: orderNumber,
      items: orderItems,
      subtotal: totalPrice,
      tax: 0,
      shipping: fulfillmentMode === 'delivery' ? 0 : 0,
      total: finalTotal,
      notes: appliedCoupon ? `Coupon: ${appliedCoupon.code} (-₹${discount})` : null,
      customer_name: form.name || (fulfillmentMode === 'dine_in' ? `Table ${tableLabel ?? ''}`.trim() : ''),
      customer_email: form.email || null,
      customer_phone: form.phone || null,
      customer_address: fulfillmentMode === 'delivery' ? {
        address: form.address, city: form.city, state: form.state, pincode: form.pincode,
      } : null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: 'pending',
      customer_user_id: user?.id || null,
      fulfillment_mode: fulfillmentMode,
      table_label: tableLabel || null,
      prep_status: 'received',
      guest_tracking_code: trackingCode,
    } as any).select('id, order_number').single();

    if (error) throw error;

    // Save address to customer's profile (delivery + signed-in only)
    if (fulfillmentMode === 'delivery' && user?.id) {
      try {
        const { data: existing } = await supabase
          .from('customers')
          .select('saved_addresses')
          .eq('user_id', user.id)
          .eq('store_id', store.id)
          .maybeSingle();
        const current: any[] = Array.isArray(existing?.saved_addresses) ? existing!.saved_addresses as any[] : [];
        const normalize = (s: string) => (s || '').trim().toLowerCase();
        const duplicate = current.find((a: any) =>
          normalize(a.address) === normalize(form.address) &&
          normalize(a.pincode) === normalize(form.pincode) &&
          normalize(a.phone) === normalize(form.phone)
        );
        if (!duplicate) {
          const newAddr = {
            id: Date.now().toString(), label: 'Home', name: form.name,
            address: form.address, landmark: '', city: form.city, state: form.state,
            pincode: form.pincode, phone: form.phone, isDefault: current.length === 0,
          };
          await supabase.from('customers').upsert(
            { user_id: user.id, store_id: store.id, saved_addresses: [...current, newAddr] },
            { onConflict: 'user_id,store_id' }
          );
        }
      } catch (e) {
        console.warn('[checkout] failed to persist address to profile', e);
      }
    }

    return { ...data, guest_tracking_code: trackingCode };
  };


  const handleRazorpayPayment = async () => {
    setPlacing(true);
    try {
      // Customer must be signed in to use online payment (auth required by edge fn)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error('Please sign in to pay online, or choose Cash on Delivery.');
        navigate(`/store/${slug}/account?redirect=checkout`);
        setPlacing(false);
        return;
      }

      // 1. Create order in DB first
      const order = await createOrder();

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        setPlacing(false);
        return;
      }

      // 3. Create Razorpay order via edge function (authenticated)
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
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
          // 5. Verify payment (authenticated)
          const verifyRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/verify-razorpay-payment`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
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
            track({ store_id: store.id, event_type: 'purchase', order_id: order.id, value: totalPrice, metadata: { payment: 'razorpay' } });
            setOrderPlaced({ number: order.order_number, trackingCode: order.guest_tracking_code });
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
      track({ store_id: store.id, event_type: 'purchase', order_id: order.id, value: totalPrice, metadata: { payment: 'cod' } });
      setOrderPlaced({ number: order.order_number, trackingCode: order.guest_tracking_code });
    } catch (err) {
      console.error(err);
      toast.error('Failed to place order. Please try again.');
    }
    setPlacing(false);
  };

  const handlePlaceOrder = () => {
    if (items.length === 0) { toast.error('Your cart is empty'); return; }

    if (fulfillmentMode === 'dine_in') {
      if (settings.dine_in_requires_table && !tableLabel) {
        toast.error('Please scan your table QR code to place a dine-in order.');
        return;
      }
      handleCODOrder(); // pay-at-counter uses the same code path (no payment gateway)
      return;
    }

    if (fulfillmentMode === 'takeaway') {
      if (!form.phone || form.phone.length < 7) {
        toast.error('Please enter your phone number');
        return;
      }
      if (form.paymentMethod === 'cod') handleCODOrder();
      else handleRazorpayPayment();
      return;
    }

    // delivery (existing path)
    if (!user) {
      toast.error('Please sign in or create an account to place your order');
      navigate(`/store/${slug}/account/auth?redirect=checkout`);
      return;
    }
    if (!form.name || !form.phone || !form.address || !form.city || !form.pincode) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.paymentMethod === 'cod') {
      if (codBlockedReason) { toast.error(codBlockedReason); return; }
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
            {orderPlaced.number}
          </p>
          {tableLabel && (
            <p className="text-sm mb-2">Table <span className="font-semibold">{tableLabel}</span> · We'll bring it to you.</p>
          )}
          <p className="text-sm opacity-50 mb-8">
            {fulfillmentMode === 'dine_in' ? 'Your order has been sent to the kitchen.' :
             fulfillmentMode === 'takeaway' ? 'We\'ll text you when your order is ready for pickup.' :
             'We\'ll notify you when your order ships. Thank you!'}
          </p>
          {orderPlaced.trackingCode && (
            <Link
              to={`/track/${orderPlaced.trackingCode}`}
              className="inline-block px-6 py-2.5 text-sm font-semibold mr-2"
              style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}
            >
              Track Order →
            </Link>
          )}
          <Link
            to={fulfillmentMode === 'dine_in' || fulfillmentMode === 'takeaway' ? `/store/${slug}/menu` : `/store/${slug}`}
            className="inline-block px-6 py-2.5 text-sm font-semibold border"
            style={{ borderColor: colors.primary, color: colors.primary, borderRadius: `${borderRadius}px` }}
          >
            {fulfillmentMode === 'delivery' ? 'Continue Shopping' : 'Back to Menu'}
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

  const isDineIn = fulfillmentMode === 'dine_in';
  const isTakeaway = fulfillmentMode === 'takeaway';

  const paymentMethods = isDineIn
    ? [{ id: 'pay_at_counter', label: 'Pay at Counter', icon: Banknote, always: true, disabledReason: null as string | null }]
    : [
        { id: 'cod', label: 'Cash on Delivery', icon: Banknote, always: true, disabledReason: codBlockedReason },
        { id: 'upi', label: 'UPI (GPay, PhonePe, Paytm)', icon: Smartphone, always: false, disabledReason: null as string | null },
        { id: 'online', label: 'Cards & Net Banking', icon: CreditCard, always: false, disabledReason: null as string | null },
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

            {!isDineIn && !isTakeaway && (
              <>
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
                  if ((shipping?.configured || shipping?.api_token) && shipping?.pickup?.pincode) {
                    return (
                      <PincodeChecker
                        storeId={store.id}
                        colors={colors}
                        borderRadius={borderRadius}
                      />
                    );
                  }
                  return null;
                })()}
              </>
            )}

            {isDineIn && tableLabel && (
              <div
                className="flex items-center gap-2 p-3 text-sm"
                style={{ backgroundColor: colors.primary + '10', borderRadius: `${borderRadius / 2}px`, color: colors.primary }}
              >
                <span className="font-semibold">Table {tableLabel}</span>
                <span className="opacity-70">· We'll bring your order to your table.</span>
              </div>
            )}

            <h2 className="text-sm font-semibold mb-3 pt-3" style={{ fontFamily: fonts.heading }}>
              Payment Method
            </h2>
            <div className="space-y-2">
              {paymentMethods.map((pm) => {
                const disabled = (!pm.always && !razorpayAvailable) || !!pm.disabledReason;
                return (
                  <label
                    key={pm.id}
                    className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={{
                      borderColor: form.paymentMethod === pm.id ? colors.primary : colors.secondary,
                      borderRadius: `${borderRadius / 2}px`,
                      backgroundColor: form.paymentMethod === pm.id ? colors.primary + '10' : 'transparent',
                    }}
                    onClick={(e) => { if (disabled) e.preventDefault(); }}
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
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                      )}
                    </div>
                    <pm.icon className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="text-sm">{pm.label}</span>
                    {pm.disabledReason ? (
                      <span className="ml-auto text-[10px] opacity-70">{pm.disabledReason}</span>
                    ) : disabled && (
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
                  : isDineIn
                  ? 'Place Order (Pay at Counter)'
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
