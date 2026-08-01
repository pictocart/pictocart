import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import WishlistButton from './WishlistButton';

interface Props {
  storeId: string;
  storeSlug: string;
  currentProductId: string;
  category?: string | null;
  colors: any;
  fonts: any;
  borderRadius: number;
  wishlistProductIds: Set<string>;
  isLoggedIn: boolean;
  onToggleWishlist: (id: string) => Promise<{ action: 'added' | 'removed' }>;
  allowMockFallback?: boolean;
  productCols?: number;
  productCardWidth?: number;
  title?: string;
  scrollHorizontal?: boolean;
  showScrollbar?: boolean;
}

const RelatedProducts = ({
  storeId, storeSlug, currentProductId, category,
  colors, fonts, borderRadius, wishlistProductIds, isLoggedIn, onToggleWishlist,
  allowMockFallback = false,
  productCols,
  productCardWidth,
  title,
  scrollHorizontal,
  showScrollbar,
}: Props) => {
  const themeSuffixMatch = currentProductId?.match(/(theme-style-\d+)/);
  const themeSuffix = themeSuffixMatch ? themeSuffixMatch[1] : '';
  const cleanCurrentProductId = currentProductId ? currentProductId.replace(/-theme-style-\d+$/, '') : '';
  const isCurrentProductUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCurrentProductId || '');

  const { data: related = [] } = useQuery({
    queryKey: ['related-products', storeId, category, cleanCurrentProductId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, title, price, compare_at_price, images, category')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (isCurrentProductUuid) {
        query = query.neq('id', cleanCurrentProductId);
      }
      query = query.limit(8);
      if (category) query = query.eq('category', category);
      
      const { data } = await query;
      if (data && data.length >= 4) return data;
      
      // Fallback to any products if not enough in same category
      let fallbackQuery = supabase
        .from('products')
        .select('id, title, price, compare_at_price, images, category')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (isCurrentProductUuid) {
        fallbackQuery = fallbackQuery.neq('id', cleanCurrentProductId);
      }
      fallbackQuery = fallbackQuery.limit(8);
      
      const { data: fallback } = await fallbackQuery;
      return fallback || [];
    },
    enabled: !!storeId,
  });

  const mockRelated = [
    {
      id: 'mock-rel-1',
      title: 'Ergonomic Memory Foam Travel Pillow',
      price: 1499,
      compare_at_price: 2499,
      category: 'Electronics',
      images: ['https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=500&auto=format&fit=crop&q=60']
    },
    {
      id: 'mock-rel-2',
      title: 'Premium Braided USB-C to USB-C Cable (2m)',
      price: 699,
      compare_at_price: 1199,
      category: 'Electronics',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60']
    },
    {
      id: 'mock-rel-3',
      title: 'Headphone Hanger Desk Mount Clamp',
      price: 899,
      compare_at_price: 1499,
      category: 'Electronics',
      images: ['https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&auto=format&fit=crop&q=60']
    },
    {
      id: 'mock-rel-4',
      title: 'Dual-Device Bluetooth Transmitter',
      price: 2499,
      compare_at_price: 3999,
      category: 'Electronics',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60']
    }
  ];

  const listToRender = related.length > 0 ? related : (allowMockFallback ? mockRelated : []);

  if (listToRender.length === 0) return null;

  const cols = productCols || 4;
  const cardWidth = productCardWidth;

  return (
    <section className="mt-10 md:mt-14">
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .related-dynamic-grid {
            grid-template-columns: repeat(${cols}, minmax(0, 1fr)) !important;
            display: grid !important;
          }
        }
        
        .custom-neon-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-neon-scrollbar::-webkit-scrollbar-track {
          background: rgba(11, 14, 27, 0.4);
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .custom-neon-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #12daa8, #a855f7);
          border-radius: 9999px;
          box-shadow: 0 0 10px rgba(18, 218, 168, 0.5);
        }
        .custom-neon-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #10b981, #c084fc);
        }
        
        .scrollbar-none::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-none {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}} />
      <h2 className="text-lg md:text-xl font-bold mb-5" style={{ fontFamily: fonts.heading }}>
        {title || "You May Also Like"}
      </h2>
      <div 
        className={scrollHorizontal !== false
          ? `flex gap-4 overflow-x-auto pt-4 pb-4 snap-x snap-mandatory scroll-smooth ${showScrollbar !== false ? "custom-neon-scrollbar" : "scrollbar-none"}`
          : cardWidth 
            ? "flex flex-wrap gap-4 justify-center md:justify-start pt-4" 
            : `grid grid-cols-2 gap-4 related-dynamic-grid pt-4`
        } 
      >
        {listToRender.map((p) => {
          const discount = p.compare_at_price && p.compare_at_price > p.price
            ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
            : 0;
          return (
            <Link
              key={p.id}
              to={`/store/${storeSlug}/product/${p.id}${themeSuffix ? `/${themeSuffix}` : ''}`}
              className={`group overflow-hidden hover-lift ${scrollHorizontal !== false ? "shrink-0 snap-start" : ""}`}
              style={{ 
                backgroundColor: colors.card, 
                borderRadius: `${borderRadius}px`, 
                border: `1px solid ${colors.secondary}`,
                width: cardWidth ? `${cardWidth}px` : (scrollHorizontal !== false ? "200px" : undefined),
                minWidth: cardWidth ? `${cardWidth}px` : (scrollHorizontal !== false ? "200px" : undefined)
              }}
            >
              <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: colors.secondary }}>
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs opacity-30">No image</div>
                )}
                {discount > 0 && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold rounded" style={{ backgroundColor: '#16a34a', color: '#fff' }}>
                    {discount}% OFF
                  </span>
                )}
                <div className="absolute top-2 right-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <WishlistButton
                    isWishlisted={wishlistProductIds.has(p.id)}
                    onToggle={() => onToggleWishlist(p.id)}
                    isLoggedIn={isLoggedIn}
                    primaryColor={colors.primary}
                    size="sm"
                  />
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-xs font-semibold truncate mb-1">{p.title}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold" style={{ color: colors.primary }}>₹{Number(p.price).toLocaleString('en-IN')}</span>
                  {discount > 0 && (
                    <span className="text-[10px] line-through opacity-40">₹{Number(p.compare_at_price).toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RelatedProducts;
