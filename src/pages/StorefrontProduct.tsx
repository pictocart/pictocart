import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorefront, useStorefrontProduct } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import SEOHead from '@/components/storefront/SEOHead';
import ReviewSection from '@/components/storefront/ReviewSection';
import ShareButton from '@/components/storefront/ShareButton';
import ProductImageSwiper from '@/components/storefront/ProductImageSwiper';
import MobileAddToCart from '@/components/storefront/MobileAddToCart';
import { useCart } from '@/hooks/useCart';
import { useProductReviews, getAverageRating } from '@/hooks/useReviews';
import { Loader2, Minus, Plus, ChevronLeft, ShoppingBag, Check, Star } from 'lucide-react';
import { toast } from 'sonner';

const StorefrontProduct = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const { store, products, loading: storeLoading } = useStorefront(slug || '');
  const { data: product, isLoading: productLoading } = useStorefrontProduct(store?.id, productId || '');
  const { addItem } = useCart(slug || '');
  const { data: reviews = [] } = useProductReviews(productId || '');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);

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

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      title: product.title,
      price: Number(product.price),
      image: images[0] || null,
    }, quantity);
    setAdded(true);
    toast.success(`${product.title} added to cart`);
    setTimeout(() => setAdded(false), 2000);
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
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <Link
          to={`/store/${slug}`}
          className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 mb-4 md:mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back to store
        </Link>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Images - Mobile swiper, Desktop gallery */}
          <div>
            {/* Mobile swiper */}
            <div className="md:hidden">
              <ProductImageSwiper images={images} title={product.title} colors={colors} borderRadius={borderRadius} />
            </div>
            {/* Desktop gallery */}
            <div className="hidden md:block space-y-3">
              <div
                className="aspect-square overflow-hidden"
                style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
              >
                {images[selectedImage] ? (
                  <img src={images[selectedImage]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm opacity-30">No image</div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className="h-16 w-16 shrink-0 overflow-hidden border-2 transition-colors"
                      style={{
                        borderRadius: `${borderRadius / 2}px`,
                        borderColor: i === selectedImage ? colors.primary : colors.secondary,
                      }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 md:space-y-6">
            {product.category && (
              <span
                className="inline-block px-3 py-1 text-xs font-medium rounded-full"
                style={{ backgroundColor: colors.secondary }}
              >
                {product.category}
              </span>
            )}

            <h1 className="text-xl md:text-3xl font-bold" style={{ fontFamily: fonts.heading }}>
              {product.title}
            </h1>

            {/* Rating summary */}
            {count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                  {average} <Star className="h-3 w-3" style={{ fill: '#fff' }} />
                </div>
                <span className="text-sm opacity-50">{count} review{count !== 1 ? 's' : ''}</span>
              </div>
            )}

            <div className="flex items-baseline gap-3">
              <span className="text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>
                ₹{Number(product.price).toLocaleString('en-IN')}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <>
                  <span className="text-base md:text-lg line-through opacity-40">
                    ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#16a34a20', color: '#16a34a' }}>
                    {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {product.short_description && (
              <p className="text-sm opacity-70">{product.short_description}</p>
            )}

            {/* Share */}
            <ShareButton
              title={product.title}
              text={product.short_description || undefined}
              url={`${window.location.origin}/store/${slug}/product/${productId}`}
              colors={colors}
              borderRadius={borderRadius}
            />

            {/* Quantity - hidden on mobile (use sticky bar) */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-medium">Quantity</span>
              <div
                className="flex items-center border"
                style={{ borderColor: colors.secondary, borderRadius: `${borderRadius / 2}px` }}
              >
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:opacity-70">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 text-sm font-medium">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:opacity-70">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add to cart - desktop only */}
            <button
              onClick={handleAddToCart}
              className="hidden md:flex w-full py-3 text-sm font-semibold items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              style={{
                backgroundColor: added ? '#16a34a' : colors.primary,
                color: '#fff',
                borderRadius: `${borderRadius}px`,
              }}
            >
              {added ? <><Check className="h-4 w-4" /> Added!</> : <><ShoppingBag className="h-4 w-4" /> Add to Cart</>}
            </button>

            {/* Description */}
            {product.description && (
              <div className="pt-4 border-t" style={{ borderColor: colors.secondary }}>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: fonts.heading }}>
                  Description
                </h3>
                <div className="text-sm opacity-70 whitespace-pre-wrap">{product.description}</div>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] rounded-full"
                    style={{ backgroundColor: colors.accent + '40' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <ReviewSection
          productId={productId!}
          storeId={store.id}
          storeSlug={slug!}
          colors={colors}
          fonts={fonts}
          borderRadius={borderRadius}
        />
      </div>

      {/* Mobile floating Add to Cart */}
      <MobileAddToCart
        price={Number(product.price)}
        comparePrice={product.compare_at_price}
        onAdd={handleAddToCart}
        added={added}
        colors={colors}
        borderRadius={borderRadius}
      />
    </StorefrontLayout>
  );
};

export default StorefrontProduct;
