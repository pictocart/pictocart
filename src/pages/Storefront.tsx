import { useState, useEffect, useRef } from 'react';
import { generateDefaultSections } from '@/lib/defaultSections';
import { useParams, Link } from 'react-router-dom';
import { X, ArrowUp } from 'lucide-react';
import { useStorefront } from '@/hooks/useStorefront';
import { useProductReviews, getAverageRating } from '@/hooks/useReviews';
import { useWishlist } from '@/hooks/useWishlist';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import NewsletterSection from '@/components/storefront/NewsletterSection';
import ProductShareButtons from '@/components/storefront/ProductShareButtons';
import AnimatedSection from '@/components/storefront/AnimatedSection';
import WishlistButton from '@/components/storefront/WishlistButton';
import { useTrackEvent } from '@/hooks/useTrackEvent';

import SEOHead from '@/components/storefront/SEOHead';
import { DEFAULT_FOOTER, type FooterConfig } from '@/components/store-design/FooterEditor';
import { Loader2, Star, ChevronLeft, ChevronRight } from 'lucide-react';

const HeroSlider = ({ images, title, subtitle, sizeMode, useFixedHeight, heightClass, colors, fonts, borderRadius }: {
  images: string[]; title: string; subtitle?: string; sizeMode: string; useFixedHeight: boolean; heightClass: string;
  colors: any; fonts: any; borderRadius: number;
}) => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % images.length), 4000);
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  const go = (dir: number) => {
    clearInterval(timerRef.current);
    setCurrent((c) => (c + dir + images.length) % images.length);
  };

  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: colors.secondary }}>
      <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${current * 100}%)` }}>
        {images.map((img, i) => (
          useFixedHeight ? (
            <img key={i} src={img} alt={`Slide ${i + 1}`} className={`w-full shrink-0 object-cover ${heightClass}`} />
          ) : (
            <img key={i} src={img} alt={`Slide ${i + 1}`} className="w-full shrink-0 h-auto object-contain" />
          )
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 pointer-events-none">
        <h1 className="text-2xl md:text-4xl font-bold mb-3 text-center px-4" style={{ fontFamily: fonts.heading, color: '#fff' }}>{title}</h1>
        {subtitle && <p className="text-sm mb-6 max-w-md mx-auto text-center px-4 text-white/85">{subtitle}</p>}
        <a href="#products" className="inline-block px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105 pointer-events-auto" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}>
          Shop Now
        </a>
      </div>
      <button onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
      <button onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"><ChevronRight className="h-5 w-5" /></button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button key={i} onClick={() => { clearInterval(timerRef.current); setCurrent(i); }} className="rounded-full transition-all" style={{ width: i === current ? 20 : 8, height: 8, backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.5)' }} />
        ))}
      </div>
    </div>
  );
};

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
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const isOwnerPreview = searchParams.get('preview') === 'owner';
  const { store, products, loading, error } = useStorefront(slug || '', isOwnerPreview);
  const { user } = useCustomerAuth(slug || '');
  const { wishlistProductIds, toggle: toggleWishlist } = useWishlist(store?.id, user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const track = useTrackEvent();
  useEffect(() => {
    if (store?.id && !isOwnerPreview) track({ store_id: store.id, event_type: 'page_view' });
  }, [store?.id, isOwnerPreview, track]);

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
  const rawSections = Array.isArray(settings.homepage_sections) ? settings.homepage_sections : [];
  const homepageSections = rawSections.length > 0 ? rawSections : generateDefaultSections(store.name, store.category);
  const bannerCarouselSections = homepageSections.filter((section: any) => section.type === 'banner_carousel');
  const footerConfig: FooterConfig = { ...DEFAULT_FOOTER, ...(settings.footer || {}) };
  const showCategoryFilters = categories.length > 0 && !homepageSections.some((section: any) => section.type === 'category_grid');

  const renderSection = (section: any, index: number) => {
    const anim = section.animation || 'none';
    const mTop = section.marginTop ?? 0;
    const mBottom = section.marginBottom ?? 0;
    const wrapAnimated = (content: React.ReactNode) => (
      <AnimatedSection key={index} animation={anim} marginTop={mTop} marginBottom={mBottom}>
        {content}
      </AnimatedSection>
    );
    switch (section.type) {
      case 'hero':
        const heroImage = section.image || store.banner_url;
        const heroImages = section.isSlider && section.images?.length ? section.images : (heroImage ? [heroImage] : []);
        const isSlider = section.isSlider && heroImages.length > 1;
        const sizeMode = section.height || 'medium';
        const useFixedHeight = sizeMode !== 'full';
        const heightMap: Record<string, string> = { small: 'h-[200px] md:h-[250px]', medium: 'h-[300px] md:h-[400px]', large: 'h-[400px] md:h-[550px]' };
        const heroMargin = section.topMargin ? `${section.topMargin}px` : '0px';

        if (isSlider) {
          return wrapAnimated(
            <section className="relative overflow-hidden" style={{ marginTop: heroMargin }}>
              <HeroSlider
                images={heroImages}
                title={section.title || store.description || `Welcome to ${store.name}`}
                subtitle={section.subtitle}
                sizeMode={sizeMode}
                useFixedHeight={useFixedHeight}
                heightClass={heightMap[sizeMode] || ''}
                colors={colors}
                fonts={fonts}
                borderRadius={borderRadius}
              />
            </section>
          );
        }

        return wrapAnimated(
          <section className="relative overflow-hidden" style={{ backgroundColor: colors.secondary, marginTop: heroMargin }}>
            {heroImages[0] && (
              useFixedHeight ? (
                <img src={heroImages[0]} alt={section.title || 'Hero banner'} className={`w-full object-cover ${heightMap[sizeMode]}`} />
              ) : (
                <img src={heroImages[0]} alt={section.title || 'Hero banner'} className="w-full h-auto object-contain" />
              )
            )}
            <div className={heroImages[0] ? "absolute inset-0 flex flex-col items-center justify-center bg-black/30" : "py-12 md:py-16 flex flex-col items-center justify-center"}>
              <h1 className="text-2xl md:text-4xl font-bold mb-3 text-center px-4" style={{ fontFamily: fonts.heading, color: heroImages[0] ? '#fff' : colors.text }}>
                {section.title || store.description || `Welcome to ${store.name}`}
              </h1>
              {section.subtitle && <p className="text-sm mb-6 max-w-md mx-auto text-center px-4" style={{ color: heroImages[0] ? 'rgba(255,255,255,0.85)' : undefined, opacity: heroImages[0] ? 1 : 0.6 }}>{section.subtitle}</p>}
              <div className="flex items-center justify-center gap-3">
                <a href="#products" className="inline-block px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}>
                  Shop Now
                </a>
              </div>
            </div>
          </section>
        );
      case 'newsletter':
        return wrapAnimated(<NewsletterSection storeId={store.id} title={section.title} subtitle={section.subtitle} colors={colors} borderRadius={borderRadius} />);
      case 'banner_carousel':
        if (section.id !== bannerCarouselSections[0]?.id) return null;
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-6 md:py-8">
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
        return wrapAnimated(
          <section className="max-w-4xl mx-auto px-4 py-10 text-center">
            {section.image && <img src={section.image} alt="" className="w-full max-h-64 object-cover rounded-lg mb-4" />}
            {section.title && <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>{section.title}</h2>}
            {section.subtitle && <p className="text-sm opacity-60 max-w-lg mx-auto">{section.subtitle}</p>}
          </section>
        );
      case 'featured_products':
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-8">
            <h2 className="text-lg md:text-xl font-bold mb-4" style={{ fontFamily: fonts.heading }}>{section.title || 'Featured Products'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {products.slice(0, 8).map((product) => (
                <Link key={product.id} to={`/store/${slug}/product/${product.id}`} className="group overflow-hidden transition-all hover:shadow-lg" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                  <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: colors.secondary }}>
                    {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>}
                    {(product.inventory_count !== null && product.inventory_count !== undefined && product.inventory_count <= 0) && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded" style={{ backgroundColor: '#ef4444', color: '#fff' }}>Out of Stock</div>
                    )}
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
        return categories.length > 0 ? wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-8">
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
      case 'testimonials':
        const testItems = section.testimonials?.length ? section.testimonials : [
          { name: 'Happy Customer', rating: 5, quote: 'Absolutely love the quality!', avatar: '👩' },
          { name: 'Regular Buyer', rating: 5, quote: 'Fast delivery and great service!', avatar: '👨' },
          { name: 'New Fan', rating: 4, quote: 'Beautiful products, very impressed!', avatar: '👩‍💼' },
        ];
        return wrapAnimated(
          <section className="py-12 px-4" style={{ backgroundColor: colors.secondary }}>
            <h2 className="text-lg md:text-xl font-bold mb-6 text-center" style={{ fontFamily: fonts.heading }}>{section.title || 'What Our Customers Say'}</h2>
            <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-4">
              {testItems.map((t: any, ti: number) => (
                <div key={ti} className="p-5 text-center" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px` }}>
                  <span className="text-2xl">{t.avatar || '👤'}</span>
                  <div className="flex justify-center gap-0.5 my-2">
                    {Array(5).fill(0).map((_, si) => (
                      <Star key={si} className="h-3.5 w-3.5" style={{ fill: si < (t.rating || 5) ? '#facc15' : 'transparent', color: si < (t.rating || 5) ? '#facc15' : colors.text + '30' }} />
                    ))}
                  </div>
                  <p className="text-xs italic opacity-70 mb-2">"{t.quote}"</p>
                  <p className="text-xs font-semibold">{t.name}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case 'trust_badges':
        const badges = section.trustBadges?.length ? section.trustBadges : [
          { icon: '🚚', label: 'Free Shipping' }, { icon: '🔒', label: 'Secure Payment' },
          { icon: '↩️', label: 'Easy Returns' }, { icon: '💬', label: '24/7 Support' },
        ];
        return wrapAnimated(
          <section className="py-8 px-4">
            <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8">
              {badges.map((b: any, bi: number) => (
                <div key={bi} className="flex flex-col items-center gap-2 min-w-[80px]">
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-xs font-semibold text-center">{b.label}</span>
                </div>
              ))}
            </div>
          </section>
        );
      case 'countdown_timer':
        return wrapAnimated(
          <section className="py-12 px-4 text-center" style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent || colors.secondary}30)` }}>
            <h2 className="text-lg md:text-xl font-bold mb-2" style={{ fontFamily: fonts.heading }}>{section.title || '⚡ Flash Sale!'}</h2>
            {section.subtitle && <p className="text-sm opacity-60 mb-4">{section.subtitle}</p>}
            <div className="flex gap-3 justify-center">
              {['Days', 'Hrs', 'Min', 'Sec'].map(u => (
                <div key={u} className="flex flex-col items-center">
                  <div className="text-2xl font-bold px-3 py-2 rounded-lg" style={{ backgroundColor: colors.card, fontFamily: fonts.heading, color: colors.primary }}>00</div>
                  <span className="text-[10px] mt-1 opacity-50">{u}</span>
                </div>
              ))}
            </div>
          </section>
        );
      case 'brand_marquee':
        const brands = section.brands?.length ? section.brands : ['Brand A', 'Brand B', 'Brand C', 'Brand D', 'Brand E'];
        return wrapAnimated(
          <section className="py-6 overflow-hidden" style={{ backgroundColor: colors.secondary }}>
            <div className="animate-marquee flex gap-12 whitespace-nowrap">
              {[...brands, ...brands].map((b: string, bi: number) => (
                <span key={bi} className="text-base font-bold opacity-25 select-none" style={{ fontFamily: fonts.heading }}>{b}</span>
              ))}
            </div>
          </section>
        );
      case 'image_with_text':
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="h-64 rounded-xl overflow-hidden" style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}>
                {section.image && <img src={section.image} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-3" style={{ fontFamily: fonts.heading }}>{section.title || 'Our Story'}</h2>
                <p className="opacity-60 text-sm mb-4 leading-relaxed">{section.subtitle || 'Crafted with passion and purpose.'}</p>
                <a href="#products" className="inline-block px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}>Learn More</a>
              </div>
            </div>
          </section>
        );
      case 'collection_showcase':
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-12">
            <h2 className="text-lg md:text-xl font-bold mb-6 text-center" style={{ fontFamily: fonts.heading }}>{section.title || 'Shop by Collection'}</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {(categories.length > 0 ? categories.slice(0, 3) : ['New Arrivals', 'Best Sellers', 'Sale']).map((col, ci) => (
                <div key={ci} className="relative h-48 rounded-xl overflow-hidden cursor-pointer group" style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <h3 className="text-base font-bold text-white" style={{ fontFamily: fonts.heading }}>{col}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      case 'instagram_feed':
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-12">
            <h2 className="text-lg font-bold mb-2 text-center" style={{ fontFamily: fonts.heading }}>{section.title || '📸 Follow Us'}</h2>
            <p className="text-xs text-center opacity-40 mb-6">@{store.slug}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {products.slice(0, 4).map((p, pi) => (
                <div key={pi} className="aspect-square rounded-lg overflow-hidden" style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius / 2}px` }}>
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />}
                </div>
              ))}
            </div>
          </section>
        );
      case 'announcement_bar':
        return wrapAnimated(
          <div className="py-2 px-4 text-center text-sm font-medium" style={{ backgroundColor: colors.primary, color: '#fff' }}>
            {section.announcementText || section.title || '🎉 Free shipping on orders above ₹999!'}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <StorefrontLayout store={store} products={products} footerConfig={footerConfig}>
      <SEOHead title={seo.meta_title || store.name} description={seo.meta_description || store.description || `Shop at ${store.name}`} ogImage={seo.og_image || store.banner_url || undefined} url={`${window.location.origin}/store/${slug}`} />

      {homepageSections.map(renderSection)}

      {showCategoryFilters && (
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
        <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6" style={{ fontFamily: fonts.heading }}>
          {selectedCategory || 'All Products'} ({filtered.length})
        </h2>
        {filtered.length === 0 ? (
          <div className="text-center py-16 opacity-50"><p>No products available yet.</p></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((product) => (
              <Link key={product.id} to={`/store/${slug}/product/${product.id}`} className="group overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: colors.secondary }}>
                  {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>}
                  {(product.inventory_count !== null && product.inventory_count !== undefined && product.inventory_count <= 0) && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded" style={{ backgroundColor: '#ef4444', color: '#fff' }}>Out of Stock</div>
                  )}
                  <div className="absolute top-2 right-2">
                    <WishlistButton isWishlisted={wishlistProductIds.has(product.id)} onToggle={() => toggleWishlist(product.id)} isLoggedIn={!!user} primaryColor={colors.primary} />
                  </div>
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
    </StorefrontLayout>
  );
};

export default Storefront;
