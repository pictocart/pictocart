import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Search, User, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useFulfillment } from '@/hooks/useFulfillment';
import { Utensils } from 'lucide-react';
import { THEME_TEMPLATES, type ThemeTemplate } from '@/lib/themes';
import BottomNav from './BottomNav';
import SearchOverlay from './SearchOverlay';
import StorefrontFooter from './StorefrontFooter';
import StorefrontAssistant from './StorefrontAssistant';
import PremiumTrialTicker from './PremiumTrialTicker';
import PromoTicker from './PromoTicker';
import SiteOfferBanner from './SiteOfferBanner';
import { usePublicNavCustomPages } from '@/hooks/useCustomPages';
import { DEFAULT_FOOTER, type FooterConfig } from '@/components/store-design/FooterEditor';

interface Props {
  children: ReactNode;
  store: {
    id?: string;
    user_id?: string | null;
    name: string;
    slug: string;
    logo_url?: string | null;
    theme?: any;
    settings?: any;
  };
  products?: any[];
  footerConfig?: FooterConfig;
}

function resolveTheme(themeData: any): ThemeTemplate {
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
  );

  return {
    ...base,
    colors: {
      ...base.colors,
      ...flattenedColors,
      ...(themeData?.colors || {}),
    },
    fonts: themeData?.fonts || base.fonts,
    borderRadius: themeData?.borderRadius ?? base.borderRadius,
  };
}

