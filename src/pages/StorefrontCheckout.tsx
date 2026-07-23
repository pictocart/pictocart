import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { useCart } from '@/hooks/useCart';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useFulfillment } from '@/hooks/useFulfillment';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, ChevronLeft, CreditCard, Banknote, Smartphone, Tag, X, Phone, MessageCircle } from 'lucide-react';
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
  const { items, totalPrice, clearCart, fulfillmentMode, tableLabel, appliedCoupon, setAppliedCoupon, clearCoupon } = useCart(slug || '');
  const { settings } = useFulfillment(store?.id);
  
  // Destructure auth methods from hook
  const { user, signInWithEmail, signUpWithEmail } = useCustomerAuth(slug || '');
  
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{ number: string; trackingCode: string | null } | null>(null);
  const isGuestMode = fulfillmentMode === 'dine_in' || fulfillmentMode === 'takeaway';
  const [razorpayAvailable, setRazorpayAvailable] = useState(false);
  const [codRules, setCodRules] = useState<any | null>(null);
  const [priorOrders, setPriorOrders] = useState<number>(0);
  const [phoneCodBlocked, setPhoneCodBlocked] = useState(false);
  const { validateCoupon, incrementUsage, findBestAutoCoupon } = useValidateCoupon();
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || '');
  const [couponLoading, setCouponLoading] = useState(false);
  
  // Checkout Multi-step, Saved Addresses & Delivery Instructions states
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(true);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Login Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const track = useTrackEvent();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const { error } = await signUpWithEmail(authEmail, authPassword, authName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created and logged in!');
          setShowLoginModal(false);
        }
      } else {
        const { error } = await signInWithEmail(authEmail, authPassword);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Logged in successfully!');
          setShowLoginModal(false);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!user && !isGuestMode && store) {
      setShowLoginModal(true);
    }
  }, [user, isGuestMode, store]);

  // Load Saved Addresses
  useEffect(() => {
    if (!user || !store) {
      setSavedAddresses([]);
      return;
    }
    supabase
      .from('customers')
      .select('saved_addresses')
      .eq('user_id', user.id)
      .eq('store_id', store.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.saved_addresses && Array.isArray(data.saved_addresses)) {
          const list = data.saved_addresses as any[];
          setSavedAddresses(list);
          const def = list.find((a: any) => a.isDefault);
          if (def) {
            setSelectedAddressId(def.id);
            setShowNewAddressForm(false);
            setForm((f) => ({
              ...f,
              name: def.name || '',
              phone: def.phone || '',
              house: def.house || '',
              street: def.street || '',
              landmark: def.landmark || '',
              city: def.city || '',
              state: def.state || '',
              pincode: def.pincode || '',
              addressType: def.label?.toLowerCase() === 'home' ? 'home' : def.label?.toLowerCase() === 'office' ? 'office' : 'other',
            }));
          } else if (list.length > 0) {
            setSelectedAddressId(list[0].id);
            setShowNewAddressForm(false);
            const first = list[0];
            setForm((f) => ({
              ...f,
              name: first.name || '',
              phone: first.phone || '',
              house: first.house || '',
              street: first.street || '',
              landmark: first.landmark || '',
              city: first.city || '',
              state: first.state || '',
              pincode: first.pincode || '',
              addressType: first.label?.toLowerCase() === 'home' ? 'home' : first.label?.toLowerCase() === 'office' ? 'office' : 'other',
            }));
          }
        }
      });
  }, [user, store]);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setShowNewAddressForm(false);
    setForm((f) => ({
      ...f,
      name: addr.name || f.name,
      phone: addr.phone || f.phone,
      house: addr.house || '',
      street: addr.street || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      addressType: addr.label?.toLowerCase() === 'home' ? 'home' : addr.label?.toLowerCase() === 'office' ? 'office' : 'other',
    }));
  };

  const handleChooseNewAddress = () => {
    setSelectedAddressId(null);
    setShowNewAddressForm(true);
    setForm((f) => ({
      ...f,
      house: '',
      street: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      addressType: 'home',
    }));
  };

  const steps = isGuestMode 
    ? [{ step: 1, label: 'Contact Details' }, { step: 3, label: 'Payment & Notes' }]
    : [{ step: 1, label: 'Contact Details' }, { step: 2, label: 'Delivery Address' }, { step: 3, label: 'Payment & Notes' }];

  const validateStep1 = () => {
    if (!form.name.trim()) { toast.error('Please enter your full name'); return false; }
    if (!form.phone.trim() || form.phone.length < 10) { toast.error('Please enter a valid phone number'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (isGuestMode) return true;
    if (!showNewAddressForm) {
      if (!selectedAddressId) { toast.error('Please select a delivery address'); return false; }
      return true;
    }
    if (!form.house.trim()) { toast.error('Please enter House/Flat No.'); return false; }
    if (!form.street.trim()) { toast.error('Please enter Street/Area'); return false; }
    if (!form.city.trim()) { toast.error('Please enter City'); return false; }
    if (!form.pincode.trim() || form.pincode.length !== 6) { toast.error('Please enter a valid 6-digit Pincode'); return false; }
    return true;
  };

  const nextStep = () => {
    if (checkoutStep === 1) {
      if (validateStep1()) {
        setCheckoutStep(isGuestMode ? 3 : 2);
      }
    } else if (checkoutStep === 2) {
      if (validateStep2()) {
        setCheckoutStep(3);
      }
    }
  };

  const prevStep = () => {
    if (checkoutStep === 3) {
      setCheckoutStep(isGuestMode ? 1 : 2);
    } else if (checkoutStep === 2) {
      setCheckoutStep(1);
    }
  };

  useEffect(() => {
    if (store?.id && items.length > 0) {
      track({ store_id: store.id, event_type: 'checkout_start', value: totalPrice, metadata: { item_count: items.length } });
    }
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
  }, [store?.id, items.length, totalPrice]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    house: '',
    street: '',
    landmark: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    addressType: 'home' as 'home' | 'office' | 'other',
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

  // Load COD rules (safe non-sensitive subset via RPC) + customer order history (for risk checks)
  useEffect(() => {
    if (!store?.id) return;
    (async () => {
      const { data } = await supabase
        .rpc('get_storefront_cod_rules' as any, { _store_id: store.id });
      const row = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
      setCodRules(row);

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
    if (phoneCodBlocked)
      return 'COD is not available for this phone number';
    return null;
  })();

  // Async server-side check for blocked phones (list is private to the seller)
  useEffect(() => {
    const phone = form.phone?.trim();
    if (!store?.id || !phone || phone.length < 6) { setPhoneCodBlocked(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('is_phone_cod_blocked' as any, { _store_id: store.id, _phone: phone });
      if (!cancelled) setPhoneCodBlocked(!!data);
    })();
    return () => { cancelled = true; };
  }, [store?.id, form.phone]);
  function finalTotalForCheck() { return Math.max(0, totalPrice - (appliedCoupon?.discount || 0)); }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) return null;

  const theme = resolveTheme(getStoreThemeTokens(store));
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
    clearCoupon();
    setCouponCode('');
  };

  const createOrder = async () => {
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Fetch tax_rate for items so GST is captured at sale time
    const productIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean)));
    const taxRateById: Record<string, number> = {};
    if (productIds.length) {
      const { data: prods } = await supabase
        .from('products')
        .select('id, tax_rate')
        .in('id', productIds);
      prods?.forEach((p: any) => { taxRateById[p.id] = Number(p.tax_rate) || 0; });
    }

    // GST is treated as inclusive in product price → back it out
    let totalTaxInclusive = 0;
    const orderItems = items.map((i) => {
      const rate = taxRateById[i.productId] || 0;
      const lineTotal = i.price * i.quantity;
      const lineTax = rate > 0 ? +(lineTotal * rate / (100 + rate)).toFixed(2) : 0;
      totalTaxInclusive += lineTax;
      return {
        product_id: i.productId,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
        variant: i.variant || null,
        tax_rate: rate,
        tax_amount: lineTax,
      };
    });
    const totalTax = +totalTaxInclusive.toFixed(2);

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
      subtotal: +(totalPrice - totalTax).toFixed(2),
      tax: totalTax,
      shipping: fulfillmentMode === 'delivery' ? 0 : 0,
      total: finalTotal,
      notes: [
        appliedCoupon ? `Coupon: ${appliedCoupon.code} (-₹${discount})` : null,
        deliveryInstructions ? `Instructions: ${deliveryInstructions}` : null
      ].filter(Boolean).join(' | '),
      customer_name: form.name || (fulfillmentMode === 'dine_in' ? `Table ${tableLabel ?? ''}`.trim() : ''),
      customer_email: form.email || null,
      customer_phone: form.phone || null,
      customer_address: fulfillmentMode === 'delivery' ? {
        address: [form.house, form.street].filter(Boolean).join(', ') || form.address,
        landmark: form.landmark,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        address_type: form.addressType,
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

    // Save address to customer's profile (delivery + signed-in + new address form only)
    if (fulfillmentMode === 'delivery' && user?.id && showNewAddressForm) {
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
          normalize(a.address) === normalize([form.house, form.street].filter(Boolean).join(', ') || form.address) &&
          normalize(a.pincode) === normalize(form.pincode) &&
          normalize(a.phone) === normalize(form.phone)
        );
        if (!duplicate) {
          const newAddr = {
            id: Date.now().toString(), label: form.addressType || 'Home', name: form.name,
            house: form.house, street: form.street,
            address: [form.house, form.street].filter(Boolean).join(', ') || form.address,
            landmark: form.landmark, city: form.city, state: form.state,
            country: form.country,
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
            if (appliedCoupon) await incrementUsage(appliedCoupon.id, order.id);
            // Send email notifications (anon — authorized via guest_tracking_code)
            const pid = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            const notifBody = (type: string) => JSON.stringify({ type, order_id: order.id, store_id: store.id, guest_tracking_code: order.guest_tracking_code });
            fetch(`https://${pid}.supabase.co/functions/v1/send-order-notification`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: notifBody('order_confirmed'),
            }).catch(() => {});
            fetch(`https://${pid}.supabase.co/functions/v1/send-order-notification`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: notifBody('new_order_seller'),
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
      if (appliedCoupon) await incrementUsage(appliedCoupon.id, order.id);
      // Send notification
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const notifBody = (type: string) => JSON.stringify({ type, order_id: order.id, store_id: store.id, guest_tracking_code: order.guest_tracking_code });
      fetch(`https://${projectId}.supabase.co/functions/v1/send-order-notification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: notifBody('order_confirmed'),
      }).catch(() => {});
      fetch(`https://${projectId}.supabase.co/functions/v1/send-order-notification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: notifBody('new_order_seller'),
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
    if (!form.name || !form.phone || (!form.house && !form.address && !form.street) || !form.city || !form.pincode) {
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
      <SEOHead
        title={`Checkout · ${store.name}`}
        description={`Secure checkout for ${store.name}`}
        url={`${window.location.origin}/store/${slug}/checkout`}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8 relative">
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
          <div className="md:col-span-3 space-y-6">
            
            {/* Step Tracker */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: colors.secondary }}>
              {steps.map((s, index) => {
                const isActive = checkoutStep === s.step;
                const isCompleted = checkoutStep > s.step;
                return (
                  <div key={s.step} className="flex items-center gap-2">
                    <span 
                      className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        backgroundColor: isActive ? colors.primary : isCompleted ? '#16a34a' : colors.secondary,
                        color: isActive || isCompleted ? '#fff' : colors.text + '80'
                      }}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </span>
                    <span 
                      className="text-xs font-semibold"
                      style={{ color: isActive ? colors.primary : colors.text + '60' }}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* STEP 1: Contact Details */}
            {checkoutStep === 1 && (
              <div className="space-y-4">
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
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full py-3 text-sm font-semibold text-white mt-4"
                  style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}
                >
                  {isGuestMode ? 'Continue to Payment' : 'Continue to Shipping Address'}
                </button>
              </div>
            )}

            {/* STEP 2: Shipping/Delivery Address */}
            {checkoutStep === 2 && !isGuestMode && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold" style={{ fontFamily: fonts.heading }}>
                  Delivery Address
                </h2>
                
                {/* Saved Addresses Selector */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs opacity-60">Select from saved addresses:</p>
                    <div className="grid gap-3 grid-cols-1">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id && !showNewAddressForm;
                        return (
                          <div 
                            key={addr.id}
                            onClick={() => handleSelectAddress(addr)}
                            className="p-4 border cursor-pointer transition-all flex items-start gap-3 hover:shadow-sm"
                            style={{
                              borderColor: isSelected ? colors.primary : colors.secondary,
                              borderRadius: `${borderRadius}px`,
                              backgroundColor: isSelected ? colors.primary + '08' : colors.card,
                            }}
                          >
                            <input
                              type="radio"
                              name="savedAddress"
                              checked={isSelected}
                              onChange={() => handleSelectAddress(addr)}
                              className="mt-1 accent-current"
                              style={{ accentColor: colors.primary }}
                            />
                            <div className="flex-1 text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-xs uppercase bg-black/5 px-2 py-0.5 rounded text-muted-foreground">{addr.label || 'Home'}</span>
                                {addr.isDefault && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Default</span>}
                              </div>
                              <p className="font-semibold">{addr.name}</p>
                              <p className="opacity-70 mt-0.5">{addr.address || `${addr.house}, ${addr.street}`}</p>
                              <p className="opacity-70">{addr.city}, {addr.state} - {addr.pincode}</p>
                              <p className="opacity-50 text-xs mt-1">Phone: {addr.phone}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Option to Deliver to New Address */}
                <button
                  type="button"
                  onClick={handleChooseNewAddress}
                  className="w-full py-3 text-xs font-semibold border border-dashed rounded-lg transition hover:bg-black/5"
                  style={{
                    borderColor: showNewAddressForm ? colors.primary : colors.secondary,
                    color: showNewAddressForm ? colors.primary : colors.text,
                    backgroundColor: showNewAddressForm ? colors.primary + '05' : 'transparent'
                  }}
                >
                  ➕ Deliver to a New Address
                </button>

                {/* New Address Form */}
                {showNewAddressForm && (
                  <div className="grid grid-cols-2 gap-3 p-4 border rounded-xl bg-card" style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}>
                    <input
                      placeholder="House / Flat No. *"
                      value={form.house}
                      onChange={(e) => handleField('house', e.target.value)}
                      className="col-span-2 w-full px-3 py-2.5 text-sm border"
                      style={inputStyle}
                    />
                    <input
                      placeholder="Street / Area *"
                      value={form.street}
                      onChange={(e) => handleField('street', e.target.value)}
                      className="col-span-2 w-full px-3 py-2.5 text-sm border"
                      style={inputStyle}
                    />
                    <input
                      placeholder="Landmark (optional)"
                      value={form.landmark}
                      onChange={(e) => handleField('landmark', e.target.value)}
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
                      placeholder="Country"
                      value={form.country}
                      onChange={(e) => handleField('country', e.target.value)}
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
                    
                    {/* Address Type Selection */}
                    <div className="col-span-2 flex gap-2 mt-2">
                      {(['home', 'office', 'other'] as const).map((type) => (
                        <label
                          key={type}
                          className="flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium cursor-pointer capitalize transition-colors"
                          style={{
                            borderColor: form.addressType === type ? colors.primary : colors.secondary,
                            backgroundColor: form.addressType === type ? colors.primary + '15' : 'transparent',
                            borderRadius: `${borderRadius / 2}px`,
                            color: form.addressType === type ? colors.primary : colors.text,
                          }}
                        >
                          <input
                            type="radio"
                            name="addressType"
                            value={type}
                            checked={form.addressType === type}
                            onChange={() => handleField('addressType', type)}
                            className="sr-only"
                          />
                          {type === 'home' ? '🏠' : type === 'office' ? '🏢' : '📍'} {type}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pincode Delivery Check */}
                {(() => {
                  const storeSettings = store?.settings as any;
                  const shipping = storeSettings?.shipping;
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

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={prevStep}
                    className="flex-1 py-3 text-sm font-semibold border hover:bg-black/5"
                    style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={nextStep}
                    className="flex-1 py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Payment & Instructions */}
            {checkoutStep === 3 && (
              <div className="space-y-4">
                {isDineIn && tableLabel && (
                  <div
                    className="flex items-center gap-2 p-3 text-sm"
                    style={{ backgroundColor: colors.primary + '10', borderRadius: `${borderRadius / 2}px`, color: colors.primary }}
                  >
                    <span className="font-semibold">Table {tableLabel}</span>
                    <span className="opacity-70">· We'll bring your order to your table.</span>
                  </div>
                )}

                <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: fonts.heading }}>
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

                {/* Delivery Instructions */}
                <div className="space-y-2 pt-3">
                  <h2 className="text-sm font-semibold" style={{ fontFamily: fonts.heading }}>
                    Delivery Instructions / Order Notes
                  </h2>
                  <textarea
                    placeholder="e.g. Leave at the gate, call before delivery, don't ring the bell..."
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    className="w-full px-3 py-2 text-sm border resize-none outline-none focus:ring-1"
                    style={{ ...inputStyle, '--tw-ring-color': colors.primary } as any}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={prevStep}
                    className="flex-1 py-3 text-sm font-semibold border hover:bg-black/5"
                    style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={placing}
                    className="flex-1 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}
                  >
                    {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {placing ? 'Processing...' : isDineIn ? 'Place Order' : form.paymentMethod === 'cod' ? 'Place Order (COD)' : 'Pay Now'}
                  </button>
                </div>
              </div>
            )}

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
                onClick={() => {
                  if (checkoutStep === 1) nextStep();
                  else if (checkoutStep === 2) nextStep();
                  else handlePlaceOrder();
                }}
                disabled={placing}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-transform hover:scale-[1.01]"
                style={{
                  backgroundColor: colors.primary,
                  color: '#fff',
                  borderRadius: `${borderRadius}px`,
                }}
              >
                {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {placing
                  ? 'Processing...'
                  : checkoutStep === 1
                  ? (isGuestMode ? 'Continue to Payment →' : 'Continue to Shipping →')
                  : checkoutStep === 2
                  ? 'Continue to Payment →'
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

      {/* Checkout Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md p-6 space-y-6 bg-white text-black shadow-2xl border" 
            style={{ borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}
          >
            <div className="text-center">
              <h3 className="text-xl font-bold" style={{ fontFamily: fonts.heading }}>
                {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h3>
              <p className="text-sm opacity-60 mt-1">
                {authMode === 'signup' ? 'Sign up to speed up checkout and save addresses' : 'Sign in to access saved addresses'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <input
                  placeholder="Full Name *"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border"
                  style={inputStyle}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email address *"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border"
                style={inputStyle}
                required
              />
              <input
                type="password"
                placeholder="Password *"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border"
                style={inputStyle}
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
                style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius / 2}px` }}
              >
                {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {authMode === 'signup' ? 'Sign Up & Continue' : 'Sign In & Continue'}
              </button>
            </form>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-xs font-semibold underline"
                style={{ color: colors.primary }}
              >
                {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </button>
              <div className="border-t pt-2 my-2" style={{ borderColor: colors.secondary }} />
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-xs font-medium opacity-50 hover:opacity-100"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </StorefrontLayout>
  );
};

export default StorefrontCheckout;
