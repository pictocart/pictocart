import { supabase } from '@/integrations/supabase/client';

export type ThemeTokens = {
  theme_id?: string | null;
  name?: string | null;
  primary?: string | null;
  primary_color?: string | null;
  secondary?: string | null;
  accent?: string | null;
  background?: string | null;
  text?: string | null;
  card?: string | null;
  colors?: Record<string, string> | null;
  fonts?: { heading?: string | null; body?: string | null } | null;
  borderRadius?: number | null;
};

export type StorefrontConfig = {
  homepage_sections?: unknown[];
  product_sections?: unknown[];
  cart_sections?: unknown[];
  checkout_sections?: unknown[];
  collection_sections?: unknown[];
  about_sections?: unknown[];
  contact_sections?: unknown[];
  header?: Record<string, unknown> | null;
  footer?: Record<string, unknown> | null;
  promo_ticker?: Record<string, unknown> | null;
  theme_overrides?: { 
    header?: Record<string, unknown>; 
    footer?: Record<string, unknown>;
    product?: Record<string, unknown>;
    cart?: Record<string, unknown>;
    checkout?: Record<string, unknown>;
  } | Record<string, unknown> | null;
  features?: Record<string, unknown> | null;
  seo?: Record<string, unknown> | null;
  show_all_products_grid?: boolean;
};

export type ThemePalette = {
  primary?: string;
  primary_fg?: string;
  accent?: string;
  bg?: string;
  surface?: string;
  fg?: string;
  muted?: string;
  border?: string;
};

/**
 * Section configuration in a theme manifest.
 * Each section has a type, optional style variant, and arbitrary props.
 */
export type SectionConfig = {
  type: string;
  style?: string;
  enabled?: boolean;
  props?: Record<string, unknown>;
};

/**
 * Page configuration in a theme manifest.
 * Contains an ordered list of sections for that page.
 */
export type PageConfig = {
  sections: SectionConfig[];
  /** Optional per-page settings (e.g., sidebar layout for shop) */
  settings?: Record<string, unknown>;
};

/**
 * Complete theme manifest structure stored in theme_master_versions.files_manifest.
 * Supports multi-page e-commerce storefronts.
 */
export type ThemeManifest = {
  dna?: {
    name?: string;
    palette?: ThemePalette;
    fonts?: { heading?: string; body?: string; heading_weight?: number };
    layout?: { header_style?: string };
    [key: string]: unknown;
  };
  header?: { is_custom_html?: boolean; html?: string; [key: string]: unknown } | null;
  footer?: { is_custom_html?: boolean; html?: string; [key: string]: unknown } | null;
  header_style?: string | null;
  footer_style?: string | null;
  header_settings?: Record<string, unknown> | null;
  /** Multi-page configuration: key = page id, value = page config */
  pages?: Record<string, PageConfig>;
};

export type ResolvedStorefrontManifest = {
  schema_version: number;
  generated_at: string;
  theme_id: string | null;
  theme_tokens: ThemeTokens | null;
  store: {
    id?: string;
    name: string;
    slug: string;
    logo_url: string | null;
    banner_url: string | null;
    category: string | null;
  };
  home_page: {
    kind: string;
    id: string | null;
    product_id: string | null;
  };
  config: StorefrontConfig;
  manifest: ThemeManifest | null;
};

export type StorefrontManifestInput = {
  id?: string;
  user_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  category?: string | null;
  created_at?: string;
  updated_at?: string;
  is_published?: boolean | null;
  theme?: ThemeTokens | null;
  theme_id?: string | null;
  theme_tokens?: ThemeTokens | null;
  settings?: StorefrontConfig | Record<string, unknown> | null;
  resolved_storefront_manifest?: ResolvedStorefrontManifest | Record<string, unknown> | null;
  home_page_kind?: string | null;
  home_page_id?: string | null;
  home_page_product_id?: string | null;
};

const MANIFEST_PREFIXES = ['theme-', 'custom-theme-', 'layout1-'];

export function getStoreThemeId(store: Partial<StorefrontManifestInput> | null | undefined): string {
  return String(store?.theme_id || store?.theme?.theme_id || store?.theme?.name || '');
}

