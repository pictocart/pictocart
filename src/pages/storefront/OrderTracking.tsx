import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, ChefHat, Bell, Truck, Utensils, PartyPopper, Star, MessageCircle, MapPin, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PREP_STEPS = [
  { key: 'received', label: 'Received', desc: 'Order sent to store', icon: Check },
  { key: 'preparing', label: 'Preparing', desc: 'Kitchen is cooking', icon: ChefHat },
  { key: 'ready', label: 'Ready', desc: 'Packed & ready', icon: Bell },
  { key: 'served', label: 'Out / Served', desc: 'Heading your way', icon: Truck },
];

const COMPLETED_STATES = new Set(['completed', 'delivered']);

const OrderTracking = () => {
  const { code } = useParams<{ code: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [storeInfo, setStoreInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);

  // Google Maps references
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const load = async () => {
      // 1. Load order by tracking code
      const { data } = await supabase.rpc('get_order_by_tracking' as any, { tracking_code: code });
      const row = Array.isArray(data) ? data[0] : data;
      if (cancelled) return;
      setOrder(row || null);
      
      // 2. Fetch feedback context
      if (row?.id) {
        const { data: fb } = await supabase
          .from('order_feedback' as any)
          .select('id')
          .eq('order_id', row.id)
          .maybeSingle();
        if (fb && !cancelled) setSubmitted(true);
      }

      // 3. Fetch store details (coordinates, brand details)
      if (row?.store_id && !storeInfo) {
        const { data: sData } = await supabase
          .from('stores')
          .select('name, logo_url, settings, category, slug')
          .eq('id', row.store_id)
          .maybeSingle();
        if (sData && !cancelled) {
          setStoreInfo(sData);
        }
      }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [code, storeInfo]);

  // Load Google Maps script dynamically
  useEffect(() => {
    if (order?.fulfillment_mode !== 'delivery') return;
    if ((window as any).google && (window as any).google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleMapsLoaded(true);
    document.body.appendChild(script);
  }, [order?.fulfillment_mode]);

  // Initialize and update Google Maps markers & polylines
  useEffect(() => {
    if (!googleMapsLoaded || !order || order.fulfillment_mode !== 'delivery') return;
    const google = (window as any).google;
    if (!google || !google.maps) return;

    const storeSettings = storeInfo?.settings || {};
    const storeLat = Number(storeSettings.store_lat || 28.6139);
    const storeLng = Number(storeSettings.store_lng || 77.2090);

    const riderLat = Number(order.rider_lat || storeLat);
    const riderLng = Number(order.rider_lng || storeLng);

    // Mock customer location offset slightly from restaurant
    const customerLat = storeLat + 0.006;
    const customerLng = storeLng + 0.008;

    if (!mapRef.current) {
      const mapContainer = document.getElementById('live-google-map');
      if (!mapContainer) return;

      const map = new google.maps.Map(mapContainer, {
        center: { lat: (storeLat + customerLat) / 2, lng: (storeLng + customerLng) / 2 },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Restaurant Marker
      new google.maps.Marker({
        position: { lat: storeLat, lng: storeLng },
        map: map,
        title: 'Store',
        label: {
          text: '🏪',
          fontSize: '18px'
        }
      });

      // Customer Marker
      new google.maps.Marker({
        position: { lat: customerLat, lng: customerLng },
        map: map,
        title: 'Delivery Location',
        label: {
          text: '🏠',
          fontSize: '18px'
        }
      });

      // Rider Marker
      const riderMarker = new google.maps.Marker({
        position: { lat: riderLat, lng: riderLng },
        map: map,
        title: 'Delivery Rider',
        label: {
          text: '🏍️',
          fontSize: '20px'
        }
      });
      riderMarkerRef.current = riderMarker;

      // Draw red tracking path route
      const routeLine = new google.maps.Polyline({
        path: [
          { lat: storeLat, lng: storeLng },
          { lat: riderLat, lng: riderLng },
          { lat: customerLat, lng: customerLng },
        ],
        geodesic: true,
        strokeColor: '#EF4444',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: map
      });
      routeLineRef.current = routeLine;

      // Set boundary view
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(new google.maps.LatLng(storeLat, storeLng));
      bounds.extend(new google.maps.LatLng(customerLat, customerLng));
      map.fitBounds(bounds);

      mapRef.current = map;
    } else {
      const riderMarker = riderMarkerRef.current;
      const routeLine = routeLineRef.current;

      if (riderMarker) {
        riderMarker.setPosition({ lat: riderLat, lng: riderLng });
      }

      if (routeLine) {
        routeLine.setPath([
          { lat: storeLat, lng: storeLng },
          { lat: riderLat, lng: riderLng },
          { lat: customerLat, lng: customerLng },
        ]);
      }
    }
  }, [googleMapsLoaded, order?.rider_lat, order?.rider_lng, order?.fulfillment_mode, storeInfo]);

  const submitFeedback = async () => {
    if (!order || rating < 1) return;
    setSubmitting(true);
    const { error } = await supabase.from('order_feedback' as any).insert({
      order_id: order.id,
      store_id: order.store_id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(true);
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    setSubmitted(true);
    toast.success('Thanks for your feedback!');
    setSubmitting(false);
  };

  const handleCallWaiter = async () => {
    if (!order) return;
    setCallingWaiter(true);
    try {
      const { error } = await supabase
        .from('store_assistance_requests' as any)
        .insert({
          store_id: order.store_id,
          table_label: order.table_label || 'T-1',
          status: 'pending'
        });
      if (error) throw error;
      toast.success('Waiter called to your table!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to summon waiter');
    }
    setCallingWaiter(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-stone-50 dark:bg-stone-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-medium">Connecting to live tracking...</span>
      </div>
    );
  }
  if (!order) return <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-stone-50 dark:bg-stone-950">Order not found</div>;

  const isCompleted = COMPLETED_STATES.has(order.prep_status) || COMPLETED_STATES.has(order.status);

  useEffect(() => {
    if (order && isCompleted && storeInfo?.slug) {
      localStorage.removeItem(`active_order_tracking_${storeInfo.slug}`);
    }
  }, [order, isCompleted, storeInfo]);

  const currentIdx = isCompleted
    ? PREP_STEPS.length - 1
    : Math.max(0, PREP_STEPS.findIndex((s) => s.key === order.prep_status));

  const supportWaUrl = `https://wa.me/919810189606?text=${encodeURIComponent(
    `Hi, I need assistance with my order ${order.order_number} placed at ${storeInfo?.name || 'the store'}.`
  )}`;

  return (
    <div className="min-h-screen bg-stone-50/50 dark:bg-stone-950/50 py-8 px-4 font-sans pb-24">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          {storeInfo?.logo_url ? (
            <img src={storeInfo.logo_url} alt="Store logo" className="h-12 w-12 rounded-xl object-cover border" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/10">
              {storeInfo?.name?.charAt(0) || 'S'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black truncate text-stone-900 dark:text-stone-100">{storeInfo?.name || 'Restaurant Store'}</h2>
            <p className="text-xs text-muted-foreground truncate">ID: {order.order_number}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-flex px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse">
              Live status
            </span>
          </div>
        </div>

        {/* Live Stepper Tracker Widget (Swiggy/Zomato Style) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Estimated progress</p>
            <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
              {isCompleted ? 'Enjoy your order! 🎉' :
               order.prep_status === 'received' ? 'Order Received & Verified' :
               order.prep_status === 'preparing' ? 'Chef is cooking your meal' :
               order.prep_status === 'ready' ? 'Packed & waiting' : 'Out for delivery / serving'}
            </h3>
          </div>

          {/* Progress Bar Track */}
          <div className="relative py-4">
            <div className="absolute top-[28px] left-[18px] right-[18px] h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full z-0" />
            <div 
              className="absolute top-[28px] left-[18px] h-1.5 bg-gradient-to-r from-primary to-orange-500 rounded-full z-0 transition-all duration-500" 
              style={{ width: `${(currentIdx / (PREP_STEPS.length - 1)) * 90}%` }}
            />

            <div className="relative flex justify-between z-10">
              {PREP_STEPS.map((s, i) => {
                const isPassed = i < currentIdx;
                const isCurrent = i === currentIdx;
                const Icon = s.icon;

                return (
                  <div key={s.key} className="flex flex-col items-center gap-1.5">
                    <div 
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isPassed ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105' :
                        isCurrent ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110 border-2 border-white ring-4 ring-orange-500/10' :
                        'bg-stone-150 dark:bg-stone-800 text-stone-400 dark:text-stone-600'
                      }`}
                    >
                      {isPassed ? <Check className="h-4 w-4 stroke-[3px]" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="text-center max-w-[70px]">
                      <p className={`text-[10px] font-black uppercase tracking-wider ${isCurrent ? 'text-orange-600 dark:text-orange-400 font-black' : isPassed ? 'text-stone-800 dark:text-stone-300' : 'text-stone-400'}`}>{s.label}</p>
                      <p className="text-[8px] text-muted-foreground truncate">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live GPS Tracker / Map Widget (EXCLUSIVELY FOR DELIVERY ORDERS) */}
        {order.fulfillment_mode === 'delivery' && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950">
              {/* Dynamic Google Map Element */}
              <div id="live-google-map" style={{ height: "260px", width: "100%" }} className="block z-0 bg-stone-100" />
              
              {/* Status Radar Tag Overlay */}
              <div className="absolute top-3 left-3 right-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm p-3 rounded-xl shadow-md border border-stone-200/30 dark:border-stone-800/30 flex items-center gap-3 z-10">
                <div className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-stone-900 dark:text-stone-100 truncate">
                    {!order.rider_id ? 'Assigning a delivery partner...' :
                     order.rider_status === 'pending' ? 'Waiting for delivery partner...' :
                     order.rider_status === 'accepted' ? 'Rider heading to store...' :
                     order.rider_status === 'picked_up' ? 'Rider picked up your food!' :
                     'Order is out for delivery!'}
                  </p>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-widest mt-0.5">Live store GPS radar tracking</p>
                </div>
              </div>
            </div>
            
            {/* Action Helper Buttons */}
            <div className="flex gap-2">
              <a 
                href={supportWaUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Store Support
              </a>
            </div>
          </div>
        )}

        {/* Action Callout Panel (FOR DINE-IN AND TAKEAWAY ONLY - MAP HIDDEN) */}
        {order.fulfillment_mode !== 'delivery' && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                {order.fulfillment_mode === 'dine_in' ? 'Dining at Table' : 'Store Takeaway'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {order.fulfillment_mode === 'dine_in' 
                  ? `Your order will be served directly at Table ${order.table_label || '—'}.`
                  : 'Your pack is being packaged for takeaway. Pick up at the counter.'}
              </p>
            </div>
            
            <div className="flex gap-2">
              <a 
                href={supportWaUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 shadow-sm shadow-emerald-600/10 transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Store Support
              </a>
              {order.fulfillment_mode === 'dine_in' && !isCompleted && (
                <button
                  onClick={handleCallWaiter}
                  disabled={callingWaiter}
                  className="flex-1 h-10 rounded-xl bg-orange-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-orange-600 shadow-sm shadow-orange-500/10 transition-colors"
                >
                  {callingWaiter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Call Waiter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Enjoy / Feedback Section */}
        {isCompleted && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-5 shadow-sm text-center space-y-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-stone-900 dark:text-stone-100">Rate your experience!</h3>
              <p className="text-xs text-muted-foreground">Your feedback helps the kitchen cook even better next time.</p>
            </div>

            {submitted ? (
              <div className="pt-2 text-sm text-emerald-600 dark:text-emerald-400 font-extrabold">
                Feedback submitted. Thank you! 🙏
              </div>
            ) : (
              <div className="pt-2 space-y-4 text-left">
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(n)}
                      className="p-1 transition-transform hover:scale-110"
                      aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors duration-200 ${
                          (hover || rating) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300 dark:text-stone-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share a review of the food... (optional)"
                  rows={2}
                  className="text-xs rounded-xl focus-visible:ring-primary border-stone-200 dark:border-stone-800"
                />
                <Button
                  onClick={submitFeedback}
                  disabled={rating < 1 || submitting}
                  className="w-full h-10 rounded-xl font-bold text-xs"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Review
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Order Items list */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-1">Receipt details</p>
          <div className="divide-y divide-stone-100 dark:divide-stone-800/50">
            {(order.items as any[]).map((it, i) => (
              <div key={i} className="flex justify-between text-xs py-2 text-stone-700 dark:text-stone-300">
                <span className="font-medium">{it.title} × {it.quantity}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">₹{(it.price * it.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-black text-sm pt-3 border-t border-stone-200/50 dark:border-stone-850 text-stone-900 dark:text-stone-100">
            <span>Total amount</span>
            <span>₹{Number(order.total).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Footer Notes */}
        {!isCompleted && (
          <p className="text-center text-[10px] uppercase font-black tracking-widest text-stone-400">
            Automatically syncing statuses. Do not refresh!
          </p>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
