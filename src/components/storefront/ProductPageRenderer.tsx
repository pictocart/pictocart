import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Heart, Share2, ShoppingCart, Minus, Plus, ChevronRight, Play, Check, Loader2, Send, Zap } from 'lucide-react';
import { getPageSections, getPageThemeOverrides, getDefaultProductSections } from '@/lib/storefrontManifest';
import { useWishlist } from '@/hooks/useWishlist';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useProductReviews, getAverageRating } from '@/hooks/useReviews';
import { useCart } from '@/hooks/useCart';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import VariantSelector from '@/components/storefront/VariantSelector';
import TrustBadges from '@/components/storefront/TrustBadges';
import ProductAccordion from '@/components/storefront/ProductAccordion';
import ReviewSection from '@/components/storefront/ReviewSection';
import RelatedProducts from '@/components/storefront/RelatedProducts';
import MobileAddToCart from '@/components/storefront/MobileAddToCart';
import WishlistButton from '@/components/storefront/WishlistButton';
import ProductShareButtons from '@/components/storefront/ProductShareButtons';
import PincodeChecker from '@/components/storefront/PincodeChecker';
import ProductImageSwiper from '@/components/storefront/ProductImageSwiper';
import { pickVariantImages, pickVariantVideos, type VariantOption } from '@/lib/productMedia';

interface ProductPageRendererProps {
  store: any;
  product: any;
  relatedProducts: any[];
  theme: any;
  slug: string;
  products: any[];
}

