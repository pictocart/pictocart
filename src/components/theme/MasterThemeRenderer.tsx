import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useParams, useNavigate, useLocation } from "react-router-dom";
import { Truck, Shield, RefreshCw, Headphones, Lock, Tag, Gift, Sparkles, Star, ShoppingBag, User, Search, Mail, MapPin, Clock, Phone, Trash2, Minus, Plus, Loader2, X, ChefHat, GripVertical, Menu } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import ProductCardActions from "@/components/storefront/ProductCardActions";
import ProductPageRenderer from "@/components/storefront/ProductPageRenderer";
import CustomerAuthModal from "@/components/storefront/CustomerAuthModal";
import { useValidateCoupon } from "@/hooks/useCoupons";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Manifest-driven theme renderer. Single source of truth for both the
 * /admin/themes/preview page and the live /store/:slug page.
 *
 * Section content comes from `manifest.pages[page].sections[].props`.
 * Per-section edits made in Customise are stored in
 * `store.settings.theme_overrides.sections[index]` and shallow-merged on top.
 *
 * Override conventions:
 *   - { image: "https://..." } replaces the image
 *   - { image: "" } explicitly clears the image (user deleted it)
 *   - any other prop key overrides the manifest prop of the same name
 */

const ICONS: Record<string, any> = {
  truck: Truck, shield: Shield, refresh: RefreshCw, headphones: Headphones,
  lock: Lock, tag: Tag, gift: Gift, sparkles: Sparkles,
};

type Manifest = any;
type HeaderOv = {
  logo_url?: string;
  show_name?: boolean;
  brand_name?: string;
  nav_links?: Array<{ label: string; page: string }>;
};
type FooterOv = {
  tagline?: string;
  show_powered_by?: boolean;
  social?: { instagram?: string; facebook?: string; twitter?: string; youtube?: string };
  columns?: Array<{ title: string; links: Array<{ label: string; href: string; page?: string }> }>;
};
type Overrides = {
  sections?: Record<string | number, any>;
  brand_name?: string;
  header?: HeaderOv;
  footer?: FooterOv;
  pages?: Record<string, { sections?: Record<string | number, any> }>;
  disabled_pages?: string[];
} | undefined;

