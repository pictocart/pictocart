import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import { useStoreMenu, type MenuItem } from '@/hooks/useMenu';
import { useFulfillment, type FulfillmentMode } from '@/hooks/useFulfillment';
import { useCart, type CartItem } from '@/hooks/useCart';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Minus, Flame, Clock, Utensils, ShoppingBag, X, Search, Info, MapPin, Navigation, Map, Globe, Home, Briefcase, Check, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { toast } from 'sonner';

interface Props {
  /** When true, route is /menu/t/:tableToken and we force dine-in. */
  forceMode?: FulfillmentMode;
  tableFromParam?: string;
}

const MODE_LABEL: Record<FulfillmentMode, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
};

const StorefrontMenu = ({ forceMode, tableFromParam }: Props) => {
  const { slug, tableToken } = useParams<{ slug: string; tableToken?: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { store, loading } = useStorefront(slug || '');
  const { enabledModes, settings } = useFulfillment(store?.id);
  const {
    fulfillmentMode, setFulfillmentMode, tableLabel, setTableLabel,
    items: cartItems, addItem, updateQuantity, totalItems, totalPrice,
  } = useCart(slug || '');
  const { data: sections, isLoading: menuLoading } = useStoreMenu(store?.id, fulfillmentMode);

  // Self-heal localStorage cart if there are any corrupted NaN items
  useEffect(() => {
    try {
      const CART_KEY = `cart_${slug}`;
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(item => 
            item && 
            typeof item.quantity === 'number' && 
            !isNaN(item.quantity) &&
            typeof item.price === 'number' &&
            !isNaN(item.price)
          );
          if (clean.length !== parsed.length) {
            localStorage.setItem(CART_KEY, JSON.stringify(clean));
            // Trigger storage reload
            window.dispatchEvent(new Event('storage'));
          }
        }
      }
    } catch (e) {
      console.warn('Cart self-healing failed', e);
    }
  }, [slug]);

  const queryTable = search.get('t');
  const resolvedTable = tableFromParam || tableToken || queryTable;

  // Auto-bind table + dine-in mode when arriving via QR
  useEffect(() => {
    if (resolvedTable) {
      setTableLabel(decodeURIComponent(resolvedTable));
    } else if (forceMode && fulfillmentMode !== forceMode) {
      setFulfillmentMode(forceMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTable, forceMode]);

  // Fallback: if current mode isn't enabled, switch to the first enabled.
  // Exception: if the customer arrived via a table QR (resolvedTable / forceMode),
  // keep dine-in even when the seller hasn't toggled it on yet — the QR itself
  // is intent to allow dine-in.
  useEffect(() => {
    if (resolvedTable || forceMode === 'dine_in') return;
    if (enabledModes.length > 0 && !enabledModes.includes(fulfillmentMode)) {
      setFulfillmentMode(enabledModes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledModes.join(','), resolvedTable, forceMode]);

  // Monitor delivery mode and configure popup/pricing
  useEffect(() => {
    if (fulfillmentMode === 'delivery') {
      const saved = localStorage.getItem(`cart_delivery_address_${slug}`);
      if (!saved) {
        setIsDeliveryPopupOpen(true);
        setHasDeliveryAddress(false);
      } else {
        setHasDeliveryAddress(true);
      }
    } else {
      setHasDeliveryAddress(false);
    }
  }, [fulfillmentMode, slug]);

  const qtyOf = (id: string) => cartItems.filter((i) => i.productId === id).reduce((s, i) => s + i.quantity, 0);

  const [query, setQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non_veg'>('all');

  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [detailVariants, setDetailVariants] = useState<Record<string, string>>({});
  const [detailQty, setDetailQty] = useState(1);
  const [detailNotes, setDetailNotes] = useState('');

  const storeSettings = (store?.settings as any) || {};
  const takeawayMarkupPercent = typeof storeSettings.fulfillment_takeaway_markup_percent === 'number'
    ? storeSettings.fulfillment_takeaway_markup_percent
    : 5;

  const getFulfillmentPrice = (basePrice: number) => {
    if (fulfillmentMode === 'delivery') {
      return hasDeliveryAddress ? Math.round(basePrice * 1.10) : Math.round(basePrice);
    }
    if (fulfillmentMode === 'takeaway') return Math.round(basePrice * (1 + takeawayMarkupPercent / 100));
    return Math.round(basePrice);
  };

  // Load customer auth
  const { user } = useCustomerAuth(slug || '');

  // Delivery Address Dialog states
  const [isDeliveryPopupOpen, setIsDeliveryPopupOpen] = useState(false);
  const [hasDeliveryAddress, setHasDeliveryAddress] = useState(() => {
    try {
      return !!localStorage.getItem(`cart_delivery_address_${slug}`);
    } catch {
      return false;
    }
  });
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  
  // Geolocation and map state
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isLocationDetected, setIsLocationDetected] = useState(false);
  
  // Address Form state
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    house: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'home' as 'home' | 'office' | 'other',
    saveToProfile: true
  });

  // Load previous saved addresses if user logged in
  useEffect(() => {
    if (!user || !store?.id) {
      setSavedAddresses([]);
      return;
    }
    
    if (user.user_metadata?.full_name && !addressForm.name) {
      setAddressForm(f => ({ ...f, name: user.user_metadata.full_name }));
    }
    if (user.user_metadata?.phone && !addressForm.phone) {
      setAddressForm(f => ({ ...f, phone: user.user_metadata.phone }));
    }
    
    supabase
      .from('customers')
      .select('saved_addresses')
      .eq('user_id', user.id)
      .eq('store_id', store.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.saved_addresses && Array.isArray(data.saved_addresses)) {
          setSavedAddresses(data.saved_addresses);
        }
      });
  }, [user, store?.id]);

  // Load previously used address from localStorage if any
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cart_delivery_address_${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setAddressForm({
          name: parsed.name || '',
          phone: parsed.phone || '',
          house: parsed.house || '',
          street: parsed.street || '',
          landmark: parsed.landmark || '',
          city: parsed.city || '',
          state: parsed.state || '',
          pincode: parsed.pincode || '',
          addressType: parsed.addressType || 'home',
          saveToProfile: true
        });
      }
    } catch {}
  }, [slug]);

  // Handle detecting current location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCoords({ lat: latitude, lng: longitude });
        setIsLocationDetected(true);
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};
            
            const house = addr.building || addr.house_number || addr.house_name || '';
            const street = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');
            const city = addr.city || addr.town || addr.municipality || addr.village || '';
            const state = addr.state || '';
            const pincode = addr.postcode || '';
            
            setAddressForm((f) => ({
              ...f,
              house: house,
              street: street,
              city: city,
              state: state,
              pincode: pincode
            }));
            toast.success('Location detected successfully!');
          } else {
            toast.error('Failed to get address details from location');
          }
        } catch (err) {
          console.error(err);
          toast.error('Error fetching address information');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error(error);
        setIsDetectingLocation(false);
        toast.error('Failed to access location. Please enable location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Helper function to update cart item prices on mode change
  const updateCartFulfillmentMode = (mode: FulfillmentMode) => {
    setFulfillmentMode(mode);
    
    try {
      const saved = localStorage.getItem(`cart_${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        const updated = parsed.map((item) => {
          let basePrice = item.price;
          if (sections) {
            for (const sec of sections) {
              const prod = sec.items.find(p => p.id === item.productId);
              if (prod) {
                basePrice = prod.price;
                break;
              }
            }
          }
          
          let newPrice = basePrice;
          if (mode === 'delivery') {
            const hasAddr = !!localStorage.getItem(`cart_delivery_address_${slug}`);
            newPrice = hasAddr ? Math.round(basePrice * 1.10) : Math.round(basePrice);
          }
          else if (mode === 'takeaway') newPrice = Math.round(basePrice * (1 + takeawayMarkupPercent / 100));
          else newPrice = Math.round(basePrice);
          
          return {
            ...item,
            price: newPrice
          };
        });
        
        localStorage.setItem(`cart_${slug}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('cart:updated', { detail: { storeSlug: slug } }));
      }
    } catch (e) {
      console.warn('Failed to update cart pricing on mode change', e);
    }
  };

  // Revert mode if popup closed without address
  const handleDialogChange = (open: boolean) => {
    setIsDeliveryPopupOpen(open);
    if (!open) {
      const saved = localStorage.getItem(`cart_delivery_address_${slug}`);
      if (!saved) {
        // Fallback to dine_in by default if enabled, otherwise fallback to takeaway
        const fallback = enabledModes.includes('dine_in') ? 'dine_in' : 'takeaway';
        updateCartFulfillmentMode(fallback);
        setHasDeliveryAddress(false);
        setIsLocationDetected(false);
        setMapCoords(null);
        toast.info(`Delivery requires a configured address. Reverted to ${MODE_LABEL[fallback]}.`);
      } else {
        setHasDeliveryAddress(true);
      }
    } else {
      // Reset map preview to initial store centered coordinates without pin marker
      const saved = localStorage.getItem(`cart_delivery_address_${slug}`);
      if (!saved) {
        setIsLocationDetected(false);
        setMapCoords(null);
      }
    }
  };

  // Handle fulfillment mode selection
  const handleFulfillmentModeSelect = (mode: FulfillmentMode) => {
    if (!enabledModes.includes(mode)) {
      toast.error('Currently not available at this time');
      return;
    }

    if (mode === 'delivery') {
      const saved = localStorage.getItem(`cart_delivery_address_${slug}`);
      updateCartFulfillmentMode('delivery');
      if (!saved) {
        setIsDeliveryPopupOpen(true);
        setHasDeliveryAddress(false);
        setIsLocationDetected(false);
        setMapCoords(null);
      } else {
        setHasDeliveryAddress(true);
      }
    } else {
      updateCartFulfillmentMode(mode);
    }
  };

  const handleSelectSavedAddress = (addr: any) => {
    setSelectedSavedAddressId(addr.id);
    setAddressForm({
      name: addr.name || addressForm.name,
      phone: addr.phone || addressForm.phone,
      house: addr.house || '',
      street: addr.street || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      addressType: addr.label?.toLowerCase() === 'office' ? 'office' : addr.label?.toLowerCase() === 'home' ? 'home' : 'other',
      saveToProfile: false
    });
  };

  const handleConfirmAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name.trim()) { toast.error('Please enter name'); return; }
    if (!addressForm.phone.trim() || addressForm.phone.length < 10) { toast.error('Please enter a 10-digit phone number'); return; }
    if (!addressForm.house.trim()) { toast.error('Please enter flat/house details'); return; }
    if (!addressForm.street.trim()) { toast.error('Please enter street/area details'); return; }
    if (!addressForm.landmark.trim()) { toast.error('Please enter landmark'); return; }
    if (!addressForm.city.trim()) { toast.error('Please enter city'); return; }
    if (!addressForm.state.trim()) { toast.error('Please enter state'); return; }
    if (!addressForm.pincode.trim() || addressForm.pincode.length < 6) { toast.error('Please enter a 6-digit pincode'); return; }

    const newAddr = {
      ...addressForm,
      label: addressForm.addressType.charAt(0).toUpperCase() + addressForm.addressType.slice(1),
    };
    
    localStorage.setItem(`cart_delivery_address_${slug}`, JSON.stringify(newAddr));

    if (user && store && addressForm.saveToProfile) {
      try {
        const { data } = await supabase
          .from('customers')
          .select('saved_addresses')
          .eq('user_id', user.id)
          .eq('store_id', store.id)
          .maybeSingle();
        const current = Array.isArray(data?.saved_addresses) ? data.saved_addresses : [];
        const exists = current.some((a: any) =>
          a.house === newAddr.house && a.street === newAddr.street && a.pincode === newAddr.pincode
        );
        if (!exists) {
          const toAdd = {
            ...newAddr,
            id: Date.now().toString(),
            isDefault: current.length === 0
          };
          await supabase
            .from('customers')
            .upsert(
              { user_id: user.id, store_id: store.id, saved_addresses: [...current, toAdd] },
              { onConflict: 'user_id,store_id' }
            );
        }
      } catch (err) {
        console.warn('Failed to save address to profile database', err);
      }
    }

    setHasDeliveryAddress(true);
    updateCartFulfillmentMode('delivery');
    setIsDeliveryPopupOpen(false);
    toast.success('Delivery location confirmed!');
  };

  const openDetail = (it: MenuItem) => {
    setDetail(it);
    setDetailVariants({});
    setDetailQty(1);
    setDetailNotes('');
  };

  const quickAdd = (it: MenuItem, e?: React.MouseEvent) => {
    if (e && typeof (window as any).triggerParabolicFly === 'function') {
      try {
        (window as any).triggerParabolicFly(e, 1);
      } catch (err) {
        console.warn('[fly] animation error', err);
      }
    }
    addItem({ productId: it.id, title: it.title, price: getFulfillmentPrice(it.price), image: it.image_url, available_modes: it.menu_meta.available_modes });
  };

  const handleDecrement = (productId: string) => {
    const matchingItems = cartItems.filter((i) => i.productId === productId);
    if (matchingItems.length === 0) return;
    
    const lastItem = matchingItems[matchingItems.length - 1];
    const q = lastItem.quantity;
    if (q <= 1) {
      updateQuantity(productId, lastItem.variant, 0);
    } else {
      updateQuantity(productId, lastItem.variant, q - 1);
    }
  };

  const addFromDetail = () => {
    if (!detail) return;
    const variantStr = Object.entries(detailVariants).map(([k, v]) => `${k}: ${v}`).join(' / ');
    const key = [variantStr, detailNotes].filter(Boolean).join(' • ') || undefined;
    addItem({
      productId: detail.id,
      title: detail.title,
      price: getFulfillmentPrice(detail.price),
      image: detail.image_url,
      available_modes: detail.menu_meta.available_modes,
      variant: key,
      notes: detailNotes || undefined,
    }, detailQty);
    setDetail(null);
  };

  const categoriesList = useMemo(() => {
    if (!sections) return [];
    return sections.map(s => {
      let emoji = "🍛";
      const name = s.name.toLowerCase();
      if (name.includes("main")) emoji = "🍲";
      else if (name.includes("starter") || name.includes("appetizer")) emoji = "🍴";
      else if (name.includes("dessert") || name.includes("sweet")) emoji = "🍦";
      else if (name.includes("drink") || name.includes("beverage")) emoji = "🍹";
      return { id: s.id, name: s.name, emoji };
    });
  }, [sections]);

  const activeItems = useMemo(() => {
    if (!sections) return [];
    const flat: MenuItem[] = [];
    const isMealFilter = selectedCategoryId.startsWith('meal_');
    sections.forEach((s) => {
      if (selectedCategoryId !== 'all' && !isMealFilter && s.id !== selectedCategoryId) return;
      s.items.forEach((it) => {
        const q = query.trim().toLowerCase();
        if (q && !it.title.toLowerCase().includes(q) && !(it.description ?? '').toLowerCase().includes(q)) return;
        if (dietFilter === 'veg' && it.menu_meta.diet !== 'veg') return;
        if (dietFilter === 'non_veg' && it.menu_meta.diet !== 'non_veg') return;
        
        if (isMealFilter) {
          const type = selectedCategoryId.replace('meal_', '');
          const mealTypes = it.menu_meta.meal_types || [];
          if (!mealTypes.includes(type as any)) return;
        }
        flat.push(it);
      });
    });
    return flat;
  }, [sections, selectedCategoryId, query, dietFilter]);

  const themeColors = useMemo(() => resolveTheme(getStoreThemeTokens(store)).colors, [store]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!store) return null;

  if (enabledModes.length === 0) {
    return (
      <StorefrontLayout store={store}>
        <div className="max-w-md mx-auto p-8 text-center">
          <Utensils className="h-12 w-12 mx-auto opacity-30 mb-3" />
          <h1 className="text-xl font-bold mb-2">Menu unavailable</h1>
          <p className="text-sm text-muted-foreground">This store hasn't enabled menu ordering yet.</p>
        </div>
      </StorefrontLayout>
    );
  }

  return (
    <StorefrontLayout store={store}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes xAxisCurve { 100% { transform: translateX(var(--tx)); } }
        @keyframes yAxisCurve { 100% { transform: translateY(var(--ty)); } }
        .dynamic-cart-flyer {
          position: fixed;
          z-index: 99999;
          pointer-events: none;
          animation: xAxisCurve 0.8s forwards cubic-bezier(1.000, 0.440, 0.840, 0.165);
        }
        .dynamic-cart-flyer-inner {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #8c2d19;
          color: white;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(140, 45, 25, 0.4);
          animation: yAxisCurve 0.8s forwards cubic-bezier(0.165, 0.840, 0.440, 1.000);
        }
      `}} />
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {/* Centered Premium Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 mb-2" style={{ fontFamily: 'var(--hf)' }}>
            our Menu
          </h1>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Freshly prepared dishes crafted to perfection. Select your preferred dining option below.
          </p>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Fulfillment Mode Pill Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-full w-fit">
              {(['dine_in', 'takeaway', 'delivery'] as FulfillmentMode[]).map((m) => {
                const isEnabled = enabledModes.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => handleFulfillmentModeSelect(m)}
                    disabled={!!resolvedTable && m !== 'dine_in'}
                    className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-50 ${
                      !isEnabled ? 'opacity-50 line-through' : ''
                    } ${fulfillmentMode === m
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                      }`}
                  >
                    {MODE_LABEL[m]}
                  </button>
                );
              })}
            </div>

            {/* Veg / Non-Veg Quick Filter Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-full w-fit">
              {(['all', 'veg', 'non_veg'] as const).map((diet) => (
                <button
                  key={diet}
                  onClick={() => setDietFilter(diet)}
                  className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${dietFilter === diet
                    ? 'bg-stone-950 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-950'
                    }`}
                >
                  {diet === 'all' ? 'All Foods' : diet === 'veg' ? '🟢 Veg Only' : '🔴 Non-Veg'}
                </button>
              ))}
            </div>
          </div>

          {/* Table ID Indicator if table QR is active */}
          {tableLabel && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-red-100/60 text-red-700 font-bold">
              <Utensils className="h-3.5 w-3.5" /> Ordering for Table: {tableLabel}
              <button onClick={() => setTableLabel(null)} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {/* Rate Explanation Banner */}
          <div className="flex flex-col gap-2">
            {fulfillmentMode === 'delivery' && (
              <div className="text-[12px] text-stone-700 flex items-center justify-between gap-1.5 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100 font-medium">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    {(() => {
                      try {
                        const saved = localStorage.getItem(`cart_delivery_address_${slug}`);
                        if (saved) {
                          const parsed = JSON.parse(saved);
                          return `Delivering to: ${parsed.house || ''}, ${parsed.street || ''}, ${parsed.city || ''} (${parsed.pincode || ''})`;
                        }
                      } catch {}
                      return 'No delivery address selected. Please configure address.';
                    })()}
                  </span>
                </div>
                <button
                  onClick={() => setIsDeliveryPopupOpen(true)}
                  className="text-emerald-700 hover:text-emerald-900 underline text-xs font-bold shrink-0 ml-2 animate-pulse"
                >
                  Change Address
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Search Input */}
        <div className="relative mb-8">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search for a specific dish..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 h-11 bg-white border-stone-200 rounded-xl shadow-sm text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Pastel Category Cards (horizontal list exactly matching image) */}
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-none -mx-4 px-4 snap-x sm:justify-center">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl w-32 h-24 shrink-0 transition-all duration-300 snap-start border-2 ${selectedCategoryId === 'all'
              ? 'bg-white border-red-500 shadow-md text-stone-900'
              : 'bg-red-50/70 hover:bg-red-100/60 border-transparent text-stone-700'
              }`}
          >
            <span className="text-3xl mb-1.5">🍽️</span>
            <span className="text-xs font-black tracking-wide leading-tight">All Dishes</span>
          </button>

          {(() => {
            const visibleMealTypes = storeSettings.visible_meal_types || { breakfast: true, lunch: true, dinner: true, drink: true };
            return (
              <>
                {visibleMealTypes.breakfast !== false && (
                  <button
                    onClick={() => setSelectedCategoryId('meal_breakfast')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl w-32 h-24 shrink-0 transition-all duration-300 snap-start border-2 ${selectedCategoryId === 'meal_breakfast'
                      ? 'bg-white border-red-500 shadow-md text-stone-900'
                      : 'bg-red-50/70 hover:bg-red-100/60 border-transparent text-stone-700'
                      }`}
                  >
                    <span className="text-3xl mb-1.5">🥞</span>
                    <span className="text-xs font-black tracking-wide leading-tight">Breakfast</span>
                  </button>
                )}

                {visibleMealTypes.lunch !== false && (
                  <button
                    onClick={() => setSelectedCategoryId('meal_lunch')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl w-32 h-24 shrink-0 transition-all duration-300 snap-start border-2 ${selectedCategoryId === 'meal_lunch'
                      ? 'bg-white border-red-500 shadow-md text-stone-900'
                      : 'bg-red-50/70 hover:bg-red-100/60 border-transparent text-stone-700'
                      }`}
                  >
                    <span className="text-3xl mb-1.5">🍲</span>
                    <span className="text-xs font-black tracking-wide leading-tight">Lunch</span>
                  </button>
                )}

                {visibleMealTypes.dinner !== false && (
                  <button
                    onClick={() => setSelectedCategoryId('meal_dinner')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl w-32 h-24 shrink-0 transition-all duration-300 snap-start border-2 ${selectedCategoryId === 'meal_dinner'
                      ? 'bg-white border-red-500 shadow-md text-stone-900'
                      : 'bg-red-50/70 hover:bg-red-100/60 border-transparent text-stone-700'
                      }`}
                  >
                    <span className="text-3xl mb-1.5">🍽️</span>
                    <span className="text-xs font-black tracking-wide leading-tight">Dinner</span>
                  </button>
                )}

                {visibleMealTypes.drink !== false && (
                  <button
                    onClick={() => setSelectedCategoryId('meal_drink')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl w-32 h-24 shrink-0 transition-all duration-300 snap-start border-2 ${selectedCategoryId === 'meal_drink'
                      ? 'bg-white border-red-500 shadow-md text-stone-900'
                      : 'bg-red-50/70 hover:bg-red-100/60 border-transparent text-stone-700'
                      }`}
                  >
                    <span className="text-3xl mb-1.5">🍹</span>
                    <span className="text-xs font-black tracking-wide leading-tight">Drinks</span>
                  </button>
                )}
              </>
            );
          })()}

          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl w-32 h-24 shrink-0 transition-all duration-300 snap-start border-2 ${selectedCategoryId === cat.id
                ? 'bg-white border-red-500 shadow-md text-stone-900'
                : 'bg-red-50/70 hover:bg-red-100/60 border-transparent text-stone-700'
                }`}
            >
              <span className="text-3xl mb-1.5">{cat.emoji}</span>
              <span className="text-xs font-black tracking-wide leading-tight text-center line-clamp-2">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Items Grid */}
        {menuLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : activeItems.length === 0 ? (
          <div className="text-center py-16 px-6 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
            <Search className="h-10 w-10 mx-auto mb-4 opacity-25" />
            <h3 className="text-lg font-semibold mb-1">No items found</h3>
            <p className="text-sm text-stone-500 max-w-xs mx-auto">
              Try adjusting your Veg/Non-Veg filter or search query to find what you are looking for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {activeItems.map((it, idx) => {
              const q = qtyOf(it.id);
              const resolvedPrice = getFulfillmentPrice(it.price);
              const hasDiet = it.menu_meta.diet;
              const isHighlighted = idx % 4 === 2; // replicates the soft highlighted cards in the user image

              return (
                <div
                  key={it.id}
                  className={`flex gap-4 p-4 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md ${isHighlighted
                    ? 'bg-red-50/45 border-red-200/85'
                    : 'bg-white border-stone-100'
                    }`}
                >
                  {it.image_url && (
                    <img
                      src={it.image_url}
                      alt={it.title}
                      className="w-24 h-24 rounded-xl object-cover shrink-0 border border-stone-200/50 cursor-pointer"
                      onClick={() => openDetail(it)}
                    />
                  )}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 
                          className="font-bold text-stone-900 text-sm md:text-base tracking-tight truncate flex-1 cursor-pointer hover:text-[#8c2d19] transition-colors"
                          onClick={() => openDetail(it)}
                        >
                          {it.title}
                        </h3>
                        <span className="font-extrabold text-stone-900 text-sm md:text-base shrink-0">
                          ₹{resolvedPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {it.description && (
                        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mt-1">
                          {it.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1.5">
                        {hasDiet && (
                          <span className={`inline-block h-3.5 w-3.5 rounded-sm border-2 ${hasDiet === 'veg' ? 'border-green-600' :
                            hasDiet === 'non_veg' ? 'border-red-600' : 'border-yellow-600'
                            }`}>
                            <span className={`block h-1.5 w-1.5 m-auto mt-[1px] rounded-full ${hasDiet === 'veg' ? 'bg-green-600' :
                              hasDiet === 'non_veg' ? 'bg-red-600' : 'bg-yellow-600'
                              }`} />
                          </span>
                        )}
                        {!!it.menu_meta.spice_level && (
                          <span className="inline-flex text-orange-500">
                            {Array.from({ length: it.menu_meta.spice_level }).map((_, i) => (
                              <Flame key={i} className="h-3 w-3 fill-orange-500" />
                            ))}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Prominent Info (i) button for details popup */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(it);
                          }}
                          className="h-7 w-7 rounded-full border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors shadow-sm"
                          title="View Item Details"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>

                        {q === 0 ? (
                          <button
                            onClick={(e) => quickAdd(it, e)}
                            className="px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full text-white bg-[#8c2d19] hover:opacity-90 transition-all shadow-sm active:scale-95"
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 border border-red-500 rounded-full px-2 py-0.5 bg-red-50/20">
                            <button
                              onClick={() => handleDecrement(it.id)}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-extrabold text-stone-900 text-xs w-4 text-center">{q}</span>
                            <button onClick={(e) => quickAdd(it, e)} className="p-1 text-red-600 hover:text-red-700">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item detail modal */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl sm:mx-auto sm:rounded-t-2xl">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{detail.title}</SheetTitle>
              </SheetHeader>
              {detail.image_url && (
                <img src={detail.image_url} alt={detail.title} className="w-full max-h-56 object-cover rounded-lg mt-3" />
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                {detail.menu_meta.diet && (
                  <span className="px-2 py-0.5 rounded-full border capitalize">{detail.menu_meta.diet.replace('_', '-')}</span>
                )}
                {!!detail.menu_meta.spice_level && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-orange-600">
                    {Array.from({ length: detail.menu_meta.spice_level }).map((_, i) => <Flame key={i} className="h-3 w-3" />)} Spicy
                  </span>
                )}
                {!!detail.menu_meta.prep_minutes && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border"><Clock className="h-3 w-3" />{detail.menu_meta.prep_minutes} min</span>
                )}
              </div>
              {detail.description && <p className="text-sm text-muted-foreground mt-3">{detail.description}</p>}
              {detail.menu_meta.allergens && detail.menu_meta.allergens.length > 0 && (
                <p className="text-xs mt-3"><span className="font-semibold">Allergens:</span> {detail.menu_meta.allergens.join(', ')}</p>
              )}

              {detail.variants.length > 0 && (
                <div className="mt-5 space-y-4">
                  {detail.variants.map((v) => (
                    <div key={v.name}>
                      <p className="text-sm font-semibold mb-1.5">{v.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {v.values.map((val) => {
                          const on = detailVariants[v.name] === val;
                          return (
                            <button
                              key={val}
                              onClick={() => setDetailVariants((p) => ({ ...p, [v.name]: val }))}
                              className="px-3 py-1.5 text-sm rounded-md border"
                              style={on ? { backgroundColor: themeColors.primary, color: '#fff', borderColor: themeColors.primary } : {}}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* <div className="mt-5">
                <p className="text-sm font-semibold mb-1.5">Special instructions</p>
                <Textarea
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  placeholder="e.g. less spicy, no onion"
                  rows={2}
                />
              </div> */}

              <div className="mt-5 flex items-center justify-between gap-3 sticky bottom-0 bg-background pt-4 pb-2">
                <div className="flex items-center gap-2 border rounded-full px-1" style={{ borderColor: themeColors.primary }}>
                  <button onClick={() => setDetailQty((q) => Math.max(1, q - 1))} className="px-3 py-1.5"><Minus className="h-4 w-4" /></button>
                  <span className="font-semibold w-6 text-center">{detailQty}</span>
                  <button onClick={() => setDetailQty((q) => q + 1)} className="px-3 py-1.5"><Plus className="h-4 w-4" /></button>
                </div>
                <button
                  onClick={addFromDetail}
                  className="flex-1 px-4 py-2.5 rounded-full font-semibold text-sm"
                  style={{ backgroundColor: themeColors.primary, color: '#fff' }}
                >
                  Add {detailQty} · ₹{(getFulfillmentPrice(detail.price) * detailQty).toLocaleString('en-IN')}
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Floating Bottom-Right Checkout Button */}
      {totalItems > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-40 flex justify-center">
          <button
            id="floating-checkout-btn"
            key={totalItems}
            onClick={() => navigate(`/store/${slug}/checkout`)}
            className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto px-5 py-3.5 rounded-full shadow-2xl font-bold text-sm text-white transition-all duration-300 transform hover:scale-105 active:scale-95 animate-badge-pop border border-red-900/30"
            style={{ backgroundColor: '#8c2d19' }}
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
              <span 
                key={totalItems} 
                className="absolute -top-2 -right-2.5 bg-white text-[#8c2d19] text-[10px] font-black rounded-full h-4 min-w-4 px-1 flex items-center justify-center shadow-sm animate-badge-pop"
              >
                {totalItems}
              </span>
            </div>
            <span className="font-extrabold tracking-wide">Proceed to Checkout</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-md font-black text-xs text-white">
              ₹{totalPrice.toLocaleString('en-IN')}
            </span>
            <ArrowRight className="h-4 w-4 ml-0.5" />
          </button>
        </div>
      )}
      {/* Delivery Address Selection Dialog */}
      <Dialog open={isDeliveryPopupOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-4xl p-6 overflow-y-auto max-h-[90vh] rounded-2xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Configure Delivery Address
            </DialogTitle>
            <DialogDescription>
              Enter your address details or select from map to calculate distance and proceed with delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column: Manual Form */}
            <form onSubmit={handleConfirmAddress} className="space-y-4">
              <h3 className="text-sm font-semibold text-stone-800">Manual Address Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Recipient Name <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. John Doe"
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Phone Number <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="10-digit mobile"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Flat / House / Block No. <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. Flat 302, Building A"
                    value={addressForm.house}
                    onChange={(e) => setAddressForm({ ...addressForm, house: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Street / Area / Locality <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. Sector 15, Park Avenue"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Landmark <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. Near Metro Station"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">City <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. New Delhi"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">State <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. Delhi"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Pincode <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="6-digit pin"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-stone-600 block">Address Label</label>
                <div className="flex gap-2">
                  {(['home', 'office', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, addressType: type })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                        addressForm.addressType === type
                          ? 'bg-red-55 text-red-800 border-red-300 font-bold'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {type === 'home' && <Home className="h-3.5 w-3.5" />}
                      {type === 'office' && <Briefcase className="h-3.5 w-3.5" />}
                      {type === 'other' && <MapPin className="h-3.5 w-3.5" />}
                      <span className="capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {user && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveToProfileCheck"
                    checked={addressForm.saveToProfile}
                    onChange={(e) => setAddressForm({ ...addressForm, saveToProfile: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500 h-3.5 w-3.5 border-stone-300"
                  />
                  <label htmlFor="saveToProfileCheck" className="text-xs font-medium text-stone-600">
                    Save address to my account profile
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDialogChange(false)}
                  className="flex-1 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white rounded-xl transition"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  Confirm Address
                </button>
              </div>
            </form>

            {/* Right Column: Map Selection */}
            <div className="flex flex-col gap-4 border-l pl-0 md:pl-6 pt-6 md:pt-0">
              <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                <Map className="h-4 w-4 text-stone-500" />
                Select from Map
              </h3>
              
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center">
                <iframe
                  title="Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={isLocationDetected && mapCoords
                    ? `https://maps.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&z=16&output=embed`
                    : `https://maps.google.com/maps?q=&ll=${Number((store?.settings as any)?.store_lat) || Number(storeSettings.store_lat) || 28.6139},${Number((store?.settings as any)?.store_lng) || Number(storeSettings.store_lng) || 77.2090}&z=14&output=embed`
                  }
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="w-full py-2.5 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border rounded-xl hover:bg-stone-50 transition disabled:opacity-50"
                style={{ borderColor: themeColors.primary, color: themeColors.primary }}
              >
                {isDetectingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detecting current location...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4" />
                    Use Current Location (Auto-fill)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Section: Previous / Saved Addresses */}
          {savedAddresses.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-stone-500" />
                Previously Used Addresses
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedSavedAddressId === addr.id;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectSavedAddress(addr)}
                      className={`flex-shrink-0 text-left p-3 rounded-xl border text-xs w-64 transition-all relative ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100/70'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-4 w-4 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mb-1">
                        {addr.label?.toLowerCase() === 'home' && <Home className="h-3.5 w-3.5 text-stone-500" />}
                        {addr.label?.toLowerCase() === 'office' && <Briefcase className="h-3.5 w-3.5 text-stone-500" />}
                        {addr.label?.toLowerCase() !== 'home' && addr.label?.toLowerCase() !== 'office' && <MapPin className="h-3.5 w-3.5 text-stone-500" />}
                        <span className="font-bold text-stone-700 capitalize">{addr.label || 'Saved'}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium truncate">
                        {addr.name} ({addr.phone})
                      </p>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">
                        {addr.house}, {addr.street}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StorefrontLayout>
  );
};

export default StorefrontMenu;