const ProductPageRenderer: React.FC<ProductPageRendererProps> = ({
  store,
  product,
  relatedProducts,
  theme,
  slug,
  products
}) => {
  const { colors, fonts, borderRadius = 8 } = theme;
  const navigate = useNavigate();
  const { user } = useCustomerAuth(slug);
  const { wishlistProductIds, toggle: toggleWishlist } = useWishlist(store?.id, user?.id);
  const { data: reviews = [] } = useProductReviews(product?.id);
  const { average, count } = getAverageRating(reviews);
  const { addItem } = useCart(slug || '');
  const track = useTrackEvent();
  const reviewsRef = React.useRef<HTMLDivElement>(null);

  // Get product page sections from store config or use defaults
  const sections = getPageSections(store, 'product');
  const productSections = sections.length > 0 ? sections : getDefaultProductSections();
  
  // Get page-specific theme overrides
  const pageOverrides = getPageThemeOverrides(store, 'product');
  
  // Apply overrides to theme
  const pageTheme = pageOverrides ? { ...theme, ...pageOverrides } : theme;
 
  // Selected Variants state
  const [selectedVariants, setSelectedVariants] = React.useState<Record<string, string>>({});
  const [quantity, setQuantity] = React.useState(1);
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [added, setAdded] = React.useState(false);
  const [imageZoom, setImageZoom] = React.useState(false);
  const [zoomPos, setZoomPos] = React.useState({ x: 50, y: 50 });
  const [coupons, setCoupons] = React.useState<any[]>([]);

  // COD, Size guide modals and Urgency countdown
  const [showCodModal, setShowCodModal] = React.useState(false);
  const [showSizeModal, setShowSizeModal] = React.useState(false);
  const [countdown, setCountdown] = React.useState('02h 14m 45s');

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('00h 00m 00s');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);
 
  // Q&A state
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [questionText, setQuestionText] = React.useState('');
  const [submittingQuestion, setSubmittingQuestion] = React.useState(false);
 
  // Social proof state
  const [socialProof, setSocialProof] = React.useState<string | null>(null);
 
  // Compare state
  const [compareList, setCompareList] = React.useState<string[]>([]);
  const [showCompareDrawer, setShowCompareDrawer] = React.useState(false);
 
  // Compute variant-aware media
  const productImages = (product?.images as string[]) || [];
  const variants = (Array.isArray(product?.variants) ? product?.variants : []) as unknown as VariantOption[];
  const aiData = (product?.ai_generated_data || {}) as Record<string, any>;
  const productVideos: string[] = Array.isArray(aiData.product_videos) ? aiData.product_videos : [];
  const variantImages = pickVariantImages(variants, selectedVariants);
  const variantVideos = pickVariantVideos(variants, selectedVariants);
  const images = variantImages.length > 0 ? variantImages : productImages;
  const videos = variantVideos.length > 0 ? variantVideos : productVideos;
  
  const isOutOfStock = product.inventory_count !== null && product.inventory_count !== undefined && product.inventory_count <= 0;
  const highlights = aiData.highlights as string[] | undefined;
  const hasSizeVariant = variants.some(v => v.name.toLowerCase() === 'size' || v.name.toLowerCase() === 'মাপ');
 
  // Reset selected thumbnail when gallery source changes
  React.useEffect(() => { setSelectedImage(0); }, [variantImages.join('|')]);
 
  // Fetch coupons & questions & track view
  React.useEffect(() => {
    if (store?.id) {
      // Coupons
      supabase
        .from('coupons')
        .select('*')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .then(({ data }) => {
          const list = data ? data.filter(c => !c.expires_at || new Date(c.expires_at) > new Date()) : [];
          const hasWelcome = list.some(c => c.code === 'WELCOME');
          if (!hasWelcome) {
            list.push({
              id: 'welcome-coupon-id',
              code: 'WELCOME',
              type: 'percentage',
              value: 10,
              description: '10% OFF for first-time customers!',
              min_order_amount: 199,
              is_active: true,
            } as any);
          }
          setCoupons(list);
        });
    }
  }, [store?.id]);

  React.useEffect(() => {
    if (product?.id && store?.id) {
      // Questions
      (supabase as any)
        .from('product_questions')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .then(({ data: anyData }) => {
          if (anyData) setQuestions(anyData);
        });

      // Event Tracking
      track({ store_id: store.id, event_type: 'product_view', product_id: product.id, value: Number(product.price) });
    }
  }, [product?.id, store?.id, track]);

  // Social proof toast timer
  React.useEffect(() => {
    const names = ['Rahul', 'Anjali', 'Vikram', 'Priya', 'Amit', 'Sneha', 'Rohan', 'Nehal'];
    const locations = ['Delhi', 'Mumbai', 'Bengaluru', 'Pune', 'Kolkata', 'Hyderabad', 'Chennai', 'Noida'];
    
    const showToast = () => {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomLoc = locations[Math.floor(Math.random() * locations.length)];
      setSocialProof(`${randomName} from ${randomLoc} recently purchased this product!`);
      
      setTimeout(() => {
        setSocialProof(null);
      }, 5000);
    };

    const interval = setInterval(showToast, 25000); // every 25 seconds
    const firstTimeout = setTimeout(showToast, 5000); // first toast after 5s
    
    return () => {
      clearInterval(interval);
      clearTimeout(firstTimeout);
    };
  }, []);

  // Track recently viewed in localStorage
  React.useEffect(() => {
    if (product?.id && store?.id) {
      const key = `recently_viewed_${store.id}`;
      const stored = localStorage.getItem(key);
      let list: string[] = stored ? JSON.parse(stored) : [];
      list = [product.id, ...list.filter(id => id !== product.id)].slice(0, 6);
      localStorage.setItem(key, JSON.stringify(list));
    }
  }, [product?.id, store?.id]);

  const activeFssai = (store.settings as any)?.fssai as string | null | undefined;
  const metadata = Object.fromEntries(
    Object.entries(aiData)
      .filter(([k]) => !['highlights', 'product_type', 'product_videos', 'product_hint'].includes(k))
      .filter(([k]) => {
        if (k === 'fssai_license' && !activeFssai) return false;
        return true;
      })
      .map(([k, v]) => [k, String(v)])
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

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    try {
      setSubmittingQuestion(true);
      const { error } = await (supabase as any)
        .from('product_questions')
        .insert({
          store_id: store.id,
          product_id: product.id,
          customer_name: user?.user_metadata?.full_name || 'Anonymous Customer',
          question: questionText.trim()
        });

      if (error) throw error;

      toast.success('Question submitted! It will appear once answered.');
      setQuestionText('');
      
      // Reload questions
      const { data } = await (supabase as any)
        .from('product_questions')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      if (data) setQuestions(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit question');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const toggleCompare = (id: string) => {
    setCompareList(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id].slice(0, 3)
    );
  };

  const renderSection = (section: any, index: number) => {
    const isEnabled = section.enabled !== false;
    if (!isEnabled) return null;

    switch (section.type) {
      case 'product_images': {
        const merged = [...videos.map((url) => ({ type: 'video' as const, url })), ...images.map((url) => ({ type: 'image' as const, url }))];
        const current = merged[selectedImage] || merged[0];
        
        return (
          <div key={index} className="md:col-span-1">
            {/* Mobile Swiper */}
            <div className="md:hidden">
              <ProductImageSwiper 
                images={images} 
                videos={videos} 
                title={product.title} 
                colors={colors} 
                borderRadius={borderRadius} 
              />
            </div>
            
            {/* Desktop: Thumbnail rail + main media */}
            <div className="hidden md:flex gap-3">
              {merged.length > 1 && (
                <div className="flex flex-col gap-2 w-16 shrink-0">
                  {merged.map((item, i) => (
                    <button
                      key={i}
                      onMouseEnter={() => setSelectedImage(i)}
                      onClick={() => setSelectedImage(i)}
                      className="w-16 h-16 overflow-hidden border-2 transition-all duration-200 relative bg-muted"
                      style={{
                        borderRadius: `${borderRadius / 2}px`,
                        borderColor: i === selectedImage ? colors.primary : colors.secondary,
                        opacity: i === selectedImage ? 1 : 0.6,
                      }}
                    >
                      {item.type === 'image' ? (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <video src={item.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                          <Play className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow fill-white/80" />
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              <div
                className="flex-1 aspect-[4/5] overflow-hidden relative flex items-center justify-center bg-muted"
                style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
                onMouseEnter={(e) => {
                  setImageZoom(true);
                  const v = e.currentTarget.querySelector('video');
                  if (v) { v.muted = false; v.play().catch(() => {}); }
                }}
                onMouseLeave={(e) => {
                  setImageZoom(false);
                  const v = e.currentTarget.querySelector('video');
                  if (v) { v.pause(); v.currentTime = 0; }
                }}
                onMouseMove={handleMouseMove}
              >
                {!current ? (
                  <div className="w-full h-full flex items-center justify-center text-sm opacity-30">No image</div>
                ) : current.type === 'video' ? (
                  <video
                    src={current.url}
                    className="w-full h-full object-contain bg-black"
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    controls
                  />
                ) : (
                  <img
                    src={current.url}
                    alt={product.title}
                    className="w-full h-full object-contain transition-transform duration-300"
                    style={{
                      transform: imageZoom ? 'scale(1.8)' : 'scale(1)',
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    }}
                  />
                )}
                {discount > 0 && (
                  <span className="absolute top-3 left-3 px-2 py-1 text-xs font-bold rounded z-10" style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                    {discount}% OFF
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'product_info':
        return (
          <div key={index} className="md:col-span-1 space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs opacity-50 mb-2">
              <Link to={`/store/${slug}`} className="hover:opacity-100 transition-opacity">Home</Link>
              <ChevronRight className="h-3 w-3" />
              {product.category && (
                <>
                  <Link to={`/store/${slug}?category=${encodeURIComponent(product.category)}`} className="hover:opacity-100 transition-opacity">{product.category}</Link>
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
              <span className="opacity-70 truncate max-w-[150px]">{product.title}</span>
            </nav>

            <div>
              {product.category && (
                <span className="inline-block px-3 py-1 text-[11px] font-medium rounded-full mb-3" style={{ backgroundColor: colors.secondary }}>
                  {product.category}
                </span>
              )}
              
              <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight" style={{ fontFamily: fonts.heading }}>
                {product.title}
              </h1>
              
              {/* Rating summary — scrolls to reviews */}
              {section.props?.showRating !== false && count > 0 && (
                <button
                  onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 group mb-4"
                >
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                    {average.toFixed(1)} <Star className="h-3 w-3" style={{ fill: '#fff' }} />
                  </div>
                  <span className="text-sm opacity-50 group-hover:opacity-80 transition-opacity">
                    {count} review{count !== 1 ? 's' : ''} →
                  </span>
                </button>
              )}
              
              {/* Price */}
              {section.props?.showPrice !== false && (
                <div className="flex items-center gap-3 flex-wrap mb-4">
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
                  
                  {/* COD Available Badge */}
                  <span 
                    onClick={() => setShowCodModal(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: '#10b98115', color: '#10b981', border: '1px solid #10b98130' }}
                  >
                    <Check className="h-2.5 w-2.5" /> COD Available (Details)
                  </span>
                </div>
              )}
            </div>

            {/* Urgency Indicators */}
            <div className="space-y-2">
              {product.inventory_count !== null && product.inventory_count !== undefined && product.inventory_count > 0 && product.inventory_count <= 5 && (
                <p className="text-xs font-bold text-amber-600 flex items-center gap-1.5 animate-pulse">
                  🔥 Only {product.inventory_count} items left in stock! Order soon.
                </p>
              )}

              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 flex items-center gap-2" style={{ borderRadius: `${borderRadius}px` }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <p className="text-xs font-semibold">
                  ⚡ Hot Deal: Sale ends in <span className="font-mono font-bold">{countdown}</span>
                </p>
              </div>
            </div>

            {/* Description */}
            {section.props?.showDescription !== false && product.short_description && (
              <p className="text-sm opacity-70 leading-relaxed">{product.short_description}</p>
            )}

            {/* Variant Selector */}
            {section.props?.showVariants !== false && (
              <div className="space-y-2">
                {hasSizeVariant && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium opacity-60">Options</span>
                    <button 
                      type="button"
                      onClick={() => setShowSizeModal(true)}
                      className="text-xs font-semibold underline hover:opacity-80 transition flex items-center gap-1"
                      style={{ color: colors.primary }}
                    >
                      📏 Size Guide
                    </button>
                  </div>
                )}
                <VariantSelector
                  variants={variants}
                  selected={selectedVariants}
                  onChange={(name, value) => setSelectedVariants((prev) => ({ ...prev, [name]: value }))}
                  colors={colors}
                  borderRadius={borderRadius}
                />
              </div>
            )}

            {/* Quantity Selector + Add / Buy buttons */}
            {section.props?.showQuantity !== false && (
              <div className="space-y-4 pt-2">
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
                    {section.props?.showAddToCart !== false && (
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
                        {added ? <><Check className="h-4 w-4" /> Added!</> : <><ShoppingCart className="h-4 w-4" /> Add to Cart</>}
                      </button>
                    )}
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
            )}

            {/* Share, Wishlist & Compare Buttons */}
            <div className="flex items-center gap-3 pt-1">
              {section.props?.showWishlist !== false && (
                <WishlistButton
                  isWishlisted={wishlistProductIds.has(product.id)}
                  onToggle={() => toggleWishlist(product.id)}
                  isLoggedIn={!!user}
                  primaryColor={colors.primary}
                  size="md"
                />
              )}
              {section.props?.showShare !== false && (
                <ProductShareButtons
                  productTitle={product.title}
                  productUrl={`/store/${slug}/product/${product.id}`}
                  productImage={images[0] || undefined}
                  primaryColor={colors.primary}
                />
              )}
              {/* Compare Button */}
              <button
                onClick={() => toggleCompare(product.id)}
                className="px-4 py-2 border text-xs font-semibold hover:bg-black/5 transition"
                style={{ 
                  borderRadius: `${borderRadius}px`, 
                  borderColor: colors.secondary, 
                  color: colors.primary,
                  backgroundColor: compareList.includes(product.id) ? colors.secondary : 'transparent' 
                }}
              >
                {compareList.includes(product.id) ? 'Added to Compare' : 'Add to Compare'}
              </button>
            </div>

            {/* Delivery Checker / PincodeChecker */}
            <div className="pt-2">
              <PincodeChecker 
                storeId={store.id} 
                colors={colors} 
                borderRadius={borderRadius} 
              />
            </div>

            {/* Active Coupons List */}
            {coupons.length > 0 && (
              <div className="border rounded-xl p-4 space-y-3" style={{ borderColor: colors.secondary, backgroundColor: colors.secondary + '15' }}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-60">Active Coupons</p>
                <div className="grid gap-2">
                  {coupons.map((coupon) => {
                    const discountPct = coupon.type === 'percentage' ? Number(coupon.value) : 0;
                    const discountAmt = coupon.type === 'percentage' 
                      ? (Number(product.price) * discountPct) / 100
                      : Number(coupon.value);
                    const effectivePrice = Math.max(0, Number(product.price) - discountAmt);
                    return (
                      <div key={coupon.id} className="flex justify-between items-center bg-card p-2.5 rounded-lg border border-dashed text-sm" style={{ borderColor: colors.primary }}>
                        <div>
                          <span className="font-mono font-bold px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.secondary, color: colors.primary }}>{coupon.code}</span>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`} OFF
                            {coupon.min_order_amount ? ` on orders above ₹${coupon.min_order_amount}` : ''}
                          </p>
                          <p className="text-xs font-bold text-emerald-600 mt-1">
                            ₹{Math.round(effectivePrice).toLocaleString('en-IN')} after applying coupon
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(coupon.code);
                            toast.success(`Coupon code ${coupon.code} copied!`);
                          }}
                          className="text-xs font-bold underline transition hover:opacity-85"
                          style={{ color: colors.primary }}
                        >
                          Copy
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seller Info / Visit Store */}
            <div className="flex items-center justify-between p-3 border rounded-xl" style={{ borderColor: colors.secondary }}>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs" style={{ backgroundColor: colors.secondary, color: colors.primary }}>
                  {store.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1 text-left">
                    {store.name}
                    <span className="inline-block text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">Verified</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">Professional Merchant</p>
                </div>
              </div>
              <Link 
                to={`/store/${slug}`} 
                className="text-xs font-bold hover:underline" 
                style={{ color: colors.primary }}
              >
                Visit Store →
              </Link>
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

            {/* Product Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2">
                {product.tags.map((tag: string) => (
                  <span key={tag} className="px-2.5 py-1 text-[10px] font-medium rounded-full" style={{ backgroundColor: colors.accent + '25', color: colors.primary }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        );

      case 'product_reviews':
        return (
          <div key={index} className="md:col-span-2 mt-12" ref={reviewsRef}>
            <ReviewSection
              productId={product.id}
              storeId={store.id}
              storeSlug={slug}
              colors={colors}
              fonts={fonts}
              borderRadius={borderRadius}
            />

            {/* Q&A Section */}
            <div className="mt-12 pt-8 border-t" style={{ borderColor: colors.secondary }}>
              <h3 className="text-lg font-bold mb-4 text-left" style={{ fontFamily: fonts.heading }}>
                Questions & Answers
              </h3>
              
              {/* Ask a question form */}
              <form onSubmit={handleAskQuestion} className="flex gap-2 max-w-xl mb-6">
                <input
                  type="text"
                  placeholder="Ask a question about this product..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="flex-1 px-4 py-2 border text-sm"
                  style={{ borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}
                  required
                />
                <button
                  type="submit"
                  disabled={submittingQuestion || !questionText.trim()}
                  className="px-5 py-2 text-white font-semibold text-sm flex items-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius}px` }}
                >
                  {submittingQuestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Ask
                </button>
              </form>

              {/* Questions List */}
              {questions.length === 0 ? (
                <p className="text-sm opacity-50 italic text-left">No questions asked yet. Be the first to ask!</p>
              ) : (
                <div className="space-y-4 max-w-2xl">
                  {questions.map((q) => (
                    <div key={q.id} className="p-4 border rounded-xl text-left" style={{ borderColor: colors.secondary, backgroundColor: colors.secondary + '10' }}>
                      <div className="flex justify-between items-start text-xs opacity-50 mb-1">
                        <span className="font-semibold">{q.customer_name}</span>
                        <span>{new Date(q.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-medium">{q.question}</p>
                      {q.answer ? (
                        <div className="mt-3 pl-3 border-l-2 py-0.5 text-sm" style={{ borderColor: colors.primary }}>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Seller Answer:</p>
                          <p className="mt-0.5 opacity-85">{q.answer}</p>
                        </div>
                      ) : (
                        <p className="text-xs opacity-40 italic mt-2">Pending answer from seller...</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'related_products':
        return (
          <div key={index} className="md:col-span-2 mt-8">
            <RelatedProducts
              storeId={store.id}
              storeSlug={slug}
              currentProductId={product.id}
              category={product.category}
              colors={colors}
              fonts={fonts}
              borderRadius={borderRadius}
              wishlistProductIds={new Set(wishlistProductIds)}
              isLoggedIn={!!user}
              onToggleWishlist={toggleWishlist}
            />
          </div>
        );

      case 'recently_viewed': {
        const key = `recently_viewed_${store?.id}`;
        const stored = localStorage.getItem(key);
        const viewedIds: string[] = stored ? JSON.parse(stored) : [];
        const viewedProducts = (products || [])
          .filter((p: any) => viewedIds.includes(p.id) && p.id !== product.id)
          .slice(0, 6);

        if (viewedProducts.length === 0) return null;

        return (
          <div key={index} className="md:col-span-2 mt-12 text-left">
            <div className="border-t pt-8" style={{ borderColor: colors.secondary }}>
              <h3 className="text-xl font-semibold mb-6" style={{ fontFamily: fonts.heading }}>
                {section.props?.title || 'Recently Viewed'}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {viewedProducts.map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/store/${slug}/product/${p.id}`}
                    className="group border transition-shadow hover:shadow-lg text-left"
                    style={{ 
                      borderColor: colors.secondary,
                      borderRadius: `${borderRadius}px`,
                      backgroundColor: colors.card
                    }}
                  >
                    <div className="aspect-square overflow-hidden bg-muted" style={{ backgroundColor: colors.secondary }}>
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-medium truncate mb-1">
                        {p.title}
                      </h4>
                      <span className="text-xs font-bold" style={{ color: colors.primary }}>
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {productSections.map((section: any, index: number) => renderSection(section, index))}
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

      {/* Social Proof Toast */}
      {socialProof && (
        <div className="fixed bottom-24 left-4 z-50 p-4 bg-white text-black shadow-2xl border flex items-center gap-3 animate-bounce" style={{ borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <p className="text-xs font-semibold">{socialProof}</p>
        </div>
      )}

      {/* Compare Floating Bar / Drawer */}
      {compareList.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 shadow-2xl flex items-center gap-6" style={{ borderRadius: `${borderRadius}px` }}>
          <div className="text-sm">
            <span className="font-bold">{compareList.length}</span> product{compareList.length > 1 ? 's' : ''} in comparison
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCompareDrawer(true)} 
              className="px-4 py-1.5 bg-white text-slate-900 text-xs font-bold rounded hover:bg-slate-100 transition"
            >
              Compare Now
            </button>
            <button 
              onClick={() => setCompareList([])} 
              className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-semibold rounded hover:bg-slate-700 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Compare Modal/Drawer */}
      {showCompareDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black max-w-2xl w-full p-6 shadow-2xl border flex flex-col max-h-[80vh] overflow-y-auto" style={{ borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold" style={{ fontFamily: fonts.heading }}>Compare Products</h3>
              <button onClick={() => setShowCompareDrawer(false)} className="text-sm font-semibold hover:opacity-75">Close</button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {/* Product 1 */}
              <div className="p-4 border rounded-xl" style={{ borderColor: colors.secondary }}>
                <div className="aspect-square bg-muted rounded mb-2 overflow-hidden">
                  <img src={images[0]} alt="" className="w-full h-full object-cover" />
                </div>
                <h4 className="font-bold text-sm truncate">{product.title}</h4>
                <p className="text-xs font-semibold mt-1" style={{ color: colors.primary }}>₹{Number(product.price).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{product.category || 'Category'}</p>
                <p className="text-[10px] mt-2 line-clamp-3 leading-relaxed opacity-75">{product.description || 'No description'}</p>
              </div>

              {/* Mock items to compare */}
              {(relatedProducts || []).slice(0, Math.max(0, 3 - compareList.length)).map((p: any, idx) => (
                <div key={idx} className="p-4 border rounded-xl opacity-60" style={{ borderColor: colors.secondary }}>
                  <div className="aspect-square bg-muted rounded mb-2 overflow-hidden">
                    <img src={p.images?.[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-bold text-sm truncate">{p.title}</h4>
                  <p className="text-xs font-semibold mt-1" style={{ color: colors.primary }}>₹{Number(p.price).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{p.category || 'Category'}</p>
                  <p className="text-[10px] mt-2 line-clamp-3 leading-relaxed opacity-75">{p.short_description || 'Product details'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* COD Modal */}
      {showCodModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black max-w-sm w-full p-6 shadow-2xl border flex flex-col" style={{ borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: fonts.heading }}>Cash on Delivery (COD)</h3>
            <p className="text-sm opacity-80 leading-relaxed mb-4">
              Cash on Delivery is available for this product! You can inspect the package and pay with cash or UPI directly to the delivery executive when they arrive.
            </p>
            <button 
              onClick={() => setShowCodModal(false)}
              className="w-full py-2 text-white font-semibold text-sm transition hover:opacity-90 animate-pulse"
              style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius / 2}px` }}
            >
              Okay, Got it
            </button>
          </div>
        </div>
      )}

      {/* Size Chart Modal */}
      {showSizeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black max-w-md w-full p-6 shadow-2xl border flex flex-col" style={{ borderRadius: `${borderRadius}px`, borderColor: colors.secondary }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: fonts.heading }}>Size Chart Guide</h3>
              <button onClick={() => setShowSizeModal(false)} className="text-sm font-semibold opacity-60 hover:opacity-100">Close</button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">All dimensions are in inches. Standard fit.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.secondary }}>
                    <th className="py-2 text-left font-semibold">Size</th>
                    <th className="py-2 text-left font-semibold">Chest</th>
                    <th className="py-2 text-left font-semibold">Length</th>
                    <th className="py-2 text-left font-semibold">Shoulder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[['S', '38"', '27"', '17"'], ['M', '40"', '28"', '18"'], ['L', '42"', '29"', '19"'], ['XL', '44"', '30"', '20"']].map(([sz, chest, len, sh]) => (
                    <tr key={sz}>
                      <td className="py-2 font-medium">{sz}</td>
                      <td className="py-2 opacity-80">{chest}</td>
                      <td className="py-2 opacity-80">{len}</td>
                      <td className="py-2 opacity-80">{sh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button 
              onClick={() => setShowSizeModal(false)}
              className="mt-6 w-full py-2 text-white font-semibold text-sm transition hover:opacity-90"
              style={{ backgroundColor: colors.primary, borderRadius: `${borderRadius / 2}px` }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPageRenderer;