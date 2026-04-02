import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import SEOHead from '@/components/storefront/SEOHead';
import { Loader2 } from 'lucide-react';

const Storefront = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, products, loading, error } = useStorefront(slug || '');

  if (loading) {
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

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const seo = (store.settings as any)?.seo || {};

  return (
    <StorefrontLayout store={store}>
      <SEOHead
        title={seo.meta_title || store.name}
        description={seo.meta_description || store.description || `Shop at ${store.name}`}
        ogImage={seo.og_image || store.banner_url || undefined}
        url={`${window.location.origin}/store/${slug}`}
      />
      {/* Hero */}
      <section
        className="text-center py-16 px-4"
        style={{ backgroundColor: colors.secondary }}
      >
        {store.banner_url && (
          <img
            src={store.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}
        <h1
          className="text-3xl md:text-4xl font-bold mb-3"
          style={{ fontFamily: fonts.heading }}
        >
          {store.description || `Welcome to ${store.name}`}
        </h1>
        <p className="text-sm opacity-60 mb-6 max-w-md mx-auto">
          Explore our curated collection of products
        </p>
        <a
          href="#products"
          className="inline-block px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105"
          style={{
            backgroundColor: colors.primary,
            color: '#fff',
            borderRadius: `${borderRadius}px`,
          }}
        >
          Shop Now
        </a>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1 text-xs font-medium rounded-full"
                style={{ backgroundColor: colors.secondary, color: colors.text }}
              >
                {cat}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section id="products" className="max-w-6xl mx-auto px-4 pb-16">
        <h2
          className="text-xl font-bold mb-6"
          style={{ fontFamily: fonts.heading }}
        >
          All Products
        </h2>

        {products.length === 0 ? (
          <div className="text-center py-16 opacity-50">
            <p>No products available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/store/${slug}/product/${product.id}`}
                className="group overflow-hidden transition-shadow hover:shadow-lg"
                style={{
                  backgroundColor: colors.card,
                  borderRadius: `${borderRadius}px`,
                  border: `1px solid ${colors.secondary}`,
                }}
              >
                <div
                  className="aspect-square overflow-hidden"
                  style={{ backgroundColor: colors.secondary }}
                >
                  {product.images && product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-30">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate" style={{ fontFamily: fonts.heading }}>
                    {product.title}
                  </h3>
                  {product.short_description && (
                    <p className="text-xs opacity-60 mt-1 line-clamp-2">{product.short_description}</p>
                  )}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-sm font-bold" style={{ color: colors.primary }}>
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-xs line-through opacity-40">
                        ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </StorefrontLayout>
  );
};

export default Storefront;
