import { useEffect, useState, type ReactNode } from 'react';
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
      {/* Theme-aware sticky navbar */}
      <ThemeNavbar
        store={store}
        colors={colors}
        fonts={fonts}
        borderRadius={theme.borderRadius}
        navStyle={theme.preview?.navStyle ?? 'top'}
        totalItems={totalItems}
        user={user}
        customerName={customerName}
        menuEnabled={menuEnabled}
        mergedNavLinks={mergedNavLinks}
        headerConfig={headerConfig}
        onSearchOpen={() => setSearchOpen(true)}
      />

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
