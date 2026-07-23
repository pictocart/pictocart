import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorefront, useStorefrontProduct } from '@/hooks/useStorefront';
import { useThemeManifest } from '@/hooks/useThemeManifest';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import MasterThemeRenderer from '@/components/theme/MasterThemeRenderer';
import ProductPageRenderer from '@/components/storefront/ProductPageRenderer';
import SEOHead from '@/components/storefront/SEOHead';
import PromoTicker from '@/components/storefront/PromoTicker';
import {
  getStoreThemeTokens,
  getStorefrontConfig,
  getStoreThemeId,
  getStoreBranding,
  isManifestThemeId,
} from '@/lib/storefrontManifest';
import { Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// MasterProductView — mirror of MasterThemeView in Storefront.tsx
// Uses the same manifest (files_manifest.pages.product) so the product page
// inherits the exact same header, footer, palette, fonts, and section layout
// that the designer defined for this theme.
// ─────────────────────────────────────────────────────────────────────────────
const MasterProductView = ({
  slug,
  themeId,
  store,
  product,
  products,
}: {
  slug: string;
  themeId: string;
  store: any;
  product: any;
  products: any[];
}) => {
  const { data: manifest, isLoading } = useThemeManifest(themeId);

  const branding = getStoreBranding(store);
  const storefrontConfig = getStorefrontConfig(store) as any;
  const overrides = storefrontConfig?.theme_overrides || {};
  const headerLogo = overrides?.header?.logo_url ?? overrides?.logo_url ?? branding.logo_url ?? '';

  // Inject real product data into manifest overrides so sections like
  // product_detail, product_images, product_info can read it.
  const productOverrides = useMemo(() => ({
    ...overrides,
    category: branding.category,
    brand_name: overrides?.brand_name || branding.name,
    header: { ...(overrides?.header || {}), logo_url: headerLogo },
    // Pass actual product so manifest product-page sections can render it
    product,
  }), [overrides, branding, headerLogo, product]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If the manifest has no pages.product sections defined, fall back to
  // the classic ProductPageRenderer so the page is never blank.
  const hasProductPage = (manifest as any)?.pages?.product?.sections?.length > 0;

  if (!hasProductPage) {
    // Manifest exists but designer didn't define a product page layout —
    // render with classic layout but still use theme's colors/fonts via
    // StorefrontLayout which reads the manifest for header/footer.
    const storeThemeTokens = getStoreThemeTokens(store);
    const theme = resolveTheme(storeThemeTokens);
    const relatedProducts = products
      .filter((p: any) => p.id !== product.id && p.category === product.category)
      .slice(0, 8);

    return (
      <>
        <PromoTicker storeSlug={slug} config={storefrontConfig?.promo_ticker} />
        <StorefrontLayout store={store} products={products} themeOverride={storeThemeTokens}>
          <SEOHead
            title={`${product.title} · ${store.name}`}
            description={product.description || `Buy ${product.title} from ${store.name}`}
            url={`${window.location.origin}/store/${slug}/product/${product.id}`}
            ogImage={product.images?.[0]}
          />
          <ProductPageRenderer
            store={store}
            product={product}
            relatedProducts={relatedProducts}
            theme={theme}
            slug={slug || ''}
            products={products}
          />
        </StorefrontLayout>
      </>
    );
  }

  // Happy path: manifest defines pages.product — render it through
  // MasterThemeRenderer exactly like the home page, just with page="product".
  return (
    <>
      <SEOHead
        title={`${product.title} · ${store.name}`}
        description={product.description || `Buy ${product.title} from ${store.name}`}
        url={`${window.location.origin}/store/${slug}/product/${product.id}`}
        ogImage={product.images?.[0]}
      />
      <PromoTicker storeSlug={slug} config={storefrontConfig?.promo_ticker} />
      <MasterThemeRenderer
        manifest={manifest}
        page="product"
        overrides={productOverrides}
        storeSlug={slug}
        products={products}
        product={product}
        store={store}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StorefrontProduct — route entry point for /store/:slug/product/:productId
// ─────────────────────────────────────────────────────────────────────────────
const StorefrontProduct = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string; themeId: string }>();

  // Strip any legacy theme-id suffix from productId (old URL format)
  const cleanProductId = productId
    ? productId.replace(/-theme-style-\d+$/, '').replace(/-custom-theme-\d+$/, '')
    : '';

  const { store, products, loading: storeLoading } = useStorefront(slug || '');
  const { data: dbProduct, isLoading: productLoading } = useStorefrontProduct(
    store?.id,
    cleanProductId || ''
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (storeLoading || productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store || !dbProduct) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="text-muted-foreground">This product doesn't exist or isn't available.</p>
        <Link to={`/store/${slug}`} className="text-sm underline">
          Back to store
        </Link>
      </div>
    );
  }

  const themeId = getStoreThemeId(store);
  const isMasterTheme = isManifestThemeId(themeId);

  // ── Master / AI-generated theme ─────────────────────────────────────────
  // Same path as MasterThemeView on the home page — reads manifest.pages.product
  if (isMasterTheme) {
    return (
      <MasterProductView
        slug={slug || ''}
        themeId={themeId}
        store={store}
        product={dbProduct}
        products={products}
      />
    );
  }

  // ── Classic / legacy theme ───────────────────────────────────────────────
  // No manifest, use store.settings.product_sections (or defaults)
  const storeThemeTokens = getStoreThemeTokens(store);
  const theme = resolveTheme(storeThemeTokens);
  const relatedProducts = products
    .filter((p: any) => p.id !== dbProduct.id && p.category === dbProduct.category)
    .slice(0, 8);

  return (
    <StorefrontLayout store={store} products={products} themeOverride={storeThemeTokens}>
      <SEOHead
        title={`${dbProduct.title} · ${store.name}`}
        description={dbProduct.description || `Buy ${dbProduct.title} from ${store.name}`}
        url={`${window.location.origin}/store/${slug}/product/${productId}`}
        ogImage={dbProduct.images?.[0]}
      />
      <ProductPageRenderer
        store={store}
        product={dbProduct}
        relatedProducts={relatedProducts}
        theme={theme}
        slug={slug || ''}
        products={products}
      />
    </StorefrontLayout>
  );
};

export default StorefrontProduct;
