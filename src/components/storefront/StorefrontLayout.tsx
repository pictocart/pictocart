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

function resolveTheme(themeData: ThemeTokens | null | undefined): ThemeTemplate {
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

  return {
    ...base,
    colors: {
      ...base.colors,
      ...flattenedColors,
      ...(themeData?.colors || {}),
    },
    fonts: {
      heading: themeData?.fonts?.heading || base.fonts.heading,
      body: themeData?.fonts?.body || base.fonts.body,
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
  const theme = resolveTheme(themeOverride || storeThemeTokens);
  const { colors, fonts } = theme;
  const { totalItems } = useCart(store.slug);
  const { user } = useCustomerAuth(store.slug);
  const { enabledModes } = useFulfillment(store.id);
  const menuEnabled = enabledModes.includes('dine_in') || enabledModes.includes('takeaway');
  const [searchOpen, setSearchOpen] = useState(false);
  const customerName = user?.user_metadata?.full_name || user?.user_metadata?.customer_email?.split('@')?.[0] || 'Account';

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
  // When using a manifest-based theme (theme-style-*), the manifest palette takes
  // priority so the dark/custom bg, fg, primary colors are respected on all pages.
  const mergedPalette = isThemeManifestTheme && Object.keys(manifestPalette).length > 0
    ? {
        ...((themeOverride?.colors || storeThemeTokens?.colors || {}) as LooseRecord),
        ...manifestPalette,
      }
    : {
        ...manifestPalette,
        ...((themeOverride?.colors || storeThemeTokens?.colors || {}) as LooseRecord),
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

  const headingFont = (baseDna.fonts?.heading as string | undefined) || fonts.heading;
  const bodyFont = (baseDna.fonts?.body as string | undefined) || fonts.body;
  const headerStyle = (manifestData?.header_style || baseDna.layout?.header_style || 'classic') as string;
  const brandName = branding.name || (baseDna.name as string | undefined) || store.name;
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
    themeId.includes('theme-style-17')
  );

  return (
    <div className="min-h-screen flex flex-col" style={layoutStyleObj}>
      {is3DTheme && <Theme3DPageBackground themeId={themeId} palette={mergedPalette} />}
      <SiteOfferBanner storeId={store.id} />
      <PromoTicker storeSlug={store.slug} config={storefrontConfig?.promo_ticker} />
      <PremiumTrialTicker storeId={store.id} storeUserId={store.user_id} settings={storefrontConfig} />

      {isThemeManifestTheme && manifestData ? (
        headerManifest?.is_custom_html && headerManifest?.html ? (
          <div dangerouslySetInnerHTML={{ __html: String(headerManifest.html) }} />
        ) : (
          <ThemeHeader dna={{ ...baseDna, palette: mergedPalette }} brandName={brandName} variant={headerStyle} storeSlug={store.slug} headerOv={headerOv} />
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
        />
      )}

      <main className="flex-1 pb-16 md:pb-0 relative" style={{ zIndex: 1 }}>{children}</main>

      {isThemeManifestTheme && manifestData ? (
        footerManifest?.is_custom_html && footerManifest?.html ? (
          <div dangerouslySetInnerHTML={{ __html: String(footerManifest.html) }} />
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

      <BottomNav colors={extendedColors} onSearchOpen={() => setSearchOpen(true)} storeId={store.id} />

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

      <StorefrontAssistant
        storeSlug={store.slug}
        storeName={brandName}
        colors={extendedColors}
        fonts={{ heading: headingFont, body: bodyFont }}
        borderRadius={theme.borderRadius}
      />
    </div>
  );
};

export default StorefrontLayout;
export { resolveTheme };
