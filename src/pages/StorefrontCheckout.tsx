import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const StorefrontCheckout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { store, loading } = useStorefront(slug || '');
  const { items, totalPrice, clearCart } = useCart(slug || '');
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);

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

  const handlePlaceOrder = async () => {
    if (!form.name || !form.phone || !form.address || !form.city || !form.pincode) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setPlacing(true);
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
      total: totalPrice,
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
    }).select('order_number').single();

    if (error) {
      toast.error('Failed to place order. Please try again.');
      console.error(error);
    } else {
      clearCart();
      setOrderPlaced(data.order_number);
    }
    setPlacing(false);
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

            <h2 className="text-sm font-semibold mb-3 pt-3" style={{ fontFamily: fonts.heading }}>
              Payment Method
            </h2>
            <div className="space-y-2">
              {[
                { id: 'cod', label: 'Cash on Delivery' },
                { id: 'upi', label: 'UPI' },
                { id: 'online', label: 'Online Payment' },
              ].map((pm) => (
                <label
                  key={pm.id}
                  className="flex items-center gap-3 p-3 border cursor-pointer transition-colors"
                  style={{
                    borderColor: form.paymentMethod === pm.id ? colors.primary : colors.secondary,
                    borderRadius: `${borderRadius / 2}px`,
                    backgroundColor: form.paymentMethod === pm.id ? colors.primary + '10' : 'transparent',
                  }}
                >
                  <div
                    className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: form.paymentMethod === pm.id ? colors.primary : colors.secondary }}
                  >
                    {form.paymentMethod === pm.id && (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: colors.primary }}
                      />
                    )}
                  </div>
                  <span className="text-sm">{pm.label}</span>
                  {pm.id !== 'cod' && (
                    <span className="ml-auto text-[10px] opacity-40">Coming soon</span>
                  )}
                </label>
              ))}
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
              <div
                className="flex justify-between text-base font-bold pt-3 border-t"
                style={{ borderColor: colors.text + '15' }}
              >
                <span>Total</span>
                <span style={{ color: colors.primary }}>₹{totalPrice.toLocaleString('en-IN')}</span>
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
                {placing ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default StorefrontCheckout;
