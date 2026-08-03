import { useEffect, useState, useRef, useMemo, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChefHat, GripVertical, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useFulfillment } from '@/hooks/useFulfillment';
import { THEME_TEMPLATES, type ThemeTemplate } from '@/lib/themes';
import BottomNav from './BottomNav';
import SearchOverlay from './SearchOverlay';
import StorefrontFooter from './StorefrontFooter';
import StorefrontAssistant from './StorefrontAssistant';
import PremiumTrialTicker from './PremiumTrialTicker';
import PromoTicker from './PromoTicker';
import SiteOfferBanner from './SiteOfferBanner';
import ThemeNavbar from './ThemeNavbar';
import CustomerAuthModal from './CustomerAuthModal';
import { usePublicNavCustomPages } from '@/hooks/useCustomPages';
import { DEFAULT_FOOTER, type FooterConfig } from '@/components/store-design/FooterEditor';
import { useThemeManifest } from '@/hooks/useThemeManifest';
import { Header as ThemeHeader, Footer as ThemeFooter, Theme3DPageBackground } from '@/components/theme/MasterThemeRenderer';
import {
  getManifestDna,
  getManifestFooter,
  getManifestHeader,
  getManifestPalette,
  getResolvedManifest,
  getStoreBranding,
  getStorefrontConfig,
  getStoreThemeId,
  getStoreThemeTokens,
  type ThemeManifest,
  type ThemeTokens,
} from '@/lib/storefrontManifest';

type LooseRecord = Record<string, any>;
type StoreLike = {
  id?: string;
  user_id?: string | null;
  name: string;
  slug: string;
  logo_url?: string | null;
  theme?: ThemeTokens | null;
  settings?: LooseRecord | null;
  resolved_storefront_manifest?: Record<string, unknown> | null;
  theme_id?: string | null;
  theme_tokens?: ThemeTokens | null;
  category?: string | null;
};

type ExtendedColors = ThemeTemplate['colors'] & {
  primary_fg?: string;
  surface?: string;
  muted?: string;
  border?: string;
};

interface Props {
  children: ReactNode;
  store: StoreLike;
  products?: any[];
  footerConfig?: FooterConfig;
  themeOverride?: ThemeTokens | null;
}

export function resolveTheme(themeData: ThemeTokens | null | undefined, store?: any): ThemeTemplate {
  const base = THEME_TEMPLATES.find((t) => t.id === themeData?.name) || THEME_TEMPLATES[0];
  const flattenedColors = Object.fromEntries(
    Object.entries({
      primary: themeData?.primary || themeData?.primary_color,
      secondary: themeData?.secondary,
      accent: themeData?.accent,
      background: themeData?.background,
      text: themeData?.text,
      card: themeData?.card,
    }).filter(([, value]) => typeof value === 'string' && value.length > 0)
  ) as Partial<ThemeTemplate['colors']>;

  const resolved = store?.resolved_storefront_manifest;
  const manifestPalette = resolved?.manifest?.dna?.palette || {};
  const storefrontConfig = getStorefrontConfig(store);
  const customPalette = storefrontConfig?.theme_overrides?.palette || {};

  const mergedColors = {
    ...base.colors,
    ...flattenedColors,
    ...(themeData?.colors || {}),
  };

  const themeId = themeData?.theme_id || store?.theme_id || '';
  const isThemeManifestTheme = !!themeId && (themeId.startsWith('theme-') || themeId.startsWith('custom-theme-') || themeId.startsWith('layout1-'));

  if (isThemeManifestTheme && (Object.keys(manifestPalette).length > 0 || Object.keys(customPalette).length > 0)) {
    const combinedPalette = { ...manifestPalette, ...customPalette };
    if (combinedPalette.primary) mergedColors.primary = combinedPalette.primary;
    if (combinedPalette.surface) {
      mergedColors.secondary = combinedPalette.surface;
      mergedColors.card = combinedPalette.surface;
    }
    if (combinedPalette.accent) mergedColors.accent = combinedPalette.accent;
    if (combinedPalette.bg) mergedColors.background = combinedPalette.bg;
    if (combinedPalette.fg) mergedColors.text = combinedPalette.fg;
  }

  if (store?.category === 'food' && !isThemeManifestTheme) {
    mergedColors.primary = '#8c2d19';
    mergedColors.secondary = '#faf6f0';
    mergedColors.accent = '#8c2d19';
    mergedColors.background = '#faf6f0';
    mergedColors.text = '#2a1b15';
    mergedColors.card = '#faf6f0';
  }

  const headingFont = resolved?.manifest?.dna?.fonts?.heading || themeData?.fonts?.heading || base.fonts.heading;
  const bodyFont = resolved?.manifest?.dna?.fonts?.body || themeData?.fonts?.body || base.fonts.body;

  return {
    ...base,
    colors: mergedColors,
    fonts: {
      heading: headingFont,
      body: bodyFont,
    },
    borderRadius: themeData?.borderRadius ?? base.borderRadius,
  };
}

