import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useWishlist } from '@/hooks/useWishlist';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import WishlistButton from '@/components/storefront/WishlistButton';
import { Loader2, Heart, ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CustomerWishlist = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, products, loading: storeLoading } = useStorefront(slug || '');
  const { user } = useCustomerAuth(slug || '');
  const { wishlistItems, wishlistProductIds, toggle } = useWishlist(store?.id, user?.id);
  const theme = store ? resolveTheme(getStoreThemeTokens(store)) : null;

  if (storeLoading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { colors, fonts, borderRadius } = theme!;

  // Get full product data for wishlisted items
  const wishlistedProducts = products.filter((p) => wishlistProductIds.has(p.id));

  return (
    <StorefrontLayout store={store} products={products}>
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <Link
          to={`/store/${slug}/account`}
          className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back to account
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <Heart className="h-5 w-5" style={{ color: '#ef4444', fill: '#ef4444' }} />
          <h1 className="text-xl md:text-2xl font-bold" style={{ fontFamily: fonts.heading }}>
            My Wishlist
          </h1>
          <span className="text-sm opacity-50">({wishlistedProducts.length} items)</span>
        </div>

        {wishlistedProducts.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm opacity-50 mb-4">Your wishlist is empty</p>
            <Link
              to={`/store/${slug}`}
              className="inline-block px-6 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {wishlistedProducts.map((product) => (
              <Link
                key={product.id}
                to={`/store/${slug}/product/${product.id}`}
                className="group overflow-hidden transition-all hover:shadow-lg"
                style={{
                  backgroundColor: colors.card,
                  borderRadius: `${borderRadius}px`,
                  border: `1px solid ${colors.secondary}`,
                }}
              >
                <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: colors.secondary }}>
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-30">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <WishlistButton
                      isWishlisted={true}
                      onToggle={() => toggle(product.id)}
                      isLoggedIn={!!user}
                      primaryColor={colors.primary}
                    />
                  </div>
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-semibold truncate">{product.title}</h3>
                  <span className="text-xs font-bold" style={{ color: colors.primary }}>
                    ₹{Number(product.price).toLocaleString('en-IN')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
};

export default CustomerWishlist;