const StorefrontLayout = ({ children, store, products = [], footerConfig }: Props) => {
  const theme = resolveTheme(store.theme);
  const { colors, fonts } = theme;
  const { totalItems } = useCart(store.slug);
  const { user } = useCustomerAuth(store.slug);
  const { enabledModes } = useFulfillment(store.id);
  const menuEnabled = enabledModes.includes('dine_in') || enabledModes.includes('takeaway');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const customerName = user?.user_metadata?.full_name || user?.user_metadata?.customer_email?.split('@')?.[0] || 'Account';

  // Fallback: if parent did not pass products, fetch them so the search overlay still works on cart/account/etc.
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

  const footer = footerConfig || (store.settings as any)?.footer || DEFAULT_FOOTER;
  const headerConfig = (store.settings as any)?.header || {};

  const { data: navCustomPages = [] } = usePublicNavCustomPages(store.id);
  const customNavLinks = navCustomPages.map((p) => ({ label: p.title, href: `/p/${p.slug}` }));
  const baseNavLinks: any[] = Array.isArray(headerConfig?.nav_links) ? headerConfig.nav_links : [];
  const mergedNavLinks = [...baseNavLinks, ...customNavLinks];

  useEffect(() => {
    [fonts.heading, fonts.body].forEach((font) => {
      const id = `gfont-${font.replace(/\s+/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [fonts]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.background, color: colors.text, fontFamily: fonts.body }}>
      {/* Site-wide festive offer banner (auto-hidden when no active offer) */}
      <SiteOfferBanner storeId={store.id} />
      {/* Customer-facing promotional ticker (merchant-configurable) */}
      <PromoTicker storeSlug={store.slug} config={(store.settings as any)?.promo_ticker} />
      {/* Owner-only premium-theme free-trial countdown */}
      <PremiumTrialTicker storeId={store.id} storeUserId={store.user_id} settings={store.settings} />
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-sm" style={{ borderColor: colors.secondary + '80', backgroundColor: colors.card + 'ee' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {mergedNavLinks.length > 0 && (
              <button className="md:hidden p-1" onClick={() => setMobileMenuOpen((v) => !v)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
            <Link to={`/store/${store.slug}`} className={`flex items-center gap-2 ${headerConfig.logo_position === 'center' ? 'md:mx-auto' : ''}`}>
              {(headerConfig.logo_url || store.logo_url) && <img src={headerConfig.logo_url || store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
              {headerConfig.show_store_name !== false && (
                <span className="font-bold text-lg" style={{ fontFamily: fonts.heading }}>{store.name}</span>
              )}
            </Link>
          </div>

          {/* Desktop nav links */}
          {mergedNavLinks.length > 0 && (
            <nav className="hidden md:flex items-center" style={{ gap: `${headerConfig.nav_gap ?? 16}px` }}>
              {mergedNavLinks.map((link: any, i: number) => (
                <Link key={i} to={link.href.startsWith('/') ? `/store/${store.slug}${link.href}` : link.href || `/store/${store.slug}`} className="text-sm opacity-70 hover:opacity-100 transition-opacity" style={{ fontFamily: headerConfig.nav_font || 'inherit', fontWeight: Number(headerConfig.nav_weight || 500) }}>
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {menuEnabled && (
              <Link
                to={`/store/${store.slug}/menu`}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                <Utensils className="h-4 w-4" /> Menu
              </Link>
            )}
            <button onClick={() => setSearchOpen(true)} className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm opacity-60 hover:opacity-100 border rounded-full" style={{ borderColor: colors.secondary }}>
              <Search className="h-4 w-4" /> Search
            </button>
            {user ? (
              <Link
                to={`/store/${store.slug}/account`}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors hover:opacity-80 max-w-40"
                style={{ borderColor: colors.primary, color: colors.primary }}
                aria-label="My account"
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{customerName}</span>
              </Link>
            ) : (
              <Link
                to={`/store/${store.slug}/account/auth`}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors hover:opacity-80"
                style={{ borderColor: colors.primary, color: colors.primary }}
              >
                <User className="h-4 w-4" /> Sign in
              </Link>
            )}
            {user ? (
              <Link
                to={`/store/${store.slug}/account`}
                className="md:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full max-w-28"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{customerName}</span>
              </Link>
            ) : (
              <Link
                to={`/store/${store.slug}/account/auth`}
                className="md:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full"
                style={{ backgroundColor: colors.primary, color: '#fff' }}
              >
                <User className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
            <Link to={`/store/${store.slug}/cart`} className="relative">
              <ShoppingBag className="h-5 w-5" style={{ color: colors.text }} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center" style={{ backgroundColor: colors.primary, color: '#fff' }}>
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mergedNavLinks.length > 0 && (
          <div
            className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: mobileMenuOpen ? `${(mergedNavLinks.length * 44) + 24}px` : '0px',
              opacity: mobileMenuOpen ? 1 : 0,
              borderTop: mobileMenuOpen ? `1px solid ${colors.secondary}80` : 'none',
              backgroundColor: colors.card,
            }}
          >
            <nav className="px-4 py-3 flex flex-col gap-1">
              {mergedNavLinks.map((link: any, i: number) => (
                <Link
                  key={i}
                  to={link.href.startsWith('/') ? `/store/${store.slug}${link.href}` : link.href || `/store/${store.slug}`}
                  className="text-sm py-2 px-2 rounded hover:bg-black/5 transition-colors"
                  style={{
                    fontFamily: headerConfig.nav_font || 'inherit',
                    fontWeight: Number(headerConfig.nav_weight || 500),
                    transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-10px)',
                    opacity: mobileMenuOpen ? 1 : 0,
                    transition: `transform 0.3s ease ${i * 0.05}s, opacity 0.3s ease ${i * 0.05}s`,
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* Custom Footer */}
      <StorefrontFooter store={store} config={footer} colors={colors} />

      <BottomNav colors={colors} onSearchOpen={() => setSearchOpen(true)} storeId={store.id} />

      {searchOpen && (
        <SearchOverlay products={searchProducts} storeSlug={store.slug} colors={colors} fonts={fonts} borderRadius={theme.borderRadius} onClose={() => setSearchOpen(false)} />
      )}

      <StorefrontAssistant
        storeSlug={store.slug}
        storeName={store.name}
        colors={colors}
        fonts={fonts}
        borderRadius={theme.borderRadius}
      />
    </div>
  );
};

export default StorefrontLayout;
export { resolveTheme };
