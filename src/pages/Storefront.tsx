import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateDefaultSections } from '@/lib/defaultSections';
import { useParams, Link, Navigate } from 'react-router-dom';
import { X, ArrowUp } from 'lucide-react';
import { useStorefront } from '@/hooks/useStorefront';
import { useStorefrontBundle } from '@/hooks/useStorefrontBundle';
import { useProductReviews, getAverageRating } from '@/hooks/useReviews';
import { useWishlist } from '@/hooks/useWishlist';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreBranding, getStorefrontConfig, getStoreHomePage, getStoreThemeTokens } from '@/lib/storefrontManifest';
import { CustomPageSections } from '@/components/storefront/CustomPageSections';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import NewsletterSection from '@/components/storefront/NewsletterSection';
import ProductShareButtons from '@/components/storefront/ProductShareButtons';
import ProductCardActions from '@/components/storefront/ProductCardActions';
import AnimatedSection from '@/components/storefront/AnimatedSection';
import WishlistButton from '@/components/storefront/WishlistButton';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { THEMES, ThemeRenderer } from '@/themes';
import MasterThemeRenderer from '@/components/theme/MasterThemeRenderer';
import PromoTicker from '@/components/storefront/PromoTicker';
import PremiumTrialTicker from '@/components/storefront/PremiumTrialTicker';
import { useThemeManifest } from '@/hooks/useThemeManifest';
import { useFulfillment } from '@/hooks/useFulfillment';

import SEOHead from '@/components/storefront/SEOHead';
import { DEFAULT_FOOTER, type FooterConfig } from '@/components/store-design/FooterEditor';
import { Loader2, Star, ChevronLeft, ChevronRight, Heart, Search, ShoppingBag, Menu, ShoppingCart } from 'lucide-react';

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

