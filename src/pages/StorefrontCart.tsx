import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCart } from '@/hooks/useCart';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { Loader2, Minus, Plus, Trash2, ShoppingBag, Tag, X } from 'lucide-react';
import { toast } from 'sonner';

const StorefrontCart = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, loading } = useStorefront(slug || '');
  const {
    items, updateQuantity, removeItem,
    totalPrice, finalPrice,
    appliedCoupon, setAppliedCoupon, clearCoupon,
  } = useCart(slug || '');

  const { validateCoupon, findBestAutoCoupon } = useValidateCoupon();
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || '');
  const [couponLoading, setCouponLoading] = useState(false);
  const [autoApplyDone, setAutoApplyDone] = useState(false);

  // Sync input with already-applied coupon (e.g. came from checkout and back)
  useEffect(() => {
    if (appliedCoupon?.code) setCouponCode(appliedCoupon.code);
  }, [appliedCoupon?.code]);

  // Auto-apply best coupon once when cart loads (only if none already applied)
  useEffect(() => {
    if (!store?.id || items.length === 0 || appliedCoupon || autoApplyDone) return;
    setAutoApplyDone(true);
    (async () => {
      const cartLines = items.map((i) => ({ productId: i.productId, price: i.price, quantity: i.quantity }));
      const best = await findBestAutoCoupon(store.id, totalPrice, cartLines);
      if (best) {
        setAppliedCoupon({ id: best.coupon.id, code: best.coupon.code, discount: best.discount });
        setCouponCode(best.coupon.code);
        toast.success(`"${best.coupon.code}" auto-applied — you save ₹${Math.round(best.discount).toLocaleString('en-IN')}`);
      }
    })();
  }, [store?.id, items.length, totalPrice, appliedCoupon, autoApplyDone]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !store) return;
    setCouponLoading(true);
    const cartLines = items.map((i) => ({ productId: i.productId, price: i.price, quantity: i.quantity }));
    const result = await validateCoupon(store.id, couponCode.trim(), totalPrice, cartLines);
    if (result.valid && result.coupon) {
      setAppliedCoupon({ id: result.coupon.id, code: result.coupon.code, discount: result.discount! });
      toast.success(`Coupon applied! You save ₹${Math.round(result.discount!).toLocaleString('en-IN')}`);
    } else {
      toast.error(result.error || 'Invalid coupon');
    }
    setCouponLoading(false);
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponCode('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Store not found</h1>
      </div>
    );
  }

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;

  const inputStyle = {
    backgroundColor: 'transparent',
    borderColor: colors.text + '30',
    borderRadius: `${borderRadius / 2}px`,
    color: colors.text,
  };

  const discount = appliedCoupon?.discount || 0;

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: fonts.heading }}>
          Shopping Cart
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 mx-auto opacity-20 mb-4" />
            <p className="text-sm opacity-50 mb-4">Your cart is empty</p>
            <Link
              to={`/store/${slug}`}
              className="inline-block px-6 py-2 text-sm font-medium"
              style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Items ── */}
            <div className="space-y-4">
              {items.map((item) => {
                const key = `${item.productId}_${item.variant || ''}`;
                return (
                  <div
                    key={key}
                    className="flex gap-4 p-4 border"
                    style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}
                  >
                    <div
                      className="h-20 w-20 shrink-0 overflow-hidden"
                      style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius / 2}px` }}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No img</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                      {item.variant && <p className="text-xs opacity-50">{item.variant}</p>}
                      <p className="text-sm font-bold mt-1" style={{ color: colors.primary }}>
                        ₹{item.price.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.productId, item.variant)}
                        className="text-xs opacity-40 hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div
                        className="flex items-center border"
                        style={{ borderColor: colors.secondary, borderRadius: `${borderRadius / 3}px` }}
                      >
                        <button onClick={() => updateQuantity(item.productId, item.variant, item.quantity - 1)} className="p-1">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-xs font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.variant, item.quantity + 1)} className="p-1">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Coupon ── */}
            <div
              className="p-4 space-y-3"
              style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Have a coupon?</p>
              {appliedCoupon ? (
                <div
                  className="flex items-center justify-between px-3 py-2 text-sm"
                  style={{ backgroundColor: colors.primary + '15', borderRadius: `${borderRadius / 2}px` }}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" style={{ color: colors.primary }} />
                    <span className="font-mono font-semibold">{appliedCoupon.code}</span>
                    <span className="font-medium" style={{ color: colors.primary }}>
                      −₹{Math.round(appliedCoupon.discount).toLocaleString('en-IN')} off
                    </span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="opacity-50 hover:opacity-100 transition-opacity">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    className="flex-1 px-3 py-2 text-sm border font-mono"
                    style={inputStyle}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 text-xs font-semibold disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius / 2}px` }}
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Order Summary ── */}
            <div
              className="p-4 space-y-3"
              style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
            >
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-sm font-medium" style={{ color: colors.primary }}>
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>−₹{Math.round(discount).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-sm opacity-60">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>

              <div
                className="flex justify-between text-base font-bold pt-3 border-t"
                style={{ borderColor: colors.text + '15' }}
              >
                <span>Total</span>
                <div className="text-right">
                  {appliedCoupon && (
                    <p className="text-xs line-through opacity-40 font-normal">
                      ₹{totalPrice.toLocaleString('en-IN')}
                    </p>
                  )}
                  <span style={{ color: colors.primary }}>₹{finalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {appliedCoupon && (
                <div
                  className="text-xs text-center font-medium py-1.5 rounded"
                  style={{ backgroundColor: colors.primary + '15', color: colors.primary, borderRadius: `${borderRadius / 2}px` }}
                >
                  🎉 You're saving ₹{Math.round(discount).toLocaleString('en-IN')} on this order!
                </div>
              )}
            </div>

            <Link
              to={`/store/${slug}/checkout`}
              className="block w-full text-center py-3 text-sm font-semibold transition-transform hover:scale-[1.01]"
              style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}
            >
              Proceed to Checkout →
            </Link>
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
};

export default StorefrontCart;
