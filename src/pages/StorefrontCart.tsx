import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens, getStoreThemeId, getStorefrontConfig, getStoreBranding } from '@/lib/storefrontManifest';
import { useCart } from '@/hooks/useCart';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { Loader2, Minus, Plus, Trash2, ShoppingBag, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { useThemeManifest } from '@/hooks/useThemeManifest';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MasterThemeRenderer from '@/components/theme/MasterThemeRenderer';
import SEOHead from '@/components/storefront/SEOHead';

const StorefrontCart = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const isOwnerPreview = searchParams.get('preview') === 'owner';
  const { store, products, loading, error } = useStorefront(slug || '', isOwnerPreview);

  const themeId = store ? getStoreThemeId(store) || "" : "";
  const { data: dbManifest, isLoading: manifestLoading } = useThemeManifest(themeId);

  const { data: sellerCategories = [] } = useQuery({
    queryKey: ['storefront-categories-full', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, image_url, description, parent_id, sort_order')
        .eq('store_id', store.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const parents = rows.filter((c) => !c.parent_id);
      return parents.map((p) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        description: p.description,
        subs: rows.filter((c) => c.parent_id === p.id).map((c) => ({ id: c.id, name: c.name, image_url: c.image_url })),
      }));
    },
    enabled: !!store?.id,
  });

  if (loading || manifestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Store not found</h1>
        <p className="text-muted-foreground">This store doesn't exist or isn't published yet.</p>
        <Link to="/" className="text-sm underline">Go home</Link>
      </div>
    );
  }

  if (!dbManifest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-8 text-center">
        <h2 className="text-lg font-semibold">Theme not found</h2>
        <p className="text-sm text-muted-foreground">The theme assigned to this store hasn't been published yet.</p>
      </div>
    );
  }

  const branding = getStoreBranding(store);
  const storefrontConfig = getStorefrontConfig(store) as any;
  const overrides = storefrontConfig?.theme_overrides || {};
  const headerLogo = overrides?.header?.logo_url ?? overrides?.logo_url ?? branding.logo_url ?? "";

  return (
    <>
      <SEOHead
        title={`Your Cart - ${branding.name}`}
        description={`Checkout items in your cart at ${branding.name}`}
        url={`${window.location.origin}/store/${slug}/cart`}
      />
      <MasterThemeRenderer
        manifest={dbManifest}
        page="cart"
        overrides={{
          ...overrides,
          category: branding.category,
          brand_name: overrides?.brand_name || branding.name,
          header: { ...(overrides?.header || {}), logo_url: headerLogo },
        }}
        storeSlug={slug}
        products={products}
        sellerCategories={sellerCategories}
      />
    </>
  );
};

export default StorefrontCart;