const Storefront = ({ page: pageProp = 'home' }: { page?: string } = {}) => {
  let page = pageProp;
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const isOwnerPreview = searchParams.get('preview') === 'owner';
  const { store, products, loading, error } = useStorefront(slug || '', isOwnerPreview);
  const { user } = useCustomerAuth(slug || '');
  const { wishlistProductIds, toggle: toggleWishlist } = useWishlist(store?.id, user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const track = useTrackEvent();
  const { enabledModes: menuModes } = useFulfillment(store?.id);
  const menuEnabled = menuModes.includes('dine_in') || menuModes.includes('takeaway');
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

  const previewThemeId = searchParams.get('preview_theme');
  // Only set when param is present; only clear when we're on home page WITHOUT param
  // (navigating to /shop, /cart etc during preview should keep the theme active)
  if (previewThemeId) {
    localStorage.setItem('storefront_preview_theme', previewThemeId);
  } else if (!searchParams.get('preview_theme') && (page === 'home' || window.location.pathname === `/store/${slug}`)) {
    // Clear only when explicitly visiting home without preview param
    localStorage.removeItem('storefront_preview_theme');
  }
  const sessionPreviewTheme = localStorage.getItem('storefront_preview_theme');
  const branding = getStoreBranding(store);
  const storefrontConfig = getStorefrontConfig(store);
  const homePage = getStoreHomePage(store);
  const storeThemeTokens = getStoreThemeTokens(store);
  const themeData = (previewThemeId || sessionPreviewTheme)
    ? { ...(storeThemeTokens || {}), theme_id: (previewThemeId || sessionPreviewTheme), name: (previewThemeId || sessionPreviewTheme) }
    : storeThemeTokens;
  const theme = resolveTheme(themeData);
  const { colors, fonts, borderRadius } = theme;

  // Home-page routing override — let sellers point "/" at any page (WordPress-style).
  if (page === 'home') {
    const kind = homePage.kind as string | undefined;
    if (kind === 'custom' && homePage.id) {
      return <CustomHomePage store={store} themeData={themeData} />;
    }
    if (kind === 'shop') page = 'shop';
    else if (kind === 'collections') page = 'collections';
    else if (kind === 'product' && homePage.product_id) {
      return <Navigate to={`/store/${slug}/product/${homePage.product_id}`} replace />;
    }
  }

  // If the resolved theme has a dedicated React theme component (bazaar, etc),
  // render via ThemeRenderer using the storefront bundle. Falls back to the
  // generic section renderer below when the theme_id isn't registered.
  const resolvedThemeId = String((themeData as any)?.theme_id ?? (themeData as any)?.name ?? '');
  const hasDedicatedTheme = resolvedThemeId in THEMES;
  const isMasterTheme = resolvedThemeId.startsWith('theme-') || resolvedThemeId.startsWith('layout1-') || resolvedThemeId.startsWith('custom-theme-');
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const filtered = selectedCategory ? products.filter((p) => p.category === selectedCategory) : products;
  const seo = (storefrontConfig.seo || {}) as any;
  const rawSections = Array.isArray(storefrontConfig.homepage_sections) ? storefrontConfig.homepage_sections : [];
  const homepageSections = rawSections.length > 0 ? rawSections : generateDefaultSections(branding.name, branding.category);
  const bannerCarouselSections = homepageSections.filter((section: any) => section.type === 'banner_carousel') as any[];
  const footerConfig: FooterConfig = { ...DEFAULT_FOOTER, ...(storefrontConfig.footer || {}) };
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
        const heroImage = section.image || branding.banner_url;
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
              <div className="flex items-center justify-center gap-3 flex-wrap px-4">
                <a href="#products" className="inline-block px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}>
                  Shop Now
                </a>
                {menuEnabled && (
                  <Link to={`/store/${slug}/menu`} className="inline-block px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105 border-2" style={{ borderColor: '#fff', color: heroImages[0] ? '#fff' : colors.primary, borderRadius: `${borderRadius}px`, backgroundColor: heroImages[0] ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                    View Menu
                  </Link>
                )}
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
                <Link key={product.id} to={`/store/${slug}/product/${product.id}${previewThemeId ? `/${previewThemeId}` : ''}`} className="group overflow-hidden transition-all hover:shadow-lg" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                  <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: colors.secondary }}>
                    {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>}
                    {(product.inventory_count !== null && product.inventory_count !== undefined && product.inventory_count <= 0) && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded" style={{ backgroundColor: '#ef4444', color: '#fff' }}>Out of Stock</div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-semibold truncate">{product.title}</h3>
                    <span className="text-xs font-bold" style={{ color: colors.primary }}>₹{Number(product.price).toLocaleString('en-IN')}</span>
                    <ProductShareButtons productTitle={product.title} productUrl={`/store/${slug}/product/${product.id}${previewThemeId ? `/${previewThemeId}` : ''}`} productImage={product.images?.[0]} primaryColor={colors.primary} />
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
      case 'video_banner':
        const videoUrl = section.videoUrl || '';
        const videoHeight = section.height === 'large' ? 'h-[500px]' : section.height === 'small' ? 'h-[250px]' : 'h-[380px]';
        return wrapAnimated(
          <section className={`relative overflow-hidden w-full ${videoHeight}`} style={{ marginTop: section.topMargin ? `${section.topMargin}px` : '0px' }}>
            {videoUrl ? (
              <video src={videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-xs opacity-50">No video URL provided</div>
            )}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-4">
              {section.title && <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-3" style={{ fontFamily: fonts.heading }}>{section.title}</h2>}
              {section.subtitle && <p className="text-sm md:text-base text-white/80 max-w-md mb-6">{section.subtitle}</p>}
              {section.buttonText && (
                <a href={section.buttonLink || '#products'} className="px-6 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105" style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}>
                  {section.buttonText}
                </a>
              )}
            </div>
          </section>
        );
      case 'faq':
        const faqItems = section.items?.length ? section.items : [
          { q: 'What is your return policy?', a: 'We offer a 7-day hassle-free return policy for all unused items.' },
          { q: 'How long does shipping take?', a: 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days.' },
          { q: 'Do you ship internationally?', a: 'Currently we only ship within India. International shipping will be coming soon!' }
        ];
        return wrapAnimated(
          <section className="max-w-4xl mx-auto px-4 py-12">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-center" style={{ fontFamily: fonts.heading }}>{section.title || 'Frequently Asked Questions'}</h2>
            <div className="space-y-3">
              {faqItems.map((item: any, idx: number) => (
                <details key={idx} className="group border p-4 transition-all duration-300" style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px`, backgroundColor: colors.card }}>
                  <summary className="flex justify-between items-center font-semibold text-sm cursor-pointer list-none select-none">
                    <span>{item.q}</span>
                    <span className="transition group-open:rotate-180">▼</span>
                  </summary>
                  <p className="mt-3 text-xs leading-relaxed opacity-70 border-t pt-3" style={{ borderColor: colors.secondary }}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        );
      case 'blog_posts':
        const defaultPosts = [
          { title: 'Summer Style Guide: What to Wear This Season', date: 'July 15, 2026', excerpt: 'Discover the hottest trends and wardrobe essentials to keep you looking cool all summer long.', image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400' },
          { title: 'The Art of Layering: A Guide for Fashion Enthusiasts', date: 'June 28, 2026', excerpt: 'Learn how to combine different textures, lengths, and colors to create beautiful layered looks.', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400' }
        ];
        const posts = section.posts?.length ? section.posts : defaultPosts;
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-12">
            <h2 className="text-xl md:text-2xl font-bold mb-8 text-center" style={{ fontFamily: fonts.heading }}>{section.title || 'From Our Blog'}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post: any, idx: number) => (
                <article key={idx} className="overflow-hidden border flex flex-col h-full" style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px`, backgroundColor: colors.card }}>
                  <img src={post.image} alt={post.title} className="h-48 w-full object-cover" />
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider opacity-50">{post.date}</span>
                      <h3 className="text-base font-bold mt-1.5 mb-2 line-clamp-2" style={{ fontFamily: fonts.heading }}>{post.title}</h3>
                      <p className="text-xs opacity-70 mb-4 line-clamp-3 leading-relaxed">{post.excerpt}</p>
                    </div>
                    <Link to={`/store/${slug}/blog`} className="text-xs font-bold inline-block hover:opacity-80" style={{ color: colors.primary }}>Read Article →</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      case 'map_and_contact':
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid md:grid-cols-2 gap-8 items-center" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
              <div className="p-6 md:p-8 space-y-4">
                <h2 className="text-xl font-bold" style={{ fontFamily: fonts.heading }}>{section.title || 'Visit Our Store'}</h2>
                {section.subtitle && <p className="text-xs opacity-70">{section.subtitle}</p>}
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="flex gap-2">
                    <span>📍</span>
                    <div>
                      <p className="font-semibold">Address</p>
                      <p className="opacity-70">{section.address || '123 Luxury Lane, Phase 1, New Delhi - 110001'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span>⏰</span>
                    <div>
                      <p className="font-semibold">Store Hours</p>
                      <p className="opacity-70">{section.hours || 'Mon - Sun: 11:00 AM - 9:00 PM'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span>📞</span>
                    <div>
                      <p className="font-semibold">Phone</p>
                      <p className="opacity-70">{section.phone || '+91 98765 43210'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-64 md:h-full min-h-[300px] w-full relative overflow-hidden" style={{ borderRadius: `0 ${borderRadius}px ${borderRadius}px 0` }}>
                <iframe
                  title="Store Location"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, filter: 'grayscale(0.3)' }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(section.address || '123 Luxury Lane, New Delhi')}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        );
      case 'stats_counter':
        const stats = section.stats?.length ? section.stats : [
          { number: '10k+', label: 'Happy Customers' },
          { number: '15+', label: 'Cities Covered' },
          { number: '4.8★', label: 'Average Rating' },
          { number: '100%', label: 'Quality Guarantee' }
        ];
        return wrapAnimated(
          <section className="py-10 px-4" style={{ backgroundColor: colors.secondary }}>
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {stats.map((s: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: colors.card, border: `1px solid ${colors.secondary}` }}>
                  <p className="text-2xl md:text-3xl font-extrabold" style={{ color: colors.primary, fontFamily: fonts.heading }}>{s.number}</p>
                  <p className="text-[10px] md:text-xs uppercase tracking-wider opacity-60 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case 'featured_collection_carousel':
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-8">
            <h2 className="text-lg md:text-xl font-bold mb-4" style={{ fontFamily: fonts.heading }}>{section.title || 'Trending Items'}</h2>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none">
              {products.slice(0, 10).map((product) => (
                <Link 
                  key={product.id} 
                  to={`/store/${slug}/product/${product.id}${previewThemeId ? `/${previewThemeId}` : ''}`} 
                  className="min-w-[200px] md:min-w-[240px] snap-center group overflow-hidden transition-all hover:shadow-lg active:scale-[0.98] shrink-0" 
                  style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}
                >
                  <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: colors.secondary }}>
                    {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>}
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-semibold truncate">{product.title}</h3>
                    <span className="text-xs font-bold" style={{ color: colors.primary }}>₹{Number(product.price).toLocaleString('en-IN')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      case 'scrolling_announcement':
        const messages = section.messages?.length ? section.messages : [
          '⚡ GET 15% OFF WITH CODE AURORA15',
          '🚚 FREE EXPRESS SHIPPING ON ALL ORDERS',
          '🎁 FESTIVE PREMIUM GIFT WRAPPING AVAILABLE',
          '✨ 100% BUYER SATISFACTION GUARANTEED'
        ];
        return wrapAnimated(
          <div className="py-2.5 overflow-hidden flex whitespace-nowrap border-y select-none" style={{ backgroundColor: colors.primary, color: '#fff', borderColor: colors.secondary }}>
            <div className="animate-marquee flex gap-12 text-xs font-bold uppercase tracking-widest">
              {[...messages, ...messages].map((msg: string, idx: number) => (
                <span key={idx} className="mx-4">{msg}</span>
              ))}
            </div>
          </div>
        );
      case 'hero_video_split':
        const videoSplitUrl = section.videoUrl || '';
        return wrapAnimated(
          <section className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-8 items-center rounded-2xl overflow-hidden" style={{ border: `1px solid ${colors.secondary}`, backgroundColor: colors.card }}>
              <div className="h-96 w-full relative">
                {videoSplitUrl ? (
                  <video src={videoSplitUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-xs opacity-50">No video URL provided</div>
                )}
              </div>
              <div className="p-8 space-y-6">
                {section.badge && <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: colors.secondary, color: colors.primary, borderRadius: `${borderRadius / 2}px` }}>{section.badge}</span>}
                <h2 className="text-3xl font-extrabold leading-tight" style={{ fontFamily: fonts.heading }}>{section.title || 'Experience Luxury'}</h2>
                <p className="text-sm opacity-70 leading-relaxed">{section.subtitle || 'Immerse yourself in our brand story and explore items created with high craftsmanship.'}</p>
                <div className="flex gap-4">
                  <a href={section.buttonLink || '#products'} className="px-6 py-2.5 text-xs font-bold text-white transition-transform hover:scale-105" style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}>
                    {section.buttonText || 'Discover More'}
                  </a>
                </div>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  // Layout1 themes (special handling - embedded themes, not from database)
  // const isLayout1Theme = resolvedThemeId.startsWith('layout1-');
  // if (isLayout1Theme) {
  //   return <Layout1ThemeView slug={slug || ''} themeId={resolvedThemeId} seo={seo} store={store} products={products} page={page} />;
  // }

  // Master theme (AI-generated) — render manifest with Customise overrides applied.
  if (isMasterTheme) {
    return <MasterThemeView slug={slug || ''} themeId={resolvedThemeId} seo={seo} store={store} products={products} page={page} />;
  }

  // Dedicated React theme path (bazaar, etc) — short-circuit and render via ThemeRenderer.
  if (hasDedicatedTheme) {
    return <DedicatedThemeView slug={slug || ''} themeId={resolvedThemeId} seo={seo} store={store} />;
  }

  // Classic theme: simple Collections page fallback
  if (page === 'collections' || page === 'collection_detail') {
    return (
      <StorefrontLayout store={store} products={products} footerConfig={footerConfig} themeOverride={themeData}>
        <SEOHead title={`Collections · ${store.name}`} description={store.description || `Shop collections at ${store.name}`} url={`${window.location.origin}/store/${slug}/collections`} />
        <ClassicCollections slug={slug || ''} storeId={store.id} colors={colors} fonts={fonts} borderRadius={borderRadius} />
      </StorefrontLayout>
    );
  }


  return (
    <StorefrontLayout store={store} products={products} footerConfig={footerConfig} themeOverride={themeData}>
      <SEOHead title={seo.meta_title || store.name} description={seo.meta_description || store.description || `Shop at ${store.name}`} ogImage={seo.og_image || store.banner_url || undefined} url={`${window.location.origin}/store/${slug}`} />

      {homepageSections.map(renderSection)}

      {menuEnabled && (
        <section className="max-w-6xl mx-auto px-4 mt-6">
          <Link
            to={`/store/${slug}/menu`}
            className="group relative block overflow-hidden rounded-2xl p-6 md:p-8 transition-transform hover:scale-[1.01]"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent || colors.primary})` }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap text-white">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-80">Order food</p>
                <h2 className="text-2xl md:text-3xl font-bold mt-1" style={{ fontFamily: fonts.heading }}>View our Menu</h2>
                <p className="text-sm opacity-90 mt-1">
                  {menuModes.includes('dine_in') && 'Dine-in'}
                  {menuModes.includes('dine_in') && (menuModes.includes('takeaway') || menuModes.includes('delivery')) && ' · '}
                  {menuModes.includes('takeaway') && 'Takeaway'}
                  {menuModes.includes('takeaway') && menuModes.includes('delivery') && ' · '}
                  {menuModes.includes('delivery') && 'Delivery'}
                </p>
              </div>
              <span className="px-5 py-2.5 bg-white text-sm font-semibold rounded-full shadow group-hover:shadow-lg transition-shadow" style={{ color: colors.primary }}>
                Browse menu →
              </span>
            </div>
          </Link>
        </section>
      )}

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
              <Link key={product.id} to={`/store/${slug}/product/${product.id}${previewThemeId ? `/${previewThemeId}` : ''}`} className="group overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]" style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}>
                <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: colors.secondary }}>
                  {product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>}
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
                  <ProductShareButtons productTitle={product.title} productUrl={`/store/${slug}/product/${product.id}${previewThemeId ? `/${previewThemeId}` : ''}`} productImage={product.images?.[0]} primaryColor={colors.primary} />
                  <ProductCardActions storeSlug={slug!} product={product} primaryColor={colors.primary} primaryFg="#fff" borderRadius={borderRadius} />

                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </StorefrontLayout>
  );
};

/**
 * Renders a registered React theme (e.g. bazaar) using the storefront bundle.
 * Lives outside Storefront() because it needs its own React Query call (rules of hooks).
 */
const DedicatedThemeView = ({ slug, themeId, seo, store }: { slug: string; themeId: string; seo: any; store: any }) => {
  const { data: bundle, isLoading } = useStorefrontBundle({ slug });
  if (isLoading || !bundle) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <>
      <SEOHead
        title={seo.meta_title || store.name}
        description={seo.meta_description || store.description || `Shop at ${store.name}`}
        ogImage={seo.og_image || store.banner_url || undefined}
        url={`${window.location.origin}/store/${slug}`}
      />
      <ThemeRenderer themeId={themeId} bundle={bundle} />
    </>
  );
};

/**
 * Renders Layout1 themes (layout1-noir-atelier, layout1-neon-drip, etc.)
 * These are embedded themes that don't need database manifest lookup.
 */
const Layout1ThemeView = ({ slug, themeId, seo, store, products, page = 'home' }: { slug: string; themeId: string; seo: any; store: any; products: any[]; page?: string }) => {
  // Theme configuration from our Layout1 system
  const L1_THEMES: Record<string, any> = {
    "layout1-noir-atelier": {
      accent: "#c9a96e", bg: "#0d0d0d", surface: "#1a1a1a", 
      textPrimary: "#f5f0eb", textMuted: "#888", border: "#2a2a2a",
      label: "Noir Atelier", ff: "Georgia,serif", sub: "1.1"
    },
    "layout1-ivory-luxe": {
      accent: "#8b6914", bg: "#faf8f4", surface: "#f0ece4",
      textPrimary: "#1a1612", textMuted: "#8a7f72", border: "#e8e0d4",
      label: "Ivory Luxe", ff: "Georgia,serif", sub: "1.1"
    },
    "layout1-neon-drip": {
      accent: "#ff3d6b", bg: "#0f0f1a", surface: "#1a1a2e",
      textPrimary: "#f8fafc", textMuted: "#94a3b8", border: "#1e1e35",
      label: "Neon Drip", ff: "system-ui", sub: "1.2"
    },
  };

  const theme = L1_THEMES[themeId];
  if (!theme) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Theme not found</h2>
          <p className="text-sm text-muted-foreground">Layout1 theme {themeId} is not available</p>
        </div>
      </div>
    );
  }

  const NavComponent = theme.sub === "1.1" ? Layout1Nav1 : Layout1Nav2;
  
  return (
    <div style={{ backgroundColor: theme.bg, color: theme.textPrimary, minHeight: "100vh", fontFamily: "system-ui" }}>
      <SEOHead
        title={seo.meta_title || store.name}
        description={seo.meta_description || store.description || `Shop at ${store.name}`}
        ogImage={seo.og_image || store.banner_url || undefined}
        url={`${window.location.origin}/store/${slug}${page !== 'home' ? '/' + page : ''}`}
      />
      
      <NavComponent theme={theme} storeName={store.name} />
      
      <div style={{ padding: 20, textAlign: "center" }}>
        <h1 style={{ fontFamily: theme.ff, fontSize: 32, fontWeight: 900, color: theme.textPrimary, marginBottom: 16 }}>
          Welcome to {store.name}
        </h1>
        <p style={{ fontSize: 14, color: theme.textMuted, marginBottom: 20 }}>
          {store.description || `Discover amazing products at ${store.name}`}
        </p>
        
        {/* Product Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, maxWidth: 1200, margin: "0 auto" }}>
          {products.slice(0, 8).map(product => (
            <Layout1ProductCard key={product.id} product={product} theme={theme} storeSlug={slug} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Layout1 Navigation Components
const Layout1Nav1 = ({ theme, storeName }: any) => (
  <>
    <div style={{ backgroundColor: theme.accent, color: "#fff", textAlign: "center", padding: "7px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
      Free Shipping above ₹999 | New Collection Live
    </div>
    <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 32px", borderBottom: "1px solid " + theme.border, backgroundColor: theme.surface, position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ fontFamily: theme.ff, fontWeight: 900, fontSize: 17, letterSpacing: "0.25em", textTransform: "uppercase", color: theme.textPrimary }}>
        {storeName}
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        {["New In", "Shop", "About", "Contact"].map((link, i) => (
          <span key={link} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: i === 0 ? theme.accent : theme.textMuted, cursor: "pointer" }}>
            {link}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Search size={16} color={theme.textMuted} style={{ cursor: "pointer" }} />
        <Heart size={16} color={theme.textMuted} style={{ cursor: "pointer" }} />
        <ShoppingBag size={18} color={theme.textPrimary} style={{ cursor: "pointer" }} />
      </div>
    </nav>
  </>
);

const Layout1Nav2 = ({ theme, storeName }: any) => (
  <nav style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid " + theme.border, backgroundColor: theme.bg, position: "sticky", top: 0, zIndex: 50 }}>
    <Menu size={20} color={theme.textPrimary} style={{ cursor: "pointer", flexShrink: 0 }} />
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 999, border: "1px solid " + theme.border, backgroundColor: theme.bg === "#0f0f1a" ? "#ffffff0a" : "#00000008" }}>
      <Search size={13} color={theme.textMuted} />
      <span style={{ fontSize: 12, color: theme.textMuted }}>Search products...</span>
    </div>
    <div style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", flexShrink: 0, color: theme.textPrimary }}>
      {storeName}<span style={{ color: theme.accent }}>.</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, backgroundColor: theme.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
      <ShoppingCart size={13} />Cart
    </div>
  </nav>
);

// Layout1 Product Card Component  
const Layout1ProductCard = ({ product, theme, storeSlug }: any) => (
  <div 
    onClick={() => {
      const pTheme = localStorage.getItem('storefront_preview_theme');
      window.location.href = `/store/${storeSlug}/product/${product.id}${pTheme ? `/${pTheme}` : ''}`;
    }}
    style={{ 
      borderRadius: 10, overflow: "hidden", backgroundColor: theme.surface, 
      border: "1px solid " + theme.border, cursor: "pointer", 
      transition: "transform .2s" 
    }}
    onMouseEnter={(e: any) => e.currentTarget.style.transform = "translateY(-3px)"}
    onMouseLeave={(e: any) => e.currentTarget.style.transform = "none"}
  >
    <div style={{ position: "relative", height: 200 }}>
      <img 
        src={product.images?.[0] || '/api/placeholder/200/200'} 
        alt={product.name} 
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <button 
        onClick={(e: any) => e.stopPropagation()} 
        style={{ 
          position: "absolute", top: 8, right: 8, background: theme.surface + "ee", 
          border: "none", borderRadius: "50%", width: 28, height: 28, 
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" 
        }}
      >
        <Heart size={13} color={theme.accent} />
      </button>
    </div>
    <div style={{ padding: "10px 12px 12px" }}>
      <p style={{ fontFamily: theme.ff, fontSize: 12, fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>
        {product.title || product.name}
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: theme.accent }}>
          ₹{product.price?.toLocaleString("en-IN") || 'N/A'}
        </p>
        <div style={{ display: "flex", gap: 1 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} size={10} style={{ fill: s <= 4 ? "#f59e0b" : "transparent", color: "#f59e0b" }} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Renders an AI-generated master theme (theme-xxxxxx). Pulls manifest from
 * theme_master_versions and overlays per-section edits from
 * store.settings.theme_overrides.
 */
const MasterThemeView = ({ slug, themeId, seo, store, products, page = 'home' }: { slug: string; themeId: string; seo: any; store: any; products: any[]; page?: string }) => {
  const searchParams = new URLSearchParams(window.location.search);
  const previewCustom = searchParams.get('preview_custom') === '1';

  const isCustom = themeId.startsWith('custom-theme-');
  // custom-theme- IDs are stored in theme_master_versions just like theme-style- IDs.
  // Only skip the DB fetch when in preview_custom mode (which uses a base theme for layout).
  const queryThemeId = previewCustom ? 'theme-style-1' : themeId;
  const { data: dbManifest, isLoading: manifestLoading } = useThemeManifest(queryThemeId);

  const manifest = useMemo(() => {
    if (previewCustom && dbManifest) {
      const nav = searchParams.get('nav') || 'classic';
      const footer = searchParams.get('footer') || 'classic';
      const sectionsRaw = searchParams.get('sections') || 'hero:centered,category:grid_4,product:grid_clean,promo:classic_split';
      
      const parsedSections = sectionsRaw.split(',').filter(Boolean).map(item => {
        const [id, style] = item.split(':');
        return { id, style };
      });
      
      const cleanUspStyle = (val: string) => {
        if (val.includes("classic")) return "classic";
        if (val.includes("minimal_center")) return "minimal_center";
        if (val.includes("left_border")) return "left_border_columns";
        if (val.includes("card")) return "card_style";
        if (val.includes("compact")) return "compact_banner";
        if (val.includes("accent")) return "accent_row";
        return "classic";
      };

      const copy = JSON.parse(JSON.stringify(dbManifest));
      copy.header_style = nav;
      copy.footer_style = footer;

      const p_primary = searchParams.get('palette_primary');
      const p_accent = searchParams.get('palette_accent');
      const p_bg = searchParams.get('palette_bg');
      const p_fg = searchParams.get('palette_fg');
      const p_navbar_bg = searchParams.get('palette_navbar_bg');
      const f_heading = searchParams.get('font_heading');
      const f_body = searchParams.get('font_body');

      if (p_primary || p_accent || p_bg || p_fg || p_navbar_bg || f_heading || f_body) {
        copy.dna = copy.dna || {};
        copy.dna.palette = { ...copy.dna.palette };
        copy.dna.fonts = { ...copy.dna.fonts };
        
        if (p_primary) copy.dna.palette.primary = p_primary;
        if (p_accent) copy.dna.palette.accent = p_accent;
        if (p_bg) copy.dna.palette.bg = p_bg;
        if (p_fg) copy.dna.palette.fg = p_fg;
        if (p_navbar_bg) copy.dna.palette.navbar_bg = p_navbar_bg;
        if (f_heading) copy.dna.fonts.heading = f_heading;
        if (f_body) copy.dna.fonts.body = f_body;
      }
      
      if (copy.pages?.home?.sections) {
        const baseSections = copy.pages.home.sections || [];
        copy.pages.home.sections = parsedSections.map((s: any) => {
          let matchType = s.id;
          if (s.id === 'product') matchType = 'product_grid';
          if (s.id === 'category') matchType = 'category_grid';
          if (s.id === 'promo') matchType = 'promo_banner';
          if (s.id === 'usp_strip') matchType = 'usp_strip';
          if (s.id === 'new_arrivals') matchType = 'new_arrivals';

          let match = baseSections.find((b: any) => b.type === matchType);
          
          if (!match) {
            if (matchType === 'new_arrivals') {
              const pGrid = baseSections.find((b: any) => b.type === 'product_grid');
              if (pGrid) {
                match = JSON.parse(JSON.stringify(pGrid));
                match.type = 'new_arrivals';
              }
            } else if (matchType === 'usp_strip') {
              match = {
                type: 'usp_strip',
                props: {
                  title: 'Why Shop With Us',
                  items: [
                    { icon: 'Shield', title: 'Secured Checkout', sub: 'SSL Certified Payment Methods' },
                    { icon: 'Truck', title: 'Free Global Shipping', sub: 'On orders over $50' },
                    { icon: 'RefreshCw', title: 'Easy returns', sub: '30-day refund window policy' }
                  ]
                }
              };
            }
          }

          if (match) {
            const cloned = JSON.parse(JSON.stringify(match));
            cloned.props = cloned.props || {};
            cloned.props.style = s.id === 'usp_strip' ? cleanUspStyle(s.style) : s.style;
            return cloned;
          }

          return {
            type: matchType,
            props: {
              style: s.id === 'usp_strip' ? cleanUspStyle(s.style) : s.style
            }
          };
        });
      }
      return copy;
    }
    // Both theme-style- and custom-theme- manifests now come from dbManifest
    // (queryThemeId is always set to themeId, never null).
    return dbManifest ?? null;
  }, [previewCustom, dbManifest, store, window.location.search]);

  const isLoading = manifestLoading;
  const { data: sellerCategories = [] } = useQuery({
    queryKey: ['storefront-categories-full', store?.id],
    queryFn: async () => {
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
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!manifest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-8 text-center">
        <h2 className="text-lg font-semibold">Theme not found</h2>
        <p className="text-sm text-muted-foreground">The theme assigned to this store ({themeId}) hasn't been published yet.</p>
      </div>
    );
  }
  const branding = getStoreBranding(store);
  const storefrontConfig = getStorefrontConfig(store) as any;
  const overrides = storefrontConfig?.theme_overrides || {};
  const disabledPages = overrides?.disabled_pages ?? [];

  if (disabledPages.includes(page)) {
    const theme = resolveTheme(getStoreThemeTokens(store));
    const { colors, borderRadius } = theme;
    return (
      <StorefrontLayout store={store}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
          <h1 className="text-6xl font-black mb-4" style={{ color: colors.primary }}>404</h1>
          <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            This page has been disabled or is not available for this store.
          </p>
          <Link 
            to={`/store/${slug}`} 
            className="px-6 py-2.5 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}
          >
            Go Back Home
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  const headerLogo = overrides?.header?.logo_url ?? overrides?.logo_url ?? branding.logo_url ?? "";
  return (
    <>
      <SEOHead
        title={seo.meta_title || branding.name}
        description={seo.meta_description || store.description || `Shop at ${branding.name}`}
        ogImage={seo.og_image || branding.banner_url || undefined}
        url={`${window.location.origin}/store/${slug}${page !== 'home' ? '/' + page : ''}`}
      />
      {/* Customer-facing promotional ticker — also visible on master-theme storefronts */}
      <PromoTicker storeSlug={slug} config={storefrontConfig?.promo_ticker} />
      {/* Owner-only premium-theme free-trial countdown */}
      <PremiumTrialTicker storeId={store.id} storeUserId={store.user_id} settings={storefrontConfig} />
      <MasterThemeRenderer
        manifest={manifest}
        page={page}
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


const ClassicCollections = ({ slug, storeId, colors, fonts, borderRadius }: { slug: string; storeId: string; colors: any; fonts: any; borderRadius: number }) => {
  const { data: cats = [] } = useQuery({
    queryKey: ['classic-collections', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, image_url, description, parent_id, sort_order')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      return rows.filter((c) => !c.parent_id).map((p) => ({
        ...p,
        subs: rows.filter((c) => c.parent_id === p.id),
      }));
    },
  });
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-6" style={{ fontFamily: fonts.heading }}>Collections</h1>
      {cats.length === 0 ? (
        <p className="text-sm opacity-60">No collections yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {cats.map((c: any) => (
            <article key={c.id} className="overflow-hidden border" style={{ borderRadius, backgroundColor: colors.card, borderColor: colors.secondary }}>
              <Link to={`/store/${slug}/shop?category=${encodeURIComponent(c.name)}`} className="block aspect-[16/9]" style={{ backgroundColor: colors.secondary }}>
                {c.image_url && <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />}
              </Link>
              <div className="p-4">
                <h2 className="text-lg font-bold mb-1" style={{ fontFamily: fonts.heading }}>{c.name}</h2>
                {c.description && <p className="text-sm opacity-70 mb-3">{c.description}</p>}
                {c.subs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.subs.map((s: any) => (
                      <Link key={s.id} to={`/store/${slug}/shop?category=${encodeURIComponent(s.name)}`} className="text-[11px] px-2.5 py-1 rounded-full border" style={{ borderColor: colors.secondary }}>{s.name}</Link>
                    ))}
                  </div>
                )}
                <Link to={`/store/${slug}/shop?category=${encodeURIComponent(c.name)}`} className="text-sm font-medium" style={{ color: colors.primary }}>Shop {c.name} →</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const CustomHomePage = ({ store, themeData }: { store: any; themeData: any }) => {
  const { data: page, isLoading } = useQuery({
    queryKey: ['storefront-custom-home', store.id, store.home_page_id],
    enabled: !!store.home_page_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_custom_pages' as any)
        .select('*')
        .eq('id', store.home_page_id)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const theme = resolveTheme(themeData);
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!page) return <StorefrontLayout store={store} themeOverride={themeData}><div className="py-24 text-center text-sm text-muted-foreground">Home page is being prepared.</div></StorefrontLayout>;
  const seo = page.seo || {};
  return (
    <StorefrontLayout store={store} themeOverride={themeData}>
      <SEOHead
        title={seo.meta_title || store.name}
        description={seo.meta_description || page.description || store.description || ''}
        url={`${window.location.origin}/store/${store.slug}`}
      />
      <CustomPageSections sections={page.sections || []} theme={theme} storeSlug={store.slug} />
    </StorefrontLayout>
  );
};


export default Storefront;
