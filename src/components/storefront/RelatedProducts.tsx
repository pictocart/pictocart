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
}

const RelatedProducts = ({
  storeId, storeSlug, currentProductId, category,
  colors, fonts, borderRadius, wishlistProductIds, isLoggedIn, onToggleWishlist,
}: Props) => {
  const { data: related = [] } = useQuery({
    queryKey: ['related-products', storeId, category, currentProductId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, title, price, compare_at_price, images, category')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .neq('id', currentProductId)
        .limit(8);
      if (category) query = query.eq('category', category);
      const { data } = await query;
      if (data && data.length >= 4) return data;
      // Fallback to any products if not enough in same category
      const { data: fallback } = await supabase
        .from('products')
        .select('id, title, price, compare_at_price, images, category')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .neq('id', currentProductId)
        .limit(8);
      return fallback || [];
    },
    enabled: !!storeId,
  });

  if (related.length === 0) return null;

  return (
    <section className="mt-10 md:mt-14">
      <h2 className="text-lg md:text-xl font-bold mb-5" style={{ fontFamily: fonts.heading }}>
        You May Also Like
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {related.map((p) => {
          const discount = p.compare_at_price && p.compare_at_price > p.price
            ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
            : 0;
          return (
            <Link
              key={p.id}
              to={`/store/${storeSlug}/product/${p.id}`}
              className="min-w-[160px] md:min-w-[200px] shrink-0 snap-start group overflow-hidden hover-lift"
              style={{ backgroundColor: colors.card, borderRadius: `${borderRadius}px`, border: `1px solid ${colors.secondary}` }}
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