function loadFont(family: string) {
  if (!family) return;
  const id = `font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

interface Props {
  manifest: Manifest;
  page?: string;
  overrides?: Overrides;
  storeSlug?: string;
  /** When set (preview mode), in-theme menu clicks call this instead of routing. */
  onNavigate?: (page: string) => void;
  /** Real catalog products to splice into product_grid sections. */
  products?: Array<{ id: string; title: string; price: number; compare_at_price?: number | null; images?: string[] | null; category?: string | null }>;
  /** Seller-defined categories (with optional image / description / subs) to splice into category_grid and collections_grid sections. */
  sellerCategories?: Array<{ id?: string; name: string; image_url?: string | null; description?: string | null; subs?: Array<{ id?: string; name: string; image_url?: string | null }> }>;
  /** Active product for the product detail page — injected into product_detail sections. */
  product?: any;
  store?: any;
}

export default function MasterThemeRenderer({ manifest, page = "home", overrides, storeSlug, onNavigate, products, sellerCategories, product, store }: Props) {
  const navigate = useNavigate();
  // Floating Live Status Tracker States with Instant Cache Loading
  const [activeOrders, setActiveOrders] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`active_orders_cache_${storeSlug}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isClosed, setIsClosed] = useState(false);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(`tracker_pos_${storeSlug}`);
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const initialCoordsRef = useRef({ x: 0, y: 0 });

  // Play browser synthesizer sound alerts for order placement and status updates
  const playAlertSound = (type: 'placed' | 'status_changed') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      
      if (type === 'placed') {
        o.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        o.start();
        o.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        o.stop(ctx.currentTime + 0.4);
      } else {
        o.frequency.setValueAtTime(440, ctx.currentTime); // A4
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        o.start();
        o.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08); // C#5
        o.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16); // E5
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
        o.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('[sound] failed to play synth alert', e);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setHasMoved(false);
    initialCoordsRef.current = { x: e.clientX, y: e.clientY };
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition({ x: newX, y: newY });
    
    // Check drag distance threshold to distinguish click from drag
    const dist = Math.sqrt(
      Math.pow(e.clientX - initialCoordsRef.current.x, 2) +
      Math.pow(e.clientY - initialCoordsRef.current.y, 2)
    );
    if (dist > 5) {
      setHasMoved(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      localStorage.setItem(`tracker_pos_${storeSlug}`, JSON.stringify(position));
    } catch (err) {}

    // Redirect or expand based on status of isClosed
    if (!hasMoved) {
      if (isClosed) {
        setIsClosed(false);
      } else {
        navigate(`/store/${storeSlug}/account`);
      }
    }
  };

  // Realtime subscription setup
  useEffect(() => {
    if (!storeSlug) return;
    const orderIdsKey = `placed_order_ids_${storeSlug}`;
    
    const checkActiveOrders = async () => {
      let ids: string[] = [];
      try {
        ids = JSON.parse(localStorage.getItem(orderIdsKey) || '[]');
      } catch {
        return;
      }
      if (ids.length === 0) {
        setActiveOrders([]);
        localStorage.removeItem(`active_orders_cache_${storeSlug}`);
        return;
      }

      // Query active orders from DB
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, prep_status, total, items, fulfillment_mode, table_label')
        .in('id', ids)
        .not('prep_status', 'in', '(completed,cancelled)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[tracker] failed to fetch active orders', error);
        return;
      }

      if (data && data.length > 0) {
        setActiveOrders(data);
        localStorage.setItem(`active_orders_cache_${storeSlug}`, JSON.stringify(data));
      } else {
        setActiveOrders([]);
        localStorage.removeItem(`active_orders_cache_${storeSlug}`);
      }
    };

    checkActiveOrders();

    // Fast polling fallback (every 5 seconds) to catch KOT updates instantly
    const pollInterval = setInterval(checkActiveOrders, 5000);

    const handleOrderPlaced = () => {
      playAlertSound('placed');
      setIsClosed(false);
      checkActiveOrders();
    };

    window.addEventListener('order_placed', handleOrderPlaced);

    // Live Postgres updates using Supabase Realtime
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem(orderIdsKey) || '[]');
    } catch {}

    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          if (ids.includes(payload.new.id)) {
            setActiveOrders((current: any[]) => {
              const updated = current.map((order) => {
                if (order.id === payload.new.id) {
                  if (order.prep_status !== payload.new.prep_status) {
                    playAlertSound('status_changed');
                    setIsClosed(false);
                  }
                  return {
                    ...order,
                    prep_status: payload.new.prep_status,
                  };
                }
                return order;
              }).filter(o => !['completed', 'cancelled'].includes(o.prep_status));
              
              if (updated.length > 0) {
                localStorage.setItem(`active_orders_cache_${storeSlug}`, JSON.stringify(updated));
              } else {
                localStorage.removeItem(`active_orders_cache_${storeSlug}`);
              }
              return updated;
            });
            if (['completed', 'cancelled'].includes(payload.new.prep_status)) {
              checkActiveOrders();
            }
          }
        }
      )
      .subscribe();

    const broadcastChannel = supabase.channel(`store_kitchen_${storeSlug}`)
      .on('broadcast', { event: 'status_update' }, ({ payload }) => {
        if (ids.includes(payload.orderId)) {
          setActiveOrders((current: any[]) => {
            const updated = current.map((order) => {
              if (order.id === payload.orderId) {
                if (order.prep_status !== payload.prep_status) {
                  playAlertSound('status_changed');
                  setIsClosed(false);
                }
                return {
                  ...order,
                  prep_status: payload.prep_status,
                };
              }
              return order;
            }).filter(o => !['completed', 'cancelled'].includes(o.prep_status));
            
            if (updated.length > 0) {
              localStorage.setItem(`active_orders_cache_${storeSlug}`, JSON.stringify(updated));
            } else {
              localStorage.removeItem(`active_orders_cache_${storeSlug}`);
            }
            return updated;
          });
          if (['completed', 'cancelled'].includes(payload.prep_status)) {
            checkActiveOrders();
          }
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('order_placed', handleOrderPlaced);
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [storeSlug]);

  const storeCategory = store?.category || (overrides as any)?.category || manifest?.store?.category || "";
  const baseDna = manifest?.dna ?? {};
  const overridesPalette = (overrides as any)?.palette ?? {};
  
  // Merge global palette overrides
  const palette = { ...(baseDna.palette ?? {}), ...overridesPalette };

  if (storeCategory === "food") {
    palette.primary = "#8c2d19";
    palette.primary_fg = "#ffffff";
    palette.accent = "#8c2d19";
    palette.bg = "#faf6f0";
    palette.surface = "#faf6f0";
    palette.border = "rgba(140, 45, 25, 0.12)";
    palette.fg = "#2a1b15";
    palette.muted = "#706053";
  }
  
  // Merge global fonts and layout overrides
  const globalOv = (overrides as any)?.global || {};
  const globalFonts = globalOv.fonts || {};
  const fonts = {
    heading: globalFonts.heading || baseDna.fonts?.heading || "Outfit",
    body: globalFonts.body || baseDna.fonts?.body || "Inter",
    heading_weight: baseDna.fonts?.heading_weight ?? 700
  };

  const dna = { ...baseDna, palette, fonts };
  const radius = globalOv.radius != null ? `${globalOv.radius}px` : (dna.radius ?? "8px");
  const headerStyle = manifest?.header_style ?? dna.layout?.header_style ?? "classic";
  const brandName = overrides?.brand_name || store?.name || dna.name;
  const headerOv = {
    logo_url: (overrides as any)?.logo_url || "",
    brand_name: (overrides as any)?.brand_name || "",
    ...((overrides as any)?.header || {}),
  };

  useMemo(() => { loadFont(fonts.heading); loadFont(fonts.body); }, [fonts.heading, fonts.body]);

  useEffect(() => {
    // Select all sections and footers to observe
    const elements = document.querySelectorAll('[data-section-index], [data-section-anchor="footer"]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
        } else {
          entry.target.classList.remove('reveal-active');
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });
    
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [page, manifest, overrides]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? scrolled / maxScroll : 0;
      document.documentElement.style.setProperty('--scroll-y', `${scrolled}px`);
      document.documentElement.style.setProperty('--scroll-progress', `${progress}`);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).triggerParabolicFly = (e: React.MouseEvent, qty: number = 1) => {
        const button = e?.currentTarget as HTMLElement;
        if (!button) return;
        const card = button.closest(".group") || button.closest(".rounded-2xl") || button.closest("a") || button.closest("div");
        const imgEl = card ? card.querySelector("img") : null;
        let startRect = imgEl ? imgEl.getBoundingClientRect() : null;
        
        if (!startRect || startRect.top < 0 || startRect.bottom > window.innerHeight) {
          startRect = button.getBoundingClientRect();
        }
        
        const getCartButton = () => {
          const floatingCart = document.getElementById("floating-checkout-btn");
          if (floatingCart) {
            const rect = floatingCart.getBoundingClientRect();
            if (rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0) {
              return floatingCart;
            }
          }
          const mobileCart = document.getElementById("mobile-cart-btn");
          if (mobileCart) {
            const rect = mobileCart.getBoundingClientRect();
            if (rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0) {
              return mobileCart;
            }
          }
          const headerCart = document.getElementById("header-cart-btn");
          if (headerCart) {
            const rect = headerCart.getBoundingClientRect();
            if (rect.top >= 0 && rect.bottom <= window.innerHeight && rect.width > 0) {
              return headerCart;
            }
          }
          return document.getElementById("floating-checkout-btn") ||
                 document.getElementById("header-cart-btn") || 
                 document.getElementById("mobile-cart-btn") || 
                 document.querySelector(".shopping-bag");
        };

        const cartBtn = getCartButton();
        const endRect = cartBtn 
          ? cartBtn.getBoundingClientRect()
          : {
              left: window.innerWidth - 80,
              top: window.innerHeight - 80,
              width: 50,
              height: 50
            } as DOMRect;
        
        const startX = startRect.left + startRect.width - 12;
        const startY = startRect.top - 12;
        
        const endX = endRect.left + endRect.width / 2 - 11;
        const endY = endRect.top + endRect.height / 2 - 11;
        
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        const flyEl = document.createElement("div");
        flyEl.className = "dynamic-cart-flyer";
        flyEl.style.left = `${startX}px`;
        flyEl.style.top = `${startY}px`;
        flyEl.style.setProperty("--tx", `${deltaX}px`);
        flyEl.style.setProperty("--ty", `${deltaY}px`);
        
        const flyInner = document.createElement("div");
        flyInner.className = "dynamic-cart-flyer-inner";
        flyInner.innerText = String(qty);
        flyEl.appendChild(flyInner);
        
        document.body.appendChild(flyEl);
        
        setTimeout(() => {
          flyEl.remove();
          
          if (cartBtn) {
            cartBtn.classList.remove("shake-cart");
            void cartBtn.offsetWidth;
            cartBtn.classList.add("shake-cart");
            
            const badge = cartBtn.querySelector(".animate-badge-pop");
            if (badge) {
              badge.classList.remove("animate-badge-pop");
              void (badge as HTMLElement).offsetWidth;
              badge.classList.add("animate-badge-pop");
            }
          }
          
          setTimeout(() => {
            cartBtn.classList.remove("shake-cart");
          }, 500);
        }, 800);
      };
    }
  }, []);

  const style: React.CSSProperties = {
    background: palette.bg,
    color: palette.fg,
    fontFamily: `${fonts.body}, system-ui, sans-serif`,
    ["--p" as any]: palette.primary,
    ["--pf" as any]: palette.primary_fg,
    ["--ac" as any]: palette.accent,
    ["--bg" as any]: palette.bg,
    ["--sf" as any]: palette.surface,
    ["--fg" as any]: palette.fg,
    ["--mu" as any]: palette.muted,
    ["--bd" as any]: palette.border,
    ["--r" as any]: radius,
    ["--hf" as any]: `${fonts.heading}, serif`,
  };

  // (built-in collections synthesized below as renderedSections)
  // New shape: overrides.pages[page].sections[idx]. Legacy: overrides.sections[idx] (home-only).
  const sectionOverrides: Record<string, any> =
    (overrides as any)?.pages?.[page]?.sections ??
    (page === "home" ? (overrides as any)?.sections ?? {} : {});

  // Inject real products into the first product/trending section if products were supplied.
  // On the shop page we pass ALL products (no slice) so category filtering works on the full catalog.
  const productItemsForOverride = products && products.length > 0
    ? (page === "shop" ? products : products.slice(0, 8)).map((p: any) => ({
        id: p.id, name: p.title, price: p.price, compare_at: p.compare_at_price,
        image: p.images?.[0], category: p.category,
      }))
    : null;
  let productSectionInjected = false;

  // Seller-defined categories override the theme's stock category tiles when present.
  const sellerCategoryItems = useMemo(() => {
    if (!sellerCategories || sellerCategories.length === 0) return null;
    const parents = sellerCategories.filter((c: any) => !c.parent_id);
    return parents.map((p: any) => {
      const subs = sellerCategories
        .filter((c: any) => c.parent_id === p.id)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          image: c.image_url || undefined,
          description: c.description || undefined,
        }));
      return {
        id: p.id,
        name: p.name,
        image: p.image_url || undefined,
        description: p.description || undefined,
        subs,
      };
    });
  }, [sellerCategories]);

  // Synthesize a built-in Collections page if the manifest doesn't define one.
  const collectionsItems = sellerCategoryItems ?? [];
  const renderedSections: any[] = page === "collections" && (!manifest?.pages?.collections?.sections?.length)
    ? [{ type: "page_title", props: { title: "Collections" } }, { type: "collections_grid", props: { items: collectionsItems } }]
    : page === "collection_detail" && (!manifest?.pages?.collection_detail?.sections?.length)
      ? [{ type: "collection_detail", props: { items: collectionsItems } }]
      : page === "shop" && (!manifest?.pages?.shop?.sections?.length)
        ? [{ type: "page_title", props: { title: "All Products" } }, { type: "product_grid", props: { style: "grid_clean" } }]
        : page === "product" && (!manifest?.pages?.product?.sections?.length)
          ? [{ type: "product_detail", props: {} }]
          : page === "cart" && (!manifest?.pages?.cart?.sections?.length)
            ? [{ type: "page_title", props: { title: "Your Cart" } }, { type: "line_items", props: {} }, { type: "cart_summary", props: {} }]
            : page === "checkout" && (!manifest?.pages?.checkout?.sections?.length)
              ? [{ type: "page_title", props: { title: "Checkout" } }, { type: "checkout_stepper", props: {} }]
              : page === "journal" && (!manifest?.pages?.journal?.sections?.length)
                ? [{ type: "page_title", props: { title: "Journal" } }, { type: "journal_list", props: {} }]
                : page === "about" && (!manifest?.pages?.about?.sections?.length)
                  ? [{ type: "page_title", props: { title: "About Us" } }, { type: "story", props: {} }, { type: "values", props: {} }]
                  : page === "contact" && (!manifest?.pages?.contact?.sections?.length)
                    ? [{ type: "page_title", props: { title: "Contact Us" } }, { type: "contact_form", props: {} }]
                    : (manifest?.pages?.[page]?.sections ?? []);

  const footerOv = overrides?.footer || {};
  const footerStyle: Record<string, any> = {};
  const footerAttrs: Record<string, string> = {};
  const TEXT_KEYS = ["title", "sub", "subtitle", "kicker", "cta", "cta_secondary", "body", "email", "phone", "address", "hours"];
  TEXT_KEYS.forEach((k) => {
    if (footerOv[`${k}_color`]) {
      footerStyle[`--${k}-color` as any] = footerOv[`${k}_color`];
      footerAttrs[`data-has-${k}-color`] = "true";
    }
    if (footerOv[`${k}_font_size`]) {
      const fsVal = footerOv[`${k}_font_size`];
      const fsStr = typeof fsVal === "number" ? `${fsVal}px` : fsVal;
      footerStyle[`--${k}-font-size` as any] = fsStr;
      footerAttrs[`data-has-${k}-font-size`] = "true";
    }
  });

  const hexToHsl = (hexColor: string) => {
    try {
      let hex = hexColor.replace(/^#/, '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      let r = parseInt(hex.substring(0, 2), 16) / 255;
      let g = parseInt(hex.substring(2, 4), 16) / 255;
      let b = parseInt(hex.substring(4, 6), 16) / 255;
      let max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    } catch {
      return '0 0% 100%';
    }
  };

  const hslBg = hexToHsl(palette.bg || '#ffffff');
  const hslFg = hexToHsl(palette.fg || '#000000');
  const hslCard = hexToHsl(palette.surface || palette.bg || '#ffffff');
  const hslBorder = hexToHsl(palette.border || '#e5e7eb');
  const hslMuted = hexToHsl(palette.muted || '#f3f4f6');
  const hslPrimary = hexToHsl(palette.primary || '#000000');
  const hslAccent = hexToHsl(palette.accent || '#000000');
  const hslSecondary = hexToHsl(palette.border || '#e5e7eb');

  return (
    <div style={style} data-master-theme key={page} className="animate-page-enter">
      <div className="scroll-progress-indicator" />
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          background-color: hsl(${hslBg}) !important;
          color: hsl(${hslFg}) !important;
        }

        /* Floating Scroll Progress Bar */
        .scroll-progress-indicator {
          position: fixed;
          top: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg, #ff6b4a, #ff8c4a);
          width: calc(var(--scroll-progress, 0) * 100vw);
          z-index: 1000;
          pointer-events: none;
          box-shadow: 0 0 8px rgba(255, 107, 74, 0.5);
          transition: width 0.1s ease-out;
        }

        /* Smooth Page Transition/Reveal overlay on entrance */
        @keyframes pageFadeIn {
          from {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }
        .animate-page-enter {
          animation: pageFadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Smooth Scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Stepper pulse glow animation */
        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.8;
            box-shadow: 0 0 0 0 rgba(255, 107, 74, 0.4);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 10px 4px rgba(255, 107, 74, 0.25);
          }
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s infinite ease-in-out;
        }

        /* Entrance Reveal for headings */
        @keyframes headingReveal {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        [data-master-theme] h1, [data-master-theme] h2 {
          animation: headingReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Premium 3D Scroll Reveal Animations */
        [data-section-index], [data-section-anchor="footer"] {
          opacity: 0;
          filter: blur(10px);
          transform: perspective(1000px) rotateX(8deg) translateY(45px) scale(0.97);
          transition: 
            opacity 1.3s cubic-bezier(0.16, 1, 0.3, 1), 
            filter 1.3s cubic-bezier(0.16, 1, 0.3, 1), 
            transform 1.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          will-change: transform, opacity, filter;
        }
        [data-section-index].reveal-active, [data-section-anchor="footer"].reveal-active {
          opacity: 1;
          filter: blur(0);
          transform: perspective(1000px) rotateX(0deg) translateY(0) scale(1);
        }

        /* Premium Card Hover glow for F&B category/product lists */
        [data-master-theme] .rounded-2xl:hover, [data-master-theme] .rounded-xl:hover {
          box-shadow: 0 20px 45px rgba(140, 45, 25, 0.08) !important;
          border-color: rgba(140, 45, 25, 0.25) !important;
          transform: translateY(-6px) scale(1.005) !important;
        }

        /* Hover Cards Lift, Zoom & Premium Shadow */
        .group, [data-section-index] a, [data-section-index] .rounded-xl, [data-section-index] .rounded-2xl {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .group:hover {
          transform: translateY(-8px) scale(1.005) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12) !important;
        }
        
        /* Ken burns zoom on images */
        .group img, [data-section-index] img {
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .group:hover img {
          transform: scale(1.06) !important;
        }

        /* Button micro-animations on hover/click */
        button:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart):not(#header-cart-btn):not(#mobile-cart-btn), 
        a:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart):not(#header-cart-btn):not(#mobile-cart-btn), 
        .btn:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart) {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, border-color 0.2s, opacity 0.2s;
        }
        button:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart):not(#header-cart-btn):not(#mobile-cart-btn):hover, 
        a:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart):not(#header-cart-btn):not(#mobile-cart-btn):hover, 
        .btn:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart):hover {
          transform: translateY(-2px) scale(1.02);
        }
        button:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart):not(#header-cart-btn):not(#mobile-cart-btn):active, 
        a:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart):not(#header-cart-btn):not(#mobile-cart-btn):active, 
        .btn:not(.cart-bounce):not(.cart-wiggle):not(.shake-cart):active {
          transform: scale(0.95);
        }

        /* Pop-up Opening Anim */
        @keyframes modalScaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-in {
          animation: modalScaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Cart Button & Badge Animations */
        @keyframes cartBounce {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.25);
            box-shadow: 0 0 15px var(--p);
          }
          100% {
            transform: scale(1);
          }
        }
        .cart-bounce {
          animation: cartBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
        }

        @keyframes cartWiggle {
          0% { transform: scale(1) rotate(0); }
          15% { transform: scale(1.1) rotate(-8deg); }
          30% { transform: scale(1.1) rotate(8deg); }
          45% { transform: scale(1.1) rotate(-6deg); }
          60% { transform: scale(1.1) rotate(6deg); }
          75% { transform: scale(1.05) rotate(-3deg); }
          90% { transform: scale(1.05) rotate(3deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .cart-wiggle {
          animation: cartWiggle 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both !important;
          box-shadow: 0 0 15px var(--p) !important;
        }

        @keyframes badgePop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.4);
            color: #FFC107;
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-badge-pop {
          animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* Curved Parabolic Fly Path Animations */
        @keyframes xAxisCurve {
          100% {
            transform: translateX(var(--tx));
          }
        }
        @keyframes yAxisCurve {
          100% {
            transform: translateY(var(--ty));
          }
        }
        @keyframes shakeCart {
          25% { transform: translateX(6px); }
          50% { transform: translateX(-4px); }
          75% { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
        
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
          background: var(--p, #8c2d19);
          color: white;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(140, 45, 25, 0.35);
          animation: yAxisCurve 0.8s forwards cubic-bezier(0.165, 0.840, 0.440, 1.000);
        }
        .shake-cart {
          animation: shakeCart 0.4s ease-in-out forwards !important;
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        [data-master-theme] {
          --background: ${hslBg} !important;
          --foreground: ${hslFg} !important;
          --card: ${hslCard} !important;
          --card-foreground: ${hslFg} !important;
          --popover: ${hslCard} !important;
          --popover-foreground: ${hslFg} !important;
          --primary: ${hslPrimary} !important;
          --primary-foreground: 0 0% 100% !important;
          --secondary: ${hslSecondary} !important;
          --secondary-foreground: ${hslFg} !important;
          --muted: ${hslMuted} !important;
          --muted-foreground: ${hslFg} !important;
          --border: ${hslBorder} !important;
          --input: ${hslBorder} !important;
          --ring: ${hslPrimary} !important;
        }

        [data-section-index], [data-section-anchor="footer"] {
          --title-color: inherit;
          --body-color: inherit;
          --sub-color: inherit;
          --kicker-color: inherit;
          --cta-color: inherit;
          --cta_secondary-color: inherit;
          --subtitle-color: inherit;
          --email-color: inherit;
          --phone-color: inherit;
          --address-color: inherit;
          --hours-color: inherit;

          --title-font-size: inherit;
          --body-font-size: inherit;
          --sub-font-size: inherit;
          --kicker-font-size: inherit;
          --cta-font-size: inherit;
          --cta_secondary-font-size: inherit;
          --subtitle-font-size: inherit;
          --email-font-size: inherit;
          --phone-font-size: inherit;
          --address-font-size: inherit;
          --hours-font-size: inherit;
        }
        
        /* Apply Colors conditionally using data attributes */
        [data-has-title-color="true"] h1, 
        [data-has-title-color="true"] h2, 
        [data-has-title-color="true"] h3, 
        [data-has-title-color="true"] .s-title, 
        [data-has-title-color="true"] .section-title {
          color: var(--title-color) !important;
        }
        [data-has-body-color="true"] p:not(.s-sub):not(.s-kicker):not(.section-sub):not(.section-subtitle):not(.section-kicker), 
        [data-has-body-color="true"] .s-body, 
        [data-has-body-color="true"] .section-body, 
        [data-has-body-color="true"] .section-desc {
          color: var(--body-color) !important;
        }
        [data-has-sub-color="true"] .s-sub, 
        [data-has-sub-color="true"] .section-sub, 
        [data-has-sub-color="true"] .section-subtitle {
          color: var(--sub-color) !important;
        }
        [data-has-kicker-color="true"] .s-kicker, 
        [data-has-kicker-color="true"] .section-kicker {
          color: var(--kicker-color) !important;
        }
        [data-has-cta-color="true"] .s-cta,
        [data-has-cta-color="true"] .section-cta {
          color: var(--cta-color) !important;
        }
        [data-has-cta_secondary-color="true"] .s-cta_secondary,
        [data-has-cta_secondary-color="true"] .section-cta_secondary {
          color: var(--cta_secondary-color) !important;
        }
        [data-has-email-color="true"] .s-email,
        [data-has-email-color="true"] .section-email {
          color: var(--email-color) !important;
        }
        [data-has-phone-color="true"] .s-phone,
        [data-has-phone-color="true"] .section-phone {
          color: var(--phone-color) !important;
        }
        [data-has-address-color="true"] .s-address,
        [data-has-address-color="true"] .section-address {
          color: var(--address-color) !important;
        }
        [data-has-hours-color="true"] .s-hours,
        [data-has-hours-color="true"] .section-hours {
          color: var(--hours-color) !important;
        }

        /* Apply Font Sizes conditionally using data attributes */
        [data-has-title-font-size="true"] h1, 
        [data-has-title-font-size="true"] h2, 
        [data-has-title-font-size="true"] h3, 
        [data-has-title-font-size="true"] .s-title, 
        [data-has-title-font-size="true"] .section-title {
          font-size: var(--title-font-size) !important;
        }
        [data-has-body-font-size="true"] p:not(.s-sub):not(.s-kicker):not(.section-sub):not(.section-subtitle):not(.section-kicker), 
        [data-has-body-font-size="true"] .s-body, 
        [data-has-body-font-size="true"] .section-body, 
        [data-has-body-font-size="true"] .section-desc {
          font-size: var(--body-font-size) !important;
        }
        [data-has-sub-font-size="true"] .s-sub, 
        [data-has-sub-font-size="true"] .section-sub, 
        [data-has-sub-font-size="true"] .section-subtitle {
          font-size: var(--sub-font-size) !important;
        }
        [data-has-subtitle-font-size="true"] .s-subtitle,
        [data-has-subtitle-font-size="true"] .section-subtitle {
          font-size: var(--subtitle-font-size) !important;
        }
        [data-has-kicker-font-size="true"] .s-kicker, 
        [data-has-kicker-font-size="true"] .section-kicker {
          font-size: var(--kicker-font-size) !important;
        }
        [data-has-cta-font-size="true"] button:not(.qty-btn):not([aria-label="Close"]):not(.sr-only):not([type="submit"]), 
        [data-has-cta-font-size="true"] .btn,
        [data-has-cta-font-size="true"] .button,
        [data-has-cta-font-size="true"] a.button,
        [data-has-cta-font-size="true"] [role="button"]:not([aria-label="Close"]):not([type="submit"]),
        [data-has-cta-font-size="true"] .s-cta,
        [data-has-cta-font-size="true"] .section-cta {
          font-size: var(--cta-font-size) !important;
        }
        [data-has-cta_secondary-font-size="true"] .s-cta_secondary,
        [data-has-cta_secondary-font-size="true"] .section-cta_secondary {
          font-size: var(--cta_secondary-font-size) !important;
        }
        [data-has-email-font-size="true"] .s-email,
        [data-has-email-font-size="true"] .section-email {
          font-size: var(--email-font-size) !important;
        }
        [data-has-phone-font-size="true"] .s-phone,
        [data-has-phone-font-size="true"] .section-phone {
          font-size: var(--phone-font-size) !important;
        }
        [data-has-address-font-size="true"] .s-address,
        [data-has-address-font-size="true"] .section-address {
          font-size: var(--address-font-size) !important;
        }
        [data-has-hours-font-size="true"] .s-hours,
        [data-has-hours-font-size="true"] .section-hours {
          font-size: var(--hours-font-size) !important;
        }
        ${globalOv.bold ? `
          [data-master-theme], [data-master-theme] *, [data-master-theme] h1, [data-master-theme] h2, [data-master-theme] h3, [data-master-theme] p, [data-master-theme] span, [data-master-theme] button, [data-master-theme] a {
            font-weight: 700 !important;
          }
        ` : ''}

        /* Global Button Overrides */
        [data-master-theme] button:not(.qty-btn):not([aria-label="Close"]):not(.sr-only):not([type="submit"]), 
        [data-master-theme] .btn,
        [data-master-theme] .button,
        [data-master-theme] a.button,
        [data-master-theme] [role="button"]:not([aria-label="Close"]):not([type="submit"]),
        [data-master-theme] [data-hero-section="true"] a,
        [data-master-theme] [data-hero-section] a,
        [data-master-theme] header a[href*="/cart"],
        [data-master-theme] header a[href*="/account"],
        [data-master-theme] header button:not([type="submit"]):not([aria-label="Close"]) {
          ${globalOv.buttons?.fontSize === 'small' ? `
            font-size: 11px !important;
            padding: 6px 12px !important;
            height: auto !important;
          ` : ''}
          ${globalOv.buttons?.fontSize === 'large' ? `
            font-size: 16px !important;
            padding: 14px 28px !important;
            height: auto !important;
          ` : ''}

          ${globalOv.buttons?.uppercase ? `
            text-transform: uppercase !important;
            letter-spacing: 0.07em !important;
          ` : ''}

          ${globalOv.buttons?.radius === 'sharp' ? 'border-radius: 0px !important;' : ''}
          ${globalOv.buttons?.radius === 'rounded' ? 'border-radius: 8px !important;' : ''}
          ${globalOv.buttons?.radius === 'round' ? 'border-radius: 9999px !important;' : ''}

          ${globalOv.buttons?.style === 'outline' ? `
            background: transparent !important;
            border: 2px solid currentColor !important;
            color: inherit !important;
          ` : ''}
          ${globalOv.buttons?.style === 'minimal' ? `
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            text-decoration: underline !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            color: inherit !important;
          ` : ''}

          ${globalOv.buttons?.bgColor ? `
            background: ${globalOv.buttons.bgColor} !important;
            background-color: ${globalOv.buttons.bgColor} !important;
            border-color: ${globalOv.buttons.bgColor} !important;
          ` : ''}
          ${globalOv.buttons?.textColor ? `
            color: ${globalOv.buttons.textColor} !important;
            ${!globalOv.buttons?.bgColor ? `border-color: ${globalOv.buttons.textColor} !important;` : ''}
          ` : ''}

          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        /* Hover animation classes */
        ${globalOv.buttons?.animation === 'scale' ? `
          [data-master-theme] button:not(.qty-btn):not([aria-label="Close"]):not(.sr-only):not([type="submit"]):hover, 
          [data-master-theme] .btn:hover,
          [data-master-theme] .button:hover,
          [data-master-theme] [data-hero-section="true"] a:hover,
          [data-master-theme] [data-hero-section] a:hover,
          [data-master-theme] header a[href*="/cart"]:hover,
          [data-master-theme] header a[href*="/account"]:hover,
          [data-master-theme] header button:not([type="submit"]):not([aria-label="Close"]):hover {
            transform: scale(1.05) !important;
          }
        ` : ''}
        ${globalOv.buttons?.animation === 'glow' ? `
          [data-master-theme] button:not(.qty-btn):not([aria-label="Close"]):not(.sr-only):not([type="submit"]):hover, 
          [data-master-theme] .btn:hover,
          [data-master-theme] .button:hover,
          [data-master-theme] [data-hero-section="true"] a:hover,
          [data-master-theme] [data-hero-section] a:hover,
          [data-master-theme] header a[href*="/cart"]:hover,
          [data-master-theme] header a[href*="/account"]:hover,
          [data-master-theme] header button:not([type="submit"]):not([aria-label="Close"]):hover {
            box-shadow: 0 0 15px var(--p) !important;
          }
        ` : ''}
        ${globalOv.buttons?.animation === 'pulse' ? `
          @keyframes btn-pulse {
            0% { box-shadow: 0 0 0 0 rgba(100, 100, 250, 0.5); }
            70% { box-shadow: 0 0 0 8px rgba(100, 100, 250, 0); }
            100% { box-shadow: 0 0 0 0 rgba(100, 100, 250, 0); }
          }
          [data-master-theme] button:not(.qty-btn):not([aria-label="Close"]):not(.sr-only):not([type="submit"]):hover, 
          [data-master-theme] .btn:hover,
          [data-master-theme] .button:hover,
          [data-master-theme] [data-hero-section="true"] a:hover,
          [data-master-theme] [data-hero-section] a:hover,
          [data-master-theme] header a[href*="/cart"]:hover,
          [data-master-theme] header a[href*="/account"]:hover,
          [data-master-theme] header button:not([type="submit"]):not([aria-label="Close"]):hover {
            animation: btn-pulse 1.5s infinite !important;
          }
        ` : ''}
        ${globalOv.buttons?.animation === 'shine' ? `
          [data-master-theme] button:not(.qty-btn):not([aria-label="Close"]):not(.sr-only):not([type="submit"]), 
          [data-master-theme] .btn,
          [data-master-theme] .button,
          [data-master-theme] [data-hero-section="true"] a,
          [data-master-theme] [data-hero-section] a,
          [data-master-theme] header a[href*="/cart"],
          [data-master-theme] header a[href*="/account"],
          [data-master-theme] header button:not([type="submit"]):not([aria-label="Close"]) {
            position: relative !important;
            overflow: hidden !important;
          }
          [data-master-theme] button:not(.qty-btn):not([aria-label="Close"]):not(.sr-only):not([type="submit"])::after, 
          [data-master-theme] .btn::after,
          [data-master-theme] .button::after,
          [data-master-theme] [data-hero-section="true"] a::after,
          [data-master-theme] [data-hero-section] a::after,
          [data-master-theme] header a[href*="/cart"]::after,
          [data-master-theme] header a[href*="/account"]::after,
          [data-master-theme] header button:not([type="submit"]):not([aria-label="Close"])::after {
            content: '' !important;
            position: absolute !important;
            top: 0 !important;
            left: -150% !important;
            width: 50% !important;
            height: 100% !important;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent) !important;
            transform: skewX(-25deg) !important;
            transition: 0.75s !important;
          }
          [data-master-theme] button:not(.qty-btn):not([aria-label="Close"]):not(.sr-only):not([type="submit"]):hover::after, 
          [data-master-theme] .btn:hover::after,
          [data-master-theme] .button:hover::after,
          [data-master-theme] [data-hero-section="true"] a:hover::after,
          [data-master-theme] [data-hero-section] a:hover::after,
          [data-master-theme] header a[href*="/cart"]:hover::after,
          [data-master-theme] header a[href*="/account"]:hover::after,
          [data-master-theme] header button:not([type="submit"]):not([aria-label="Close"]):hover::after {
            left: 150% !important;
          }
        ` : ''}
      `}} />
      {/* Header is first child — sticky top-0 works against window scroll */}
      <Header dna={dna} brandName={brandName} variant={headerStyle} storeSlug={storeSlug} onNavigate={onNavigate} headerOv={headerOv} products={products} disabledPages={overrides?.disabled_pages} storeCategory={storeCategory} />
      {renderedSections.map((s: any, i: number) => {
        // Merge overrides on top of manifest props.
        const ov = sectionOverrides[i] ?? sectionOverrides[String(i)] ?? {};
        if (ov.hidden) return null;
        const mergedProps = { ...(s.props ?? {}), ...ov };
        // Inject active product into product_detail sections
        if (s.type === "product_detail" && product) {
          mergedProps.product = product;
          if (product.images?.[0]) mergedProps.image = product.images[0];
        }
        // Also inject product from overrides if present (e.g. StorefrontProduct passes it via overrides.product)
        if (s.type === "product_detail" && (overrides as any)?.product) {
          mergedProps.product = (overrides as any).product;
          if ((overrides as any).product?.images?.[0]) mergedProps.image = (overrides as any).product.images[0];
        }
        // Inject real products for all product-display section types with distinct slices
        if (products && products.length > 0) {
          const mapToItem = (pr: any) => ({
            id: pr.id,
            name: pr.title,
            price: pr.price,
            compare_at: pr.compare_at_price,
            image: pr.images?.[0],
            category: pr.category,
          });

          const selectedIds = mergedProps.selected_product_ids;
          if (Array.isArray(selectedIds) && selectedIds.length > 0) {
            // Map the selected product IDs to real products, maintaining selection order
            const selectedProds = selectedIds
              .map(id => products.find(p => p.id === id))
              .filter(Boolean);
            mergedProps.items = selectedProds.map(mapToItem);
          } else {
            if (s.type === "featured_products" || s.type === "product_grid") {
              mergedProps.items = products.slice(0, 8).map(mapToItem);
            } else if (s.type === "trending") {
              // Show a different slice for trending (e.g., products from index 4 to 12)
              const sliceStart = products.length >= 8 ? 4 : 0;
              mergedProps.items = products.slice(sliceStart, sliceStart + 8).map(mapToItem);
            } else if (s.type === "new_arrivals") {
              // Show the newest products (e.g., last 8 products in reverse order)
              const sliceStart = Math.max(0, products.length - 8);
              mergedProps.items = products.slice(sliceStart).reverse().map(mapToItem);
            }
          }
        }
        // Pass seller catalog categories into product sections so shop-page chips use them.
        if (sellerCategoryItems && (s.type === "product_grid" || s.type === "trending" || s.type === "featured_products" || s.type === "new_arrivals")) {
          mergedProps.sellerCategories = sellerCategoryItems;
        }
        // category_grid: replace items with seller's real categories if they've defined any, respecting selection overrides.
        if (sellerCategoryItems && s.type === "category_grid") {
          const selectedCatIds = mergedProps.selected_category_ids;
          if (Array.isArray(selectedCatIds) && selectedCatIds.length > 0) {
            mergedProps.items = sellerCategoryItems.filter(cat => selectedCatIds.includes(cat.id));
          } else {
            mergedProps.items = sellerCategoryItems;
          }
        }
        // collections: replace items with seller's real categories if they've defined any
        if (sellerCategoryItems && (s.type === "collections" || s.type === "collections_grid")) {
          mergedProps.items = sellerCategoryItems;
        }
        const anchorMap: Record<string, string> = {
          product_grid: "products", trending: "products",
          category_grid: "categories",
          story: "about",
          newsletter: "contact",
        };
        const anchorId = anchorMap[s.type];
        // Per-section color override: ov.colors = { primary, accent, bg, surface, fg, muted, border, primary_fg }
        const secColors = (mergedProps.colors ?? ov.colors) as Record<string, string> | undefined;
        const sectionDna = secColors ? { ...dna, palette: { ...dna.palette, ...secColors } } : dna;
        const sectionStyle: Record<string, any> = secColors
          ? {
              ["--p" as any]: sectionDna.palette.primary,
              ["--pf" as any]: sectionDna.palette.primary_fg,
              ["--ac" as any]: sectionDna.palette.accent,
              ["--bg" as any]: sectionDna.palette.bg,
              ["--sf" as any]: sectionDna.palette.surface,
              ["--fg" as any]: sectionDna.palette.fg,
              ["--mu" as any]: sectionDna.palette.muted,
              ["--bd" as any]: sectionDna.palette.border,
              color: sectionDna.palette.fg,
            }
          : {};

        const TEXT_KEYS = ["title", "sub", "subtitle", "kicker", "cta", "cta_secondary", "body", "email", "phone", "address", "hours"];
        const extraAttrs: Record<string, string> = {};
        TEXT_KEYS.forEach((k) => {
          if (mergedProps[`${k}_color`]) {
            sectionStyle[`--${k}-color` as any] = mergedProps[`${k}_color`];
            extraAttrs[`data-has-${k}-color`] = "true";
          }
          if (mergedProps[`${k}_font_size`]) {
            const fsVal = mergedProps[`${k}_font_size`];
            const fsStr = typeof fsVal === "number" ? `${fsVal}px` : fsVal;
            sectionStyle[`--${k}-font-size` as any] = fsStr;
            extraAttrs[`data-has-${k}-font-size`] = "true";
          }
        });
        return (
          <div
            key={i}
            id={anchorId}
            data-section-index={i}
            data-section-anchor={`s-${i}`}
            style={{ scrollMarginTop: 80, ...sectionStyle }}
            {...extraAttrs}
          >
            <Section s={{ ...s, props: mergedProps }} dna={sectionDna} storeSlug={storeSlug} page={page} store={store} products={products} storeCategory={storeCategory} />
          </div>
        );
      })}
      <div 
        data-section-anchor="footer" 
        style={{ scrollMarginTop: 80, ...footerStyle }}
        {...footerAttrs}
      >
        <Footer footer={manifest?.footer} dna={dna} brandName={brandName} storeSlug={storeSlug} onNavigate={onNavigate} footerOv={overrides?.footer} hasPolicies={!!(overrides as any)?.has_policies} />
      </div>

      {activeOrders && activeOrders.length > 0 && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="fixed bottom-24 right-4 z-50 select-none cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            touchAction: 'none',
          }}
        >
          {isClosed ? (
            /* Collapsed Floating Bubble */
            <div 
              className="h-12 w-12 bg-stone-950/95 backdrop-blur border border-stone-800 text-stone-100 shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 relative"
              style={{ borderRadius: '50%' }}
            >
              <ChefHat className="h-5.5 w-5.5 text-[#ff6b4a] animate-bounce" />
              {activeOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-[#ff6b4a] text-white h-5 w-5 rounded-full flex items-center justify-center border border-stone-950 shadow-sm">
                  {activeOrders.length}
                </span>
              )}
            </div>
          ) : (
            /* Expanded Tracker Panel */
            <div 
              className="w-76 bg-stone-950/95 backdrop-blur border border-stone-800 text-stone-100 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-3 transition-all duration-300 animate-badge-pop"
              style={{ borderRadius: radius }}
            >
              {/* Header Drag Bar */}
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-800 text-stone-450">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5 text-[#ff6b4a] animate-bounce" /> Live Kitchen Tracker
                </span>
                <div className="flex items-center gap-2">
                  {activeOrders.length > 1 && (
                    <span className="text-[9px] font-bold bg-[#ff6b4a]/20 text-[#ff6b4a] px-2 py-0.5 rounded-full">
                      {activeOrders.length} Orders
                    </span>
                  )}
                  <GripVertical className="h-3.5 w-3.5 text-stone-600 shrink-0 cursor-grab" />
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsClosed(true);
                    }}
                    className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
                    title="Close Tracker"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable list of active orders */}
              <div className="max-h-[280px] overflow-y-auto pr-1 space-y-3.5 divide-y divide-stone-800">
                {activeOrders.map((order: any, idx: number) => (
                  <div key={order.id} className={idx > 0 ? "pt-3.5" : ""}>
                    {/* Status Information */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-stone-400">#{order.order_number}</span>
                          <span>
                            {order.prep_status === 'received' ? 'Order Placed' :
                             order.prep_status === 'preparing' ? 'Cooking in Kitchen' :
                             order.prep_status === 'ready' ? (order.fulfillment_mode === 'delivery' ? 'Ready for Delivery' : 'Ready to Serve') :
                             order.prep_status === 'out_for_delivery' ? 'Out for Delivery' : 'Preparing Order'}
                          </span>
                        </span>
                        <span className="text-[10px] opacity-75 text-[#ff6b4a] font-bold">
                          {order.fulfillment_mode === 'dine_in' ? 'Dine-In' :
                           order.fulfillment_mode === 'takeaway' ? 'Takeaway' : 'Delivery'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-tight">
                        {order.prep_status === 'received' ? 'Waiting for the kitchen to accept your order.' :
                         order.prep_status === 'preparing' ? 'The chef has started preparing your fresh dish!' :
                         order.prep_status === 'ready' ? (order.fulfillment_mode === 'delivery' ? 'Your order is packed and ready for delivery!' : 'Your food is hot and ready. Bon appétit!') :
                         order.prep_status === 'out_for_delivery' ? 'Our delivery partner is on the way to you!' :
                         'Order is being reviewed.'}
                      </p>
                    </div>

                    {/* Stepper Progress Bar */}
                    <div className="space-y-1.5 mt-2">
                      {order.fulfillment_mode === 'delivery' ? (
                        <>
                          <div className="flex justify-between items-center gap-1 text-[9px] uppercase tracking-wider text-stone-500 font-bold">
                            <span className={['received', 'preparing', 'ready', 'out_for_delivery'].includes(order.prep_status) ? 'text-[#ff6b4a]' : ''}>Accepted</span>
                            <span className={['preparing', 'ready', 'out_for_delivery'].includes(order.prep_status) ? 'text-[#ff6b4a]' : ''}>Cooking</span>
                            <span className={['ready', 'out_for_delivery'].includes(order.prep_status) ? 'text-[#ff6b4a]' : ''}>Ready</span>
                            <span className={order.prep_status === 'out_for_delivery' ? 'text-[#ff6b4a]' : ''}>On Way</span>
                          </div>
                          <div className="h-1.5 w-full bg-stone-850 rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-gradient-to-r from-[#ff6b4a] to-[#ff8c4a] transition-all duration-500 rounded-full animate-pulse-glow"
                              style={{ 
                                width: order.prep_status === 'received' ? '25%' :
                                       order.prep_status === 'preparing' ? '50%' :
                                       order.prep_status === 'ready' ? '75%' :
                                       order.prep_status === 'out_for_delivery' ? '100%' : '15%'
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center gap-1 text-[9px] uppercase tracking-wider text-stone-500 font-bold">
                            <span className={['received', 'preparing', 'ready'].includes(order.prep_status) ? 'text-[#ff6b4a]' : ''}>Accepted</span>
                            <span className={['preparing', 'ready'].includes(order.prep_status) ? 'text-[#ff6b4a]' : ''}>Cooking</span>
                            <span className={order.prep_status === 'ready' ? 'text-[#ff6b4a]' : ''}>Ready</span>
                          </div>
                          <div className="h-1.5 w-full bg-stone-850 rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-gradient-to-r from-[#ff6b4a] to-[#ff8c4a] transition-all duration-500 rounded-full animate-pulse-glow"
                              style={{ 
                                width: order.prep_status === 'received' ? '33%' :
                                       order.prep_status === 'preparing' ? '66%' :
                                       order.prep_status === 'ready' ? '100%' : '15%'
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Additional details */}
                    {order.table_label && (
                      <div className="text-[10px] text-stone-450 flex items-center justify-between mt-2 font-medium">
                        <span>Dining Table:</span>
                        <span className="text-stone-200 font-bold">{order.table_label}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Header({ dna, brandName, variant = "classic", storeSlug, onNavigate, headerOv, products, disabledPages = [], storeCategory }: any) {
  const base = storeSlug ? `/store/${storeSlug}` : "";
  const navigate = useNavigate();
  const location = useLocation();
  const isMenuPage = location.pathname.endsWith('/menu');
  const [searchVal, setSearchVal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const suggestions = useMemo(() => {
    if (!searchVal.trim() || !products || products.length === 0) return [];
    const query = searchVal.toLowerCase().trim();
    const results = new Set<string>();

    // 1. Match categories
    products.forEach((p: any) => {
      if (p.category && p.category.toLowerCase().includes(query)) {
        results.add(p.category.toLowerCase());
      }
    });

    // 2. Match exact product title or words starting with query
    products.forEach((p: any) => {
      const title = p.title || "";
      const words = title.split(/[\s\-_,]+/);
      words.forEach((word: string) => {
        const cleanWord = word.replace(/[^\w]/g, "");
        if (cleanWord.toLowerCase().startsWith(query) && cleanWord.length > 2) {
          results.add(title.toLowerCase());
        }
      });
      if (title.toLowerCase().startsWith(query)) {
        results.add(title.toLowerCase());
      }
    });

    return Array.from(results).slice(0, 5);
  }, [searchVal, products]);

  const handleSearchSubmit = (val: string) => {
    if (!val.trim()) return;
    setSearchVal("");
    setShowSuggestions(false);
    if (onNavigate) {
      onNavigate(`${base}/shop?search=${encodeURIComponent(val.trim())}`);
    } else {
      navigate(`${base}/shop?search=${encodeURIComponent(val.trim())}`);
    }
  };

  const ov = headerOv || {};
  const effectiveBrand = ov.brand_name || brandName;
  const showName = ov.show_name !== false; // default true
  const logoUrl = ov.logo_url || "";
  const defaultLinks: Array<{ label: string; page: string }> = [
    { label: storeCategory === "food" ? "Our Menu" : "Shop", page: "shop" },
    { label: "Collections", page: "collections" },
    { label: "About", page: "about" },
    { label: "Journal", page: "journal" },
    { label: "Contact", page: "contact" },
  ];
  const pageToPath: Record<string, string> = {
    home: "", shop: storeCategory === "food" ? "/menu" : "/shop", collections: "/collections", about: "/about", contact: "/contact",
    journal: "/blog", blog: "/blog", account: "/account", cart: "/cart",
  };
  const links = (ov.nav_links && ov.nav_links.length > 0 ? ov.nav_links : defaultLinks)
    .filter((l: any) => !disabledPages.includes(l.page))
    .map((l: any) => ({ label: l.label, page: l.page, to: `${base}${pageToPath[l.page] ?? `/${l.page}`}` }));

  const { totalItems } = useCart(storeSlug || "");
  const { user } = useCustomerAuth(storeSlug || "");
  const customerName = user?.user_metadata?.full_name || user?.user_metadata?.customer_email?.split("@")[0] || "Account";
  const wrap = "sticky top-0 z-50 border-b backdrop-blur transition-shadow hover:shadow-md";
  const bg = { background: `${dna.palette?.bg}ee`, borderColor: storeCategory === "food" ? "transparent" : dna.palette?.border };
  const brandSize = variant === "bold_serif" ? 32 : variant === "minimal_thin" ? 16 : 22;
  const brandStyle: React.CSSProperties = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700, fontSize: brandSize, color: dna.palette?.fg, cursor: (storeSlug || onNavigate) ? "pointer" : "default" };
  const logoSize = Math.max(20, Math.min(160, Number((ov as any).logo_size) || (brandSize + 8)));
  const logoFit: "contain" | "cover" | "fill" = ((ov as any).logo_fit as any) || "contain";
  const fitToHeader = !!(ov as any).logo_fit_header;
  const headerH = variant === "minimal_thin" ? 48 : 64;
  const logoStyle: React.CSSProperties = fitToHeader
    ? { height: headerH, maxHeight: headerH, width: "auto", objectFit: logoFit }
    : { height: logoSize, width: logoFit === "fill" ? logoSize : "auto", maxHeight: 160, objectFit: logoFit };
  if ((ov as any).logo_shape === 'circle') {
    logoStyle.borderRadius = '9999px';
    logoStyle.aspectRatio = '1/1';
    logoStyle.objectFit = 'cover';
    logoStyle.width = `${logoSize}px`;
  }
  const BrandInner = (
    <span className="inline-flex items-center gap-2">
      {logoUrl && <img data-logo-element="true" src={logoUrl} alt={effectiveBrand} style={logoStyle} />}
      {showName && <span style={brandStyle}>{effectiveBrand}</span>}
      {!showName && !logoUrl && <span style={brandStyle}>{effectiveBrand}</span>}
    </span>
  );
  const Brand = onNavigate
    ? <button onClick={() => onNavigate("home")} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>{BrandInner}</button>
    : storeSlug
      ? <Link to={`/store/${storeSlug}`}>{BrandInner}</Link>
      : <div>{BrandInner}</div>;
  const CartBtn = onNavigate ? (
    <button
      id="header-cart-btn"
      onClick={() => onNavigate("cart")}
      className="text-sm px-5 py-2.5 inline-flex items-center gap-2 transition-all duration-300 font-bold hover:scale-[1.03]"
      style={{ 
        background: "var(--p)", 
        color: "var(--pf)", 
        borderRadius: storeCategory === "food" ? "9999px" : "var(--r)" 
      }}
    >
      <span>{storeCategory === "food" ? 'Order Now' : 'Cart'}</span>
      <ShoppingBag className="h-4 w-4" /> 
      <span className="inline-block animate-badge-pop" key={0}>· 0</span>
    </button>
  ) : storeSlug ? (
    <Link 
      id="header-cart-btn" 
      to={`/store/${storeSlug}/cart`} 
      className="text-sm px-5 py-2.5 inline-flex items-center gap-2 transition-all duration-300 font-bold hover:scale-[1.03]" 
      style={{ 
        background: "var(--p)", 
        color: "var(--pf)", 
        borderRadius: storeCategory === "food" ? "9999px" : "var(--r)" 
      }}
    >
      <span>{storeCategory === "food" ? 'Order Now' : 'Cart'}</span>
      <ShoppingBag className="h-4 w-4" /> 
      {totalItems > 0 && <span className="inline-block animate-badge-pop" key={totalItems}>· {totalItems}</span>}
    </Link>
  ) : (
    <button
      id="header-cart-btn"
      onClick={() => onNavigate?.("cart")}
      className="text-sm px-5 py-2.5 inline-flex items-center gap-2 transition-all duration-300 font-bold hover:scale-[1.03]"
      style={{ 
        background: "var(--p)", 
        color: "var(--pf)", 
        borderRadius: storeCategory === "food" ? "9999px" : "var(--r)" 
      }}
    >
      <span>{storeCategory === "food" ? 'Order Now' : 'Cart'}</span>
      <ShoppingBag className="h-4 w-4" /> 
      <span className="inline-block animate-badge-pop" key={0}>· 0</span>
    </button>
  );
  const AccountBtn = storeSlug ? (
    user ? (
      <Link to={`/store/${storeSlug}/account`} className="hidden md:inline-flex text-sm px-4 py-2 items-center gap-2 border" style={{ borderColor: "var(--p)", color: "var(--p)", borderRadius: "var(--r)" }}>
        <User className="h-4 w-4" /> <span className="max-w-28 truncate">{customerName}</span>
      </Link>
    ) : (
      <button onClick={() => setAuthOpen(true)} className="hidden md:inline-flex text-sm px-4 py-2 items-center gap-2 border" style={{ borderColor: "var(--p)", color: "var(--p)", borderRadius: "var(--r)" }}>
        <User className="h-4 w-4" /> Sign in
      </button>
    )
  ) : null;
  const renderLink = (l: { label: string; to: string; page: string }, cls: string) =>
    onNavigate
      ? <button key={l.label} onClick={() => onNavigate(l.page)} className={cls} style={{ opacity: 0.85, background: "transparent", border: 0, cursor: "pointer", color: "inherit" }}>{l.label}</button>
      : storeSlug
        ? <Link key={l.label} to={l.to} className={cls} style={{ opacity: 0.85 }}>{l.label}</Link>
        : <span key={l.label} className={cls} style={{ opacity: 0.85 }}>{l.label}</span>;


  if (storeCategory === "food") {
    const FoodLogoIcon = (
      <div className="w-10 h-10 rounded-full bg-[#8c2d19] flex items-center justify-center shadow-sm shrink-0">
        <span className="text-xl filter drop-shadow" style={{ transform: 'translateY(-1px)' }}>🍲</span>
      </div>
    );

    const BrandInner = (
      <span className="inline-flex items-center gap-2.5">
        {logoUrl ? <img data-logo-element="true" src={logoUrl} alt={effectiveBrand} style={logoStyle} /> : FoodLogoIcon}
        <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate max-w-[100px] sm:max-w-[180px] md:max-w-none" style={{ ...brandStyle, fontSize: undefined }}>{effectiveBrand}</span>
      </span>
    );

    const Brand = onNavigate
      ? <button onClick={() => onNavigate("home")} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>{BrandInner}</button>
      : storeSlug
        ? <Link to={`/store/${storeSlug}`}>{BrandInner}</Link>
        : <div>{BrandInner}</div>;

    const AccountBtnIcon = storeSlug ? (
      user ? (
        <Link
          to={`/store/${storeSlug}/account`}
          className="p-2.5 rounded-full border transition-all duration-300 hover:scale-[1.05] flex items-center justify-center"
          style={{ borderColor: 'rgba(140, 45, 25, 0.2)', backgroundColor: 'rgba(140, 45, 25, 0.05)', color: '#8c2d19' }}
          title="My Profile"
        >
          <User className="h-4 w-4" />
        </Link>
      ) : (
        <button
          onClick={() => setAuthOpen(true)}
          className="p-2.5 rounded-full border transition-all duration-300 hover:scale-[1.05] flex items-center justify-center"
          style={{ borderColor: 'rgba(140, 45, 25, 0.2)', backgroundColor: 'rgba(140, 45, 25, 0.05)', color: '#8c2d19' }}
          title="Sign In / My Profile"
        >
          <User className="h-4 w-4" />
        </button>
      )
    ) : null;

    const CartBtnMobile = storeSlug ? (
      <Link 
        to={`/store/${storeSlug}/cart`} 
        onClick={() => setMobileMenuOpen(false)}
        className="w-full py-3 inline-flex items-center justify-center gap-2 transition-all duration-300 font-bold hover:scale-[1.02] shadow-sm rounded-xl text-base" 
        style={{ 
          background: "var(--p)", 
          color: "var(--pf)", 
        }}
      >
        <ShoppingBag className="h-4.5 w-4.5" /> 
        <span>Order Now</span>
        {totalItems > 0 && <span className="inline-block animate-badge-pop" key={totalItems}>({totalItems})</span>}
      </Link>
    ) : (
      <button
        onClick={() => {
          onNavigate?.("cart");
          setMobileMenuOpen(false);
        }}
        className="w-full py-3 inline-flex items-center justify-center gap-2 transition-all duration-300 font-bold hover:scale-[1.02] shadow-sm rounded-xl text-base" 
        style={{ 
          background: "var(--p)", 
          color: "var(--pf)", 
        }}
      >
        <ShoppingBag className="h-4.5 w-4.5" /> 
        <span>Order Now</span>
      </button>
    );

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes nav-shimmer {
            0% { left: -150%; }
            20% { left: 150%; }
            100% { left: 150%; }
          }
          .nav-shine-effect {
            animation: nav-shimmer 7s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
          }
        `}} />
        <div className="w-full py-4 px-6 sticky top-0 z-50 transition-all duration-300" style={{ background: '#faf6f0' }}>
          <header 
            className="max-w-6xl mx-auto px-5 py-2 flex items-center justify-between gap-4 relative rounded-full border border-white/30 shadow-[0_12px_40px_rgba(140,45,25,0.07)] backdrop-blur-md overflow-hidden"
            style={{ background: 'rgba(240, 228, 214, 0.95)' }}
          >
            {/* Periodic Glossy Shine element */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none rounded-full z-0">
              <div 
                className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-25deg] nav-shine-effect"
                style={{ left: '-150%' }}
              />
            </div>

            {/* Brand/Logo (left) */}
            <div className="flex items-center pl-2 relative z-10">
              {Brand}
            </div>
            
            {/* Nav Links (centered absolute - Desktop only) */}
            <nav className="hidden md:flex items-center justify-center gap-8 text-sm absolute left-1/2 -translate-x-1/2 z-10" style={{ fontFamily: 'var(--hf)' }}>
              {links.map(l => {
                const isActive = l.page === "home" || l.page === "";
                return (
                  <span key={l.label}>
                    {onNavigate
                      ? <button onClick={() => onNavigate(l.page)} className={`transition duration-300 font-medium ${isActive ? "text-[#8c2d19] font-bold" : "text-stone-800 hover:text-[#8c2d19]"}`} style={{ background: "transparent", border: 0, cursor: "pointer" }}>{l.label}</button>
                      : storeSlug
                        ? <Link to={l.to} className={`transition duration-300 font-medium ${isActive ? "text-[#8c2d19] font-bold" : "text-stone-800 hover:text-[#8c2d19]"}`}>{l.label}</Link>
                        : <span className={`font-medium ${isActive ? "text-[#8c2d19] font-bold" : "text-stone-800"}`}>{l.label}</span>
                    }
                  </span>
                );
              })}
            </nav>
            
            {/* Cart/CTA button (right - Desktop only) */}
            <div className="hidden md:flex items-center gap-2.5 pr-2 relative z-10">
              {AccountBtnIcon}
              {!isMenuPage && CartBtn}
            </div>

            {/* Hamburger Menu button (Mobile only) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-full border transition-all duration-300 hover:scale-[1.05] flex items-center justify-center relative z-10"
              style={{ borderColor: 'rgba(140, 45, 25, 0.2)', backgroundColor: 'rgba(140, 45, 25, 0.05)', color: '#8c2d19' }}
              aria-label="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[90] transition-opacity duration-300"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer Container */}
            <div 
              className="fixed inset-y-0 right-0 w-72 bg-[#faf6f0] border-l border-stone-200/80 shadow-2xl z-[100] p-6 flex flex-col justify-between transition-transform duration-300 transform translate-x-0 overflow-y-auto"
              style={{ fontFamily: 'var(--hf)' }}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-stone-205">
                  <span className="font-bold text-[#8c2d19] text-base max-w-[180px] truncate">{effectiveBrand}</span>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-full hover:bg-stone-200/50 transition-colors text-stone-500 hover:text-stone-850"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Nav Links */}
                <nav className="flex flex-col gap-4 py-8">
                  {links.map(l => {
                    const isActive = l.page === "home" || l.page === "";
                    return (
                      <span key={l.label}>
                        {onNavigate ? (
                          <button 
                            onClick={() => {
                              onNavigate(l.page);
                              setMobileMenuOpen(false);
                            }}
                            className={`block w-full text-left py-2 text-base transition duration-300 font-semibold ${isActive ? "text-[#8c2d19] border-l-2 border-[#8c2d19] pl-3" : "text-stone-700 hover:text-[#8c2d19]"}`}
                            style={{ background: "transparent", border: 0, cursor: "pointer" }}
                          >
                            {l.label}
                          </button>
                        ) : storeSlug ? (
                          <Link 
                            to={l.to} 
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block py-2 text-base transition duration-300 font-semibold ${isActive ? "text-[#8c2d19] border-l-2 border-[#8c2d19] pl-3" : "text-stone-700 hover:text-[#8c2d19]"}`}
                          >
                            {l.label}
                          </Link>
                        ) : (
                          <span className={`block py-2 text-base font-semibold ${isActive ? "text-[#8c2d19]" : "text-stone-500"}`}>
                            {l.label}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom Actions (Account & Cart) */}
              <div className="pt-6 border-t border-stone-200 space-y-4">
                {/* Account Section */}
                {user ? (
                  <Link 
                    to={`${base}/account`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors w-full"
                  >
                    <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 border">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-stone-400 font-medium leading-none">Signed In as</p>
                      <p className="text-sm font-semibold text-stone-850 truncate mt-1">{customerName}</p>
                    </div>
                  </Link>
                ) : (
                  <button 
                    onClick={() => {
                      setAuthOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors w-full text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-[#8c2d19]/10 text-[#8c2d19] flex items-center justify-center border border-[#8c2d19]/20">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#8c2d19]">Sign In</p>
                      <p className="text-[10px] text-stone-400 font-medium mt-0.5">To view your orders</p>
                    </div>
                  </button>
                )}

                {/* Cart Button */}
                {!isMenuPage && CartBtnMobile}
              </div>
            </div>
          </>
        )}

        {authOpen && storeSlug && (
          <CustomerAuthModal
            storeSlug={storeSlug}
            storeName={brandName}
            primaryColor={dna.palette?.primary}
            cardColor={dna.palette?.bg}
            borderColor={dna.palette?.border}
            textColor={dna.palette?.fg}
            onClose={() => setAuthOpen(false)}
          />
        )}
      </>
    );
  }

  if (variant === "centered_logo") {
    return (
      <>
      <header className={wrap} style={bg} data-section-anchor="header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col items-center gap-2">
          {Brand}
          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-widest" style={{ color: dna.palette?.muted }}>
            {links.map(l => renderLink(l, "hover:opacity-100 transition"))}
            {storeSlug && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchVal.trim()) {
                    const isPlatform = window.location.pathname.startsWith('/store/');
                    navigate(isPlatform ? `/store/${storeSlug}/search?q=${encodeURIComponent(searchVal.trim())}` : `/search?q=${encodeURIComponent(searchVal.trim())}`);
                  }
                }} 
                className="flex items-center relative max-w-[120px] w-full"
              >
                <div className="relative w-full">
                  <input
                    placeholder="Search..."
                    value={searchVal}
                    onChange={(e) => {
                      setSearchVal(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full pl-2 pr-7 py-1 text-[10px] border outline-none bg-transparent"
                    style={{ borderColor: dna.palette?.border || 'rgba(0,0,0,0.15)', borderRadius: 'var(--r)', color: dna.palette?.fg }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto text-slate-800 text-[10px] font-sans text-left">
                      {suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onMouseDown={() => {
                            setSearchVal(sug);
                            setShowSuggestions(false);
                            const isPlatform = window.location.pathname.startsWith('/store/');
                            navigate(isPlatform ? `/store/${storeSlug}/search?q=${encodeURIComponent(sug)}` : `/search?q=${encodeURIComponent(sug)}`);
                          }}
                          className="w-full px-2 py-1.5 text-left hover:bg-slate-100 transition truncate capitalize block"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 opacity-65 hover:opacity-100">
                  <Search className="h-3 w-3" style={{ color: dna.palette?.fg }} />
                </button>
              </form>
            )}
            {AccountBtn}
            {CartBtn}
          </nav>
        </div>
      </header>
      {authOpen && storeSlug && (
        <CustomerAuthModal
          storeSlug={storeSlug}
          storeName={brandName}
          primaryColor={dna.palette?.primary}
          cardColor={dna.palette?.bg}
          borderColor={dna.palette?.border}
          textColor={dna.palette?.fg}
          onClose={() => setAuthOpen(false)}
        />
      )}
      </>
    );
  }
  return (
    <>
    <header className={wrap} style={bg} data-section-anchor="header">
      <div className={`max-w-6xl mx-auto px-6 ${variant === "minimal_thin" ? "h-12" : "h-16"} flex items-center justify-between gap-4`}>
        {Brand}
        <nav className="hidden md:flex gap-6 text-sm shrink-0" style={{ color: dna.palette?.muted }}>
          {links.map(l => renderLink(l, "hover:opacity-100 transition"))}
        </nav>
        <div className="flex items-center gap-3 flex-1 justify-end">
          {storeSlug && (
            <>
              {/* Desktop search */}
               <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchVal.trim()) {
                    const isPlatform = window.location.pathname.startsWith('/store/');
                    navigate(isPlatform ? `/store/${storeSlug}/search?q=${encodeURIComponent(searchVal.trim())}` : `/search?q=${encodeURIComponent(searchVal.trim())}`);
                  }
                }} 
                className="hidden md:flex items-center relative max-w-[140px] lg:max-w-[200px] w-full"
              >
                <div className="relative w-full">
                  <input
                    placeholder="Search..."
                    value={searchVal}
                    onChange={(e) => {
                      setSearchVal(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full pl-3 pr-8 py-1.5 text-xs border outline-none bg-transparent"
                    style={{ borderColor: dna.palette?.border || 'rgba(0,0,0,0.15)', borderRadius: 'var(--r)', color: dna.palette?.fg }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto text-slate-800 text-xs font-sans text-left">
                      {suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onMouseDown={() => {
                            setSearchVal(sug);
                            setShowSuggestions(false);
                            const isPlatform = window.location.pathname.startsWith('/store/');
                            navigate(isPlatform ? `/store/${storeSlug}/search?q=${encodeURIComponent(sug)}` : `/search?q=${encodeURIComponent(sug)}`);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-100 transition truncate capitalize block"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-65 hover:opacity-100">
                  <Search className="h-3.5 w-3.5" style={{ color: dna.palette?.fg }} />
                </button>
              </form>
              
              {/* Mobile search */}
              <button 
                onClick={() => {
                  const isPlatform = window.location.pathname.startsWith('/store/');
                  navigate(isPlatform ? `/store/${storeSlug}/search` : `/search`);
                }} 
                className="md:hidden p-1 opacity-60 hover:opacity-100"
              >
                <Search className="h-5 w-5" style={{ color: dna.palette?.fg }} />
              </button>
            </>
          )}
          {AccountBtn}
          {CartBtn}
        </div>
      </div>
    </header>
    {authOpen && storeSlug && (
      <CustomerAuthModal
        storeSlug={storeSlug}
        storeName={brandName}
        primaryColor={dna.palette?.primary}
        cardColor={dna.palette?.bg}
        borderColor={dna.palette?.border}
        textColor={dna.palette?.fg}
        onClose={() => setAuthOpen(false)}
      />
    )}
    </>
  );
}

function Section({ s, dna, storeSlug, page, store, products, storeCategory }: any) {
  const p = s.props ?? {};
  // If image was explicitly cleared via override (image === ""), do not render image.
  switch (s.type) {
    case "hero": return <Hero p={p} dna={dna} storeSlug={storeSlug} storeCategory={storeCategory} />;
    case "usp_strip": {
      if (storeCategory === "food") {
        const foodItems = (p.items && p.items.length > 0) ? p.items : [
          { title: "Freshly Made", sub: "With the best local ingredients", icon: "sparkles" },
          { title: "Always Hot", sub: "Delivered sizzling and aromatic.", icon: "gift" },
          { title: "Bursting with Flavor", sub: "It awaken your taste buds", icon: "sparkles" },
          { title: "Swift Delivery", sub: "Delivered fast and hot.", icon: "truck" }
        ];
        return (
          <section className="w-full text-white py-6" style={{ background: "#8c2d19" }}>
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {foodItems.map((u: any, i: number) => {
                const Ico = ICONS[u.icon] ?? Sparkles;
                return (
                  <div key={i} className="flex items-center gap-3.5 justify-center md:justify-start">
                    <div className="p-2.5 bg-white/10 rounded-full flex items-center justify-center">
                      <Ico className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-[13px] font-bold tracking-wider leading-tight text-white">{u.title}</div>
                      <div className="text-[11px] text-white/80 mt-0.5 leading-snug">{u.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      }
      const uspStyle = p.style ?? "classic";
      if (uspStyle === "3d_neon_bar")   return <Usp3DNeonBar   p={p} dna={dna} />;
      if (uspStyle === "chrome_bar")    return <UspChrome      p={p} dna={dna} />;
      if (uspStyle === "botanical_bar") return <UspBotanical   p={p} dna={dna} />;
      return (
      <section className="border-y" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {(p.items ?? []).map((u: any, i: number) => { const Ico = ICONS[u.icon] ?? Sparkles; return (
            <div key={i} className="flex items-start gap-3">
              <Ico className="h-5 w-5 mt-0.5" style={{ color: dna.palette?.accent }} />
              <div>
                <div className="text-sm font-medium">{u.title}</div>
                <div className="text-xs" style={{ color: dna.palette?.muted }}>{u.sub}</div>
              </div>
            </div>
          ); })}
        </div>
      </section>
    );
    } // end usp_strip
    case "category_grid": {
      const catStyle = p.style ?? "grid_4";
      if (catStyle === "floating_orbs") return <CategoryFloatingOrbs p={p} dna={dna} storeSlug={storeSlug} />;
      return <CategoryBlock p={p} dna={dna} storeSlug={storeSlug} />;
    }
    case "collections":
    case "collections_grid": return <CollectionsBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "collection_detail": return <CollectionDetailBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "trending":
    case "featured_products":
    case "new_arrivals":
    case "product_grid": return <ProductBlock p={p} dna={dna} storeSlug={storeSlug} page={page} storeCategory={storeCategory} />;
    case "promo_banner": {
      const promoStyle = p.style ?? "classic_split";
      if (promoStyle === "aurora_wave")     return <PromoAuroraWave   p={p} dna={dna} storeSlug={storeSlug} />;
      if (promoStyle === "chrome_wave")     return <PromoChromeWave   p={p} dna={dna} storeSlug={storeSlug} />;
      if (promoStyle === "botanical_promo") return <PromoBotanical    p={p} dna={dna} storeSlug={storeSlug} />;
      // default promo fallback
      const title = p.title ?? "Exclusive Sale"; const cta = p.cta ?? "Shop Now";
      const href = storeSlug ? `/store/${storeSlug}/shop` : "#products";
      const img = p.image;

      // CTA button styling customizations
      const btnBg = p.cta_bg_color || dna.palette?.primary;
      const btnColor = p.cta_color || dna.palette?.primary_fg;
      const btnRadius = p.cta_radius != null ? `${p.cta_radius}px` : "12px";
      const btnFontSize = p.cta_font_size ? (typeof p.cta_font_size === "number" ? `${p.cta_font_size}px` : p.cta_font_size) : undefined;
      
      const BTN_SIZES: Record<string, string> = {
        sm: "px-5 py-2.5 text-xs",
        md: "px-8 py-4 text-sm",
        lg: "px-10 py-5 text-base",
        xl: "px-12 py-6 text-lg",
      };
      const btnSizeClass = BTN_SIZES[p.cta_size as string] || "px-8 py-4 text-sm";
      
      const BTN_ANIMS: Record<string, string> = {
        none: "",
        pulse: "animate-pulse",
        bounce: "animate-bounce",
        float: "hover:-translate-y-1 hover:shadow-lg transition-transform duration-300",
      };
      const btnAnimClass = BTN_ANIMS[p.cta_animation as string] || "";

      if (img) {
        return (
          <section className="py-20" style={{ background: dna.palette?.surface }}>
            <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-black mb-4 s-title" style={{ fontFamily: "var(--hf)" }}>{title}</h2>
                {p.subtitle && <p className="mb-8 s-sub" style={{ color: dna.palette?.muted }}>{p.subtitle}</p>}
                {cta && (
                  <a 
                    href={href} 
                    className={`inline-block font-bold transition-all duration-300 s-cta ${btnSizeClass} ${btnAnimClass}`} 
                    style={{ 
                      background: btnBg, 
                      color: btnColor,
                      borderRadius: btnRadius,
                      fontSize: btnFontSize,
                    }}
                  >
                    {cta}
                  </a>
                )}
              </div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border" style={{ borderColor: dna.palette?.border }}>
                <img src={img} alt={title} className="w-full h-full object-cover" />
              </div>
            </div>
          </section>
        );
      }

      return (
        <section className="py-20 text-center" style={{ background: dna.palette?.surface }}>
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-4xl font-black mb-4 s-title" style={{ fontFamily:"var(--hf)" }}>{title}</h2>
            {p.subtitle && <p className="mb-8 s-sub" style={{ color:dna.palette?.muted }}>{p.subtitle}</p>}
            {cta && (
              <a 
                href={href} 
                className={`inline-block font-bold transition-all duration-300 s-cta ${btnSizeClass} ${btnAnimClass}`} 
                style={{ 
                  background: btnBg, 
                  color: btnColor,
                  borderRadius: btnRadius,
                  fontSize: btnFontSize,
                }}
              >
                {cta}
              </a>
            )}
          </div>
        </section>
      );
    }

    case "story": {
      const sizeMode = p.image_size ?? "medium";
      let imgStyle: React.CSSProperties = { borderRadius: "var(--r)" };
      let imgClass = "object-cover";
      
      if (sizeMode === "auto") {
        imgClass = "w-auto h-auto max-h-[450px] object-contain";
      } else if (sizeMode === "full") {
        imgClass = "w-full h-auto max-h-[600px] object-cover";
      } else if (sizeMode === "small") {
        imgClass = "w-full max-w-[250px] aspect-[4/5] object-cover justify-self-center";
      } else if (sizeMode === "large") {
        imgClass = "w-full max-w-[550px] aspect-[4/5] object-cover justify-self-center";
      } else {
        // medium (default)
        imgClass = "w-full max-w-[400px] aspect-[4/5] object-cover justify-self-center";
      }

      return (
        <section className="py-20" style={{ background: dna.palette?.surface }}>
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl mb-6 s-title" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>
              <p className="leading-relaxed s-body" style={{ color: dna.palette?.muted }}>{p.body}</p>
            </div>
            {p.image && (
              <div className="flex justify-center w-full">
                <img src={p.image} className={imgClass} style={imgStyle} />
              </div>
            )}
          </div>
        </section>
      );
    }
    case "testimonials": return <TestimonialsBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "google_reviews": return <GoogleReviewsBlock p={p} dna={dna} storeSlug={storeSlug} />
    case "newsletter": return (
      <section className="py-20 text-center" style={{ background: dna.palette?.primary, color: dna.palette?.primary_fg }}>
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl mb-3 s-title" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>
          <p className="mb-6 opacity-80 s-sub">{p.sub}</p>
          <form className="flex gap-2 max-w-md mx-auto">
            <input placeholder="you@example.com" className="flex-1 px-4 py-3 text-sm" style={{ background: dna.palette?.bg, color: dna.palette?.fg, borderRadius: "var(--r)" }} />
            <button className="px-5 py-3 text-sm font-medium" style={{ background: dna.palette?.accent, color: dna.palette?.bg, borderRadius: "var(--r)" }}>{p.cta}</button>
          </form>
        </div>
      </section>
    );
    case "page_title": return (
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <h1 className="text-5xl s-title" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h1>
      </section>
    );
    case "values": return (
      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-6">
        {(p.items ?? []).map((v: any, i: number) => {
          const isObj = typeof v === 'object' && v !== null;
          const title = isObj ? (v.title || v.name || "") : "";
          const body = isObj ? (v.body || v.description || "") : v;
          return (
            <div key={i} className="p-6 border flex flex-col justify-between" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", borderColor: dna.palette?.border }}>
              <div>
                <Sparkles className="h-5 w-5 mb-3" style={{ color: dna.palette?.accent }} />
                {title && <h3 className="font-bold text-base mb-1" style={{ color: dna.palette?.fg }}>{title}</h3>}
                <div className="text-sm leading-relaxed opacity-85" style={{ color: dna.palette?.fg }}>{body}</div>
              </div>
            </div>
          );
        })}
      </section>
    );
    case "signup":
    case "signin":
    case "forgot_password":
    case "reset_password": return <AuthForm p={p} dna={dna} variant={s.type} storeSlug={storeSlug} />;
    case "line_items":     return <LineItems dna={dna} storeSlug={storeSlug} />;
    case "cart_summary":   return <CartSummary p={p} dna={dna} storeSlug={storeSlug} store={store} />;
    case "checkout_stepper": return <CheckoutStepper p={p} dna={dna} />;
    case "journal_strip":  return <JournalStrip p={p} dna={dna} storeSlug={storeSlug} />;
    case "journal_list":   return <JournalList p={p} dna={dna} storeSlug={storeSlug} />;
    case "account_panel":  return <AccountPanel p={p} dna={dna} storeSlug={storeSlug} />;
    case "contact_form":   return <ContactForm p={p} dna={dna} storeSlug={storeSlug} />;
    case "map_and_contact": {
      const address = p.address || "123 Luxury Lane, Phase 1, New Delhi - 110001";
      const hours = p.hours || "Mon - Sun: 11:00 AM - 9:00 PM";
      const phone = p.phone || "+91 98765 43210";
      return (
        <section className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
          <div className="grid md:grid-cols-2 gap-8 items-stretch border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
            <div className="p-6 md:p-8 space-y-6 flex flex-col justify-center">
              <h2 className="text-xl font-bold" style={{ fontFamily: "var(--hf)", color: dna.palette?.fg }}>{p.title || 'Visit Our Store'}</h2>
              {p.subtitle && <p className="text-xs" style={{ color: dna.palette?.muted }}>{p.subtitle}</p>}
              <div className="space-y-4 text-xs leading-relaxed">
                <div className="flex gap-3 items-start">
                  <span className="text-sm">📍</span>
                  <div>
                    <p className="font-semibold" style={{ color: dna.palette?.fg }}>Address</p>
                    <p style={{ color: dna.palette?.muted }}>{address}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-sm">⏰</span>
                  <div>
                    <p className="font-semibold" style={{ color: dna.palette?.fg }}>Store Hours</p>
                    <p style={{ color: dna.palette?.muted }}>{hours}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-sm">📞</span>
                  <div>
                    <p className="font-semibold" style={{ color: dna.palette?.fg }}>Phone</p>
                    <p style={{ color: dna.palette?.muted }}>{phone}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-64 md:h-auto min-h-[300px] w-full relative overflow-hidden border-t md:border-t-0 md:border-l" style={{ borderColor: dna.palette?.border }}>
              <iframe
                title="Store Location"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
              />
            </div>
          </div>
        </section>
      );
    }
    case "product_detail": return <ProductDetailStub p={p} dna={dna} storeSlug={storeSlug} store={store} products={products} />;
    // --- Service industry (doctor / salon / clinic) sections -------------
    case "provider_team":      return <ProviderTeamBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "service_menu":       return <ServiceMenuBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "booking_widget":     return <BookingWidgetBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "clinic_hours":       return <ClinicHoursBlock p={p} dna={dna} />;
    case "service_packages":   return <ServicePackagesBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "faqs":               return <FaqsBlock p={p} dna={dna} />;
    case "service_detail":     return <ServiceDetailBlock p={p} dna={dna} storeSlug={storeSlug} />;
    case "appointments_panel": return <AppointmentsPanelBlock p={p} dna={dna} storeSlug={storeSlug} />;
    default: return null;
  }
}

// =============================================================================
// SERVICE INDUSTRY BLOCKS (doctor / clinic / salon / spa / home-visit)
// Renders provider profiles, service menus, slot booking, clinic hours,
// packages, FAQs, and a customer appointment history panel.
// =============================================================================
function ProviderTeamBlock({ p, dna, storeSlug }: any) {
  const items: any[] = p.items ?? [];
  return (
    <section className="py-20" style={{ background: dna.palette?.bg }}>
      <div className="max-w-6xl mx-auto px-6">
        {p.title && <h2 className="text-4xl mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>}
        {p.subtitle && <p className="mb-10" style={{ color: dna.palette?.muted }}>{p.subtitle}</p>}
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((m: any, i: number) => (
            <article key={i} className="overflow-hidden border" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
              {m.image && <img src={m.image} alt={m.name} className="w-full aspect-[4/5] object-cover" />}
              <div className="p-5">
                <div className="text-lg font-medium" style={{ fontFamily: "var(--hf)" }}>{m.name}</div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: dna.palette?.accent }}>{m.role}{m.qualifications ? ` · ${m.qualifications}` : ""}</div>
                {m.experience && <div className="text-xs mt-2" style={{ color: dna.palette?.muted }}>{m.experience}</div>}
                {m.bio && <p className="text-sm mt-3 leading-relaxed" style={{ color: dna.palette?.muted }}>{m.bio}</p>}
                {m.specialties && Array.isArray(m.specialties) && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {m.specialties.slice(0, 4).map((s: string, j: number) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 uppercase tracking-wider" style={{ background: dna.palette?.bg, color: dna.palette?.fg, borderRadius: "var(--r)" }}>{s}</span>
                    ))}
                  </div>
                )}
                {storeSlug && (
                  <Link to={`/store/${storeSlug}/book?provider=${encodeURIComponent(m.name)}`} className="inline-block mt-4 text-sm px-4 py-2" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book {m.role?.split(" ")[0] ?? "now"}</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceMenuBlock({ p, dna, storeSlug }: any) {
  const groups: any[] = p.groups ?? [{ name: p.title ?? "Services", items: p.items ?? [] }];
  return (
    <section className="py-20" style={{ background: dna.palette?.surface }}>
      <div className="max-w-5xl mx-auto px-6">
        {p.title && <h2 className="text-4xl mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>}
        {p.subtitle && <p className="mb-10" style={{ color: dna.palette?.muted }}>{p.subtitle}</p>}
        <div className="space-y-10">
          {groups.map((g: any, gi: number) => (
            <div key={gi}>
              {groups.length > 1 && <h3 className="text-xl mb-4 pb-2 border-b" style={{ fontFamily: "var(--hf)", borderColor: dna.palette?.border, color: dna.palette?.accent }}>{g.name}</h3>}
              <ul className="divide-y" style={{ borderColor: dna.palette?.border }}>
                {(g.items ?? []).map((s: any, i: number) => (
                  <li key={i} className="py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-base font-medium">{s.name}</span>
                        {s.duration_min && <span className="text-xs" style={{ color: dna.palette?.muted }}>{s.duration_min} min</span>}
                        {s.badge && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5" style={{ background: dna.palette?.accent, color: dna.palette?.bg, borderRadius: "var(--r)" }}>{s.badge}</span>}
                      </div>
                      {s.description && <p className="text-sm mt-1" style={{ color: dna.palette?.muted }}>{s.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-semibold">₹{s.price}</div>
                      {storeSlug && <Link to={`/store/${storeSlug}/book?service=${encodeURIComponent(s.name)}`} className="inline-block mt-1 text-xs px-3 py-1.5" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book</Link>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingWidgetBlock({ p, dna, storeSlug }: any) {
  return (
    <section className="py-16" style={{ background: dna.palette?.bg }}>
      <div className="max-w-3xl mx-auto px-6 p-8 text-center border" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
        <h2 className="text-3xl mb-3" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title ?? "Book your appointment"}</h2>
        <p className="mb-6" style={{ color: dna.palette?.muted }}>{p.subtitle ?? "Choose a service, pick a provider and a slot — confirmation is instant."}</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-6 text-left text-sm">
          {(p.steps ?? ["Pick a service", "Pick a provider & slot", "Confirm details"]).map((st: string, i: number) => (
            <div key={i} className="p-3 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: dna.palette?.accent }}>Step {i + 1}</div>
              <div>{st}</div>
            </div>
          ))}
        </div>
        {storeSlug
          ? <Link to={`/store/${storeSlug}/book`} className="inline-block px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta ?? "Book appointment"}</Link>
          : <button className="px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta ?? "Book appointment"}</button>}
      </div>
    </section>
  );
}

function ClinicHoursBlock({ p, dna }: any) {
  const hours: any[] = p.hours ?? [];
  return (
    <section className="py-16" style={{ background: dna.palette?.surface }}>
      <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-start">
        <div>
          <h2 className="text-3xl mb-3" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title ?? "Visit us"}</h2>
          {p.address && <p className="text-sm mb-2" style={{ color: dna.palette?.muted }}>{p.address}</p>}
          {p.phone && <p className="text-sm" style={{ color: dna.palette?.muted }}>Call: {p.phone}</p>}
          {p.note && <p className="text-sm mt-4" style={{ color: dna.palette?.accent }}>{p.note}</p>}
        </div>
        <ul className="divide-y" style={{ borderColor: dna.palette?.border }}>
          {hours.map((h: any, i: number) => (
            <li key={i} className="py-2 flex items-center justify-between text-sm">
              <span className="font-medium">{h.day}</span>
              <span style={{ color: dna.palette?.muted }}>{h.closed ? "Closed" : `${h.open} — ${h.close}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ServicePackagesBlock({ p, dna, storeSlug }: any) {
  const items: any[] = p.items ?? [];
  return (
    <section className="py-20" style={{ background: dna.palette?.bg }}>
      <div className="max-w-6xl mx-auto px-6">
        {p.title && <h2 className="text-4xl mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>}
        {p.subtitle && <p className="mb-10" style={{ color: dna.palette?.muted }}>{p.subtitle}</p>}
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((pk: any, i: number) => (
            <div key={i} className="p-6 border flex flex-col" style={{ background: dna.palette?.surface, borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
              {pk.badge && <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: dna.palette?.accent }}>{pk.badge}</div>}
              <div className="text-xl font-medium mb-1" style={{ fontFamily: "var(--hf)" }}>{pk.name}</div>
              <div className="text-2xl font-semibold mb-1">₹{pk.price}</div>
              <div className="text-xs mb-4" style={{ color: dna.palette?.muted }}>{pk.total_visits ? `${pk.total_visits} visits · ` : ""}{pk.validity_days ? `Valid ${pk.validity_days} days` : ""}</div>
              <ul className="text-sm space-y-1 mb-5 flex-1">
                {(pk.includes ?? []).map((it: string, j: number) => (
                  <li key={j} className="flex gap-2"><span style={{ color: dna.palette?.accent }}>✓</span><span style={{ color: dna.palette?.muted }}>{it}</span></li>
                ))}
              </ul>
              {storeSlug && <Link to={`/store/${storeSlug}/book?package=${encodeURIComponent(pk.name)}`} className="text-center px-4 py-2 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Buy package</Link>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqsBlock({ p, dna }: any) {
  const items: any[] = p.items ?? [];
  return (
    <section className="py-20" style={{ background: dna.palette?.surface }}>
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl mb-8" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title ?? "Frequently asked"}</h2>
        <div className="space-y-4">
          {items.map((f: any, i: number) => (
            <details key={i} className="p-4 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
              <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
              <p className="text-sm mt-2" style={{ color: dna.palette?.muted }}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceDetailBlock({ p, dna, storeSlug }: any) {
  const s = p.service ?? {};
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
      <div className="aspect-square overflow-hidden" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
        {(p.image || s.image) && <img src={p.image || s.image} className="w-full h-full object-cover" />}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: dna.palette?.accent }}>{s.category ?? "Service"}</div>
        <h1 className="text-4xl mb-3" style={{ fontFamily: "var(--hf)" }}>{s.name}</h1>
        <div className="flex items-baseline gap-4 mb-4">
          <div className="text-2xl font-semibold">₹{s.price}</div>
          {s.duration_min && <div className="text-sm" style={{ color: dna.palette?.muted }}>{s.duration_min} minutes</div>}
        </div>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: dna.palette?.muted }}>{s.description ?? "Detailed service information renders here."}</p>
        {Array.isArray(s.includes) && s.includes.length > 0 && (
          <ul className="text-sm space-y-1 mb-6">
            {s.includes.map((it: string, i: number) => (<li key={i} className="flex gap-2"><span style={{ color: dna.palette?.accent }}>✓</span>{it}</li>))}
          </ul>
        )}
        {storeSlug
          ? <Link to={`/store/${storeSlug}/book?service=${encodeURIComponent(s.name ?? "")}`} className="inline-block px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book appointment</Link>
          : <button className="px-6 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book appointment</button>}
      </div>
    </section>
  );
}

function AppointmentsPanelBlock({ p, dna, storeSlug }: any) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <h2 className="text-2xl mb-2" style={{ fontFamily: "var(--hf)" }}>{p.title ?? "My appointments"}</h2>
      <p className="mb-6 text-sm" style={{ color: dna.palette?.muted }}>{p.subtitle ?? "Upcoming, past visits and prescriptions all in one place."}</p>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {(p.metrics ?? [
          { label: "Upcoming", value: "—" },
          { label: "Visits this year", value: "—" },
          { label: "Active packages", value: "—" },
        ]).map((m: any, i: number) => (
          <div key={i} className="p-4 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.surface }}>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: dna.palette?.muted }}>{m.label}</div>
            <div className="text-2xl font-semibold">{m.value}</div>
          </div>
        ))}
      </div>
      <div className="p-6 border text-sm" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", color: dna.palette?.muted }}>
        Your appointment history, prescriptions and family member visits will appear here once you sign in.
        {storeSlug && <Link to={`/store/${storeSlug}/book`} className="ml-3 inline-block px-4 py-2 text-xs" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>Book a new visit</Link>}
      </div>
    </section>
  );
}

function pad(cls = "max-w-3xl mx-auto px-6 py-16") { return cls; }

function AuthForm({ p, dna, variant, storeSlug }: any) {
  const links: Record<string, { label: string; to: string }[]> = {
    signin:   [{ label: "Forgot password?", to: storeSlug ? `/store/${storeSlug}/auth/forgot` : "#" }, { label: "Create account", to: storeSlug ? `/store/${storeSlug}/auth/signup` : "#" }],
    signup:   [{ label: "Already have an account? Sign in", to: storeSlug ? `/store/${storeSlug}/auth/signin` : "#" }],
    forgot_password: [{ label: "Back to sign in", to: storeSlug ? `/store/${storeSlug}/auth/signin` : "#" }],
    reset_password:  [],
  };
  return (
    <section className={pad()}>
      <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--hf)" }}>{p.title}</h1>
      <form className="space-y-3">
        {variant !== "reset_password" && <input type="email" placeholder="Email" className="w-full px-4 py-3 text-sm border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg }} />}
        {variant === "signup" && <input placeholder="Full name" className="w-full px-4 py-3 text-sm border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg }} />}
        <button type="button" className="w-full px-5 py-3 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>{p.cta}</button>
      </form>
      <div className="mt-5 flex flex-col gap-2 text-sm">
        {(links[variant] ?? []).map((l, i) => <Link key={i} to={l.to} style={{ color: dna.palette?.accent }}>{l.label}</Link>)}
      </div>
    </section>
  );
}

function LineItems({ dna, storeSlug }: any) {
  const { items, updateQuantity, removeItem } = useCart(storeSlug || "");
  const br = "var(--r)";
  
  if (!items?.length) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto opacity-20 mb-4" />
        <p className="text-sm opacity-50 mb-4" style={{ color: dna.palette?.muted }}>Your cart is empty</p>
        <Link
          to={storeSlug ? `/store/${storeSlug}/shop` : "#"}
          className="inline-block px-6 py-2.5 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: "var(--p)", color: "var(--pf)", borderRadius: br }}
        >
          Continue Shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <div className="space-y-4">
        {items.map((item: any) => {
          const key = `${item.productId}_${item.variant || ''}`;
          return (
            <div
              key={key}
              className="flex gap-4 p-4 border"
              style={{ borderColor: dna.palette?.border, borderRadius: br, background: dna.palette?.surface }}
            >
              <div
                className="h-20 w-20 shrink-0 overflow-hidden"
                style={{ backgroundColor: dna.palette?.bg, borderRadius: br }}
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
                <p className="text-sm font-bold mt-1" style={{ color: "var(--p)" }}>
                  ₹{item.price.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeItem(item.productId, item.variant)}
                  className="text-xs opacity-40 hover:opacity-100 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div
                  className="flex items-center border"
                  style={{ borderColor: dna.palette?.border, borderRadius: "8px" }}
                >
                  <button onClick={() => updateQuantity(item.productId, item.variant, item.quantity - 1)} className="p-1.5 hover:bg-muted/50 rounded-l">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-3 text-xs font-semibold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.variant, item.quantity + 1)} className="p-1.5 hover:bg-muted/50 rounded-r">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CartSummary({ p, dna, storeSlug, store }: any) {
  const {
    items, totalPrice, finalPrice,
    appliedCoupon, setAppliedCoupon, clearCoupon
  } = useCart(storeSlug || "");
  
  const { validateCoupon } = useValidateCoupon();
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || '');
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (appliedCoupon?.code) setCouponCode(appliedCoupon.code);
  }, [appliedCoupon?.code]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !items.length) return;
    setCouponLoading(true);
    const storeId = store?.id;
    if (!storeId) {
      toast.error("Store reference error");
      setCouponLoading(false);
      return;
    }
    const cartLines = items.map((i: any) => ({ productId: i.productId, price: i.price, quantity: i.quantity }));
    const result = await validateCoupon(storeId, couponCode.trim(), totalPrice, cartLines);
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

  if (!items?.length) return null;

  const discount = appliedCoupon?.discount || 0;

  return (
    <section className="max-w-3xl mx-auto px-6 pb-16 space-y-4">
      {/* Coupon input */}
      <div className="p-4 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.surface }}>
        <Label className="text-xs font-semibold mb-2 block">Have a coupon?</Label>
        <div className="flex gap-2">
          <Input 
            value={couponCode} 
            onChange={(e) => setCouponCode(e.target.value)} 
            placeholder="Enter promo code" 
            disabled={!!appliedCoupon}
            className="h-9 text-xs flex-1 bg-transparent border-input"
          />
          {appliedCoupon ? (
            <Button size="sm" variant="outline" onClick={handleRemoveCoupon} className="h-9 px-3 shrink-0">
              <X className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          ) : (
            <Button size="sm" onClick={handleApplyCoupon} disabled={couponLoading} className="h-9 px-4 shrink-0" style={{ background: "var(--p)", color: "var(--pf)" }}>
              {couponLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Apply
            </Button>
          )}
        </div>
        {appliedCoupon && (
          <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" /> Coupon "{appliedCoupon.code}" applied! Saving ₹{Math.round(discount).toLocaleString('en-IN')}
          </p>
        )}
      </div>

      {/* Cart totals */}
      <div className="p-6 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.surface }}>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm opacity-70">
            <span>Subtotal</span>
            <span>₹{totalPrice.toLocaleString("en-IN")}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Discount</span>
              <span>-₹{Math.round(discount).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between text-sm opacity-70 pb-2 border-b" style={{ borderColor: dna.palette?.border }}>
            <span>Shipping</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">Calculated at checkout</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2">
            <span>Total</span>
            <span style={{ color: "var(--p)" }}>₹{Math.round(finalPrice).toLocaleString("en-IN")}</span>
          </div>
        </div>
        {/* Proceed to Checkout button */}
        {(() => {
          const btnBg = p.checkout_btn_bg || "var(--p)";
          const btnColor = p.checkout_btn_color || "var(--pf)";
          const btnRadius = p.checkout_btn_radius != null ? `${p.checkout_btn_radius}px` : "var(--r)";
          const btnFont = p.checkout_btn_font === "body" ? "var(--bf)" : "var(--hf)";
          
          let sizeClass = "py-3 px-5 text-sm";
          if (p.checkout_btn_size === "sm") sizeClass = "py-2 px-4 text-xs";
          else if (p.checkout_btn_size === "lg") sizeClass = "py-3.5 px-6 text-base";
          else if (p.checkout_btn_size === "xl") sizeClass = "py-4 px-8 text-lg";

          let weightClass = "font-bold";
          if (p.checkout_btn_font_weight === "normal") weightClass = "font-normal";
          else if (p.checkout_btn_font_weight === "medium") weightClass = "font-medium";
          else if (p.checkout_btn_font_weight === "semibold") weightClass = "font-semibold";
          else if (p.checkout_btn_font_weight === "extrabold") weightClass = "font-extrabold";

          let animClass = "";
          if (p.checkout_btn_animation === "pulse") animClass = "animate-pulse";
          else if (p.checkout_btn_animation === "bounce") animClass = "animate-bounce";
          else if (p.checkout_btn_animation === "float") animClass = "hover:-translate-y-1 hover:shadow-lg transition-all duration-300";

          return (
            <Link 
              to={storeSlug ? `/store/${storeSlug}/checkout` : "#"} 
              className={`block text-center w-full shadow-md hover:opacity-95 transition-opacity relative overflow-hidden ${sizeClass} ${weightClass} ${animClass}`} 
              style={{ 
                background: btnBg, 
                color: btnColor, 
                borderRadius: btnRadius,
                fontFamily: btnFont 
              }}
            >
              {p.checkout_btn_animation === "shimmer" && (
                <>
                  <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes btn-shimmer-swipe {
                      0% { transform: translateX(-150%) skewX(-25deg); }
                      100% { transform: translateX(150%) skewX(-25deg); }
                    }
                    .btn-shimmer-effect {
                      animation: btn-shimmer-swipe 3.5s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
                    }
                  `}} />
                  <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent btn-shimmer-effect" />
                  </div>
                </>
              )}
              <span className="relative z-10">{p.cta || "Proceed to Checkout"}</span>
            </Link>
          );
        })()}
      </div>
    </section>
  );
}

function CheckoutStepper({ p, dna }: any) {
  const steps: string[] = p.steps ?? ["address", "shipping", "payment", "review"];
  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      <ol className="flex gap-2 mb-8">
        {steps.map((st, i) => (
          <li key={i} className="flex-1 text-center text-xs uppercase tracking-wider py-2 border-b-2" style={{ borderColor: i === 0 ? dna.palette?.accent : dna.palette?.border, color: i === 0 ? dna.palette?.fg : dna.palette?.muted }}>{st}</li>
        ))}
      </ol>
      <p style={{ color: dna.palette?.muted }} className="text-sm">Checkout content is wired to your existing checkout flow.</p>
    </section>
  );
}

function JournalStrip({ p, dna, storeSlug }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!storeSlug) {
          setLoading(false);
          return;
        }
        const { data: store } = await supabase.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
        if (!store?.id) {
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("store_id", store.id)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(p.limit || 3); // Fetch up to 3 posts
        setPosts(data || []);
      } catch (e) {
        console.warn("Failed to fetch blog posts:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [storeSlug, p.limit]);

  if (loading) return null;
  if (posts.length === 0) return null;

  let displayTitle = p.title || "Blogs";
  if (displayTitle === "Latest News" || displayTitle === "Journal") {
    displayTitle = "Blogs";
  }

  const blogLink = storeSlug ? `/store/${storeSlug}/journal` : "#";
  const headingFont = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 } as React.CSSProperties;

  const productCols = p.product_cols ?? 3;
  const cardWidth = p.product_card_width;
  const sectionId = p.id || `sec-journal-strip`;

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .dynamic-grid-${sectionId} {
            grid-template-columns: repeat(${productCols}, minmax(0, 1fr)) !important;
            display: grid !important;
          }
        }
      `}} />
      <div className="flex items-end justify-between mb-8">
        <h2 className="text-3xl font-bold s-title" style={{ fontFamily: "var(--hf)", color: dna.palette?.fg }}>{displayTitle}</h2>
        {storeSlug && <Link to={blogLink} className="text-sm font-semibold hover:underline" style={{ color: dna.palette?.accent }}>Read all →</Link>}
      </div>
      <div 
        className={p.scroll_horizontal
          ? "flex gap-6 overflow-x-auto pb-4 snap-x scroll-smooth scrollbar-thin"
          : cardWidth 
            ? "flex flex-wrap gap-6 justify-center" 
            : `grid grid-cols-1 md:grid-cols-3 gap-6 dynamic-grid-${sectionId}`
        }
      >
        {posts.map((post) => (
          <Link 
            key={post.id} 
            to={storeSlug ? `/store/${storeSlug}/journal/${post.slug}` : "#"} 
            className={`group flex flex-col overflow-hidden border ${p.scroll_horizontal ? 'snap-start shrink-0' : ''}`} 
            style={{ 
              background: dna.palette?.surface, 
              borderColor: dna.palette?.border, 
              borderRadius: "var(--r)",
              width: p.scroll_horizontal ? `${cardWidth ?? 280}px` : cardWidth ? `${cardWidth}px` : 'auto'
            }}
          >
            <div className="aspect-[16/10] overflow-hidden bg-muted/10">
              {post.cover_image ? (
                <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No cover image</div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: dna.palette?.accent }}>
                  {new Date(post.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <h3 className="text-base font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors" style={{ color: dna.palette?.fg }}>
                  {post.title}
                </h3>
                {post.seo_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed" style={{ color: dna.palette?.muted }}>
                    {post.seo_description}
                  </p>
                )}
              </div>
              <div className="mt-4 text-xs font-semibold inline-flex items-center gap-1 group-hover:underline" style={{ color: dna.palette?.accent }}>
                Read Article <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function JournalList({ p, dna, storeSlug }: any) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: p.limit || 6 }).map((_, i) => (
          <Link key={i} to={storeSlug ? `/store/${storeSlug}/journal/post-${i}` : "#"} className="block p-6 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: dna.palette?.accent }}>Story</div>
            <div className="text-lg" style={{ fontFamily: "var(--hf)" }}>Journal post placeholder</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AccountPanel({ p, dna, storeSlug }: any) {
  const tabs: string[] = p.tabs ?? ["orders", "addresses", "wishlist", "profile"];
  return (
    <section className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-[200px,1fr] gap-8">
      <nav className="space-y-2 text-sm">
        {tabs.map((t, i) => (
          <Link key={t} to={storeSlug ? `/store/${storeSlug}/account/${t}` : "#"} className="block px-3 py-2 capitalize" style={{ background: i === 0 ? dna.palette?.surface : "transparent", borderRadius: "var(--r)" }}>{t}</Link>
        ))}
      </nav>
      <div className="p-6 border" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)" }}>
        <p style={{ color: dna.palette?.muted }}>Account content connects to your customer profile data.</p>
      </div>
    </section>
  );
}

function ContactForm({ p, dna, storeSlug }: any) {
  const title = p.title || "Get In Touch";
  const sub = p.sub || "Have a question or feedback? We would love to hear from you. Send us a message and we will respond as soon as possible.";
  const email = p.email || "support@storeontips.com";
  const phone = p.phone || "+91 98765 43210";
  const address = p.address || "123 Luxury Lane, Phase 1, New Delhi - 110001";
  const hours = p.hours || "Mon - Sun: 11:00 AM - 9:00 PM";

  const { user } = useCustomerAuth(storeSlug || "");

  const [name, setName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [termsContent, setTermsContent] = useState("");

  // Previous messages history for logged-in users
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || "");
      setSenderEmail(user.email || user.user_metadata?.customer_email || "");
      setContactPhone(user.phone || user.user_metadata?.phone || "");
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id || !storeSlug) return;
    setHistoryLoading(true);
    try {
      const { data: store } = await supabase
        .from("stores").select("id").eq("slug", storeSlug).maybeSingle();
      if (!store?.id) return;

      const userEmail = (user.email || user.user_metadata?.customer_email || "").toLowerCase();

      // Fetch by customer_user_id OR by email (covers messages sent before login was linked)
      const [byId, byEmail] = await Promise.all([
        (supabase as any)
          .from("contact_messages")
          .select("id, subject, message, status, created_at")
          .eq("customer_user_id", user.id)
          .eq("store_id", store.id),
        userEmail
          ? (supabase as any)
              .from("contact_messages")
              .select("id, subject, message, status, created_at, customer_user_id")
              .eq("email", userEmail)
              .eq("store_id", store.id)
          : Promise.resolve({ data: [] }),
      ]);

      // Merge + deduplicate by id, newest first
      const merged = [...(byId.data || []), ...(byEmail.data || [])];
      const seen = new Set<string>();
      const unique = merged.filter((m: any) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      unique.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setHistory(unique);

      // Backfill customer_user_id on old messages that matched by email but have no user id
      const toBackfill = (byEmail.data || []).filter((m: any) => !m.customer_user_id).map((m: any) => m.id);
      if (toBackfill.length > 0) {
        await (supabase as any)
          .from("contact_messages")
          .update({ customer_user_id: user.id })
          .in("id", toBackfill);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id, storeSlug]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    const fetchStoreTerms = async () => {
      if (!storeSlug) return;
      const { data } = await supabase
        .from('stores')
        .select('settings')
        .eq('slug', storeSlug)
        .maybeSingle();
      const policies = (data?.settings as any)?.policies || {};
      if (policies.terms?.trim()) {
        setTermsContent(policies.terms);
      }
    };
    fetchStoreTerms();
  }, [storeSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !senderEmail.trim() || !message.trim()) return;
    setSending(true);
    try {
      // Resolve store_id from slug
      const { data: store, error: storeErr } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", storeSlug || "")
        .maybeSingle();
      if (storeErr || !store?.id) {
        toast.error("Could not identify the store. Please try again.");
        setSending(false);
        return;
      }
      const { error } = await (supabase as any).from("contact_messages").insert({
        store_id: store.id,
        name: name.trim(),
        email: senderEmail.trim().toLowerCase(),
        phone: contactPhone.trim() || null,
        subject: subject.trim() || "(No subject)",
        message: message.trim(),
        status: "unread",
        customer_user_id: user?.id ?? null,
      });
      if (error) throw error;
      setSent(true);
      setName(""); setSenderEmail(""); setContactPhone(""); setSubject(""); setMessage("");
      toast.success("Message sent! We'll get back to you soon.");
      fetchHistory();
    } catch (err: any) {
      console.error("contact_form submit", err);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    unread:  { label: "Sent",    cls: "bg-blue-100 text-blue-700" },
    read:    { label: "Seen",    cls: "bg-gray-100 text-gray-600" },
    replied: { label: "Replied", cls: "bg-green-100 text-green-700" },
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-bold mb-3 s-title" style={{ fontFamily: "var(--hf)", color: p.title_color ?? dna.palette?.fg }}>
          {title}
        </h2>
        <p className="text-sm leading-relaxed s-sub" style={{ color: p.sub_color ?? dna.palette?.muted }}>
          {sub}
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Info Column */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 border rounded-2xl space-y-6" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--hf)", color: dna.palette?.fg }}>
              Contact Information
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-3.5 items-start">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ borderColor: dna.palette?.border, background: dna.palette?.bg }}>
                  <Mail className="h-4 w-4" style={{ color: "var(--p)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider" style={{ color: dna.palette?.muted }}>Email Us</h4>
                  <p className="text-sm font-semibold mt-0.5 break-all s-email" style={{ color: p.email_color ?? dna.palette?.fg }}>{email}</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ borderColor: dna.palette?.border, background: dna.palette?.bg }}>
                  <Phone className="h-4 w-4" style={{ color: "var(--p)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider" style={{ color: dna.palette?.muted }}>Call Us</h4>
                  <p className="text-sm font-semibold mt-0.5 s-phone" style={{ color: p.phone_color ?? dna.palette?.fg }}>{phone}</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ borderColor: dna.palette?.border, background: dna.palette?.bg }}>
                  <MapPin className="h-4 w-4" style={{ color: "var(--p)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider" style={{ color: dna.palette?.muted }}>Visit Our Store</h4>
                  <p className="text-sm font-semibold mt-0.5 leading-relaxed s-address" style={{ color: p.address_color ?? dna.palette?.fg }}>{address}</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ borderColor: dna.palette?.border, background: dna.palette?.bg }}>
                  <Clock className="h-4 w-4" style={{ color: "var(--p)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider" style={{ color: dna.palette?.muted }}>Working Hours</h4>
                  <p className="text-sm font-semibold mt-0.5 s-hours" style={{ color: p.hours_color ?? dna.palette?.fg }}>{hours}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Abstract Map Graphic */}
          <div className="h-48 rounded-2xl overflow-hidden relative border shadow-inner flex items-center justify-center animate-fade-in" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(var(--p) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
            <div className="absolute w-24 h-24 rounded-full filter blur-xl opacity-10 animate-pulse" style={{ background: "var(--p)" }} />
            <div className="z-10 text-center space-y-2 p-4">
              <MapPin className="h-7 w-7 mx-auto animate-bounce" style={{ color: "var(--p)" }} />
              <p className="text-xs font-bold" style={{ color: dna.palette?.fg }}>Find us on Google Maps</p>
              <button 
                type="button" 
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')} 
                className="text-[10px] font-bold px-3 py-1.5 border rounded-lg hover:bg-background transition"
                style={{ borderColor: dna.palette?.border, color: dna.palette?.fg }}
              >
                Get Directions
              </button>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-7 p-6 md:p-8 border rounded-2xl space-y-6" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
          <h3 className="text-lg font-bold" style={{ fontFamily: "var(--hf)", color: dna.palette?.fg }}>
            Send Us a Message
          </h3>
          {sent ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--p)" + "22" }}>
                <Mail className="h-7 w-7" style={{ color: "var(--p)" }} />
              </div>
              <p className="font-semibold" style={{ color: dna.palette?.fg }}>Message Sent!</p>
              <p className="text-sm" style={{ color: dna.palette?.muted }}>We'll get back to you as soon as possible.</p>
              <button
                onClick={() => setSent(false)}
                className="text-xs underline opacity-60 hover:opacity-100"
                style={{ color: dna.palette?.fg }}
              >Send another message</button>
            </div>
          ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold block" style={{ color: dna.palette?.muted }}>Full Name</label>
                <input required placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-primary" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg, color: dna.palette?.fg }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold block" style={{ color: dna.palette?.muted }}>Email Address</label>
                <input required type="email" placeholder="email@domain.com" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="w-full px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-primary" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg, color: dna.palette?.fg }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold block" style={{ color: dna.palette?.muted }}>Phone Number</label>
                <input placeholder="E.g. +91 99999 99999" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-primary" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg, color: dna.palette?.fg }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold block" style={{ color: dna.palette?.muted }}>Subject</label>
              <input placeholder="What is this about?" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-primary" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg, color: dna.palette?.fg }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold block" style={{ color: dna.palette?.muted }}>Your Message</label>
              <textarea required rows={5} placeholder="Write your message here..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-primary" style={{ borderColor: dna.palette?.border, borderRadius: "var(--r)", background: dna.palette?.bg, color: dna.palette?.fg }} />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 text-xs font-bold uppercase tracking-wider transition hover:opacity-90 shadow-md flex items-center justify-center gap-2"
              style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sending ? "Sending…" : "Send Message"}
            </button>
          </form>
          )}

          {/* ── Previous Messages History (logged-in users only) ── */}
          {user && (
            <div className="pt-5 border-t" style={{ borderColor: dna.palette?.border }}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: dna.palette?.muted }}>
                Your Previous Messages
              </h4>
              {historyLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: dna.palette?.muted }} />
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs py-4 text-center opacity-50" style={{ color: dna.palette?.muted }}>
                  No previous messages yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((msg) => {
                    const badge = STATUS_BADGE[msg.status] ?? STATUS_BADGE.unread;
                    const isOpen = expandedId === msg.id;
                    return (
                      <div key={msg.id} className="border rounded-xl overflow-hidden" style={{ borderColor: dna.palette?.border, background: dna.palette?.bg }}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : msg.id)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:opacity-80 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate" style={{ color: dna.palette?.fg }}>
                              {msg.subject || "(No subject)"}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: dna.palette?.muted }}>
                              {new Date(msg.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                              {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <X className="h-3.5 w-3.5 shrink-0 transition-transform" style={{ color: dna.palette?.muted, transform: isOpen ? "rotate(0deg)" : "rotate(45deg)" }} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-2 border-t space-y-3" style={{ borderColor: dna.palette?.border }}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: dna.palette?.fg }}>
                              {msg.message}
                            </p>
                            {msg.status === "replied" && (
                              <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "var(--p)" + "18", color: "var(--p)" }}>
                                ✓ Store has replied — check your email inbox for their response.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {termsContent && (
        <div className="mt-12 p-6 border rounded-2xl animate-fade-in text-left" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--hf)", color: dna.palette?.fg }}>
            Terms of Service
          </h3>
          <div 
            className="terms-md text-sm leading-relaxed space-y-3 opacity-80" 
            style={{ color: dna.palette?.fg }}
            dangerouslySetInnerHTML={{ __html: md(termsContent) }}
          />
          <style>{`
            .terms-md h2 { font-size: 1.1rem; font-weight: 600; margin-top: 1.25rem; }
            .terms-md h3 { font-size: 1rem;   font-weight: 600; margin-top: 1rem; }
            .terms-md ul { list-style: disc; padding-left: 1.25rem; }
          `}</style>
        </div>
      )}
    </section>
  );
}

function ProductDetailStub({ p, dna, storeSlug, store, products }: any) {
  const pr = p.product ?? {};

  if (store && pr.id) {
    const themeObj = {
      colors: {
        primary: dna.palette?.primary || '#111',
        secondary: dna.palette?.surface || '#f3f3f3',
        accent: dna.palette?.accent || '#111',
        background: dna.palette?.bg || '#fff',
        card: dna.palette?.surface || '#fff',
        text: dna.palette?.fg || '#0a0a0a',
      },
      fonts: {
        heading: dna.fonts?.heading || 'inherit',
        body: dna.fonts?.body || 'inherit',
      },
      borderRadius: parseInt(dna.radius) || 8,
    };

    const relatedProducts = (products || [])
      .filter((item: any) => item.id !== pr.id && item.category === pr.category)
      .slice(0, 8);

    return (
      <ProductPageRenderer
        store={store}
        product={pr}
        relatedProducts={relatedProducts}
        theme={themeObj}
        slug={storeSlug || ''}
        products={products || []}
        sectionOverrides={p}
      />
    );
  }

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart(storeSlug || "");

  // Use title as primary, name as fallback (DB shape uses `title`, legacy manifests use `name`)
  const name = pr.title || pr.name || "";

  const images: string[] = pr.images || (p.image ? [p.image] : []);
  const [activeImg, setActiveImg] = useState(0);
  const price = pr.price ?? 0;
  const compareAt = pr.compare_at_price ?? pr.compare_at ?? 0;
  const discount = compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  const handleAdd = () => {
    if (!pr.id || !storeSlug) return;
    addItem({ productId: pr.id, title: name || "Product", price: Number(price), image: images[0] || null }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // No product data yet — show loading skeleton
  if (!pr.id && !name) {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square rounded-2xl animate-pulse" style={{ background: dna.palette?.surface }} />
          <div className="space-y-4">
            <div className="h-8 rounded animate-pulse w-3/4" style={{ background: dna.palette?.surface }} />
            <div className="h-6 rounded animate-pulse w-1/4" style={{ background: dna.palette?.surface }} />
            <div className="h-24 rounded animate-pulse" style={{ background: dna.palette?.surface }} />
            <div className="h-12 rounded animate-pulse w-1/2" style={{ background: dna.palette?.surface }} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-6 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Image gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl mb-3" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
            {images[activeImg] && <img src={images[activeImg]} alt={name} className="w-full h-full object-cover" />}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className="shrink-0 w-16 h-16 overflow-hidden rounded-lg border-2 transition-all"
                  style={{ borderColor: i === activeImg ? dna.palette?.primary : dna.palette?.border, borderRadius: "8px" }}>
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-4">
          {/* Breadcrumb */}
          {pr.category && (
            <div className="text-xs uppercase tracking-widest" style={{ color: dna.palette?.muted }}>{pr.category}</div>
          )}

          <h1 className="text-3xl font-bold leading-tight" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>
            {name}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black" style={{ color: dna.palette?.primary }}>₹{price.toLocaleString("en-IN")}</span>
            {compareAt > price && (
              <>
                <span className="text-lg line-through" style={{ color: dna.palette?.muted }}>₹{compareAt.toLocaleString("en-IN")}</span>
                <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: "#dcfce7", color: "#16a34a" }}>{discount}% off</span>
              </>
            )}
          </div>

          {/* Stock status */}
          {pr.inventory_count !== undefined && pr.inventory_count !== null && (
            <div className="text-sm font-medium" style={{ color: pr.inventory_count > 0 ? "#16a34a" : "#dc2626" }}>
              {pr.inventory_count > 0 ? (pr.inventory_count <= 5 ? `Only ${pr.inventory_count} left!` : "In Stock") : "Out of Stock"}
            </div>
          )}

          {/* Description */}
          {(pr.description) && (
            <p className="text-sm leading-relaxed" style={{ color: dna.palette?.muted }}>{pr.description}</p>
          )}

          {/* Qty + Add to Cart */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: dna.palette?.border }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-3 text-lg hover:opacity-60 transition" style={{ color: dna.palette?.fg }}>−</button>
              <span className="px-4 py-3 text-sm font-bold min-w-[40px] text-center" style={{ color: dna.palette?.fg }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="px-4 py-3 text-lg hover:opacity-60 transition" style={{ color: dna.palette?.fg }}>+</button>
            </div>
            <button onClick={handleAdd} disabled={pr.inventory_count === 0}
              className="flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: dna.palette?.primary, color: dna.palette?.primary_fg, borderRadius: "var(--r)" }}>
              {added ? "✓ Added!" : pr.inventory_count === 0 ? "Out of Stock" : "Add to Cart"}
            </button>
          </div>

          {storeSlug && pr.id && (
            <a href={`/store/${storeSlug}/checkout`} onClick={() => handleAdd()}
              className="w-full py-3 text-center font-bold text-sm rounded-xl border-2 transition-all hover:opacity-80"
              style={{ borderColor: dna.palette?.primary, color: dna.palette?.primary, borderRadius: "var(--r)" }}>
              {store?.category === 'food' ? "Order Now" : "Buy Now"}
            </a>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 mt-2 pt-4 border-t" style={{ borderColor: dna.palette?.border }}>
            {[["🔒","Secure","Payment"],["↩","7 Day","Returns"],["🚚","Free","Shipping"]].map(([icon,t,s],i) => (
              <div key={i} className="text-center p-2 rounded-lg" style={{ background: dna.palette?.surface }}>
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-[10px] font-bold" style={{ color: dna.palette?.fg }}>{t}</div>
                <div className="text-[10px]" style={{ color: dna.palette?.muted }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// HERO — Shopify/WordPress-grade flexibility
// Styles: slider | fixed | half_banner | split | fullscreen_image | video |
//         magazine | editorial_serif | minimal_left | asymmetric | gradient | centered
// =============================================================================
function heightClass(h?: string) {
  switch (h) {
    case "short":  return "min-h-[40vh]";
    case "medium": return "min-h-[60vh]";
    case "tall":   return "min-h-[80vh]";
    case "full":   return "min-h-screen";
    case "auto":   return "";
    default:       return "";
  }
}

function alignClass(pos?: string) {
  // 9-point grid like "top-left", "center-center", "bottom-right"
  const [v = "center", h = "center"] = (pos ?? "center-center").split("-");
  const vMap: Record<string, string> = { top: "items-start", center: "items-center", bottom: "items-end" };
  const hMap: Record<string, string> = { left: "justify-start text-left", center: "justify-center text-center", right: "justify-end text-right" };
  return `${vMap[v] ?? "items-center"} ${hMap[h] ?? "justify-center text-center"}`;
}

function Overlay({ overlay }: { overlay?: any }) {
  if (!overlay) return <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.35)" }} />;
  const opacity = typeof overlay.opacity === "number" ? overlay.opacity : 0.45;
  const color = overlay.color || "#000000";
  const grad = overlay.gradient;
  let bg = `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
  let style: React.CSSProperties = { background: bg };
  if (grad === "bottom") style = { background: `linear-gradient(180deg, transparent 0%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 100%)` };
  else if (grad === "top") style = { background: `linear-gradient(0deg, transparent 0%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 100%)` };
  else if (grad === "radial") style = { background: `radial-gradient(ellipse at center, transparent 30%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 100%)` };
  return <div className="absolute inset-0 pointer-events-none" style={style} />;
}

function parseYouTube(url: string): string | null {
  const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function parseVimeo(url: string): string | null {
  const m = url?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function HeroVideo({ video }: { video: any }) {
  const src = video?.src || "";
  const yt = parseYouTube(src);
  const vm = parseVimeo(src);
  if (yt) {
    return (
      <iframe
        className="absolute inset-0 w-full h-full pointer-events-none"
        src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1`}
        allow="autoplay; encrypted-media; picture-in-picture"
        style={{ border: 0, transform: "scale(1.4)" }}
      />
    );
  }
  if (vm) {
    return (
      <iframe
        className="absolute inset-0 w-full h-full pointer-events-none"
        src={`https://player.vimeo.com/video/${vm}?background=1&autoplay=1&loop=1&muted=1`}
        allow="autoplay; fullscreen"
        style={{ border: 0 }}
      />
    );
  }
  if (!src) return null;
  return (
    <video
      className="absolute inset-0 w-full h-full object-cover"
      src={src}
      poster={video?.poster}
      autoPlay
      muted={video?.muted !== false}
      loop={video?.loop !== false}
      playsInline
    />
  );
}

function HeroSlider({ slides, slider, dna, shopHref, height, contentAlign, overlay, kenBurns, buttons }: any) {
  const list = (slides ?? []).filter((s: any) => s);
  const [idx, setIdx] = useState(0);
  const autoplay = slider?.autoplay !== false;
  const interval = Math.max(2000, slider?.interval ?? 5000);
  const arrows = slider?.arrows !== false;
  const dots = slider?.dots !== false;
  const transition = slider?.transition === "slide" ? "slide" : "fade";

  useEffect(() => {
    if (!autoplay || list.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), interval);
    return () => clearInterval(t);
  }, [autoplay, interval, list.length]);

  if (list.length === 0) return null;
  const headingFont = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 } as React.CSSProperties;

  return (
    <section data-hero-section="true" className={`relative overflow-hidden ${heightClass(height) || "min-h-[70vh]"}`} style={{ background: dna.palette?.surface }}>
      {list.map((s: any, i: number) => {
        const active = i === idx;
        const style: React.CSSProperties = transition === "fade"
          ? { opacity: active ? 1 : 0, transition: "opacity 700ms ease" }
          : { transform: `translateX(${(i - idx) * 100}%)`, transition: "transform 700ms ease" };
        return (
          <div key={i} className="absolute inset-0" style={style}>
            {s.image && (
              <img
                src={s.image}
                alt={s.title ?? ""}
                className={`absolute inset-0 w-full h-full object-cover ${kenBurns && active ? "animate-[ken-burns_18s_ease-out_infinite]" : ""}`}
                style={{ objectPosition: s.focal || "50% 50%" }}
              />
            )}
            <Overlay overlay={overlay} />
            <div className={`relative h-full w-full flex ${alignClass(contentAlign)} px-6`}>
              <div 
                className={s.content_bg ? "max-w-3xl p-6 md:p-10 rounded-2xl backdrop-blur-sm text-left" : "max-w-3xl"} 
                style={{ 
                  color: "#fff",
                  backgroundColor: s.content_bg || undefined,
                  boxShadow: s.content_bg ? "0 10px 30px -10px rgba(0, 0, 0, 0.15)" : undefined,
                  width: s.content_bg ? "fit-content" : undefined,
                  maxWidth: "100%"
                }}
              >
                {s.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-3 opacity-90">{s.kicker}</div>}
                {s.title && <h1 className="text-4xl md:text-6xl leading-[1.05]" style={headingFont}>{s.title}</h1>}
                {s.sub && <p className="mt-4 text-base md:text-lg opacity-90 max-w-xl">{s.sub}</p>}
                {(s.cta || s.cta_secondary) && (
                  <div className="mt-7 flex gap-3 flex-wrap" style={{ justifyContent: (s.content_bg || (contentAlign?.endsWith("-center") || !contentAlign)) ? "center" : (contentAlign?.endsWith("-right") ? "flex-end" : "flex-start") }}>
                    {s.cta && <HeroBtn kind="primary" label={s.cta} href={s.cta_href || shopHref} cfg={buttons?.primary} />}
                    {s.cta_secondary && <HeroBtn kind="secondary" label={s.cta_secondary} href={s.cta_secondary_href || shopHref} cfg={buttons?.secondary} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {arrows && list.length > 1 && (
        <>
          <button aria-label="Previous slide" onClick={() => setIdx((i) => (i - 1 + list.length) % list.length)} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">‹</button>
          <button aria-label="Next slide"     onClick={() => setIdx((i) => (i + 1) % list.length)}                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition">›</button>
        </>
      )}
      {dots && list.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 z-10 flex justify-center gap-1.5">
          {list.map((_: any, i: number) => (
            <button key={i} aria-label={`Slide ${i+1}`} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Hero button styling helpers ----------
const HBTN_SIZES: Record<string, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-7 py-3 text-sm",
  lg: "px-9 py-4 text-base",
  xl: "px-12 py-5 text-lg",
};
const HBTN_SHADOWS: Record<string, string> = {
  none: "none",
  soft: "0 4px 14px rgba(0,0,0,0.15)",
  medium: "0 10px 25px rgba(0,0,0,0.25)",
  hard: "6px 6px 0 rgba(0,0,0,0.85)",
  glow: "0 0 28px rgba(255,255,255,0.55)",
  inset: "inset 0 -3px 0 rgba(0,0,0,0.2)",
};
const HBTN_ANIMS: Record<string, string> = {
  none: "",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  shine: "hbtn-shine",
  float: "hbtn-float",
  wobble: "hbtn-wobble",
};
const HBTN_HOVERS: Record<string, string> = {
  none: "hover:opacity-90",
  lift: "hover:-translate-y-0.5 hover:shadow-2xl",
  scale: "hover:scale-105",
  glow: "hover:brightness-110 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]",
  invert: "hover:bg-white hover:text-black",
};

function HeroBtnStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes hbtn-shine-kf { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      .hbtn-shine { position: relative; overflow: hidden; }
      .hbtn-shine::after { content: ""; position: absolute; inset: 0; background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%); background-size: 200% 100%; animation: hbtn-shine-kf 2.4s linear infinite; pointer-events: none; }
      @keyframes hbtn-float-kf { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      .hbtn-float { animation: hbtn-float-kf 2.6s ease-in-out infinite; }
      @keyframes hbtn-wobble-kf { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-2deg); } 75% { transform: rotate(2deg); } }
      .hbtn-wobble { animation: hbtn-wobble-kf 1.8s ease-in-out infinite; }
    `}} />
  );
}

function HeroBtn({ kind, label, href, cfg, freePos }: { kind: "primary" | "secondary"; label: string; href: string; cfg?: any; freePos?: boolean }) {
  const b = cfg || {};
  const isPrimary = kind === "primary";
  const size = HBTN_SIZES[b.size as string] || HBTN_SIZES.md;
  const radius = b.radius != null ? `${b.radius}px` : "var(--r)";
  const shadow = HBTN_SHADOWS[b.shadow as string] ?? (isPrimary ? HBTN_SHADOWS.soft : HBTN_SHADOWS.none);
  const anim = HBTN_ANIMS[b.animation as string] || "";
  const hover = HBTN_HOVERS[b.hover as string] || "hover:opacity-90";
  const bg = b.bg || (isPrimary ? "var(--p)" : "transparent");
  const color = b.color || (isPrimary ? "var(--pf)" : "#fff");
  const borderColor = b.border_color || (isPrimary ? "transparent" : "rgba(255,255,255,0.65)");
  const borderWidth = b.border_width != null ? Number(b.border_width) : (isPrimary ? 0 : 1);
  const style: React.CSSProperties = {
    background: bg, color, borderColor, borderWidth,
    borderStyle: borderWidth ? "solid" : "none",
    borderRadius: radius, boxShadow: shadow,
    transition: "all 250ms ease",
    letterSpacing: b.tracking != null ? `${b.tracking}em` : undefined,
    textTransform: b.uppercase ? "uppercase" : undefined,
    fontWeight: b.weight || 500,
  };
  if (freePos) {
    const defX = isPrimary ? 35 : 65;
    const defY = 78;
    Object.assign(style, {
      position: "absolute",
      left: `${b.x ?? defX}%`,
      top: `${b.y ?? defY}%`,
      transform: "translate(-50%, -50%)",
      zIndex: 5,
      pointerEvents: "auto",
    } as React.CSSProperties);
  }
  return (
    <a href={href} className={`${size} inline-block ${hover} ${anim} ${isPrimary ? "s-cta" : "s-cta_secondary"}`} style={style}>{label}</a>
  );
}

function HeroFood({ p, dna, storeSlug }: any) {
  const shopHref = storeSlug ? `/store/${storeSlug}/shop` : "#products";
  const title = p.title || "Craving Naija Flavors?";
  const sub = p.sub || "Get It Hot, Fast, and Fresh!";
  const desc = p.description || p.sub || "Order authentic Nigerian dishes like vegetable soup, jollof rice, and pepper soup, delivered hot and fresh to your doorstep in minutes.";
  const image = p.image || "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80";

  const renderFormattedTitle = (text: string) => {
    if (!text) return null;
    const parts = text.split(" ");
    if (parts.length > 1) {
      const lastWord = parts.pop();
      return (
        <>
          {parts.join(" ")} <span style={{ color: '#8c2d19' }}>{lastWord}</span>
        </>
      );
    }
    return text;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-subtle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(4deg); }
        }
        @keyframes float-leaf {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(-8px) rotate(24deg); }
        }
        .float-chili {
          animation: float-subtle 4s ease-in-out infinite;
        }
        .float-leaf-1 {
          animation: float-leaf 5s ease-in-out infinite;
        }
        .float-leaf-2 {
          animation: float-subtle 6s ease-in-out infinite;
        }
      `}} />
      <section data-hero-section="true" className="relative py-10 sm:py-20 md:py-28 overflow-hidden" style={{ background: '#faf6f0' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="text-left flex flex-col items-start z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 sm:mb-6 text-[10px] sm:text-xs font-semibold" style={{ background: 'rgba(140, 45, 25, 0.06)', color: '#8c2d19' }}>
              <div className="flex -space-x-1.5">
                <img className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60" />
                <img className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60" />
                <img className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=60" />
              </div>
              <span>Rated 4.9/5 by food lovers nationwide.</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-stone-900 mb-2" style={{ fontFamily: "var(--hf)" }}>
              {renderFormattedTitle(title)}
            </h1>

            <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-stone-800 mb-4 sm:mb-5 leading-snug">
              {sub}
            </div>

            <p className="text-xs sm:text-sm md:text-base text-stone-600 mb-6 sm:mb-8 max-w-xl leading-relaxed">
              {desc}
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-4 items-center w-full sm:w-auto">
              <a 
                href={p.cta_href || shopHref} 
                className="px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-bold text-white bg-[#8c2d19] hover:bg-[#722314] transition-all flex items-center justify-center gap-2 hover:scale-[1.03] text-sm flex-1 sm:flex-initial"
              >
                <span>Order Now</span>
                <ShoppingBag className="w-4 h-4" />
              </a>
              <a 
                href={p.cta_secondary_href || shopHref} 
                className="px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-bold bg-transparent border-2 border-stone-300 hover:border-stone-400 text-stone-800 transition-all hover:scale-[1.03] text-sm flex-1 sm:flex-initial text-center"
              >
                <span>View Menu &gt;</span>
              </a>
            </div>
          </div>

          <div className="relative w-full aspect-square sm:aspect-[4/3] max-w-[280px] sm:max-w-md md:max-w-lg mx-auto flex items-center justify-center mt-8 md:mt-0">
            <div className="absolute inset-0 rounded-[24px] sm:rounded-[32px] overflow-hidden flex shadow-lg">
              <div className="w-1/2 h-full bg-[#fde9cd]" />
              <div className="w-1/2 h-full bg-[#8c2d19]" />
            </div>

            <img 
              src={image} 
              alt={title} 
              className="absolute w-3/4 aspect-square object-cover rounded-[24px] sm:rounded-[32px] shadow-[0_15px_40px_rgba(0,0,0,0.3)] border-[4px] sm:border-[6px] border-white z-10 hover:scale-105 transition-transform duration-700" 
            />

            <span className="float-chili absolute -left-4 top-1/4 text-3xl sm:text-5xl z-20 pointer-events-none select-none">🌶️</span>
            <span className="float-leaf-1 absolute -right-4 bottom-1/4 text-2xl sm:text-3xl z-20 pointer-events-none select-none">🍃</span>
            <span className="float-leaf-2 absolute left-1/4 bottom-[-10px] text-xl sm:text-2xl z-20 pointer-events-none select-none">🌿</span>
          </div>
        </div>
      </section>
    </>
  );
}

function Hero({ p, dna, storeSlug, storeCategory }: any) {
  const v = p.style ?? "centered";
  if (storeCategory === "food") {
    return <HeroFood p={p} dna={dna} storeSlug={storeSlug} />;
  }
  // ── 3D theme styles ───────────────────────────────────────────────────────
  if (v === "holographic_3d") return <HeroHolographic3D p={p} dna={dna} storeSlug={storeSlug} />;
  if (v === "liquid_metal")   return <HeroLiquidMetal   p={p} dna={dna} storeSlug={storeSlug} />;
  if (v === "neon_botanical") return <HeroNeonBotanical p={p} dna={dna} storeSlug={storeSlug} />;
  const headingFont = { fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 } as React.CSSProperties;
  const shopHref = storeSlug ? `/store/${storeSlug}/shop` : "#products";
  const overlay = p.overlay;
  const effects = p.effects || {};
  const height = p.height;
  const contentAlign = p.content_align;
  const parallax = effects.parallax;
  const kenBurns = effects.ken_burns;
  const buttons = p.buttons || {};

  // --- HORIZONTAL SCROLL / SWIPE --------------------------------------------
  if (p.scroll_horizontal) {
    const slides = (p.slides && p.slides.length > 0)
      ? p.slides
      : [{ image: p.image, title: p.title, sub: p.sub, kicker: p.kicker, cta: p.cta, cta_href: p.cta_href, cta_secondary: p.cta_secondary, cta_secondary_href: p.cta_secondary_href }];
    return (
      <>
        <HeroBtnStyles />
        <section data-hero-section="true" className="relative w-full overflow-hidden" style={{ background: dna.palette?.surface }}>
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none px-6 py-4">
            {slides.map((s: any, i: number) => (
              <div 
                key={i} 
                className={`relative shrink-0 snap-center min-w-[85%] md:min-w-[70%] rounded-2xl overflow-hidden ${heightClass(height) || "min-h-[50vh] h-[350px] md:h-[450px]"}`}
                style={{ background: dna.palette?.bg }}
              >
                {s.image && (
                  <img
                    src={s.image}
                    alt={s.title ?? ""}
                    className={`absolute inset-0 w-full h-full object-cover ${kenBurns ? "animate-[ken-burns_18s_ease-out_infinite]" : ""}`}
                    style={{ objectPosition: s.focal || "50% 50%" }}
                  />
                )}
                <Overlay overlay={overlay} />
                <div className={`relative h-full w-full flex ${alignClass(contentAlign)} p-6 md:p-10 text-white z-10`}>
                  <div 
                    className={s.content_bg ? "max-w-xl p-5 md:p-8 rounded-xl backdrop-blur-sm text-left" : "max-w-xl"} 
                    style={{ 
                      color: "#fff",
                      backgroundColor: s.content_bg || undefined,
                      boxShadow: s.content_bg ? "0 10px 30px -10px rgba(0, 0, 0, 0.15)" : undefined,
                    }}
                  >
                    {s.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-2 opacity-90">{s.kicker}</div>}
                    {s.title && <h2 className="text-2xl md:text-4xl leading-tight font-bold" style={headingFont}>{s.title}</h2>}
                    {s.sub && <p className="mt-2 text-sm opacity-90">{s.sub}</p>}
                    {(s.cta || s.cta_secondary) && (
                      <div className="mt-4 flex gap-2 flex-wrap" style={{ justifyContent: (s.content_bg || (contentAlign?.endsWith("-center") || !contentAlign)) ? "center" : (contentAlign?.endsWith("-right") ? "flex-end" : "flex-start") }}>
                        {s.cta && <HeroBtn kind="primary" label={s.cta} href={s.cta_href || shopHref} cfg={buttons?.primary} />}
                        {s.cta_secondary && <HeroBtn kind="secondary" label={s.cta_secondary} href={s.cta_secondary_href || shopHref} cfg={buttons?.secondary} />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }
  const contentBgStyle = p.content_bg ? {
    backgroundColor: p.content_bg,
    padding: "2rem",
    borderRadius: "16px",
    backdropFilter: "blur(8px)",
    boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.15)",
    width: "fit-content",
    maxWidth: "100%",
    textAlign: "left",
  } as React.CSSProperties : {};

  const freePos = !!buttons.free_position && v !== "slider";

  const Btns = freePos ? (
    <div className="mt-8 flex gap-3 flex-wrap opacity-0 pointer-events-none select-none">
      {p.cta && <HeroBtn kind="primary" label={p.cta} href="#" cfg={buttons.primary} />}
      {p.cta_secondary && <HeroBtn kind="secondary" label={p.cta_secondary} href="#" cfg={buttons.secondary} />}
    </div>
  ) : (
    <div className="mt-8 flex gap-3 flex-wrap">
      {p.cta && <HeroBtn kind="primary" label={p.cta} href={p.cta_href || shopHref} cfg={buttons.primary} />}
      {p.cta_secondary && <HeroBtn kind="secondary" label={p.cta_secondary} href={p.cta_secondary_href || shopHref} cfg={buttons.secondary} />}
    </div>
  );

  const FreeLayer = freePos ? (
    <div className="absolute inset-0 pointer-events-none z-20">
      {p.cta && <HeroBtn kind="primary" label={p.cta} href={p.cta_href || shopHref} cfg={buttons.primary} freePos />}
      {p.cta_secondary && <HeroBtn kind="secondary" label={p.cta_secondary} href={p.cta_secondary_href || shopHref} cfg={buttons.secondary} freePos />}
    </div>
  ) : null;

  const wrap = (node: JSX.Element) => {
    if (freePos) {
      const children = [
        ...(React.Children.toArray(node.props.children)),
        FreeLayer
      ];
      return (
        <>
          <HeroBtnStyles />
          {React.cloneElement(node, {}, ...children)}
        </>
      );
    }
    return (
      <>
        <HeroBtnStyles />
        {node}
      </>
    );
  };

  // --- SLIDER ---------------------------------------------------------------
  if (v === "slider") {
    const slides = (p.slides && p.slides.length > 0)
      ? p.slides
      : [{ image: p.image, title: p.title, sub: p.sub, kicker: p.kicker, cta: p.cta, cta_href: p.cta_href, cta_secondary: p.cta_secondary, cta_secondary_href: p.cta_secondary_href }];
    return (<><HeroBtnStyles /><HeroSlider slides={slides} slider={p.slider} dna={dna} shopHref={shopHref} height={height} contentAlign={contentAlign} overlay={overlay} kenBurns={kenBurns} buttons={buttons} /></>);
  }

  // --- VIDEO BACKGROUND -----------------------------------------------------
  if (v === "video") {
    return wrap(
      <section data-hero-section="true" className={`relative overflow-hidden ${heightClass(height) || "min-h-[80vh]"}`} style={{ background: "#000" }}>
        <HeroVideo video={p.video} />
        <Overlay overlay={overlay} />
        <div className={`relative h-full w-full flex ${alignClass(contentAlign)} px-6 py-24`} style={{ color: "#fff" }}>
          <div className="max-w-3xl" style={contentBgStyle}>
            {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-3 opacity-90">{p.kicker}</div>}
            {p.title && <h1 className="text-5xl md:text-7xl leading-[1.05]" style={headingFont}>{p.title}</h1>}
            {p.sub && <p className="mt-5 text-lg opacity-90 max-w-xl">{p.sub}</p>}
            {Btns}
          </div>
        </div>
      </section>
    );
  }

  // --- HALF BANNER ----------------------------------------------------------
  if (v === "half_banner") {
    return wrap(
      <section data-hero-section="true" className="grid md:grid-cols-2 relative" style={{ background: dna.palette?.surface, minHeight: "40vh" }}>
        <div className="px-6 md:px-12 py-12 md:py-16 flex flex-col justify-center">
          <div style={contentBgStyle}>
            {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
            <h1 className="text-3xl md:text-5xl leading-tight" style={headingFont}>{p.title}</h1>
            {p.sub && <p className="mt-3 text-base" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
            {Btns}
          </div>
        </div>
        <div className="min-h-[260px]">{p.image && <img src={p.image} className="w-full h-full object-cover" style={{ objectPosition: p.focal || "50% 50%" }} />}</div>
      </section>
    );
  }

  // --- GRADIENT (no image) --------------------------------------------------
  if (v === "gradient") {
    return wrap(
      <section data-hero-section="true" className={`relative overflow-hidden ${heightClass(height) || "min-h-[60vh]"}`} style={{ background: `linear-gradient(135deg, ${dna.palette?.primary} 0%, ${dna.palette?.accent} 100%)`, color: dna.palette?.primary_fg || "#fff" }}>
        <div className={`relative h-full w-full flex ${alignClass(contentAlign)} px-6 py-24`}>
          <div className="max-w-3xl" style={contentBgStyle}>
            {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-3 opacity-90">{p.kicker}</div>}
            {p.title && <h1 className="text-5xl md:text-7xl leading-[1.05]" style={headingFont}>{p.title}</h1>}
            {p.sub && <p className="mt-5 text-lg opacity-90 max-w-xl">{p.sub}</p>}
            {Btns}
          </div>
        </div>
      </section>
    );
  }

  if (v === "split") {
    return wrap(
      <section data-hero-section="true" className="grid md:grid-cols-2 relative" style={{ background: dna.palette?.surface }}>
        <div className="px-6 md:px-12 py-20 md:py-32 flex flex-col justify-center">
          <div style={contentBgStyle}>
            {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
            <h1 className="text-5xl md:text-6xl leading-tight" style={headingFont}>{p.title}</h1>
            {p.sub && <p className="mt-5 text-lg" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
            {Btns}
          </div>
        </div>
        <div className="min-h-[400px]">{p.image && <img src={p.image} className="w-full h-full object-cover" style={{ objectPosition: p.focal || "50% 50%" }} />}</div>
      </section>
    );
  }
  if (v === "magazine" || v === "editorial_serif") {
    return wrap(
      <section data-hero-section="true" className="max-w-6xl mx-auto px-6 py-24 relative">
        <div className="grid md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-7">
            {p.kicker && <div className="text-xs uppercase tracking-[0.4em] mb-6 border-b pb-2 inline-block" style={{ color: dna.palette?.accent, borderColor: dna.palette?.border }}>{p.kicker}</div>}
            <h1 className="text-6xl md:text-8xl leading-[0.95] italic" style={{ ...headingFont, fontStyle: v === "editorial_serif" ? "italic" : "normal" }}>{p.title}</h1>
          </div>
          <div className="md:col-span-5 md:pl-8 md:border-l" style={{ borderColor: dna.palette?.border }}>
            {p.sub && <p className="text-base leading-relaxed" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
            {Btns}
          </div>
        </div>
        {p.image && <img src={p.image} className="mt-12 w-full aspect-[21/9] object-cover" style={{ borderRadius: "var(--r)", objectPosition: p.focal || "50% 50%" }} />}
      </section>
    );
  }
  if (v === "fullscreen_image" || v === "fixed") {
    const h = heightClass(height) || (v === "fixed" ? "min-h-[60vh]" : "min-h-[80vh]");
    return wrap(
      <section data-hero-section="true" className={`relative overflow-hidden ${h}`}>
        {p.image && (
          <div className={`absolute inset-0 ${parallax ? "bg-fixed" : ""}`}>
            <img
              src={p.image}
              className={`absolute inset-0 w-full h-full object-cover ${kenBurns ? "animate-[ken-burns_18s_ease-out_infinite]" : ""}`}
              style={{ objectPosition: p.focal || "50% 50%" }}
            />
          </div>
        )}
        <Overlay overlay={overlay} />
        <div className={`relative h-full w-full flex ${alignClass(contentAlign || "center-center")} px-6 py-24`} style={{ color: "#fff" }}>
          <div className="max-w-3xl" style={contentBgStyle}>
            {p.kicker && <div className="text-xs uppercase tracking-[0.4em] mb-4 opacity-80">{p.kicker}</div>}
            <h1 className="text-5xl md:text-7xl" style={headingFont}>{p.title}</h1>
            {p.sub && <p className="mt-5 opacity-90 max-w-xl">{p.sub}</p>}
            {Btns}
          </div>
        </div>
      </section>
    );
  }
  if (v === "minimal_left") {
    return wrap(
      <section data-hero-section="true" className="max-w-6xl mx-auto px-6 py-32 relative">
        <div style={contentBgStyle}>
          {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
          <h1 className="text-5xl md:text-7xl max-w-2xl" style={headingFont}>{p.title}</h1>
          {p.sub && <p className="mt-6 text-lg max-w-md" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
          {Btns}
        </div>
      </section>
    );
  }
  if (v === "asymmetric") {
    return wrap(
      <section data-hero-section="true" className="relative overflow-hidden" style={{ background: dna.palette?.surface }}>
        <div className="absolute -right-20 -top-10 w-2/3 h-full">{p.image && <img src={p.image} className="w-full h-full object-cover" style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0% 100%)", objectPosition: p.focal || "50% 50%" }} />}</div>
        <div className="relative max-w-6xl mx-auto px-6 py-32 md:py-40">
          <div style={contentBgStyle}>
            {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
            <h1 className="text-5xl md:text-7xl max-w-xl" style={headingFont}>{p.title}</h1>
            {p.sub && <p className="mt-5 max-w-sm" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
            {Btns}
          </div>
        </div>
      </section>
    );
  }
  // centered (default)
  return wrap(
    <section data-hero-section="true" className={`relative overflow-hidden ${heightClass(height)}`} style={{ background: dna.palette?.surface }}>
      {p.image && <img src={p.image} alt="" className={`absolute inset-0 w-full h-full object-cover opacity-60 ${kenBurns ? "animate-[ken-burns_18s_ease-out_infinite]" : ""}`} style={{ objectPosition: p.focal || "50% 50%" }} />}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${dna.palette?.bg}00, ${dna.palette?.bg}cc)` }} />
      <div className="relative max-w-6xl mx-auto px-6 py-32 md:py-40">
        <div style={contentBgStyle}>
          {p.kicker && <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: dna.palette?.accent }}>{p.kicker}</div>}
          <h1 className="text-5xl md:text-7xl leading-[1.05] max-w-3xl" style={headingFont}>{p.title}</h1>
          {p.sub && <p className="mt-6 text-lg max-w-xl" style={{ color: dna.palette?.muted }}>{p.sub}</p>}
          {Btns}
        </div>
      </div>
    </section>
  );
}

function CategoryBlock({ p, dna, storeSlug }: any) {
  const v = p.style ?? "grid_4";
  const items = p.items ?? [];
  // Each tile links to the shop page filtered by that category name. Falls back to #products
  // when there is no slug (admin theme preview).
  const hrefFor = (name: string) =>
    storeSlug ? `/store/${storeSlug}/shop?category=${encodeURIComponent(name || "")}` : "#products";
  const Title = <h2 className="text-3xl mb-10 s-title" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>;

  if (p.scroll_horizontal) {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20">
        {Title}
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x scroll-smooth scrollbar-thin">
          {items.map((c: any, i: number) => (
            <Link 
              to={hrefFor(c.name)} 
              key={i} 
              className="group block aspect-[3/4] relative overflow-hidden shrink-0 snap-start" 
              style={{ borderRadius: "var(--r)", width: p.product_card_width ? `${p.product_card_width}px` : "220px" }}
            >
              {c.image ? <img src={c.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <div className="w-full h-full" style={{ background: dna.palette?.surface }} />}
              <div className="absolute inset-0 flex items-end p-4" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.7))" }}>
                <span className="text-white font-medium" style={{ fontFamily: "var(--hf)" }}>{c.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  if (v === "carousel_strip") {
    return (
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">{Title}</div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 snap-x">
          {items.map((c: any, i: number) => (
            <Link to={hrefFor(c.name)} key={i} className="snap-start shrink-0 w-72 aspect-[4/5] relative overflow-hidden hover:opacity-90 transition" style={{ borderRadius: "var(--r)" }}>
              {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              <div className="absolute bottom-0 inset-x-0 p-4 text-white" style={{ background: "linear-gradient(180deg,transparent,rgba(0,0,0,0.7))" }}>{c.name}</div>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  if (v === "circles") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        {Title}
        <div className="flex flex-wrap justify-center gap-10">
          {items.map((c: any, i: number) => (
            <Link to={hrefFor(c.name)} key={i} className="flex flex-col items-center gap-3 hover:opacity-80 transition">
              <div className="w-32 h-32 rounded-full overflow-hidden border" style={{ borderColor: dna.palette?.border }}>
                {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              </div>
              <span className="text-sm">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  if (v === "big_feature") {
    const [first, ...rest] = items;
    return (
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-4">
        {first && (
          <Link to={hrefFor(first.name)} className="relative aspect-[4/5] md:aspect-auto overflow-hidden hover:opacity-95 transition" style={{ borderRadius: "var(--r)" }}>
            {first.image && <img src={first.image} className="w-full h-full object-cover" />}
            <div className="absolute bottom-6 left-6 right-6 text-white"><div className="text-2xl" style={{ fontFamily: "var(--hf)" }}>{first.name}</div></div>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-4">
          {rest.slice(0, 3).map((c: any, i: number) => (
            <Link to={hrefFor(c.name)} key={i} className="relative aspect-square overflow-hidden hover:opacity-95 transition" style={{ borderRadius: "var(--r)" }}>
              {c.image && <img src={c.image} className="w-full h-full object-cover" />}
              <div className="absolute bottom-3 left-3 text-white text-sm">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  if (v === "masonry" || v === "mosaic_2x2") {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16">
        {Title}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((c: any, i: number) => {
            const tall = v === "masonry" && i % 3 === 0;
            return (
              <Link to={hrefFor(c.name)} key={i} className="relative overflow-hidden hover:opacity-95 transition" style={{ borderRadius: "var(--r)", gridRow: tall ? "span 2" : undefined, aspectRatio: tall ? "3/5" : "1/1" }}>
                {c.image && <img src={c.image} className="w-full h-full object-cover" />}
                <div className="absolute bottom-3 left-3 text-white text-sm">{c.name}</div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }
  const cols = p.product_cols ?? p.category_cols ?? 4;
  const colsMap: Record<number, string> = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
  };
  const gridColsClass = colsMap[cols] || "md:grid-cols-4";

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      {Title}
      <div className={`grid grid-cols-2 ${gridColsClass} gap-4`}>
        {items.map((c: any, i: number) => (
          <Link to={hrefFor(c.name)} key={i} className="group block aspect-[3/4] relative overflow-hidden" style={{ borderRadius: "var(--r)" }}>
            {c.image ? <img src={c.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <div className="w-full h-full" style={{ background: dna.palette?.surface }} />}
            <div className="absolute inset-0 flex items-end p-4" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.7))" }}>
              <span className="text-white font-medium" style={{ fontFamily: "var(--hf)" }}>{c.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Industry-standard collections page: list every parent category with its image,
// description, and a chip-row of its subcategories (drilling into the shop with that filter).
function CollectionsBlock({ p, dna, storeSlug }: any) {
  const items: any[] = p.items ?? [];
  const collHref = (c: any) => storeSlug
    ? (c.id ? `/store/${storeSlug}/collections/${c.id}` : `/store/${storeSlug}/shop?category=${encodeURIComponent(c.name || "")}`)
    : "#";
  const shopHref = (catName: string) => storeSlug ? `/store/${storeSlug}/shop?category=${encodeURIComponent(catName || "")}` : "#";
  if (!items.length) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p style={{ color: dna.palette?.muted }}>No collections yet. Add categories from your dashboard to populate this page.</p>
      </section>
    );
  }
  return (
    <section className="max-w-6xl mx-auto px-6 pb-20">
      <div className="grid md:grid-cols-2 gap-8">
        {items.map((c: any, i: number) => (
          <article key={i} className="group flex flex-col" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", overflow: "hidden", border: `1px solid ${dna.palette?.border}` }}>
            <Link to={collHref(c)} className="relative block aspect-[16/10] overflow-hidden bg-muted/10" style={{ background: dna.palette?.bg }}>
              {c.image
                ? <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-[1.03]" />
                : <div className="w-full h-full" />}
            </Link>
            <div className="p-5 flex-1 flex flex-col">
              <Link to={collHref(c)}>
                <h3 className="text-2xl mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{c.name}</h3>
              </Link>
              {c.description && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: dna.palette?.muted }}>{c.description}</p>
              )}
              {Array.isArray(c.subs) && c.subs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {c.subs.map((s: any, si: number) => (
                    <Link
                      key={si}
                      to={shopHref(s.name)}
                      className="text-xs px-3 py-1.5 border transition hover:opacity-80"
                      style={{ borderColor: dna.palette?.border, borderRadius: "999px", color: dna.palette?.fg }}
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              )}
              <Link
                to={collHref(c)}
                className="mt-4 inline-flex items-center text-sm self-start"
                style={{ color: dna.palette?.accent }}
              >
                Shop {c.name} →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// Single-collection page: header (image+description) then subcategory tiles, or
// fall back to product list filtered by category if no subs.
function CollectionDetailBlock({ p, dna, storeSlug }: any) {
  const items: any[] = p.items ?? [];
  // Path is /collections/:categoryId — pull from window since useParams is hard to reach here.
  const segments = typeof window !== "undefined" ? window.location.pathname.split("/") : [];
  const categoryId = segments[segments.indexOf("collections") + 1] || "";
  const cat = items.find((c: any) => c.id === categoryId) || null;
  if (!cat) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl mb-3" style={{ fontFamily: "var(--hf)" }}>Collection not found</h1>
        {storeSlug && <Link to={`/store/${storeSlug}/collections`} className="text-sm" style={{ color: dna.palette?.accent }}>← Back to all collections</Link>}
      </section>
    );
  }
  const shopHref = (name: string) => storeSlug ? `/store/${storeSlug}/shop?category=${encodeURIComponent(name)}` : "#";
  return (
    <>
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-6">
        {storeSlug && <Link to={`/store/${storeSlug}/collections`} className="text-xs uppercase tracking-widest" style={{ color: dna.palette?.muted }}>← All collections</Link>}
        <div className="mt-4 grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div>
            <h1 className="text-5xl mb-4" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{cat.name}</h1>
            {cat.description && <p className="text-base leading-relaxed" style={{ color: dna.palette?.muted }}>{cat.description}</p>}
            <Link to={shopHref(cat.name)} className="inline-block mt-6 px-5 py-2.5 text-sm" style={{ background: "var(--p)", color: "var(--pf)", borderRadius: "var(--r)" }}>
              Shop all {cat.name.toLowerCase()}
            </Link>
          </div>
          {cat.image && (
            <img src={cat.image} alt={cat.name} className="w-full aspect-[4/3] object-cover" style={{ borderRadius: "var(--r)" }} />
          )}
        </div>
      </section>
      {Array.isArray(cat.subs) && cat.subs.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <h2 className="text-xl mb-5" style={{ fontFamily: "var(--hf)" }}>Browse by type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cat.subs.map((s: any, i: number) => (
              <Link
                key={i}
                to={shopHref(s.name)}
                className="group relative aspect-square overflow-hidden border"
                style={{ borderRadius: "var(--r)", borderColor: dna.palette?.border, background: dna.palette?.surface }}
              >
                {s.image_url && <img src={s.image_url} alt={s.name} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />}
                <div className="absolute inset-0 flex items-end p-3" style={{ background: s.image_url ? "linear-gradient(180deg,transparent,rgba(0,0,0,0.65))" : "transparent" }}>
                  <span className="text-sm font-medium" style={{ color: s.image_url ? "#fff" : dna.palette?.fg }}>{s.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}





function ProductsFoodTheme({ p, dna, storeSlug, page }: any) {
  const { themeId } = useParams<{ themeId: string }>();
  const allItems: any[] = p.items ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = page === "shop" ? (searchParams.get("category") || "") : "";
  const { addItem } = useCart(storeSlug || "");
  const navigate = useNavigate();

  const items = selectedCategory
    ? allItems.filter((it) => (it.category || "").toLowerCase() === selectedCategory.toLowerCase())
    : allItems;

  const setCategory = (next: string) => {
    const sp = new URLSearchParams(searchParams);
    if (next) sp.set("category", next); else sp.delete("category");
    setSearchParams(sp, { replace: true });
  };

  const linkFor = (pr: any) => storeSlug && pr.id 
    ? `/store/${storeSlug}/product/${pr.id}${themeId ? `/${themeId}` : ""}` 
    : "#";

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    (p.sellerCategories ?? []).forEach((c: any) => {
      const name = (c?.name || "").trim();
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    });
    allItems.forEach((it) => {
      const c = (it.category || "").trim();
      if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
    });
    return Array.from(seen.values());
  }, [allItems, p.sellerCategories]);

  const titleText = p.title || "Our Signature Dishes";
  const subText = p.subtitle || "From classic favorites to modern culinary creations, our menu is designed to tantalize your taste buds. Every dish is made with the freshest ingredients and an extra dash of love.";

  const cardStyles = [
    {
      bg: '#fff7ed', // orange tint
      border: 'rgba(249, 115, 22, 0.15)',
      accent: '#f97316',
      shadow: '#c2410c',
      btnText: '#ffffff'
    },
    {
      bg: '#faf5ff', // purple tint
      border: 'rgba(168, 85, 247, 0.15)',
      accent: '#7c3aed',
      shadow: '#5b21b6',
      btnText: '#ffffff'
    },
    {
      bg: '#f0fdfa', // teal/mint tint
      border: 'rgba(20, 184, 166, 0.15)',
      accent: '#0d9488',
      shadow: '#115e59',
      btnText: '#ffffff'
    }
  ];

  const triggerConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#FFC107', '#8BC34A', '#FFFFFF', '#FF5722']
    });
  };

  const Chips = page === "shop" && categories.length > 0 ? (
    <div className="flex flex-wrap gap-2 justify-center mb-8">
      <button
        type="button"
        onClick={() => setCategory("")}
        className="text-xs px-4 py-2 border transition duration-300 font-semibold"
        style={{
          borderColor: dna.palette?.border || '#e5e7eb',
          borderRadius: "9999px",
          background: !selectedCategory ? 'var(--p)' : "transparent",
          color: !selectedCategory ? 'var(--pf)' : dna.palette?.fg,
        }}
      >
        All ({allItems.length})
      </button>
      {categories.map((cat) => {
        const active = selectedCategory.toLowerCase() === cat.toLowerCase();
        const count = allItems.filter((it) => (it.category || "").toLowerCase() === cat.toLowerCase()).length;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="text-xs px-4 py-2 border transition duration-300 font-semibold"
            style={{
              borderColor: dna.palette?.border || '#e5e7eb',
              borderRadius: "9999px",
              background: active ? 'var(--p)' : "transparent",
              color: active ? 'var(--pf)' : dna.palette?.fg,
            }}
          >
            {cat} ({count})
          </button>
        );
      })}
    </div>
  ) : null;

  const productCols = p.product_cols ?? 3;
  const cardWidth = p.product_card_width;
  const sectionId = p.id || "sec-prod-food";

  return (
    <section id="products" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-20 text-center">
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .dynamic-grid-${sectionId} {
            grid-template-columns: repeat(${productCols}, minmax(0, 1fr)) !important;
            display: grid !important;
          }
        }
      `}} />

      {/* Cartoonish Sticker Badge */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-5 relative flex items-center justify-center rounded-full bg-amber-400 border-4 border-white shadow-md transform rotate-3 hover:rotate-6 transition-transform">
        <div className="absolute inset-0.5 rounded-full border-2 border-white/40 border-dashed animate-spin-slow" />
        <span className="text-xl sm:text-2xl filter drop-shadow">👌</span>
        <span className="absolute -top-2.5 -right-2.5 text-xs sm:text-sm">✨</span>
        <span className="absolute -bottom-1.5 -left-1.5 text-xs sm:text-sm">✨</span>
      </div>

      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 text-stone-900" style={{ fontFamily: "var(--hf)", fontWeight: 800 }}>
        {titleText}
      </h2>
      <p className="text-xs sm:text-sm text-stone-500 max-w-2xl mx-auto mb-6 sm:mb-12 leading-relaxed">
        {subText}
      </p>

      {Chips}

      <div 
        className={p.scroll_horizontal
          ? "flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x scroll-smooth scrollbar-thin"
          : cardWidth 
            ? "flex flex-wrap gap-4 sm:gap-6 justify-center" 
            : `grid grid-cols-2 dynamic-grid-${sectionId} gap-3 sm:gap-8`
        }
      >
        {items.map((pr: any, i: number) => {
          const style = cardStyles[i % cardStyles.length];
          const isOutOfStock = pr.inventory_count === 0;
          const fallbackDesc = "Freshly prepared with handpicked ingredients and love.";
          const desc = pr.short_description || pr.description || fallbackDesc;

          const handleAddToCart = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (isOutOfStock) { toast.error('This item is out of stock'); return; }
            
            if (typeof (window as any).triggerParabolicFly === 'function') {
              (window as any).triggerParabolicFly(e, 1);
            }
            
            addItem({ productId: pr.id, title: pr.name, price: Number(pr.price), image: pr.image }, 1);
            triggerConfetti();
            toast.success(`${pr.name} added to cart!`);
          };

          const handleBuyNow = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (isOutOfStock) { toast.error('This item is out of stock'); return; }
            
            const basePath = storeSlug ? `/store/${storeSlug}` : "";
            navigate(`${basePath}/checkout?buyNowProductId=${pr.id}&buyNowQty=1`);
          };

          return (
            <div 
              key={i} 
              className={`group flex flex-col rounded-[16px] sm:rounded-[24px] overflow-hidden border p-2.5 sm:p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 animate-reveal ${p.scroll_horizontal ? "snap-start shrink-0 w-[165px] sm:w-[280px]" : ""}`}
              style={{ 
                backgroundColor: style.bg, 
                borderColor: style.border,
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                ...(!p.scroll_horizontal && cardWidth 
                  ? { width: `${cardWidth}px`, minWidth: `${cardWidth}px` } 
                  : {}
                )
              }}
            >
              {/* Image Container */}
              <Link to={linkFor(pr)} className="block relative aspect-square sm:aspect-[4/3] rounded-[12px] sm:rounded-[18px] overflow-hidden mb-3 sm:mb-4 bg-stone-100 shrink-0">
                {pr.image ? (
                  <img 
                    src={pr.image} 
                    alt={pr.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No Image</div>
                )}
                
                {/* Floating circular basket badge */}
                <button 
                  onClick={handleAddToCart}
                  className="absolute top-2 right-2 w-7.5 h-7.5 sm:w-9 sm:h-9 bg-white rounded-full flex items-center justify-center shadow-md border border-stone-100 transition-transform active:scale-90 hover:scale-105"
                >
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-800" />
                </button>

                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <span className="bg-stone-800 text-white font-bold text-[9px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider">
                      Out of Stock
                    </span>
                  </div>
                )}
              </Link>

              {/* Details Container */}
              <div className="flex-1 flex flex-col text-left px-0.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-0.5 sm:gap-2 mb-2">
                  <Link to={linkFor(pr)} className="font-bold text-xs sm:text-base md:text-lg text-stone-900 hover:underline truncate w-full sm:flex-1">{pr.name}</Link>
                  <span className="font-bold text-xs sm:text-base md:text-lg text-stone-900 shrink-0">₹{pr.price}</span>
                </div>
                
                <p className="hidden sm:block text-xs text-stone-500 leading-relaxed mb-5 line-clamp-2 h-8">
                  {desc}
                </p>

                {/* 3D Order Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="w-full py-2 sm:py-3 text-[10px] sm:text-sm font-bold text-white flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:translate-y-[2px]"
                  style={{
                    backgroundColor: style.accent,
                    borderRadius: '9999px',
                    boxShadow: `0 3px 0 ${style.shadow}`,
                    borderBottom: `2px solid rgba(0,0,0,0.1)`
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.boxShadow = `0 1px 0 ${style.shadow}`;
                    e.currentTarget.style.transform = 'translateY(2px)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.boxShadow = `0 3px 0 ${style.shadow}`;
                    e.currentTarget.style.transform = 'none';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 3px 0 ${style.shadow}`;
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span>Order Now</span>
                  <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProductBlock({ p, dna, storeSlug, page, storeCategory }: any) {
  const v = p.style ?? "grid_clean";
  if (storeCategory === "food") {
    return <ProductsFoodTheme p={p} dna={dna} storeSlug={storeSlug} page={page} />;
  }
  // ── 3D theme product styles ───────────────────────────────────────────────
  if (v === "glass_3d")        return <ProductsGlass3D    p={p} dna={dna} storeSlug={storeSlug} storeCategory={storeCategory} />;
  if (v === "chrome_3d")       return <ProductsChrome     p={p} dna={dna} storeSlug={storeSlug} storeCategory={storeCategory} />;
  if (v === "botanical_cards") return <ProductsBotanical  p={p} dna={dna} storeSlug={storeSlug} storeCategory={storeCategory} />;
  const allItems: any[] = p.items ?? [];
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = page === "shop" ? (searchParams.get("category") || "") : "";

  // Categories shown as chips = union of seller's catalog categories + any
  // category strings actually present on products (so legacy/free-text product
  // categories still appear even if the seller hasn't added them to the catalog).
  const categories = useMemo(() => {
    const seen = new Map<string, string>(); // lower -> display
    (p.sellerCategories ?? []).forEach((c: any) => {
      const name = (c?.name || "").trim();
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    });
    allItems.forEach((it) => {
      const c = (it.category || "").trim();
      if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
    });
    return Array.from(seen.values());
  }, [allItems, p.sellerCategories]);

  const items = selectedCategory
    ? allItems.filter((it) => (it.category || "").toLowerCase() === selectedCategory.toLowerCase())
    : allItems;

  const setCategory = (next: string) => {
    const sp = new URLSearchParams(searchParams);
    if (next) sp.set("category", next); else sp.delete("category");
    setSearchParams(sp, { replace: true });
  };

  const linkFor = (pr: any) => (storeSlug && pr.id ? `/store/${storeSlug}/product/${pr.id}` : "#");
  const Title = p.title ? <h2 className="text-3xl mb-6 s-title" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2> : null;

  const Chips = page === "shop" && categories.length > 0 ? (
    <div className="flex flex-wrap gap-2 mb-8">
      <button
        type="button"
        onClick={() => setCategory("")}
        className="text-xs px-3 py-1.5 border transition"
        style={{
          borderColor: dna.palette?.border,
          borderRadius: "var(--r)",
          background: !selectedCategory ? dna.palette?.primary : "transparent",
          color: !selectedCategory ? dna.palette?.primary_fg : dna.palette?.fg,
        }}
      >
        All ({allItems.length})
      </button>
      {categories.map((cat) => {
        const active = selectedCategory.toLowerCase() === cat.toLowerCase();
        const count = allItems.filter((it) => (it.category || "").toLowerCase() === cat.toLowerCase()).length;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="text-xs px-3 py-1.5 border transition"
            style={{
              borderColor: dna.palette?.border,
              borderRadius: "var(--r)",
              background: active ? dna.palette?.primary : "transparent",
              color: active ? dna.palette?.primary_fg : dna.palette?.fg,
            }}
          >
            {cat} ({count})
          </button>
        );
      })}
    </div>
  ) : null;

  const Empty = page === "shop" && items.length === 0 ? (
    <div className="py-16 text-center text-sm" style={{ color: dna.palette?.muted }}>
      No products in this category yet.
    </div>
  ) : null;

  if (v === "editorial_list") {
    return (
      <section className="max-w-5xl mx-auto px-6 py-20">
        {Title}
        {Chips}
        {Empty}
        <div className="divide-y" style={{ borderColor: dna.palette?.border }}>
          {items.map((pr: any, i: number) => (
            <Link to={linkFor(pr)} key={i} className="grid grid-cols-[80px,1fr,auto] gap-6 py-6 items-center" style={{ borderColor: dna.palette?.border }}>
              <div className="text-5xl tabular-nums" style={{ color: dna.palette?.muted, fontFamily: "var(--hf)" }}>{String(i + 1).padStart(2, "0")}</div>
              <div>
                <div className="text-xl" style={{ fontFamily: "var(--hf)" }}>{pr.name}</div>
                {pr.badge && <div className="text-xs mt-1" style={{ color: dna.palette?.accent }}>{pr.badge}</div>}
              </div>
              <div className="text-right">
                <div className="text-lg">₹{pr.price}</div>
                {pr.compare_at > pr.price && <div className="text-xs line-through" style={{ color: dna.palette?.muted }}>₹{pr.compare_at}</div>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  const productCols = p.product_cols ?? (v === "grid_minimal" ? 3 : 4);
  const cardWidth = p.product_card_width;
  const sectionId = p.id || `sec-prod-${v}`;

  return (
    <section id="products" className="max-w-6xl mx-auto px-6 py-20">
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .dynamic-grid-${sectionId} {
            grid-template-columns: repeat(${productCols}, minmax(0, 1fr)) !important;
            display: grid !important;
          }
        }
      `}} />
      {Title}
      {Chips}
      {Empty}
      <div 
        className={p.scroll_horizontal
          ? "flex gap-6 overflow-x-auto pb-4 snap-x scroll-smooth scrollbar-thin"
          : cardWidth 
            ? "flex flex-wrap gap-6 justify-center" 
            : `grid grid-cols-2 gap-6 dynamic-grid-${sectionId}`
        }
      >
        {items.map((pr: any, i: number) => {
          const isOutOfStock = pr.inventory_count === 0;
          return (
            <div 
              key={i} 
              className={`group ${p.scroll_horizontal ? "snap-start shrink-0" : ""} ${isOutOfStock ? "opacity-50 grayscale" : ""}`} 
              style={p.scroll_horizontal
                ? { width: cardWidth ? `${cardWidth}px` : "260px" }
                : cardWidth 
                  ? { width: `${cardWidth}px`, minWidth: `${cardWidth}px` } 
                  : {}
              }
            >
              <Link to={linkFor(pr)} className="block">
                <div className="aspect-square mb-3 overflow-hidden relative" style={{ background: dna.palette?.surface, borderRadius: "var(--r)" }}>
                  {pr.image && <img src={pr.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                  {pr.badge && <span className="absolute top-2 left-2 text-[10px] px-2 py-1 uppercase tracking-wider z-10" style={{ background: dna.palette?.accent, color: dna.palette?.bg, borderRadius: "var(--r)" }}>{pr.badge}</span>}
                  {isOutOfStock && <span className="absolute top-2 right-2 text-[9px] font-black bg-gray-600 text-white px-2 py-0.5 rounded shadow z-10">OUT OF STOCK</span>}
                </div>
                <div 
                  className="text-sm font-medium" 
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    height: "2.5rem",
                    lineHeight: "1.25rem"
                  }}
                >
                  {pr.name}
                </div>
                <div className="mt-1 text-sm flex gap-2">
                  <span>₹{pr.price}</span>
                  {pr.compare_at > pr.price && <span className="line-through" style={{ color: dna.palette?.muted }}>₹{pr.compare_at}</span>}
                </div>
              </Link>
              {storeSlug && pr.id && (
                <ProductCardActions
                  storeSlug={storeSlug}
                  product={{ id: pr.id, title: pr.name, price: pr.price, image: pr.image, inventory_count: pr.inventory_count }}
                  primaryColor={dna.palette?.primary}
                  primaryFg={dna.palette?.primary_fg}
                  borderRadius={dna.radius ?? "8px"}
                  storeCategory={storeCategory}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}


function Footer({ footer, dna, brandName, storeSlug, onNavigate, footerOv }: any) {
  const ov: FooterOv = footerOv || {};
  const base = storeSlug ? `/store/${storeSlug}` : "";
  const pageToPath: Record<string, string> = {
    home: "", shop: "/shop", collections: "/collections", about: "/about", contact: "/contact",
    journal: "/blog", blog: "/blog", account: "/account", cart: "/cart",
    privacy: "/privacy-policy", terms: "/terms", refund: "/refund-policy",
    return: "/return-policy", shipping: "/shipping-policy",
  };

  // Build merged columns: footerOv.columns overrides; else manifest footer.columns (legacy
  // shape: links as string[] — convert to {label, href}); else sensible defaults.
  const defaultColumns: FooterOv["columns"] = [
    { title: "Shop", links: [
      { label: "All products", href: "", page: "shop" },
      { label: "Cart",         href: "", page: "cart" },
      { label: "My account",   href: "", page: "account" },
    ]},
    { title: "About", links: [
      { label: "About us",     href: "", page: "about" },
      { label: "Journal",      href: "", page: "blog" },
      { label: "Contact",      href: "", page: "contact" },
    ]},
    { title: "Policies", links: [
      { label: "Privacy Policy",  href: "", page: "privacy" },
      { label: "Terms of Service", href: "", page: "terms" },
      { label: "Refund Policy",   href: "", page: "refund" },
      { label: "Shipping Policy", href: "", page: "shipping" },
    ]},
  ];

  let columns = ov.columns;
  if (!columns || columns.length === 0) {
    if (footer?.columns?.length) {
      columns = footer.columns.map((c: any) => ({
        title: c.title,
        links: (c.links ?? []).map((l: any) =>
          typeof l === "string"
            ? { label: l, href: "", page: guessPage(l) }
            : { label: l.label ?? String(l), href: l.href ?? "", page: l.page ?? guessPage(l.label ?? "") }
        ),
      }));
    } else {
      columns = defaultColumns;
    }
  }

  const tagline = ov.tagline ?? footer?.tagline ?? "";
  const renderLink = (l: { label: string; href: string; page?: string }, idx: number) => {
    const to = l.href || (l.page ? `${base}${pageToPath[l.page] ?? `/${l.page}`}` : "");
    const cls = "hover:opacity-100 transition";
    const style = { opacity: 0.75 } as React.CSSProperties;
    if (onNavigate && l.page) return <button key={idx} onClick={() => onNavigate!(l.page!)} className={cls} style={{ ...style, background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit", textAlign: "left" }}>{l.label}</button>;
    if (storeSlug && to) return <Link key={idx} to={to} className={cls} style={style}>{l.label}</Link>;
    return <span key={idx} className={cls} style={style}>{l.label}</span>;
  };

  const social = ov.social || {};
  const showPoweredBy = ov.show_powered_by !== false;

  return (
    <footer className="border-t mt-12" style={{ borderColor: dna.palette?.border, background: dna.palette?.surface }}>
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="text-lg mb-2" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{brandName}</div>
          {tagline && <p style={{ color: dna.palette?.muted }}>{tagline}</p>}
          {(social.instagram || social.facebook || social.twitter || social.youtube) && (
            <div className="mt-3 flex gap-3 text-xs" style={{ color: dna.palette?.muted }}>
              {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a>}
              {social.facebook  && <a href={social.facebook}  target="_blank" rel="noreferrer" className="hover:underline">Facebook</a>}
              {social.twitter   && <a href={social.twitter}   target="_blank" rel="noreferrer" className="hover:underline">Twitter</a>}
              {social.youtube   && <a href={social.youtube}   target="_blank" rel="noreferrer" className="hover:underline">YouTube</a>}
            </div>
          )}
        </div>
        {columns.map((c, i) => (
          <div key={i}>
            <div className="font-medium mb-3">{c.title}</div>
            <ul className="space-y-2 flex flex-col" style={{ color: dna.palette?.muted }}>
              {(c.links ?? []).map((l, j) => <li key={j}>{renderLink(l, j)}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {showPoweredBy && (
        <div className="border-t" style={{ borderColor: dna.palette?.border }}>
          <div className="max-w-6xl mx-auto px-6 py-4 text-[11px] flex flex-wrap justify-between gap-2" style={{ color: dna.palette?.muted }}>
            <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
            <span>Powered by <a href="https://pictocart.in" target="_blank" rel="noreferrer" className="hover:underline">Pic to Cart</a></span>
          </div>
        </div>
      )}
    </footer>
  );
}

function guessPage(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("privacy"))  return "privacy";
  if (l.includes("term"))     return "terms";
  if (l.includes("refund") || l.includes("return")) return "refund";
  if (l.includes("ship"))     return "shipping";
  if (l.includes("about"))    return "about";
  if (l.includes("contact"))  return "contact";
  if (l.includes("blog") || l.includes("journal")) return "blog";
  if (l.includes("shop") || l.includes("product")) return "shop";
  if (l.includes("cart"))     return "cart";
  if (l.includes("account"))  return "account";
  return "home";
}

/**
 * Testimonials block — uses props.items if provided (manifest/overrides),
 * otherwise auto-loads merchant-managed testimonials from store_testimonials.
 */
function TestimonialsBlock({ p, dna, storeSlug }: any) {
  const [dbItems, setDbItems] = useState<any[]>([]);
  useEffect(() => {
    if (!storeSlug || (p.items && p.items.length)) return;
    (async () => {
      const { data: store } = await supabase.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
      if (!store?.id) return;
      const { data } = await supabase
        .from("store_testimonials")
        .select("customer_name, customer_role, content, rating, photo_url")
        .eq("store_id", store.id)
        .order("display_order", { ascending: true });
      setDbItems(data || []);
    })();
  }, [storeSlug, p.items]);

  const items =
    (p.items && p.items.length ? p.items : dbItems).map((t: any) => ({
      quote: t.quote ?? t.content,
      author: t.author ?? t.customer_name,
      location: t.location ?? t.customer_role ?? "",
      photo: t.photo_url,
      rating: t.rating ?? 5,
    }));

  if (!items.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      {p.title && <h2 className="text-3xl mb-8 text-center" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title}</h2>}
      <div className="grid md:grid-cols-3 gap-6">
        {items.map((t: any, i: number) => (
          <div key={i} className="p-6" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", border: `1px solid ${dna.palette?.border}` }}>
            <div className="flex gap-1 mb-3">
              {[...Array(t.rating || 5)].map((_, k) => <Star key={k} className="h-4 w-4 fill-current" style={{ color: dna.palette?.accent }} />)}
            </div>
            <p className="text-sm mb-4 leading-relaxed">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              {t.photo && <img src={t.photo} className="h-9 w-9 rounded-full object-cover" />}
              <div className="text-xs" style={{ color: dna.palette?.muted }}>
                <div className="font-medium" style={{ color: dna.palette?.fg }}>{t.author}</div>
                {t.location && <div>{t.location}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Google Reviews block — only renders if store has an active paid connection.
 */
function GoogleReviewsBlock({ p, dna, storeSlug }: any) {
  const [data, setData] = useState<{ conn: any; reviews: any[] } | null>(null);
  useEffect(() => {
    if (!storeSlug) return;
    (async () => {
      const { data: store } = await supabase.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
      if (!store?.id) return;
      const { data: conn } = await supabase
        .from("store_google_reviews_connections")
        .select("*").eq("store_id", store.id).eq("is_active", true).eq("is_paid", true).maybeSingle();
      if (!conn) return;
      const { data: reviews } = await supabase
        .from("store_google_reviews_cache")
        .select("*").eq("store_id", store.id).order("time_unix", { ascending: false }).limit(6);
      setData({ conn, reviews: reviews || [] });
    })();
  }, [storeSlug]);

  if (!data) return null;
  const { conn, reviews } = data;
  if (!reviews.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="flex items-center justify-center gap-3 mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-2 3.3-4.9 3.3-8.2z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.3-1.9-6.1-4.5H2v2.8C3.9 20.5 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.9 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7H2c-.8 1.5-1.2 3.2-1.2 5s.4 3.5 1.2 5l3.9-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.7 1 3.9 3.5 2 7l3.9 2.8C6.7 7.3 9.2 5.4 12 5.4z"/></svg>
        <span className="text-sm font-semibold" style={{ color: dna.palette?.muted }}>From Google Reviews</span>
      </div>
      <div className="text-center mb-8">
        <h2 className="text-3xl" style={{ fontFamily: "var(--hf)", fontWeight: dna.fonts?.heading_weight ?? 700 }}>{p.title || "What our customers say"}</h2>
        {conn.average_rating != null && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-2xl font-bold">{Number(conn.average_rating).toFixed(1)}</span>
            <div className="flex">{[...Array(5)].map((_, k) => <Star key={k} className={`h-4 w-4 ${k < Math.round(conn.average_rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</div>
            <span className="text-sm" style={{ color: dna.palette?.muted }}>({conn.total_reviews} reviews)</span>
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r) => (
          <div key={r.id} className="p-6" style={{ background: dna.palette?.surface, borderRadius: "var(--r)", border: `1px solid ${dna.palette?.border}` }}>
            <div className="flex items-center gap-3 mb-3">
              {r.author_photo_url ? (
                <img src={r.author_photo_url} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold" style={{ background: dna.palette?.bg }}>{r.author_name?.charAt(0)}</div>
              )}
              <div>
                <div className="text-sm font-medium">{r.author_name}</div>
                <div className="text-xs" style={{ color: dna.palette?.muted }}>{r.relative_time}</div>
              </div>
            </div>
            <div className="flex mb-2">{[...Array(r.rating || 5)].map((_, k) => <Star key={k} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
            <p className="text-sm leading-relaxed line-clamp-5">{r.text}</p>
          </div>
        ))}
      </div>
      {conn.business_url && (
        <div className="text-center mt-6">
          <a href={conn.business_url} target="_blank" rel="noreferrer" className="text-sm underline" style={{ color: dna.palette?.muted }}>
            See all reviews on Google
          </a>
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D STAR FIELD — shared animated starfield background for themes 15/16/17
// ═══════════════════════════════════════════════════════════════════════════
function StarField3D({ color1 = "#6366f1", color2 = "#a855f7", count = 120 }: { color1?: string; color2?: string; count?: number }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    z: Math.random() * 3 + 0.5, size: Math.random() * 2.5 + 0.5,
    dur: Math.random() * 6 + 3, delay: Math.random() * 8,
    color: i % 5 === 0 ? "#ffffff" : i % 3 === 0 ? color1 : color2,
    kind: i % 4,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden style={{ zIndex: 0 }}>
      <style>{`
        @keyframes sf-twinkle { 0%,100%{opacity:.15;transform:scale(.8)} 50%{opacity:1;transform:scale(1.4)} }
        @keyframes sf-float   { 0%{transform:translateY(0) translateX(0)} 50%{transform:translateY(-30px) translateX(15px)} 100%{transform:translateY(0) translateX(0)} }
        @keyframes sf-shoot   { 0%{transform:translateX(0) translateY(0);opacity:1;width:2px} 100%{transform:translateX(200px) translateY(-100px);opacity:0;width:60px} }
        .sf-star    { animation: sf-twinkle var(--d) var(--dl) ease-in-out infinite; }
        .sf-floater { animation: sf-float var(--d) var(--dl) ease-in-out infinite; }
        .sf-shoot   { animation: sf-shoot 3s linear infinite; }
      `}</style>
      {stars.map(s => (
        <div key={s.id} className={s.kind < 2 ? "sf-star" : "sf-floater"} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: `${s.size * s.z}px`, height: `${s.size * s.z}px`,
          background: s.color, borderRadius: "50%",
          boxShadow: `0 0 ${s.size * 4}px ${s.size * 1.5}px ${s.color}90`,
          ["--d" as any]: `${s.dur}s`, ["--dl" as any]: `${s.delay}s`,
        }} />
      ))}
      {/* Shooting stars */}
      {[15, 45, 75].map((top, i) => (
        <div key={`sh${i}`} className="sf-shoot absolute" style={{
          top: `${top}%`, left: `${10 + i * 25}%`, height: "1.5px",
          background: `linear-gradient(90deg,transparent,${color1},transparent)`,
          borderRadius: "9999px", animationDelay: `${i * 2.5}s`,
        }} />
      ))}
      {/* Large glow orbs */}
      {[[20,25,500,color1,10],[75,55,400,color2,13],[50,80,300,color1,8]].map(([x,y,sz,c,d],i) => (
        <div key={`orb${i}`} style={{
          position: "absolute", left: `${x}%`, top: `${y}%`,
          width: sz as number, height: sz as number, borderRadius: "50%",
          background: `radial-gradient(circle,${c}18 0%,${c}06 50%,transparent 70%)`,
          transform: "translate(-50%,-50%)", filter: "blur(40px)",
          animation: `sf-twinkle ${d}s ${i * 2}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME-16  LIQUID METAL — chrome/silver, morphing 3D, magnetic feel
// ═══════════════════════════════════════════════════════════════════════════
function HeroLiquidMetal({ p, dna, storeSlug }: any) {
  const ctaHref = p.cta_href || (storeSlug ? `/store/${storeSlug}/shop` : "#products");
  const P = "#94a3b8", A = "#e2e8f0";
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#050810" }}>
      <style>{`
        @keyframes lm-morph1 { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%;transform:rotate(0)} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%;transform:rotate(180deg) scale(1.1)} }
        @keyframes lm-morph2 { 0%,100%{border-radius:40% 60% 60% 40%/40% 50% 60% 50%} 50%{border-radius:60% 40% 40% 60%/60% 40% 50% 60%;transform:rotate(-120deg) scale(1.08)} }
        @keyframes lm-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes lm-float { 0%,100%{transform:perspective(800px) rotateX(8deg) rotateY(-5deg) translateY(0)} 50%{transform:perspective(800px) rotateX(2deg) rotateY(5deg) translateY(-20px)} }
        @keyframes lm-pulse { 0%,100%{box-shadow:0 0 0 0 ${P}40} 50%{box-shadow:0 0 0 30px transparent} }
        @keyframes lm-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes lm-scan { 0%{top:0%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        .lm-morph1 { animation: lm-morph1 10s ease-in-out infinite; }
        .lm-morph2 { animation: lm-morph2 14s ease-in-out infinite; }
        .lm-float  { animation: lm-float 6s ease-in-out infinite; transform-style:preserve-3d; }
        .lm-scan   { animation: lm-scan 3s linear infinite; }
        .lm-shimmer-text { background:linear-gradient(90deg,${A},${P},#fff,${P},${A});background-size:300% 100%;animation:lm-shimmer 5s linear infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
      `}</style>

      <StarField3D color1={P} color2="#475569" count={100} />

      {/* Morphing chrome blobs */}
      <div className="lm-morph1 absolute opacity-30" style={{ width: 600, height: 600, top: "-20%", left: "-10%", background: `conic-gradient(from 0deg,${P}30,#1e293b,${P}30,transparent)`, filter: "blur(60px)" }} />
      <div className="lm-morph2 absolute opacity-20" style={{ width: 500, height: 500, bottom: "-15%", right: "-10%", background: `conic-gradient(from 180deg,${A}20,#0f172a,${A}20,transparent)`, filter: "blur(50px)" }} />

      {/* Scanline effect */}
      <div className="lm-scan absolute left-0 right-0 pointer-events-none" style={{ height: "2px", background: `linear-gradient(90deg,transparent,${P}80,transparent)`, zIndex: 2 }} />

      {/* 3D hex grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='104'%3E%3Cpolygon points='30,2 58,17 58,47 30,62 2,47 2,17' fill='none' stroke='%2394a3b8' stroke-width='0.5'/%3E%3Cpolygon points='30,52 58,67 58,97 30,112 2,97 2,67' fill='none' stroke='%2394a3b8' stroke-width='0.5'/%3E%3C/svg%3E")` }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center py-24">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 max-w-12" style={{ background: `linear-gradient(90deg,transparent,${P})` }} />
            <span className="text-[10px] font-black uppercase tracking-[0.5em]" style={{ color: P }}>Chrome Edition</span>
            <div className="h-px flex-1 max-w-12" style={{ background: `linear-gradient(90deg,${P},transparent)` }} />
          </div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] mb-8">
            <span className="lm-shimmer-text block">{p.title?.split(" ").slice(0,2).join(" ") || "Forged"}</span>
            <span className="block mt-2" style={{ color: A }}>{p.title?.split(" ").slice(2).join(" ") || "in Steel"}</span>
          </h1>
          <p className="text-base mb-10 max-w-md leading-loose" style={{ color: "#64748b" }}>{p.sub || "Precision-engineered for those who demand nothing less than perfection."}</p>
          <div className="flex gap-4 flex-wrap">
            <a href={ctaHref} className="group relative px-10 py-4 font-black text-sm overflow-hidden rounded-xl"
              style={{ background: `linear-gradient(135deg,${P},#475569)`, color: "#0a0a0f", boxShadow: `0 0 40px ${P}50, inset 0 1px 0 rgba(255,255,255,0.2)` }}>
              <span className="relative z-10">{p.cta || "Shop Collection"}</span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg,${A},${P})` }} />
            </a>
            <a href={storeSlug ? `/store/${storeSlug}/collections` : "#"} className="px-10 py-4 font-bold text-sm rounded-xl transition-all hover:scale-105"
              style={{ border: `1px solid ${P}50`, color: P, backdropFilter: "blur(10px)", background: `${P}08` }}>
              Lookbook →
            </a>
          </div>
          {/* Stats row */}
          <div className="flex gap-8 mt-12 pt-8 border-t" style={{ borderColor: "#1e293b" }}>
            {[["10K+","Happy Clients"],["500+","Products"],["4.9★","Rating"]].map(([n,l],i) => (
              <div key={i}>
                <div className="text-2xl font-black lm-shimmer-text">{n}</div>
                <div className="text-[11px] mt-1" style={{ color: "#475569" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3D Floating card stack */}
        <div className="lm-float relative hidden md:block" style={{ height: 480 }}>
          {[
            { z: 0, r: "-8deg", scale: 0.88, bg: `linear-gradient(135deg,rgba(148,163,184,0.06),rgba(71,85,105,0.02))` },
            { z: 30, r: "-3deg", scale: 0.94, bg: `linear-gradient(135deg,rgba(148,163,184,0.10),rgba(71,85,105,0.04))` },
            { z: 60, r: "1deg",  scale: 1.00, bg: `linear-gradient(135deg,rgba(226,232,240,0.13),rgba(148,163,184,0.06))` },
          ].map((c, i) => (
            <div key={i} className="absolute inset-0 rounded-3xl" style={{
              background: c.bg, border: `1px solid rgba(226,232,240,${0.06 + i * 0.04})`,
              transform: `rotateY(${c.r}) scale(${c.scale}) translateZ(${c.z}px)`,
              backdropFilter: "blur(20px)", transition: "transform 0.5s ease",
              boxShadow: `0 ${20 + i * 15}px ${60 + i * 20}px rgba(0,0,0,0.5)`,
            }}>
              {i === 2 && (
                <div className="absolute inset-0 rounded-3xl overflow-hidden p-8 flex flex-col justify-end">
                  <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: P }}>◈ New Season</div>
                  <div className="text-3xl font-black text-white mb-1">Chrome Series</div>
                  <div className="text-sm" style={{ color: "#64748b" }}>Premium Collection 2025</div>
                </div>
              )}
            </div>
          ))}
          {/* Decorative ring */}
          <div className="absolute inset-4 rounded-3xl pointer-events-none" style={{ border: `1px solid ${P}20`, animation: "lm-pulse 3s ease-in-out infinite" }} />
        </div>
      </div>

      {/* Bottom marquee ticker */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden py-3" style={{ borderTop: "1px solid #1e293b", background: "#050810ee" }}>
        <div style={{ display: "inline-block", whiteSpace: "nowrap", animation: "lm-ticker 20s linear infinite" }}>
          {Array(8).fill(null).map((_,i) => (
            <span key={i} className="mx-10 text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: "#334155" }}>◈ Premium Quality &nbsp;◈ Fast Delivery &nbsp;◈ 100% Secure &nbsp;◈ Easy Returns</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductsChrome({ p, dna, storeSlug, storeCategory }: any) {
  const { themeId } = useParams<{ themeId: string }>();
  const P = "#94a3b8", A = "#e2e8f0";
  const items: any[] = (p.items && p.items.length > 0) ? p.items : [
    { id:"c1", name:"Steel Edge Watch",   price:4999, compare_at:7999, image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60", badge:"New" },
    { id:"c2", name:"Chrome Minimal Bag", price:3499, compare_at:4999, image:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=60", badge:"Hot" },
    { id:"c3", name:"Brushed Steel Kicks",price:2999, compare_at:3999, image:"https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&auto=format&fit=crop&q=60", badge:"" },
    { id:"c4", name:"Silver Cuff Series", price:1999, compare_at:2999, image:"https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&auto=format&fit=crop&q=60", badge:"Sale" },
  ];
  const linkFor = (pr: any) => storeSlug && pr.id ? `/store/${storeSlug}/product/${pr.id}${themeId ? `/${themeId}` : ""}` : "#";
  const productCols = p.product_cols ?? 4;
  const cardWidth = p.product_card_width;
  const sectionId = p.id || "sec-chrome-prod";

  return (
    <section className="relative py-24 overflow-hidden" style={{ background: "#050810" }}>
      <style>{`
        @keyframes chrome-card-hover { from{transform:perspective(600px) rotateX(0) rotateY(0) translateZ(0)} to{transform:perspective(600px) rotateX(-3deg) rotateY(5deg) translateZ(20px)} }
        @keyframes shine-sweep { 0%{transform:translateX(-100%) skewX(-15deg)} 100%{transform:translateX(300%) skewX(-15deg)} }
        .chrome-card:hover .card-shine { animation: shine-sweep 0.6s ease forwards; }
      `}</style>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .dynamic-grid-${sectionId} {
            grid-template-columns: repeat(${productCols}, minmax(0, 1fr)) !important;
            display: grid !important;
          }
        }
      `}} />
      <StarField3D color1={P} color2="#475569" count={60} />
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {p.title && (
          <div className="flex items-center gap-6 mb-14">
            <h2 className="text-4xl font-black" style={{ fontFamily:"var(--hf)", background:`linear-gradient(90deg,${A},${P})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>{p.title}</h2>
            <div className="h-px flex-1" style={{ background:`linear-gradient(90deg,${P}50,transparent)` }} />
          </div>
        )}
        <div 
          className={cardWidth 
            ? "flex flex-wrap gap-6 justify-center" 
            : `grid grid-cols-2 gap-6 dynamic-grid-${sectionId}`
          }
        >
          {items.map((pr, i) => {
            const isOutOfStock = pr.inventory_count === 0;
            return (
              <div key={i} className={`chrome-card group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ${isOutOfStock ? "opacity-50 grayscale hover:-translate-y-0" : "hover:-translate-y-3"}`}
                style={{ background:"linear-gradient(145deg,rgba(226,232,240,0.07) 0%,rgba(148,163,184,0.02) 100%)", border:`1px solid rgba(226,232,240,0.10)`, boxShadow:"0 8px 40px rgba(0,0,0,0.5)", width: cardWidth ? `${cardWidth}px` : undefined, minWidth: cardWidth ? `${cardWidth}px` : undefined }}>
                <Link to={linkFor(pr)}>
                  <div className="aspect-square overflow-hidden relative">
                    {pr.image && <img src={pr.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                    <div className="card-shine absolute inset-0 w-1/3" style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)" }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:"linear-gradient(to bottom,transparent 40%,rgba(5,8,16,0.9))" }} />
                    {pr.badge && <span className="absolute top-3 left-3 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider" style={{ background:P, color:"#050810" }}>{pr.badge}</span>}
                    {isOutOfStock && <span className="absolute top-3 right-3 text-[9px] font-black bg-gray-600 text-white px-2 py-1 rounded-lg uppercase tracking-wider z-10">OUT OF STOCK</span>}
                  </div>
                  <div className="p-4">
                    <div className="text-sm font-bold truncate mb-1" style={{ color: A }}>{pr.name}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black" style={{ color: P }}>₹{pr.price}</span>
                      {pr.compare_at > pr.price && <span className="text-xs line-through" style={{ color:"#334155" }}>₹{pr.compare_at}</span>}
                    </div>
                  </div>
                </Link>
                {storeSlug && pr.id && (
                  <div className="px-4 pb-4">
                    <ProductCardActions storeSlug={storeSlug} product={{ id:pr.id, title:pr.name, price:pr.price, image:pr.image, inventory_count: pr.inventory_count }} primaryColor={P} primaryFg="#050810" borderRadius="10px" compact storeCategory={storeCategory} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UspChrome({ p, dna }: any) {
  const P = "#94a3b8";
  const items: any[] = p.items ?? [];
  if (!items.length) return null;
  return (
    <section className="relative py-12 overflow-hidden" style={{ background:"#060a14" }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage:`linear-gradient(${P} 1px,transparent 1px),linear-gradient(90deg,${P} 1px,transparent 1px)`, backgroundSize:"80px 80px" }} />
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((u,i) => {
          const Ico = ICONS[u.icon] ?? Sparkles;
          return (
            <div key={i} className="group flex items-center gap-4 p-5 rounded-2xl transition-all hover:scale-105 hover:-translate-y-1"
              style={{ background:"linear-gradient(135deg,rgba(148,163,184,0.07),rgba(71,85,105,0.03))", border:`1px solid rgba(148,163,184,0.12)`, backdropFilter:"blur(16px)", boxShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
              <div className="p-3 rounded-xl shrink-0 transition-all group-hover:scale-110" style={{ background:`${P}18`, color:P, boxShadow:`0 0 20px ${P}30` }}>
                <Ico className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color:"#e2e8f0" }}>{u.title}</div>
                <div className="text-xs mt-0.5" style={{ color:"#475569" }}>{u.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PromoChromeWave({ p, dna, storeSlug }: any) {
  const P = "#94a3b8", A = "#e2e8f0";
  const ctaHref = storeSlug ? `/store/${storeSlug}/shop` : "#products";
  return (
    <section className="relative py-32 overflow-hidden" style={{ background:"#050810" }}>
      <style>{`
        @keyframes cw-wave{0%,100%{transform:skewY(-1deg) scale(1.02)}50%{transform:skewY(1deg) scale(1)}}
        @keyframes cw-glow{0%,100%{opacity:0.3}50%{opacity:0.7}}
      `}</style>
      <div className="absolute inset-0" style={{ background:`conic-gradient(from 180deg at 50% 50%,${P}08,transparent,${P}08,transparent)`, animation:"cw-wave 12s ease-in-out infinite" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background:`radial-gradient(circle,${P}15,transparent 70%)`, filter:"blur(60px)", animation:"cw-glow 4s ease-in-out infinite" }} />
      <StarField3D color1={P} color2="#334155" count={50} />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full mb-8" style={{ background:`${P}12`, border:`1px solid ${P}35` }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background:P, boxShadow:`0 0 8px ${P}` }} />
          <span className="text-[11px] font-black uppercase tracking-[0.4em]" style={{ color:P }}>Limited Offer</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-black mb-6 leading-tight" style={{ fontFamily:"var(--hf)", background:`linear-gradient(135deg,${A} 0%,${P} 50%,${A} 100%)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", backgroundSize:"200%", animation:"lm-shimmer 5s linear infinite" }}>
          {p.title || "Steel Collection"}
        </h2>
        <p className="text-lg mb-12 max-w-lg mx-auto leading-loose" style={{ color:"#475569" }}>{p.subtitle || "Precision-forged pieces for the modern connoisseur."}</p>
        <a href={ctaHref} className="inline-flex items-center gap-3 px-12 py-5 font-black text-sm rounded-2xl transition-all hover:scale-105 hover:-translate-y-1"
          style={{ background:`linear-gradient(135deg,${P},#475569)`, color:"#050810", boxShadow:`0 0 50px ${P}50, inset 0 1px 0 rgba(255,255,255,0.2)` }}>
          {p.cta || "Shop Now"} <span style={{ fontSize:18 }}>→</span>
        </a>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME-17  NEON BOTANICAL — bioluminescent, organic, otherworldly glow
// ═══════════════════════════════════════════════════════════════════════════
function HeroNeonBotanical({ p, dna, storeSlug }: any) {
  const ctaHref = p.cta_href || (storeSlug ? `/store/${storeSlug}/shop` : "#products");
  const N = "#10b981", G = "#34d399";
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "#010d08" }}>
      <style>{`
        @keyframes nb-breathe  { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.08);opacity:1} }
        @keyframes nb-sway     { 0%,100%{transform:rotate(-4deg) scaleY(1) translateY(0)} 50%{transform:rotate(4deg) scaleY(1.05) translateY(-10px)} }
        @keyframes nb-rise     { 0%{transform:translateY(40px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        @keyframes nb-ring-out { 0%{transform:translate(-50%,-50%) scale(.8);opacity:.8} 100%{transform:translate(-50%,-50%) scale(2);opacity:0} }
        @keyframes nb-drip     { 0%,100%{transform:translateY(0) scaleY(1)} 50%{transform:translateY(8px) scaleY(1.15)} }
        @keyframes nb-text-glow{ 0%,100%{text-shadow:0 0 20px ${N}60} 50%{text-shadow:0 0 60px ${N},0 0 100px ${G}80} }
        .nb-sway    { animation: nb-sway 5s ease-in-out infinite; transform-origin:bottom center; }
        .nb-breathe { animation: nb-breathe 4s ease-in-out infinite; }
        .nb-ring    { position:absolute;top:50%;left:50%;border-radius:50%;border:1px solid ${N}30; animation:nb-ring-out 3s ease-out infinite; }
        .nb-drip    { animation: nb-drip 3s ease-in-out infinite; }
        .nb-glow    { animation: nb-text-glow 3s ease-in-out infinite; }
      `}</style>

      <StarField3D color1={N} color2={G} count={80} />

      {/* Bioluminescent background blobs */}
      {([[8,20,600,N,10],[72,55,500,G,14],[45,85,350,N,8]] as [number,number,number,string,number][]).map(([x,y,sz,c,d],i) => (
        <div key={i} className="nb-breathe absolute pointer-events-none" style={{ left:`${x}%`,top:`${y}%`,width:sz,height:sz,background:`radial-gradient(circle,${c}20 0%,${c}06 50%,transparent 70%)`,borderRadius:"50%",transform:"translate(-50%,-50%)",filter:"blur(50px)",animationDuration:`${d}s`,animationDelay:`${i*2}s` }} />
      ))}

      {/* Animated organic stems */}
      <svg className="nb-sway absolute left-0 bottom-0 opacity-25" width="220" height="500" viewBox="0 0 220 500" fill="none">
        <path d="M110 500 Q70 380 130 260 Q60 200 110 100 Q140 50 110 0" stroke={N} strokeWidth="1.5" fill="none" filter="url(#glow)"/>
        <defs><filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        {[[130,260,55,30,N],[70,180,40,22,G],[110,120,45,25,N],[150,340,35,18,G]].map(([cx,cy,rx,ry,c],i)=>(
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={c as string} opacity="0.25" filter="url(#glow)" />
        ))}
      </svg>
      <svg className="nb-sway absolute right-0 top-0 opacity-20" width="200" height="460" viewBox="0 0 200 460" style={{ animationDelay:"2s" }} fill="none">
        <path d="M90 0 Q120 100 70 200 Q140 280 80 400 Q60 440 90 460" stroke={G} strokeWidth="1.5" fill="none"/>
        {[[70,200,42,24,G],[130,300,35,20,N],[80,380,30,16,G]].map(([cx,cy,rx,ry,c],i)=>(
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={c as string} opacity="0.2"/>
        ))}
      </svg>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background:`${N}15`, border:`1px solid ${N}35` }}>
            <span className="nb-breathe w-2 h-2 rounded-full" style={{ background:N, boxShadow:`0 0 10px ${N}` }} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color:N }}>Bioluminescent Collection</span>
          </div>
          <h1 className="font-black leading-none mb-6" style={{ fontFamily:"var(--hf)", fontSize:"clamp(52px,8vw,96px)" }}>
            <span className="block" style={{ color:"#d1fae5" }}>Nature</span>
            <span className="nb-glow block" style={{ color:N }}>Reborn</span>
          </h1>
          <p className="text-lg mb-10 max-w-lg leading-loose" style={{ color:"#6ee7b7" }}>{p.sub || "Where living organisms inspire design. Glow from within."}</p>
          <div className="flex gap-4 flex-wrap">
            <a href={ctaHref} className="nb-drip group relative px-10 py-4 font-black text-sm rounded-2xl overflow-hidden"
              style={{ background:`linear-gradient(135deg,${N},${G})`, color:"#010d08", boxShadow:`0 0 50px ${N}60, inset 0 1px 0 rgba(255,255,255,0.2)` }}>
              🌿 {p.cta || "Explore Now"}
            </a>
            <a href={storeSlug ? `/store/${storeSlug}/collections` : "#"} className="px-10 py-4 font-bold text-sm rounded-2xl transition-all hover:scale-105"
              style={{ border:`1px solid ${N}40`, color:N, background:`${N}08`, backdropFilter:"blur(10px)" }}>
              Browse All
            </a>
          </div>
          {/* Live pulse counter */}
          <div className="flex gap-6 mt-12 pt-8 border-t" style={{ borderColor:`${N}20` }}>
            {[["2.4K","Active Now","👁"],["98%","Satisfaction","⭐"],["1hr","Avg Delivery","⚡"]].map(([n,l,e],i) => (
              <div key={i} className="text-center">
                <div className="text-xl font-black" style={{ color:N }}>{e} {n}</div>
                <div className="text-[11px] mt-1" style={{ color:"#065f46" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pulsing orb display */}
        <div className="relative h-96 flex items-center justify-center hidden md:flex">
          {[0,1,2].map(i => (
            <div key={i} className="nb-ring" style={{ width:`${200+i*100}px`, height:`${200+i*100}px`, animationDelay:`${i*1}s` }} />
          ))}
          <div className="nb-breathe relative z-10 rounded-full flex items-center justify-center" style={{ width:200, height:200, background:`radial-gradient(circle,${N}30,${N}08)`, border:`1.5px solid ${N}50`, backdropFilter:"blur(20px)", boxShadow:`0 0 80px ${N}40` }}>
            <div className="text-center">
              <div style={{ fontSize:60 }}>🌿</div>
              <div className="text-xs font-black mt-2" style={{ color:N }}>PURE ORGANIC</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductsBotanical({ p, dna, storeSlug, storeCategory }: any) {
  const { themeId } = useParams<{ themeId: string }>();
  const N = "#10b981", G = "#34d399";
  const items: any[] = (p.items && p.items.length > 0) ? p.items : [
    { id:"b1", name:"Forest Serum",   price:999,  compare_at:1499, image:"https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60", badge:"✨" },
    { id:"b2", name:"Moss Candle Set",price:599,  compare_at:799,  image:"https://images.unsplash.com/photo-1596433809252-260c2745df6b?w=600&auto=format&fit=crop&q=60", badge:"" },
    { id:"b3", name:"Jade Stone Kit", price:1299, compare_at:1799, image:"https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=60", badge:"🌿" },
    { id:"b4", name:"Botanical Mist",  price:799,  compare_at:999,  image:"https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=60", badge:"" },
  ];
  const linkFor = (pr: any) => storeSlug && pr.id ? `/store/${storeSlug}/product/${pr.id}${themeId ? `/${themeId}` : ""}` : "#";
  const productCols = p.product_cols ?? 4;
  const cardWidth = p.product_card_width;
  const sectionId = p.id || "sec-bot-prod";

  return (
    <section className="relative py-24 overflow-hidden" style={{ background:"#010d08" }}>
      <style>{`
        @keyframes bot-hover { 0%,100%{transform:perspective(600px) rotateX(0) rotateY(0)} 50%{transform:perspective(600px) rotateX(-4deg) rotateY(4deg)} }
        .bot-card { animation: bot-hover 6s ease-in-out infinite; }
        .bot-card:nth-child(2){animation-delay:1.5s}
        .bot-card:nth-child(3){animation-delay:3s}
        .bot-card:nth-child(4){animation-delay:4.5s}
      `}</style>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .dynamic-grid-${sectionId} {
            grid-template-columns: repeat(${productCols}, minmax(0, 1fr)) !important;
            display: grid !important;
          }
        }
      `}} />
      <StarField3D color1={N} color2={G} count={50} />
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {p.title && (
          <div className="flex items-center gap-6 mb-14">
            <div className="text-3xl">🌿</div>
            <h2 className="text-4xl font-black" style={{ fontFamily:"var(--hf)", color:N, textShadow:`0 0 30px ${N}60` }}>{p.title}</h2>
            <div className="h-px flex-1" style={{ background:`linear-gradient(90deg,${N}50,transparent)` }} />
          </div>
        )}
        <div 
          className={cardWidth 
            ? "flex flex-wrap gap-6 justify-center" 
            : `grid grid-cols-2 gap-6 dynamic-grid-${sectionId}`
          }
        >
          {items.map((pr, i) => {
            const isOutOfStock = pr.inventory_count === 0;
            return (
              <div key={i} className={`bot-card group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${isOutOfStock ? "opacity-50 grayscale hover:-translate-y-0" : "hover:-translate-y-4"}`}
                style={{ background:`linear-gradient(160deg,${N}08,${G}03)`, border:`1px solid ${N}20`, boxShadow:`0 8px 40px rgba(16,185,129,0.08)`, width: cardWidth ? `${cardWidth}px` : undefined, minWidth: cardWidth ? `${cardWidth}px` : undefined }}>
                <Link to={linkFor(pr)}>
                  <div className="aspect-square overflow-hidden relative">
                    {pr.image && <img src={pr.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:`radial-gradient(circle at 30% 30%,${N}25,transparent 60%)` }} />
                    {pr.badge && <span className="absolute top-3 right-3 text-lg">{pr.badge}</span>}
                    {isOutOfStock && <span className="absolute top-3 left-3 text-[9px] font-black bg-gray-600 text-white px-2 py-1 rounded-lg uppercase tracking-wider z-10">OUT OF STOCK</span>}
                    {/* Corner glow on hover */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:`linear-gradient(to top,${N}30,transparent)` }} />
                  </div>
                  <div className="p-4">
                    <div className="text-sm font-bold truncate mb-1" style={{ color:"#d1fae5" }}>{pr.name}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-black text-base" style={{ color:N, textShadow:`0 0 10px ${N}60` }}>₹{pr.price}</span>
                      {pr.compare_at > pr.price && <span className="text-xs line-through" style={{ color:"#065f46" }}>₹{pr.compare_at}</span>}
                    </div>
                  </div>
                </Link>
                {storeSlug && pr.id && (
                  <div className="px-4 pb-4">
                    <ProductCardActions storeSlug={storeSlug} product={{ id:pr.id, title:pr.name, price:pr.price, image:pr.image, inventory_count: pr.inventory_count }} primaryColor={N} primaryFg="#010d08" borderRadius="12px" compact storeCategory={storeCategory} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UspBotanical({ p, dna }: any) {
  const N = "#10b981";
  const items: any[] = p.items ?? [];
  if (!items.length) return null;
  return (
    <section className="relative py-12 overflow-hidden" style={{ background:"#010d08" }}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:`radial-gradient(${N} 1px,transparent 1px)`, backgroundSize:"44px 44px" }} />
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((u,i) => {
          const Ico = ICONS[u.icon] ?? Sparkles;
          return (
            <div key={i} className="group flex items-center gap-4 p-5 rounded-2xl transition-all hover:scale-105 hover:-translate-y-1"
              style={{ background:`${N}06`, border:`1px solid ${N}18`, backdropFilter:"blur(12px)" }}>
              <div className="p-3 rounded-xl shrink-0 transition-all group-hover:scale-110" style={{ background:`${N}15`, color:N, boxShadow:`0 0 20px ${N}30` }}>
                <Ico className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color:"#d1fae5" }}>{u.title}</div>
                <div className="text-xs mt-0.5" style={{ color:"#065f46" }}>{u.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PromoBotanical({ p, dna, storeSlug }: any) {
  const N = "#10b981", G = "#34d399";
  const ctaHref = storeSlug ? `/store/${storeSlug}/shop` : "#products";
  return (
    <section className="relative py-32 overflow-hidden" style={{ background:"#010d08" }}>
      <style>{`@keyframes bot-wave{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.05) rotate(1deg)}}`}</style>
      {([[10,20,600,N,10],[70,60,500,G,14]] as [number,number,number,string,number][]).map(([x,y,sz,c,d],i)=>(
        <div key={i} className="nb-breathe absolute pointer-events-none" style={{ left:`${x}%`,top:`${y}%`,width:sz,height:sz,background:`radial-gradient(circle,${c}15,transparent 70%)`,borderRadius:"50%",transform:"translate(-50%,-50%)",filter:"blur(60px)",animationDuration:`${d}s`,animationDelay:`${i*3}s` }}/>
      ))}
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage:`radial-gradient(${N} 1px,transparent 1px)`, backgroundSize:"36px 36px", animation:"bot-wave 10s ease-in-out infinite" }} />
      <StarField3D color1={N} color2={G} count={60} />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8" style={{ background:`${N}15`, border:`1px solid ${N}35` }}>
          <span className="nb-breathe w-1.5 h-1.5 rounded-full" style={{ background:N }} />
          <span className="text-[11px] font-black uppercase tracking-[0.4em]" style={{ color:N }}>New Season</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-black mb-6 leading-tight nb-glow" style={{ fontFamily:"var(--hf)", color:N }}>
          {p.title || "Fresh Arrivals"}
        </h2>
        <p className="text-lg mb-12 max-w-lg mx-auto leading-loose" style={{ color:"#6ee7b7" }}>{p.subtitle || "New energy. New season. Discover what's blooming now."}</p>
        <a href={ctaHref} className="nb-drip inline-flex items-center gap-3 px-12 py-5 font-black text-sm rounded-2xl transition-all hover:scale-105 hover:-translate-y-1"
          style={{ background:`linear-gradient(135deg,${N},${G})`, color:"#010d08", boxShadow:`0 0 60px ${N}60` }}>
          🌱 {p.cta || "Explore Now"}
        </a>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SPARKLE BACKGROUND + CURSOR TRAIL + SCROLL REVEAL  (theme-15)
// ═══════════════════════════════════════════════════════════════════════════
function SparkleBackground({ count = 60, primaryColor = "#a855f7", accentColor = "#6366f1" }: { count?: number; primaryColor?: string; accentColor?: string }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i, size: Math.random() * 4 + 1, x: Math.random() * 100, y: Math.random() * 100,
    duration: Math.random() * 8 + 4, delay: Math.random() * 6,
    opacity: Math.random() * 0.6 + 0.2,
    color: i % 3 === 0 ? primaryColor : i % 3 === 1 ? accentColor : "#ffffff",
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      <style>{`
        @keyframes sparkle-float { 0%{transform:translateY(0) rotate(0deg) scale(1);opacity:var(--so)} 50%{transform:translateY(-60px) translateX(-10px) rotate(180deg) scale(.8);opacity:var(--so)} 100%{transform:translateY(-100px) translateX(5px) rotate(360deg) scale(1);opacity:0} }
        @keyframes sparkle-twinkle { 0%,100%{transform:scale(1) rotate(0deg);opacity:var(--so)} 50%{transform:scale(1.8) rotate(45deg);opacity:calc(var(--so)*2)} }
        .spark-float   { animation: sparkle-float var(--sd) var(--sdl) ease-in infinite; }
        .spark-twinkle { animation: sparkle-twinkle var(--sd) var(--sdl) ease-in-out infinite alternate; }
      `}</style>
      {particles.map(p => (
        <div key={p.id} className={p.id % 2 === 0 ? "spark-float" : "spark-twinkle"} style={{
          position:"absolute", left:`${p.x}%`, top:`${p.y}%`,
          width:`${p.size}px`, height:`${p.size}px`,
          background:p.color, borderRadius:"50%",
          boxShadow:`0 0 ${p.size*3}px ${p.size}px ${p.color}80`,
          ["--so" as any]:p.opacity, ["--sd" as any]:`${p.duration}s`, ["--sdl" as any]:`${p.delay}s`,
        }} />
      ))}
      {[[15,20,300,primaryColor,12],[75,60,250,accentColor,16],[50,80,200,primaryColor,10],[85,10,180,accentColor,14]].map(([x,y,sz,c,d],i)=>(
        <div key={`orb${i}`} style={{ position:"absolute",left:`${x}%`,top:`${y}%`,width:sz as number,height:sz as number,background:`radial-gradient(circle,${c}20 0%,${c}08 50%,transparent 70%)`,borderRadius:"50%",transform:"translate(-50%,-50%)",animation:`sparkle-twinkle ${d}s ${i*2}s ease-in-out infinite alternate` }}/>
      ))}
    </div>
  );
}

function CursorStarTrail({ primaryColor = "#a855f7", accentColor = "#6366f1" }: { primaryColor?: string; accentColor?: string }) {
  useEffect(() => {
    const colors = [primaryColor, accentColor, "#ffffff", "#f0abfc", "#818cf8"];
    let last = 0;
    const onMove = (e: MouseEvent) => {
      const now = Date.now(); if (now - last < 25) return; last = now;
      const star = document.createElement("div");
      const size = Math.random() * 10 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const driftX = (Math.random() - 0.5) * 60, driftY = -(Math.random() * 50 + 20);
      star.style.cssText = `position:fixed;left:${e.clientX-size/2}px;top:${e.clientY-size/2}px;width:${size}px;height:${size}px;pointer-events:none;z-index:999999;border-radius:${Math.random()>.4?"50%":"2px"};background:${color};box-shadow:0 0 ${size*2}px ${size*.8}px ${color}99;animation:cst-die .7s ease-out forwards;--dx:${driftX}px;--dy:${driftY}px;`;
      document.body.appendChild(star);
      setTimeout(() => star.remove(), 750);
    };
    if (!document.getElementById("cst-kf")) {
      const s = document.createElement("style"); s.id="cst-kf";
      s.textContent = "@keyframes cst-die{0%{opacity:1;transform:translate(0,0) rotate(0deg) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(360deg) scale(.2)}}";
      document.head.appendChild(s);
    }
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); document.getElementById("cst-kf")?.remove(); };
  }, [primaryColor, accentColor]);
  return null;
}

function ScrollAnimationProvider({ primaryColor = "#6366f1" }: { primaryColor?: string }) {
  useEffect(() => {
    const ATTR = "data-t15-reveal";
    const styleId = "t15-scroll-css";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      s.textContent = `[${ATTR}]{opacity:0;transform:translateY(36px);transition:opacity .65s cubic-bezier(.22,.61,.36,1),transform .65s cubic-bezier(.22,.61,.36,1)}[${ATTR}].t15-vis{opacity:1!important;transform:translateY(0)!important}#t15-bar{position:fixed;top:0;left:0;height:3px;width:0%;background:linear-gradient(90deg,${primaryColor},#a855f7,#ec4899);z-index:99998;pointer-events:none;box-shadow:0 0 10px 2px ${primaryColor}80}#t15-top{position:fixed;bottom:24px;right:24px;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${primaryColor},#a855f7);color:#fff;border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px ${primaryColor}60;opacity:0;transform:scale(.6);transition:opacity .3s,transform .3s;z-index:99998}#t15-top.show{opacity:1;transform:scale(1)}#t15-top:hover{transform:scale(1.1)}`;
      document.head.appendChild(s);
    }
    const bar = Object.assign(document.createElement("div"), { id:"t15-bar" });
    const btn = Object.assign(document.createElement("button"), { id:"t15-top", innerHTML:"↑", title:"Back to top" });
    btn.onclick = () => window.scrollTo({ top:0, behavior:"smooth" });
    document.body.append(bar, btn);
    const markAndObserve = () => {
      const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("t15-vis"); }), { threshold:.08 });
      document.querySelectorAll("[data-master-theme] [data-section-index]").forEach(el => { el.setAttribute(ATTR,"1"); obs.observe(el); });
      return obs;
    };
    let obs = markAndObserve();
    const retry = setTimeout(() => { obs.disconnect(); obs = markAndObserve(); }, 800);
    const onScroll = () => {
      const st = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = max>0 ? `${(st/max)*100}%` : "0%";
      if (st>350) btn.classList.add("show"); else btn.classList.remove("show");
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    return () => { window.removeEventListener("scroll",onScroll); obs.disconnect(); clearTimeout(retry); bar.remove(); btn.remove(); document.getElementById(styleId)?.remove(); document.getElementById("cst-kf")?.remove(); };
  }, [primaryColor]);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME-15  COSMIC 3D — deep space, sparkles, holographic
// ═══════════════════════════════════════════════════════════════════════════
function HeroHolographic3D({ p, dna, storeSlug }: any) {
  const ctaHref = p.cta_href || (storeSlug ? `/store/${storeSlug}/shop` : "#products");
  const primary = dna.palette?.primary ?? "#6366f1";
  const accent  = dna.palette?.accent  ?? "#a855f7";
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background:"linear-gradient(135deg,#050510 0%,#0d0d2b 40%,#1a0533 100%)" }}>
      <style>{`
        @keyframes holo-rotate{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(180deg) scale(1.1)}100%{transform:rotate(360deg) scale(1)}}
        @keyframes holo-float{0%,100%{transform:translateY(0px) rotateX(0deg)}50%{transform:translateY(-20px) rotateX(5deg)}}
        @keyframes holo-glow{0%,100%{box-shadow:0 0 40px ${primary}60,0 0 80px ${accent}30}50%{box-shadow:0 0 80px ${primary}90,0 0 160px ${accent}50}}
        @keyframes holo-text{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        .holo-ring{animation:holo-rotate 8s linear infinite}
        .holo-card{animation:holo-float 4s ease-in-out infinite,holo-glow 3s ease-in-out infinite}
        .holo-title{background:linear-gradient(90deg,${primary},${accent},#fff,${primary},${accent});background-size:300% 100%;animation:holo-text 4s ease infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
      `}</style>
      <SparkleBackground count={80} primaryColor={primary} accentColor={accent} />
      <CursorStarTrail primaryColor={primary} accentColor={accent} />
      <ScrollAnimationProvider primaryColor={primary} />
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage:`linear-gradient(${primary}40 1px,transparent 1px),linear-gradient(90deg,${primary}40 1px,transparent 1px)`,backgroundSize:"60px 60px",transform:"perspective(500px) rotateX(30deg)",transformOrigin:"center bottom" }} />
      {[["-top-20","-right-20","w-96","h-96",primary,8],["-bottom-10","left-10","w-64","h-64",accent,12],["top-1/3","left-5","w-48","h-48",primary,6]].map(([t,l,w,h,c,dur],i)=>(
        <div key={i} className="holo-ring absolute" style={{ top:t as string,left:l as string,width:w as string,height:h as string,border:`2px solid ${c as string}40`,borderRadius:"50%",animationDuration:`${dur}s`,boxShadow:`0 0 30px ${c as string}30` }} />
      ))}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center" style={{ perspective:"1000px" }}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-bold uppercase tracking-widest" style={{ background:`${primary}20`,border:`1px solid ${primary}50`,color:primary }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background:primary }} /> New Collection — Theme 15
        </div>
        <h1 className="holo-title text-5xl md:text-8xl font-black leading-tight mb-6" style={{ fontFamily:"var(--hf)" }}>{p.title || "Welcome to Theme 15"}</h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-white/70">{p.sub || "Experience the future of shopping with immersive 3D design"}</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href={ctaHref} className="holo-card px-8 py-4 font-bold text-sm rounded-xl text-white" style={{ background:`linear-gradient(135deg,${primary},${accent})`,border:`1px solid ${primary}80` }}>{p.cta || "Explore Catalog"}</a>
          <a href={storeSlug?`/store/${storeSlug}/shop`:"#"} className="px-8 py-4 font-bold text-sm rounded-xl" style={{ border:`1px solid ${accent}60`,color:accent,background:`${accent}10` }}>Shop All</a>
        </div>
        <div className="hidden md:flex gap-6 justify-center mt-16">
          {[{label:"Best Seller",badge:"🔥",delay:0},{label:"New Arrival",badge:"✨",delay:1},{label:"Top Pick",badge:"⚡",delay:2}].map((card,i)=>(
            <div key={i} className="holo-card px-6 py-3 rounded-2xl text-sm font-semibold" style={{ background:`linear-gradient(135deg,${primary}20,${accent}15)`,border:`1px solid ${primary}40`,color:"#fff",animationDelay:`${card.delay*.8}s`,backdropFilter:"blur(12px)" }}>{card.badge} {card.label}</div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 pointer-events-none" style={{ background:`radial-gradient(ellipse,${primary}30 0%,transparent 70%)`,filter:"blur(20px)" }} />
    </section>
  );
}

function ProductsGlass3D({ p, dna, storeSlug, storeCategory }: any) {
  const { themeId } = useParams<{ themeId: string }>();
  const primary = dna.palette?.primary ?? "#6366f1";
  const accent  = dna.palette?.accent  ?? "#a855f7";
  const items: any[] = (p.items && p.items.length > 0) ? p.items : [
    { id:"d1",name:"Crystal Sneakers",price:2999,compare_at:4999,image:"https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=60",badge:"Hot" },
    { id:"d2",name:"Neon Jacket",     price:4999,compare_at:7999,image:"https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=60",badge:"New" },
    { id:"d3",name:"Prism Tee",       price:1299,compare_at:1999,image:"https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=60",badge:"Sale" },
    { id:"d4",name:"Holo Denim",      price:2499,compare_at:3999,image:"https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=60",badge:"🔥" },
  ];
  const linkFor = (pr: any) => storeSlug && pr.id ? `/store/${storeSlug}/product/${pr.id}${themeId?`/${themeId}`:""}` : "#";
  const productCols = p.product_cols ?? 4;
  const cardWidth = p.product_card_width;
  const sectionId = p.id || "sec-glass-prod";

  return (
    <section className="relative py-20 overflow-hidden" style={{ background:"linear-gradient(135deg,#050510 0%,#0d0d2b 50%,#1a0533 100%)" }}>
      <style>{`@keyframes glass-tilt{0%,100%{transform:perspective(600px) rotateX(0) rotateY(0) translateZ(0)}25%{transform:perspective(600px) rotateX(3deg) rotateY(-3deg) translateZ(10px)}75%{transform:perspective(600px) rotateX(-3deg) rotateY(3deg) translateZ(10px)}}.glass-card{animation:glass-tilt 5s ease-in-out infinite;transform-style:preserve-3d}.glass-card:nth-child(2){animation-delay:1s}.glass-card:nth-child(3){animation-delay:2s}.glass-card:nth-child(4){animation-delay:3s}`}</style>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .dynamic-grid-${sectionId} {
            grid-template-columns: repeat(${productCols}, minmax(0, 1fr)) !important;
            display: grid !important;
          }
        }
      `}} />
      <SparkleBackground count={40} primaryColor={primary} accentColor={accent} />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {p.title && <h2 className="text-4xl md:text-5xl font-black text-center mb-12" style={{ fontFamily:"var(--hf)",background:`linear-gradient(90deg,${primary},${accent},#fff)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>{p.title}</h2>}
        <div 
          className={cardWidth 
            ? "flex flex-wrap gap-6 justify-center" 
            : `grid grid-cols-2 gap-6 dynamic-grid-${sectionId}`
          }
        >
          {items.map((pr,i)=>{
            const isOutOfStock = pr.inventory_count === 0;
            return (
              <div key={i} className={`glass-card group cursor-pointer ${isOutOfStock ? "opacity-50 grayscale" : ""}`} style={{ animationDelay:`${i*.8}s`, width: cardWidth ? `${cardWidth}px` : undefined, minWidth: cardWidth ? `${cardWidth}px` : undefined }}>
                <Link to={linkFor(pr)} className="block h-full">
                  <div className="relative rounded-2xl overflow-hidden h-full flex flex-col" style={{ background:"linear-gradient(135deg,rgba(255,255,255,.1),rgba(255,255,255,.03))",border:"1px solid rgba(255,255,255,.15)",backdropFilter:"blur(16px)",boxShadow:`0 8px 32px ${primary}25,inset 0 1px 0 rgba(255,255,255,.1)` }}>
                    <div className="aspect-square overflow-hidden relative">
                      {pr.image && <img src={pr.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                      <div className="absolute inset-0" style={{ background:`linear-gradient(to bottom,transparent 40%,${primary}60)` }} />
                      {pr.badge && <span className="absolute top-3 right-3 text-[10px] font-black px-2 py-1 rounded-lg" style={{ background:primary,color:"#fff",borderRadius:"8px" }}>{pr.badge}</span>}
                      {isOutOfStock && <span className="absolute top-3 left-3 text-[9px] font-black bg-gray-600 text-white px-2 py-1 rounded-lg z-10">OUT OF STOCK</span>}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background:"linear-gradient(135deg,rgba(255,255,255,.15) 0%,transparent 50%)" }} />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="text-sm font-bold text-white mb-2">{pr.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black" style={{ color:primary }}>₹{pr.price}</span>
                        {pr.compare_at>pr.price && <span className="text-xs line-through text-white/40">₹{pr.compare_at}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
                {storeSlug && pr.id && <div className="mt-2"><ProductCardActions storeSlug={storeSlug} product={{ id:pr.id,title:pr.name,price:pr.price,image:pr.image,inventory_count: pr.inventory_count }} primaryColor={primary} primaryFg="#ffffff" borderRadius="12px" compact storeCategory={storeCategory} /></div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Usp3DNeonBar({ p, dna }: any) {
  const primary = dna.palette?.primary ?? "#6366f1";
  const accent  = dna.palette?.accent  ?? "#a855f7";
  const items: any[] = p.items ?? [];
  if (!items.length) return null;
  return (
    <section className="relative py-12 overflow-hidden" style={{ background:"linear-gradient(90deg,#050510,#0d0d2b,#050510)" }}>
      <style>{`@keyframes neon-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.05)}}.neon-item{animation:neon-float 3s ease-in-out infinite}.neon-item:nth-child(2){animation-delay:.5s}.neon-item:nth-child(3){animation-delay:1s}.neon-item:nth-child(4){animation-delay:1.5s}`}</style>
      <div className="relative z-10 max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((u,i)=>{ const Ico=ICONS[u.icon]??Sparkles; const c=i%2===0?primary:accent; return (
          <div key={i} className="neon-item flex flex-col items-center text-center gap-3 p-5 rounded-2xl" style={{ background:"linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",border:`1px solid ${c}40`,backdropFilter:"blur(12px)",boxShadow:`0 4px 24px ${c}20,inset 0 1px 0 rgba(255,255,255,.08)` }}>
            <div className="p-3 rounded-xl" style={{ background:`${c}20`,color:c,border:`1px solid ${c}50` }}><Ico className="h-6 w-6" /></div>
            <div><div className="text-sm font-bold text-white">{u.title}</div><div className="text-xs mt-1 text-white/50">{u.sub}</div></div>
          </div>
        );})}
      </div>
    </section>
  );
}

function PromoAuroraWave({ p, dna, storeSlug }: any) {
  const primary = dna.palette?.primary ?? "#6366f1";
  const accent  = dna.palette?.accent  ?? "#a855f7";
  const ctaHref = storeSlug ? `/store/${storeSlug}/shop` : "#products";
  return (
    <section className="relative py-24 overflow-hidden text-center" style={{ background:"#050510" }}>
      <style>{`@keyframes aurora1{0%{transform:translateX(-30%) translateY(0) rotate(0deg)}50%{transform:translateX(10%) translateY(-15%) rotate(20deg) scale(1.2)}100%{transform:translateX(-30%) translateY(0) rotate(0deg)}}@keyframes aurora2{0%{transform:translateX(30%) translateY(0)}50%{transform:translateX(-10%) translateY(10%) rotate(-20deg) scale(1.15)}100%{transform:translateX(30%) translateY(0)}}@keyframes code-flash{0%,90%,100%{opacity:1}95%{opacity:.3}}.aurora-1{animation:aurora1 8s ease-in-out infinite}.aurora-2{animation:aurora2 10s ease-in-out infinite}.code-flash{animation:code-flash 3s ease-in-out infinite}`}</style>
      <div className="aurora-1 absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(ellipse 80% 60% at 20% 50%,${primary}35,transparent 60%)` }} />
      <div className="aurora-2 absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(ellipse 70% 50% at 80% 40%,${accent}30,transparent 60%)` }} />
      <SparkleBackground count={50} primaryColor={primary} accentColor={accent} />
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {p.promo_code && <div className="code-flash inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6 text-sm font-black tracking-widest" style={{ background:`${primary}20`,border:`1px solid ${primary}60`,color:primary }}>🎁 USE CODE: <span className="text-white">{p.promo_code}</span></div>}
        <h2 className="text-4xl md:text-6xl font-black mb-6 text-white leading-tight" style={{ fontFamily:"var(--hf)",textShadow:`0 0 40px ${primary}80` }}>{p.title || "Cosmic Sale"}</h2>
        <p className="text-lg text-white/60 max-w-xl mx-auto mb-10">{p.subtitle || "Limited-time offer across the entire store."}</p>
        <a href={ctaHref} className="inline-flex items-center gap-2 px-10 py-4 text-base font-black rounded-2xl text-white transition-all hover:scale-105" style={{ background:`linear-gradient(135deg,${primary},${accent})`,boxShadow:`0 8px 40px ${primary}50` }}>⚡ {p.cta || "Claim Discount"}</a>
      </div>
    </section>
  );
}

function CategoryFloatingOrbs({ p, dna, storeSlug }: any) {
  const primary = dna.palette?.primary ?? "#6366f1";
  const accent  = dna.palette?.accent  ?? "#a855f7";
  const orbColors = [primary, accent, "#ec4899", "#06b6d4", "#f59e0b", "#10b981"];
  const items: any[] = p.items ?? [];
  const hrefFor = (name: string) => storeSlug ? `/store/${storeSlug}/shop?category=${encodeURIComponent(name||"")}` : "#products";
  return (
    <section className="relative py-20 overflow-hidden" style={{ background:"linear-gradient(135deg,#050510,#0d0d2b,#1a0533)" }}>
      <style>{`@keyframes orb-float-0{0%,100%{transform:translateY(0) scale(1) rotate(0deg)}50%{transform:translateY(-20px) scale(1.05) rotate(5deg)}}@keyframes orb-float-1{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px) scale(1.08) rotate(-4deg)}}@keyframes orb-float-2{0%,100%{transform:translateY(0)}50%{transform:translateY(-25px) scale(1.06)}}@keyframes orb-float-3{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}.orb-0{animation:orb-float-0 4s ease-in-out infinite}.orb-1{animation:orb-float-1 5s ease-in-out infinite}.orb-2{animation:orb-float-2 4.5s ease-in-out infinite}.orb-3{animation:orb-float-3 5.5s ease-in-out infinite}`}</style>
      <SparkleBackground count={35} primaryColor={primary} accentColor={accent} />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {p.title && <h2 className="text-4xl md:text-5xl font-black text-center mb-12 text-white" style={{ fontFamily:"var(--hf)",textShadow:`0 0 30px ${primary}60` }}>{p.title}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {items.map((cat,i)=>{ const c=orbColors[i%orbColors.length]; return (
            <a key={i} href={hrefFor(cat.name||cat)} className={`orb-${i%4} group block`}>
              <div className="relative rounded-3xl overflow-hidden aspect-square" style={{ border:`2px solid ${c}40`,boxShadow:`0 0 30px ${c}25,0 0 60px ${c}10,inset 0 1px 0 rgba(255,255,255,.1)`,background:`radial-gradient(circle at 30% 30%,${c}30,rgba(0,0,0,.8))` }}>
                {cat.image && <img src={cat.image} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-700" />}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background:`radial-gradient(circle at 30% 20%,rgba(255,255,255,.2),transparent 60%)` }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <span className="text-base font-black text-white text-center leading-tight" style={{ textShadow:`0 0 20px ${c}` }}>{cat.name||cat}</span>
                  <span className="mt-2 text-xs font-bold px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ background:c,color:"#fff" }}>Shop →</span>
                </div>
              </div>
            </a>
          );})}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THEME 3D PAGE BACKGROUND — fixed starfield for ALL pages
// Injected by StorefrontLayout for theme-15/16/17
// ═══════════════════════════════════════════════════════════════════════════
export function Theme3DPageBackground({ themeId, palette }: { themeId: string; palette: any }) {
  const is16 = themeId.includes('style-16') || themeId.includes('talkofthetown');
  const is17 = themeId.includes('style-17');
  const color1 = is17 ? '#10b981' : is16 ? '#94a3b8' : '#6366f1';
  const color2 = is17 ? '#34d399' : is16 ? '#475569' : '#a855f7';
  const bg     = is17 ? '#010d08' : is16 ? '#050810' : '#050510';

  useEffect(() => {
    document.body.style.background = bg;
    return () => { document.body.style.background = ''; };
  }, [bg]);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: bg,
      }}
    >
      <StarField3D color1={color1} color2={color2} count={80} />
    </div>
  );
}

// ─── Named exports — delegate to the existing Header/Footer above ────────────
export { Header, Footer };

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function md(src: string): string {
  const esc = escapeHtml(src);
  const lines = esc.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const flushList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); out.push(''); continue; }
    if (line.startsWith('### ')) { flushList(); out.push(`<h3>${line.slice(4)}</h3>`); continue; }
    if (line.startsWith('## '))  { flushList(); out.push(`<h2>${line.slice(3)}</h2>`); continue; }
    if (line.startsWith('# '))   { flushList(); out.push(`<h2>${line.slice(2)}</h2>`); continue; }
    if (/^[-*]\s+/.test(line))   {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${line.replace(/^[-*]\s+/, '')}</li>`);
      continue;
    }
    flushList();
    out.push(`<p>${line}</p>`);
  }
  flushList();
  return out.join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline" target="_blank" rel="noreferrer">$1</a>');
}
