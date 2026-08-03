import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { Truck, Navigation } from 'lucide-react';

export default function ActiveOrderTrackerFloat() {
  const { slug } = useParams<{ slug: string }>();
  const { store } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const storeSlug = store?.slug || slug;

  useEffect(() => {
    if (!storeSlug) {
      setTrackingCode(null);
      return;
    }

    // Check if there is an active tracking code
    const checkTracking = () => {
      const code = localStorage.getItem(`active_order_tracking_${storeSlug}`);
      if (code) {
        setTrackingCode(code);
        return;
      }

      // Check fallback theme cache
      const cacheStr = localStorage.getItem(`active_orders_cache_${storeSlug}`);
      if (cacheStr) {
        try {
          const cache = JSON.parse(cacheStr);
          if (Array.isArray(cache) && cache.length > 0 && cache[0].guest_tracking_code) {
            setTrackingCode(cache[0].guest_tracking_code);
            return;
          }
        } catch (e) {}
      }

      setTrackingCode(null);
    };

    checkTracking();
    
    // Listen for custom checkout events or storage changes
    window.addEventListener('order_placed', checkTracking);
    window.addEventListener('storage', checkTracking);
    
    // Poll every 10 seconds for clean state syncing
    const interval = setInterval(checkTracking, 10000);

    return () => {
      window.removeEventListener('order_placed', checkTracking);
      window.removeEventListener('storage', checkTracking);
      clearInterval(interval);
    };
  }, [storeSlug]);

  // Hide the floating pill if:
  // 1. No active tracking code is in cache.
  // 2. The customer is currently already on the tracking page (avoid redundancy).
  if (!trackingCode) return null;
  if (location.pathname.includes('/track/')) return null;

  // Render a premium Swiggy/Zomato style pulsing button at bottom-right viewport
  return (
    <button
      onClick={() => navigate(`/track/${trackingCode}`)}
      className="fixed bottom-[88px] right-4 z-40 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs py-3 px-4 rounded-full shadow-lg shadow-orange-500/20 border border-white/20 flex items-center gap-2 tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 animate-pulse-glow"
      style={{
        boxShadow: "0 4px 20px rgba(249, 115, 22, 0.4)"
      }}
    >
      <Truck className="h-4 w-4 animate-bounce shrink-0" />
      <span>Track Active Order</span>
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
      </span>
    </button>
  );
}
