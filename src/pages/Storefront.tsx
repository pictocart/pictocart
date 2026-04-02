import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import { useProductReviews, getAverageRating } from '@/hooks/useReviews';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import NewsletterSection from '@/components/storefront/NewsletterSection';
import ProductShareButtons from '@/components/storefront/ProductShareButtons';

import SEOHead from '@/components/storefront/SEOHead';
import { DEFAULT_FOOTER, type FooterConfig } from '@/components/store-design/FooterEditor';
import { Loader2, Star } from 'lucide-react';

const ProductRatingBadge = ({ productId }: { productId: string }) => {
  const { data: reviews = [] } = useProductReviews(productId);
  const { average, count } = getAverageRating(reviews);
  if (!count) return null;
  return (
    <div className="flex items-center gap-1 text-xs">
      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#16a34a', color: '#fff' }}>
        {average} <Star className="h-2.5 w-2.5" style={{ fill: '#fff' }} />
      </div>
      <span className="opacity-40">({count})</span>
    </div>
  );
};

const Storefront = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, products, loading, error } = useStorefront(slug || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error || !store) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Store not found</h1>
      <p className="text-muted-foreground">This store doesn't exist or isn't published yet.</p>
      <Link to="/" className="text-sm underline">Go home</Link>
    </div>
  );

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const filtered = selectedCategory ? products.filter((p) => p.category === selectedCategory) : products;
  const settings = (store.settings || {}) as any;
  const seo = settings.seo || {};
  const homepageSections = settings.homepage_sections || [];
  const bannerCarouselSections = homepageSections.filter((section: any) => section.type === 'banner_carousel');
  const footerConfig: FooterConfig = { ...DEFAULT_FOOTER, ...(settings.footer || {}) };

  const renderSection = (section: any, index: number) => {
    switch (section.type) {
      case 'hero':
        const heroImage = section.image || store.banner_url;
        const sizeMode = section.height || 'medium';
        const useFixedHeight = sizeMode !== 'full';
        const heightMap: Record<string, string> = { small: 'h-[200px] md:h-[250px]', medium: 'h-[300px] md:h-[400px]', large: 'h-[400px] md:h-[550px]' };
        const heroMargin = section.topMargin ? `${section.topMargin}px` : '0px';
        return (
          <section key={index} className="relative overflow-hidden" style={{ backgroundColor: colors.secondary, marginTop: heroMargin }}>
            {heroImage && (
              useFixedHeight ? (
                <img src={heroImage} alt={section.title || 'Hero banner'} className={`w-full object-cover ${heightMap[sizeMode]}`} />
              ) : (
                <img src={heroImage} alt={section.title || 'Hero banner'} className="w-full h-auto object-contain" />
              )
            )}
            <div className={heroImage ? "absolute inset-0 flex flex-col items-center justify-center bg-black/30" : "py-12 md:py-16 flex flex-col items-center justify-center"}>
              <h1 className="text-2xl md:text-4xl font-bold mb-3 text-center px-4" style={{ fontFamily: fonts.heading, color: heroImage ? '#fff' : colors.text }}>
                {section.title || store.description || `Welcome to ${store.name}`}
              </h1>
              {section.subtitle && <p className="text-sm mb-6 max-w-md mx-auto text-center px-4" style={{ color: heroImage ? 'rgba(255,255,255,0.85)' : undefined, opacity: heroImage ? 1 : 0.6 }}>{section.subtitle}</p>}
              <div className="flex items-center justify-center gap-3">
                <a href="#products" className="inline-block px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}>
                  Shop Now
                </a>
              </div>
            </div>
          </section>
        );
      case 'newsletter':
        return <NewsletterSection key={index} storeId={store.id} title={section.title} subtitle={section.subtitle} colors={colors} borderRadius={borderRadius} />;
      case 'banner_carousel':
        if (section.id !== bannerCarouselSections[0]?.id) return null;
        return (
          <section key={section.id || index} className="max-w-6xl mx-auto px-4 py-6 md:py-8">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
              {bannerCarouselSections.map((banner: any, bannerIndex: number) => (
                <article
                  key={banner.id || bannerIndex}
                  className="relative min-w-[85%] md:min-w-[48%] lg:min-w-[32%] overflow-hidden snap-center shrink-0"
                  style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
                >
                  {banner.image ? (
                    <img src={banner.image} alt={banner.title || `Banner ${bannerIndex + 1}`} className="h-44 md:h-56 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-44 md:h-56 w-full" />
                  )}
                  <div className="absolute inset-0 flex items-end bg-black/25">
                    <div className="p-4 md:p-5 text-white">
                      {banner.title && <h2 className="text-lg md:text-xl font-bold" style={{ fontFamily: fonts.heading }}>{banner.title}</h2>}
                      {banner.subtitle && <p className="mt-1 text-sm text-white/80">{banner.subtitle}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      case 'text_block':
        return (
          <section key={index} className="max-w-4xl mx-auto px-4 py-10 text-center">
            {section.image && <img src={section.image} alt="" className="w-full max-h-64 object-cover rounded-lg mb-4" />}
            {section.title && <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>{section.title}</h2>}
            {section.subtitle && <p className="text-sm opacity-60 max-w-lg mx-auto">{section.subtitle}</p>}
          </section>
        );
      case 'featured_products':
        return (
          <section key={index} className="max-w-6xl mx-auto px-4 py-8">
            <h2 className="text-lg md:text-xl font-bold mb-4" style={{ fontFamily: fonts.heading }}>{section.title || 'Featured Products'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {products.slice(0, 8).map((product) => (
                <Link key={product.id} to={`/store/${slug}/product/${product.id}`} className="group overflow-hidden transition-all hover:shadow-lg" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                  <div className="aspect-square overflow-hidden" style={{ backgroundColor: colors.secondary }}>
                    {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-semibold truncate">{product.title}</h3>
                    <span className="text-xs font-bold" style={{ color: colors.primary }}>₹{Number(product.price).toLocaleString('en-IN')}</span>
                    <ProductShareButtons productTitle={product.title} productUrl={`/store/${slug}/product/${product.id}`} productImage={product.images?.[0]} primaryColor={colors.primary} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      case 'category_grid':
        return categories.length > 0 ? (
          <section key={index} className="max-w-6xl mx-auto px-4 py-8">
            <h2 className="text-lg font-bold mb-4" style={{ fontFamily: fonts.heading }}>{section.title || 'Shop by Category'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat!)} className="p-4 text-center text-sm font-medium rounded-lg transition-colors" style={{ backgroundColor: selectedCategory === cat ? colors.primary : colors.secondary, color: selectedCategory === cat ? '#fff' : colors.text }}>
                  {cat}
                </button>
              ))}
            </div>
          </section>
        ) : null;
      default:
        return null;
    }
  };

  // If no sections configured, show default hero + products
  const hasCustomSections = homepageSections.length > 0;

  return (
    <StorefrontLayout store={store} products={products} footerConfig={footerConfig}>
      <SEOHead title={seo.meta_title || store.name} description={seo.meta_description || store.description || `Shop at ${store.name}`} ogImage={seo.og_image || store.banner_url || undefined} url={`${window.location.origin}/store/${slug}`} />

      {hasCustomSections ? (
        <>
          {homepageSections.map(renderSection)}
          {/* Always show all products after custom sections */}
          <section id="products" className="max-w-6xl mx-auto px-4 pb-16">
            <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6" style={{ fontFamily: fonts.heading }}>
              {selectedCategory || 'All Products'} ({filtered.length})
            </h2>
            {filtered.length === 0 ? (
              <div className="text-center py-16 opacity-50"><p>No products available yet.</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {filtered.map((product) => (
                  <Link key={product.id} to={`/store/${slug}/product/${product.id}`} className="group overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: colors.secondary }}>
                      {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>}
                    </div>
                    <div className="p-2.5 md:p-3">
                      <h3 className="text-xs md:text-sm font-semibold truncate" style={{ fontFamily: fonts.heading }}>{product.title}</h3>
                      {product.short_description && <p className="text-[10px] md:text-xs opacity-60 mt-0.5 line-clamp-1 md:line-clamp-2">{product.short_description}</p>}
                      <ProductRatingBadge productId={product.id} />
                      <div className="flex items-baseline gap-1.5 md:gap-2 mt-1.5">
                        <span className="text-xs md:text-sm font-bold" style={{ color: colors.primary }}>₹{Number(product.price).toLocaleString('en-IN')}</span>
                        {product.compare_at_price && product.compare_at_price > product.price && <span className="text-[10px] md:text-xs line-through opacity-40">₹{Number(product.compare_at_price).toLocaleString('en-IN')}</span>}
                      </div>
                      <ProductShareButtons productTitle={product.title} productUrl={`/store/${slug}/product/${product.id}`} productImage={product.images?.[0]} primaryColor={colors.primary} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Default hero */}
          <section className="relative overflow-hidden" style={{ backgroundColor: colors.secondary }}>
            {store.banner_url && <img src={store.banner_url} alt="Store banner" className="w-full h-[300px] md:h-[450px] object-cover" />}
            <div className={store.banner_url ? "absolute inset-0 flex flex-col items-center justify-center bg-black/30" : "py-12 md:py-16 flex flex-col items-center justify-center"}>
              <h1 className="text-2xl md:text-4xl font-bold mb-3 text-center px-4" style={{ fontFamily: fonts.heading, color: store.banner_url ? '#fff' : colors.text }}>{store.description || `Welcome to ${store.name}`}</h1>
              <p className="text-sm mb-6 max-w-md mx-auto text-center px-4" style={{ color: store.banner_url ? 'rgba(255,255,255,0.85)' : undefined, opacity: store.banner_url ? 1 : 0.6 }}>Explore our curated collection of products</p>
              <div className="flex items-center justify-center gap-3">
                <a href="#products" className="inline-block px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}>Shop Now</a>
              </div>
            </div>
          </section>

          {categories.length > 0 && (
            <section className="max-w-6xl mx-auto px-4 py-6 md:py-8">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedCategory(null)} className="px-3 py-1 text-xs font-medium rounded-full transition-colors" style={{ backgroundColor: !selectedCategory ? colors.primary : colors.secondary, color: !selectedCategory ? '#fff' : colors.text }}>All</button>
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat!)} className="px-3 py-1 text-xs font-medium rounded-full transition-colors" style={{ backgroundColor: selectedCategory === cat ? colors.primary : colors.secondary, color: selectedCategory === cat ? '#fff' : colors.text }}>{cat}</button>
                ))}
              </div>
            </section>
          )}

          <section id="products" className="max-w-6xl mx-auto px-4 pb-16">
            <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6" style={{ fontFamily: fonts.heading }}>{selectedCategory || 'All Products'} ({filtered.length})</h2>
            {filtered.length === 0 ? (
              <div className="text-center py-16 opacity-50"><p>No products available yet.</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {filtered.map((product) => (
                  <Link key={product.id} to={`/store/${slug}/product/${product.id}`} className="group overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: colors.secondary }}>
                      {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>}
                    </div>
                    <div className="p-2.5 md:p-3">
                      <h3 className="text-xs md:text-sm font-semibold truncate" style={{ fontFamily: fonts.heading }}>{product.title}</h3>
                      {product.short_description && <p className="text-[10px] md:text-xs opacity-60 mt-0.5 line-clamp-1 md:line-clamp-2">{product.short_description}</p>}
                      <ProductRatingBadge productId={product.id} />
                      <div className="flex items-baseline gap-1.5 md:gap-2 mt-1.5">
                        <span className="text-xs md:text-sm font-bold" style={{ color: colors.primary }}>₹{Number(product.price).toLocaleString('en-IN')}</span>
                        {product.compare_at_price && product.compare_at_price > product.price && <span className="text-[10px] md:text-xs line-through opacity-40">₹{Number(product.compare_at_price).toLocaleString('en-IN')}</span>}
                      </div>
                      <ProductShareButtons productTitle={product.title} productUrl={`/store/${slug}/product/${product.id}`} productImage={product.images?.[0]} primaryColor={colors.primary} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </StorefrontLayout>
  );
};

export default Storefront;