export function isManifestThemeId(themeId: string | null | undefined): boolean {
  return !!themeId && MANIFEST_PREFIXES.some((prefix) => themeId.startsWith(prefix));
}

export async function fetchThemeManifest(themeId: string | null | undefined): Promise<ThemeManifest | null> {
  if (!isManifestThemeId(themeId)) return null;
  const { data, error } = await supabase
    .from('theme_master_versions')
    .select('files_manifest, version')
    .eq('theme_id', themeId!)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.files_manifest as ThemeManifest | null) ?? null;
}

/**
 * Builds the fully-resolved storefront snapshot for a store.
 *
 * `configOverride`, when passed, becomes the *sole* source for the
 * rendering-config portion (homepage_sections/header/footer/promo_ticker/
 * theme_overrides/features/show_all_products_grid/seo) instead of reading
 * them from `store.settings`. This is what lets callers stop writing those
 * keys into `stores.settings` entirely and keep them only in
 * `resolved_storefront_manifest.config` — avoiding the same config living in
 * two places. `store.settings` remains untouched for non-theme business data
 * (payments, shipping, fssai, policies, purchased_themes, etc).
 */
export async function buildResolvedStorefrontManifest(
  store: StorefrontManifestInput,
  configOverride?: StorefrontConfig
): Promise<ResolvedStorefrontManifest> {
  const settings = (configOverride || store.settings || {}) as StorefrontConfig;
  const themeId = getStoreThemeId(store);
  const dbManifest = await fetchThemeManifest(themeId);

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    theme_id: store.theme_id || themeId || null,
    theme_tokens: store.theme_tokens || store.theme || null,
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      logo_url: store.logo_url || null,
      banner_url: store.banner_url || null,
      category: store.category || null,
    },
    home_page: {
      kind: store.home_page_kind || 'default',
      id: store.home_page_id || null,
      product_id: store.home_page_product_id || null,
    },
    config: {
      homepage_sections: settings.homepage_sections || [],
      product_sections: settings.product_sections || [],
      cart_sections: settings.cart_sections || [],
      checkout_sections: settings.checkout_sections || [],
      collection_sections: settings.collection_sections || [],
      about_sections: settings.about_sections || [],
      contact_sections: settings.contact_sections || [],
      header: settings.header || null,
      footer: settings.footer || null,
      promo_ticker: settings.promo_ticker || null,
      theme_overrides: settings.theme_overrides || null,
      features: settings.features || null,
      seo: settings.seo || null,
      show_all_products_grid: settings.show_all_products_grid,
    },
    manifest: dbManifest,
  };
}

export function getResolvedManifest(store: Partial<StorefrontManifestInput> | null | undefined): ResolvedStorefrontManifest | null {
  const value = store?.resolved_storefront_manifest;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as ResolvedStorefrontManifest;
}

export function getStorefrontConfig(store: Partial<StorefrontManifestInput> | null | undefined): StorefrontConfig {
  const resolved = getResolvedManifest(store);
  return resolved?.config || store?.settings || {};
}

export function getStoreThemeTokens(store: Partial<StorefrontManifestInput> | null | undefined): ThemeTokens | null {
  const resolved = getResolvedManifest(store);
  return store?.theme_tokens || resolved?.theme_tokens || store?.theme || null;
}

export function getStoreBranding(store: Partial<StorefrontManifestInput> | null | undefined) {
  const resolved = getResolvedManifest(store);
  return {
    name: store?.name || resolved?.store?.name || '',
    slug: store?.slug || resolved?.store?.slug || '',
    logo_url: store?.logo_url || resolved?.store?.logo_url || null,
    banner_url: store?.banner_url || resolved?.store?.banner_url || null,
    category: store?.category || resolved?.store?.category || null,
  };
}

export function getStoreHomePage(store: Partial<StorefrontManifestInput> | null | undefined) {
  const resolved = getResolvedManifest(store);
  return {
    kind: store?.home_page_kind || resolved?.home_page?.kind || 'default',
    id: store?.home_page_id || resolved?.home_page?.id || null,
    product_id: store?.home_page_product_id || resolved?.home_page?.product_id || null,
  };
}