function normalizeFooterConfig(input: LooseRecord | null | undefined): FooterConfig {
  return {
    ...DEFAULT_FOOTER,
    ...(input || {}),
  };
}

const StorefrontLayout = ({ children, store, products = [], footerConfig, themeOverride }: Props) => {
  const branding = getStoreBranding(store);
  const storefrontConfig = getStorefrontConfig(store) as LooseRecord;
  const resolvedManifest = getResolvedManifest(store);
  const storeThemeTokens = getStoreThemeTokens(store);
  const theme = resolveTheme(themeOverride || storeThemeTokens, store);
  const { colors, fonts } = theme;
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart(store.slug);
  const { user } = useCustomerAuth(store.slug);
  const { enabledModes } = useFulfillment(store.id);
  const menuEnabled = enabledModes.includes('dine_in') || enabledModes.includes('takeaway');
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const customerName = user?.user_metadata?.full_name || user?.user_metadata?.customer_email?.split('@')?.[0] || 'Account';

  // Floating Live Status Tracker States with Instant Cache Loading
  const [activeOrders, setActiveOrders] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`active_orders_cache_${store.slug}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isClosed, setIsClosed] = useState(false);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(`tracker_pos_${store.slug}`);
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
        // Double cheery high-pitch chime sound
        o.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        o.start();
        o.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        o.stop(ctx.currentTime + 0.4);
      } else {
        // Cheery success rising chime sound
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
      localStorage.setItem(`tracker_pos_${store.slug}`, JSON.stringify(position));
    } catch (err) {}

    // Redirect or expand based on status of isClosed
    if (!hasMoved) {
      if (isClosed) {
        setIsClosed(false);
      } else {
        navigate(`/store/${store.slug}/account`);
      }
    }
  };

  // Realtime subscription setup
  useEffect(() => {
    if (!store.slug) return;
    const orderIdsKey = `placed_order_ids_${store.slug}`;
    
    const checkActiveOrders = async () => {
      let ids: string[] = [];
      try {
        ids = JSON.parse(localStorage.getItem(orderIdsKey) || '[]');
      } catch {
        return;
      }
      if (ids.length === 0) {
        setActiveOrders([]);
        localStorage.removeItem(`active_orders_cache_${store.slug}`);
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
        localStorage.setItem(`active_orders_cache_${store.slug}`, JSON.stringify(data));
      } else {
        setActiveOrders([]);
        localStorage.removeItem(`active_orders_cache_${store.slug}`);
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
                localStorage.setItem(`active_orders_cache_${store.slug}`, JSON.stringify(updated));
              } else {
                localStorage.removeItem(`active_orders_cache_${store.slug}`);
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

    const broadcastChannel = supabase.channel(`store_kitchen_${store.slug}`)
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
              localStorage.setItem(`active_orders_cache_${store.slug}`, JSON.stringify(updated));
            } else {
              localStorage.removeItem(`active_orders_cache_${store.slug}`);
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
  }, [store.slug]);

  const themeId = themeOverride?.theme_id || getStoreThemeId(store) || '';
  const isThemeManifestTheme = !!themeId && (themeId.startsWith('theme-') || themeId.startsWith('custom-theme-') || themeId.startsWith('layout1-'));

  // Always fetch the theme manifest when using a manifest-based theme.
  // This ensures preview_theme works correctly even when the store has a
  // cached resolved_storefront_manifest from a different theme.
  const { data: dbManifest } = useThemeManifest(isThemeManifestTheme ? themeId : null);

  // Prefer dbManifest when the theme IDs don't match (e.g. during preview),
  // otherwise fall back to the store's resolved manifest snapshot.
  const resolvedManifestThemeId = (resolvedManifest as any)?.theme_id as string | undefined;
  const useDbManifest = isThemeManifestTheme && (
    !resolvedManifest?.manifest ||
    (resolvedManifestThemeId && resolvedManifestThemeId !== themeId)
  );
  const manifestData = ((useDbManifest ? dbManifest : resolvedManifest?.manifest) || dbManifest || null) as ThemeManifest | null;
  const baseDna = getManifestDna(manifestData) as LooseRecord;
  const manifestPalette = getManifestPalette(manifestData) as LooseRecord;
  const customPalette = storefrontConfig?.theme_overrides?.palette || {};

  // When using a manifest-based theme (theme-style-*), the manifest palette and customizer palette take
  // priority so the dark/custom bg, fg, primary colors are respected on all pages.
  const mergedPalette = isThemeManifestTheme && (Object.keys(manifestPalette).length > 0 || Object.keys(customPalette).length > 0)
    ? {
        ...((themeOverride?.colors || storeThemeTokens?.colors || {}) as LooseRecord),
        ...manifestPalette,
        ...customPalette,
      }
    : {
        ...manifestPalette,
        ...((themeOverride?.colors || storeThemeTokens?.colors || {}) as LooseRecord),
        ...customPalette,
      };
  const headerManifest = getManifestHeader(manifestData) as LooseRecord | null;
  const footerManifest = getManifestFooter(manifestData) as LooseRecord | null;

  const extendedColors: ExtendedColors = {
    ...colors,
    primary: String(mergedPalette.primary || colors.primary),
    secondary: String(mergedPalette.surface || mergedPalette.secondary || colors.secondary),
    accent: String(mergedPalette.accent || colors.accent),
    background: String(mergedPalette.bg || mergedPalette.background || colors.background),
    text: String(mergedPalette.fg || mergedPalette.text || colors.text),
    card: String(mergedPalette.surface || mergedPalette.card || colors.card),
    primary_fg: typeof mergedPalette.primary_fg === 'string' ? mergedPalette.primary_fg : '#ffffff',
    surface: typeof mergedPalette.surface === 'string' ? mergedPalette.surface : colors.card,
    muted: typeof mergedPalette.muted === 'string' ? mergedPalette.muted : '#888888',
    border: typeof mergedPalette.border === 'string' ? mergedPalette.border : colors.secondary,
  };

  if (store?.category === 'food' && !isThemeManifestTheme) {
    extendedColors.primary = '#8c2d19';
    extendedColors.secondary = '#faf6f0';
    extendedColors.accent = '#8c2d19';
    extendedColors.background = '#faf6f0';
    extendedColors.text = '#2a1b15';
    extendedColors.card = '#faf6f0';
    extendedColors.primary_fg = '#ffffff';
    extendedColors.surface = '#faf6f0';
    extendedColors.muted = '#706053';
    extendedColors.border = 'rgba(140, 45, 25, 0.12)';
  }

  const headingFont = (baseDna.fonts?.heading as string | undefined) || fonts.heading;
  const bodyFont = (baseDna.fonts?.body as string | undefined) || fonts.body;
  const headerStyle = (manifestData?.header_style || baseDna.layout?.header_style || 'classic') as string;
  const brandName = branding.name || (baseDna.name as string | undefined) || store.name;
  
  const storeCategory = store?.category || storefrontConfig?.theme_overrides?.category || (manifestData as any)?.store?.category || "";
  const isFoodLayout = storeCategory === "food" || (
    themeId === "theme-70904877" || 
    themeId === "theme-bee17452" || 
    !!(manifestData?.dna?.name?.toLowerCase().includes('gourmet') || 
      manifestData?.dna?.name?.toLowerCase().includes('food') || 
      manifestData?.dna?.name?.toLowerCase().includes('restaurant'))
  );

  const headerOv: LooseRecord = {
    logo_url: branding.logo_url || '',
    brand_name: brandName,
    ...((manifestData?.header_settings || {}) as LooseRecord),
    ...((storefrontConfig?.theme_overrides?.header || {}) as LooseRecord),
  };

  useEffect(() => {
    const hasCustomHtml = !!headerManifest?.is_custom_html || !!footerManifest?.is_custom_html;
    if (hasCustomHtml) {
      const id = 'tailwind-play-cdn';
      if (!document.getElementById(id)) {
        const script = document.createElement('script');
        script.id = id;
        script.src = 'https://cdn.tailwindcss.com';
        document.head.appendChild(script);
      }
    }
  }, [headerManifest, footerManifest]);

  const { data: fetchedProducts = [] } = useQuery({
    queryKey: ['storefront-layout-products', store.id],
    enabled: !!store.id && products.length === 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, images, category')
        .eq('store_id', store.id!)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  const searchProducts = products.length > 0 ? products : fetchedProducts;

  const footer = normalizeFooterConfig((footerConfig as LooseRecord) || storefrontConfig?.footer);
  const headerConfig = (storefrontConfig?.header || {}) as LooseRecord;

  const { data: navCustomPages = [] } = usePublicNavCustomPages(store.id);
  const customNavLinks = navCustomPages.map((p) => ({ label: p.title, href: `/p/${p.slug}` }));
  const baseNavLinks = Array.isArray(headerConfig?.nav_links) ? headerConfig.nav_links : [];
  const mergedNavLinks = [...baseNavLinks, ...customNavLinks];

  const { data: sellerCategories = [] } = useQuery({
    queryKey: ['storefront-layout-categories', store.id],
    enabled: !!store.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, emoji, parent_id')
        .eq('store_id', store.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const headerHtml = useMemo(() => {
    if (!headerManifest?.is_custom_html || !headerManifest?.html) return '';
    let html = String(headerManifest.html).replace(/{STORE_NAME}/g, brandName || '');

    // A. Substitute Brand Name Suffix/Underscore
    const suffix = headerOv.brand_suffix !== undefined ? headerOv.brand_suffix : "_";
    html = html.replace(/(class="[^"]*?font-black[^"]*?">)_(<\/span>)/g, `$1${suffix}$2`);
    html = html.replace(/font-black">_<\/span>/g, `font-black">${suffix}</span>`);

    // A2. Toggle Brand name text display visibility
    if (headerOv.show_name === false) {
      html = html.replace(/<span class="font-extrabold text-xl[^>]*>[\s\S]*?<\/span>\s*<\/span>/g, '');
    }

    // B. Toggle Pincode Display Banner visibility
    if (headerOv.show_pincode_banner === false) {
      html = html.replace(/<!-- (Pincode Display Block|Pincode setup)[\s\S]*?<!-- Light \/ Dark Mode Toggle Button -->/, '<!-- Light / Dark Mode Toggle Button -->');
    }

    // C. Toggle Search Bar visibility (Desktop & Mobile)
    if (headerOv.show_search_bar === false) {
      html = html.replace(/<!-- (Desktop Search Bar Input|Search Bar)[\s\S]*?<!-- (Pincode Display Block|Pincode setup)[^>]*?-->/, (match, p1, p2) => {
        return `<!-- ${p2} -->`;
      });
      html = html.replace(/<!-- Mobile Search Input inside drawer[\s\S]*?<!-- Sidebar Links[^>]*?-->/, '<!-- Sidebar Links -->');
    }

    // D. Toggle Light/Dark Mode button visibility
    if (headerOv.show_theme_toggle === false) {
      html = html.replace(/<!-- Light \/ Dark Mode Toggle Button -->[\s\S]*?<\/button>/, '');
    }

    // 1. Substitute Logo Image if uploaded
    if (headerOv.logo_url) {
      const logoShapeClass = headerOv.logo_shape === 'circle' ? 'rounded-full object-cover w-8 h-8 shrink-0' : 'rounded-none object-contain h-8 shrink-0';
      const logoHtml = `<img src="${headerOv.logo_url}" alt="${brandName}" class="${logoShapeClass} mr-2" />`;
      html = html.replace(/<span class="font-extrabold text-xl md:text-2xl tracking-wide font-sans lowercase">/g, `${logoHtml}<span class="font-extrabold text-xl md:text-2xl tracking-wide font-sans lowercase">`);
      html = html.replace(/<span class="font-extrabold text-xl tracking-wide font-sans text-white lowercase">/g, `${logoHtml}<span class="font-extrabold text-xl tracking-wide font-sans text-white lowercase">`);
    }

    // 2. Substitute Navigation links dynamically
    const navLinks = headerOv.nav_links || [
      { label: isFoodLayout ? "Our Menu" : "Shop", page: "shop" },
      { label: "Collections", page: "collections" },
      { label: "About", page: "about" },
      { label: "Journal", page: "journal" },
      { label: "Contact", page: "contact" }
    ];
    const pageToQuery: Record<string, string> = {
      home: "", shop: isFoodLayout ? "?page=menu" : "?page=shop", collections: "?page=collections", about: "?page=about", contact: "?page=contact",
      journal: "?page=journal", blog: "?page=journal", account: "?page=account", cart: "?page=cart",
    };
    const linksHtml = navLinks.map((link: any) => {
      const pageQuery = pageToQuery[link.page] ?? `?page=${link.page}`;
      const onClickAttr = `window.location.search = '${pageQuery}'`;
      return `<a class="hover:text-[#12daa8] py-1 transition-colors cursor-pointer" onclick="${onClickAttr}">${link.label}</a>`;
    }).join('\n');
    html = html.replace(/<nav class="flex flex-col gap-3 font-semibold text-sm">[\s\S]*?<\/nav>/, `<nav class="flex flex-col gap-3 font-semibold text-sm">${linksHtml}</nav>`);

    // 3. Substitute Catalog Categories dynamically
    if (sellerCategories && sellerCategories.length > 0) {
      const categoriesHtml = sellerCategories.filter((c: any) => !c.parent_id).map((cat: any) => {
        const emoji = cat.emoji || "📁";
        return `<a class="hover:text-white transition-colors cursor-pointer" onclick="window.location.search = '?category=${cat.id}'">${emoji} ${cat.name}</a>`;
      }).join('\n');
      html = html.replace(/<nav class="flex flex-col gap-3 font-medium text-xs text-neutral-400">[\s\S]*?<\/nav>/, `<nav class="flex flex-col gap-3 font-medium text-xs text-neutral-400">${categoriesHtml}</nav>`);
    }

    return html;
  }, [headerManifest, brandName, headerOv, isFoodLayout, sellerCategories]);

  const footerHtml = useMemo(() => {
    if (!footerManifest?.is_custom_html || !footerManifest?.html) return '';
    return String(footerManifest.html).replace(/{STORE_NAME}/g, brandName || '');
  }, [footerManifest, brandName]);

  useEffect(() => {
    [headingFont, bodyFont].forEach((font) => {
      const id = `gfont-${font.replace(/\s+/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [headingFont, bodyFont]);

  const layoutStyleObj: React.CSSProperties = {
    backgroundColor: extendedColors.background,
    color: extendedColors.text,
    fontFamily: bodyFont,
    ['--p' as any]: extendedColors.primary,
    ['--pf' as any]: extendedColors.primary_fg || '#ffffff',
    ['--ac' as any]: extendedColors.accent,
    ['--bg' as any]: extendedColors.background,
    ['--sf' as any]: extendedColors.surface || extendedColors.card,
    ['--fg' as any]: extendedColors.text,
    ['--mu' as any]: extendedColors.muted || '#888888',
    ['--bd' as any]: extendedColors.border || extendedColors.secondary,
    ['--r' as any]: `${theme.borderRadius}px`,
    ['--hf' as any]: `${headingFont}, serif`,
  };

  // Detect 3D themes for global background
  const is3DTheme = isThemeManifestTheme && (
    themeId.includes('theme-style-15') ||
    themeId.includes('theme-style-16') ||
    themeId.includes('theme-talkofthetown') ||
    themeId.includes('theme-style-17')
  );

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

  const hslBg = hexToHsl(extendedColors.background);
  const hslFg = hexToHsl(extendedColors.text);
  const hslCard = hexToHsl(extendedColors.card || extendedColors.surface);
  const hslBorder = hexToHsl(extendedColors.border || extendedColors.secondary);
  const hslMuted = hexToHsl(extendedColors.muted || '#888888');
  const hslPrimary = hexToHsl(extendedColors.primary);
  const hslAccent = hexToHsl(extendedColors.accent);
  const hslSecondary = hexToHsl(extendedColors.secondary || extendedColors.border);

  return (
    <div className="min-h-screen flex flex-col storefront-root" style={layoutStyleObj}>
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          background-color: hsl(${hslBg}) !important;
          color: hsl(${hslFg}) !important;
        }
        .storefront-root {
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
      ` }} />
      {is3DTheme && <Theme3DPageBackground themeId={themeId} palette={mergedPalette} />}
      <SiteOfferBanner storeId={store.id} />
      {store?.category !== 'food' && (
        <PromoTicker
          storeSlug={store.slug}
          config={
            storefrontConfig?.promo_ticker ||
            (store.settings as any)?.promo_ticker ||
            undefined
          }
        />
      )}
      <PremiumTrialTicker storeId={store.id} storeUserId={store.user_id} settings={storefrontConfig} />

      {isThemeManifestTheme && manifestData ? (
        headerManifest?.is_custom_html && headerManifest?.html ? (
          <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: headerHtml }} />
        ) : (
          <ThemeHeader dna={{ ...baseDna, palette: mergedPalette }} brandName={brandName} variant={headerStyle} storeSlug={store.slug} headerOv={headerOv} storeCategory={store.category} isFoodLayout={isFoodLayout} />
        )
      ) : (
        <ThemeNavbar
          store={{ name: brandName, slug: store.slug, logo_url: branding.logo_url }}
          colors={extendedColors}
          fonts={{ heading: headingFont, body: bodyFont }}
          borderRadius={theme.borderRadius}
          navStyle={theme.preview?.navStyle ?? 'top'}
          totalItems={totalItems}
          user={user}
          customerName={customerName}
          menuEnabled={menuEnabled}
          mergedNavLinks={mergedNavLinks}
          headerConfig={headerConfig}
          onSearchOpen={() => setSearchOpen(true)}
          onAuthOpen={() => setAuthOpen(true)}
        />
      )}

      <main className="flex-1 pb-16 md:pb-0 relative" style={{ zIndex: 1 }}>{children}</main>

      {isThemeManifestTheme && manifestData ? (
        footerManifest?.is_custom_html && footerManifest?.html ? (
          <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: footerHtml }} />
        ) : (
          <div data-section-anchor="footer" style={{ scrollMarginTop: 80 }}>
            <ThemeFooter
              footer={footerManifest as any}
              dna={{ ...baseDna, palette: mergedPalette }}
              brandName={brandName}
              storeSlug={store.slug}
              footerOv={(storefrontConfig?.theme_overrides?.footer || {}) as any}
              hasPolicies={true}
              variant={String(manifestData.footer_style || storefrontConfig?.theme_overrides?.footer?.style || '')}
            />
          </div>
        )
      ) : (
        <StorefrontFooter store={{ name: brandName, slug: store.slug }} config={footer} colors={extendedColors} />
      )}

      {searchOpen && (
        <SearchOverlay
          products={searchProducts}
          storeSlug={store.slug}
          colors={extendedColors}
          fonts={{ heading: headingFont, body: bodyFont }}
          borderRadius={theme.borderRadius}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {authOpen && !user && (
        <CustomerAuthModal
          storeSlug={store.slug}
          storeName={brandName}
          primaryColor={extendedColors.primary}
          cardColor={extendedColors.card}
          borderColor={extendedColors.border || extendedColors.secondary}
          textColor={extendedColors.text}
          borderRadius={theme.borderRadius}
          onClose={() => setAuthOpen(false)}
        />
      )}

      {/* <StorefrontAssistant
        storeSlug={store.slug}
        storeName={brandName}
        colors={extendedColors}
        fonts={{ heading: headingFont, body: bodyFont }}
        borderRadius={theme.borderRadius}
      /> */}

      {store?.category === 'food' && activeOrders && activeOrders.length > 0 && (
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
              className="w-76 bg-stone-950/95 backdrop-blur border border-stone-800 text-stone-100 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-3 transition-all duration-300"
              style={{ borderRadius: `${theme.borderRadius * 1.5}px` }}
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
};

export default StorefrontLayout;
