import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStorefront, useStorefrontProduct } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import SEOHead from '@/components/storefront/SEOHead';
import ReviewSection from '@/components/storefront/ReviewSection';
import ProductShareButtons from '@/components/storefront/ProductShareButtons';
import ProductImageSwiper from '@/components/storefront/ProductImageSwiper';
import MobileAddToCart from '@/components/storefront/MobileAddToCart';
import WishlistButton from '@/components/storefront/WishlistButton';
import TrustBadges from '@/components/storefront/TrustBadges';
import ProductAccordion from '@/components/storefront/ProductAccordion';
import RelatedProducts from '@/components/storefront/RelatedProducts';
import VariantSelector from '@/components/storefront/VariantSelector';
import { useCart } from '@/hooks/useCart';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { useEffect } from 'react';
import { useProductReviews, getAverageRating } from '@/hooks/useReviews';
import { useWishlist } from '@/hooks/useWishlist';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Loader2, Minus, Plus, ChevronRight, ShoppingBag, Check, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';

const StorefrontProduct = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();
  const { store, products, loading: storeLoading } = useStorefront(slug || '');
  const { data: product, isLoading: productLoading } = useStorefrontProduct(store?.id, productId || '');
  const { addItem } = useCart(slug || '');
  const { data: reviews = [] } = useProductReviews(productId || '');
  const { user } = useCustomerAuth(slug || '');
  const { wishlistProductIds, toggle: toggleWishlist } = useWishlist(store?.id, user?.id);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [imageZoom, setImageZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const reviewsRef = useRef<HTMLDivElement>(null);
  const track = useTrackEvent();
  useEffect(() => {
    if (store?.id && product?.id) {
      track({ store_id: store.id, event_type: 'product_view', product_id: product.id, value: Number(product.price) });
    }
  }, [store?.id, product?.id, product?.price, track]);

  if (storeLoading || productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link to={`/store/${slug}`} className="text-sm underline">Back to store</Link>
      </div>
    );
  }

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;
  const images = product.images || [];
  const { average, count } = getAverageRating(reviews);
  const isOutOfStock = product.inventory_count !== null && product.inventory_count !== undefined && product.inventory_count <= 0;
  const variants = Array.isArray(product.variants) ? product.variants as { name: string; values: string[] }[] : [];
  const aiData = (product.ai_generated_data || {}) as Record<string, any>;
  const highlights = aiData.highlights as string[] | undefined;
  const metadata = Object.fromEntries(
    Object.entries(aiData).filter(([k]) => !['highlights', 'product_type'].includes(k)).map(([k, v]) => [k, String(v)])
  );
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;
  const variantLabel = Object.values(selectedVariants).filter(Boolean).join(' / ');

  const handleAddToCart = () => {
    if (isOutOfStock) { toast.error('This product is currently out of stock'); return; }
    addItem({
      productId: product.id,
      title: product.title,
      price: Number(product.price),
      image: images[0] || null,
      variant: variantLabel || undefined,
    }, quantity);
    track({ store_id: store.id, event_type: 'add_to_cart', product_id: product.id, value: Number(product.price) * quantity });
    setAdded(true);
    toast.success(`${product.title} added to cart`);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) { toast.error('This product is currently out of stock'); return; }
    addItem({
      productId: product.id,
      title: product.title,
      price: Number(product.price),
      image: images[0] || null,
      variant: variantLabel || undefined,
    }, quantity);
    track({ store_id: store.id, event_type: 'add_to_cart', product_id: product.id, value: Number(product.price) * quantity, metadata: { source: 'buy_now' } });
    navigate(`/store/${slug}/cart`);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <StorefrontLayout store={store} products={products}>
      <SEOHead
        title={product.seo_title || `${product.title} | ${store.name}`}
        description={product.seo_description || product.short_description || product.description?.slice(0, 160) || undefined}
        ogImage={images[0] || undefined}
        url={`${window.location.origin}/store/${slug}/product/${productId}`}
        type="product"
        product={{
          price: Number(product.price),
          currency: 'INR',
          sku: product.sku || undefined,
          images: images.length ? images : undefined,
          brand: store.name,
        }}
      />
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs opacity-50 mb-4 md:mb-6 product-page-enter">
          <Link to={`/store/${slug}`} className="hover:opacity-100 transition-opacity">Home</Link>
          <ChevronRight className="h-3 w-3" />
          {product.category && (
            <>
              <span>{product.category}</span>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="opacity-70 truncate max-w-[200px]">{product.title}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          {/* Images */}
          <div className="product-slide-in-left">
            {/* Mobile swiper */}
            <div className="md:hidden">
              <ProductImageSwiper images={images} title={product.title} colors={colors} borderRadius={borderRadius} />
            </div>
            {/* Desktop: Thumbnail rail + main image */}
            <div className="hidden md:flex gap-3">
              {images.length > 1 && (
                <div className="flex flex-col gap-2 w-16 shrink-0">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onMouseEnter={() => setSelectedImage(i)}
                      onClick={() => setSelectedImage(i)}
                      className="w-16 h-16 overflow-hidden border-2 transition-all duration-200"
                      style={{
                        borderRadius: `${borderRadius / 2}px`,
                        borderColor: i === selectedImage ? colors.primary : colors.secondary,
                        opacity: i === selectedImage ? 1 : 0.6,
                      }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div
                className="flex-1 aspect-square overflow-hidden relative cursor-crosshair"
                style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
                onMouseEnter={() => setImageZoom(true)}
                onMouseLeave={() => setImageZoom(false)}
                onMouseMove={handleMouseMove}
              >
                {images[selectedImage] ? (
                  <img
                    src={images[selectedImage]}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-300"
                    style={{
                      transform: imageZoom ? 'scale(2)' : 'scale(1)',
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm opacity-30">No image</div>
                )}
                {discount > 0 && (
                  <span className="absolute top-3 left-3 px-2 py-1 text-xs font-bold rounded" style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                    {discount}% OFF
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-5 product-fade-in-right">
            {product.category && (
              <span className="inline-block px-3 py-1 text-[11px] font-medium rounded-full" style={{ backgroundColor: colors.secondary }}>
                {product.category}
              </span>
            )}

            <h1 className="text-xl md:text-3xl font-bold leading-tight" style={{ fontFamily: fonts.heading }}>
              {product.title}
            </h1>

            {/* Rating summary — clickable */}
            {count > 0 && (
              <button
                onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 group"
              >
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                  {average} <Star className="h-3 w-3" style={{ fill: '#fff' }} />
                </div>
                <span className="text-sm opacity-50 group-hover:opacity-80 transition-opacity">
                  {count} review{count !== 1 ? 's' : ''} →
                </span>
              </button>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl md:text-3xl font-bold" style={{ color: colors.primary }}>
                ₹{Number(product.price).toLocaleString('en-IN')}
              </span>
              {discount > 0 && (
                <>
                  <span className="text-base md:text-lg line-through opacity-40">
                    ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#16a34a20', color: '#16a34a' }}>
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>

            {product.short_description && (
              <p className="text-sm opacity-70 leading-relaxed">{product.short_description}</p>
            )}

            {/* Variant Selector */}
            <VariantSelector
              variants={variants}
              selected={selectedVariants}
              onChange={(name, value) => setSelectedVariants((prev) => ({ ...prev, [name]: value }))}
              colors={colors}
              borderRadius={borderRadius}
            />

            {/* Quantity + CTA — desktop */}
            <div className="hidden md:block space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Quantity</span>
                <div className="flex items-center border" style={{ borderColor: colors.secondary, borderRadius: `${borderRadius / 2}px` }}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:opacity-70"><Minus className="h-4 w-4" /></button>
                  <span className="px-4 text-sm font-medium min-w-[40px] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:opacity-70"><Plus className="h-4 w-4" /></button>
                </div>
              </div>

              {isOutOfStock ? (
                <div className="w-full py-3.5 text-sm font-semibold text-center opacity-60" style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}>
                  Out of Stock
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 border-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      borderColor: added ? '#16a34a' : colors.primary,
                      color: added ? '#16a34a' : colors.primary,
                      backgroundColor: added ? '#16a34a10' : 'transparent',
                      borderRadius: `${borderRadius}px`,
                    }}
                  >
                    {added ? <><Check className="h-4 w-4" /> Added!</> : <><ShoppingBag className="h-4 w-4" /> Add to Cart</>}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: colors.primary,
                      color: '#fff',
                      borderRadius: `${borderRadius}px`,
                    }}
                  >
                    <Zap className="h-4 w-4" /> Buy Now
                  </button>
                </div>
              )}
            </div>

            {/* Share & Wishlist */}
            <div className="flex items-center gap-3 pt-1">
              <WishlistButton
                isWishlisted={wishlistProductIds.has(product.id)}
                onToggle={() => toggleWishlist(product.id)}
                isLoggedIn={!!user}
                primaryColor={colors.primary}
                size="md"
              />
              <ProductShareButtons
                productTitle={product.title}
                productUrl={`/store/${slug}/product/${productId}`}
                productImage={product.images?.[0]}
                primaryColor={colors.primary}
              />
            </div>

            {/* Trust Badges */}
            <TrustBadges colors={colors} borderRadius={borderRadius} category={store.category} />

            {/* Product Accordion */}
            <ProductAccordion
              description={product.description}
              highlights={highlights}
              metadata={Object.keys(metadata).length > 0 ? metadata : undefined}
              colors={colors}
              fonts={fonts}
            />

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 text-[10px] font-medium rounded-full" style={{ backgroundColor: colors.accent + '40' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div ref={reviewsRef}>
          <ReviewSection
            productId={productId!}
            storeId={store.id}
            storeSlug={slug!}
            colors={colors}
            fonts={fonts}
            borderRadius={borderRadius}
          />
        </div>

        {/* Related Products */}
        <RelatedProducts
          storeId={store.id}
          storeSlug={slug!}
          currentProductId={productId!}
          category={product.category}
          colors={colors}
          fonts={fonts}
          borderRadius={borderRadius}
          wishlistProductIds={wishlistProductIds}
          isLoggedIn={!!user}
          onToggleWishlist={toggleWishlist}
        />
      </div>

      {/* Mobile floating CTA */}
      <MobileAddToCart
        price={Number(product.price)}
        comparePrice={product.compare_at_price}
        onAdd={handleAddToCart}
        onBuyNow={handleBuyNow}
        added={added}
        colors={colors}
        borderRadius={borderRadius}
        variantLabel={variantLabel}
        isOutOfStock={isOutOfStock}
      />
    </StorefrontLayout>
  );
};

export default StorefrontProduct;