export function getManifestDna(manifest: ThemeManifest | null | undefined) {
  return manifest?.dna || {};
}

export function getManifestPalette(manifest: ThemeManifest | null | undefined): ThemePalette {
  return getManifestDna(manifest).palette || {};
}

export function getManifestHeader(manifest: ThemeManifest | null | undefined) {
  return manifest?.header || null;
}

export function getManifestFooter(manifest: ThemeManifest | null | undefined) {
  return manifest?.footer || null;
}

export function deriveLegacyThemeFields<T extends StorefrontManifestInput | null>(store: T): T {
  const resolved = getResolvedManifest(store);
  if (!resolved) return store;
  const branding = getStoreBranding(store);
  const config = getStorefrontConfig(store);
  const home = getStoreHomePage(store);
  const themeTokens = getStoreThemeTokens(store);
  return {
    ...store,
    theme_id: store?.theme_id || resolved?.theme_id || store?.theme?.theme_id || null,
    theme_tokens: themeTokens,
    theme: store?.theme || themeTokens,
    settings: store?.settings || config,
    name: branding.name,
    slug: branding.slug,
    logo_url: branding.logo_url,
    banner_url: branding.banner_url,
    category: branding.category,
    home_page_kind: home.kind,
    home_page_id: home.id,
    home_page_product_id: home.product_id,
  } as T;
}

/**
 * All supported page IDs in the e-commerce storefront.
 * Used for type-safe page configuration.
 */
export type PageId =
  | 'home'
  | 'shop'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'journal'
  | 'about'
  | 'contact'
  | 'account'
  | 'auth';

/**
 * Type-safe access to page configuration from a theme manifest.
 */
export function getPageConfig(manifest: ThemeManifest | null | undefined, pageId: PageId): PageConfig | undefined {
  return manifest?.pages?.[pageId];
}

/**
 * Get sections for a specific page type from storefront config
 */
export function getPageSections(store: Partial<StorefrontManifestInput> | null | undefined, pageType: string): unknown[] {
  const config = getStorefrontConfig(store);
  
  switch (pageType) {
    case 'home':
      return config.homepage_sections || [];
    case 'product':
      return config.product_sections || [];
    case 'cart':
      return config.cart_sections || [];
    case 'checkout':
      return config.checkout_sections || [];
    case 'collection':
      return config.collection_sections || [];
    case 'about':
      return config.about_sections || [];
    case 'contact':
      return config.contact_sections || [];
    default:
      return [];
  }
}

/**
 * Get theme overrides for a specific page
 */
export function getPageThemeOverrides(store: Partial<StorefrontManifestInput> | null | undefined, pageType: string): Record<string, unknown> | null {
  const config = getStorefrontConfig(store);
  const overrides = config.theme_overrides;
  
  if (!overrides || typeof overrides !== 'object') return null;
  
  return (overrides as any)[pageType] || null;
}

/**
 * Get default product page sections if not configured
 */
export function getDefaultProductSections(): unknown[] {
  return [
    {
      type: 'product_images',
      style: 'gallery',
      enabled: true,
      props: {
        showThumbnails: true,
        showZoom: true,
        galleryLayout: 'horizontal'
      }
    },
    {
      type: 'product_info',
      style: 'detailed',
      enabled: true,
      props: {
        showPrice: true,
        showDescription: true,
        showVariants: true,
        showQuantity: true,
        showAddToCart: true,
        showWishlist: true,
        showShare: true
      }
    },
    {
      type: 'product_reviews',
      style: 'tabbed',
      enabled: true,
      props: {
        showRating: true,
        showReviewForm: true,
        showReviewStats: true
      }
    },
    {
      type: 'related_products',
      style: 'carousel',
      enabled: true,
      props: {
        title: 'Related Products',
        count: 8,
        layout: 'grid'
      }
    },
    {
      type: 'recently_viewed',
      style: 'horizontal_scroll',
      enabled: true,
      props: {
        title: 'Recently Viewed',
        count: 6
      }
    }
  ];
}