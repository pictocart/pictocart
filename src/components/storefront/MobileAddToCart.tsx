import { ShoppingBag, Check, Zap } from 'lucide-react';

interface Props {
  price: number;
  comparePrice?: number | null;
  onAdd: () => void;
  onBuyNow: () => void;
  added: boolean;
  colors: any;
  borderRadius: number;
  variantLabel?: string;
  isOutOfStock?: boolean;
}

const MobileAddToCart = ({ price, comparePrice, onAdd, onBuyNow, added, colors, borderRadius, variantLabel, isOutOfStock }: Props) => {
  return (
    <div
      className="fixed left-0 right-0 z-[60] flex items-center gap-3 p-3 border-t md:hidden backdrop-blur-md"
      style={{
        borderColor: colors.secondary + '80',
        backgroundColor: colors.card + 'f5',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 52px)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold" style={{ color: colors.primary }}>
            ₹{price.toLocaleString('en-IN')}
          </span>
          {comparePrice && comparePrice > price && (
            <span className="text-[10px] line-through opacity-40">
              ₹{comparePrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        {variantLabel && (
          <span className="text-[10px] opacity-50 truncate block">{variantLabel}</span>
        )}
      </div>

      {isOutOfStock ? (
        <div
          className="px-4 py-3 text-xs font-semibold opacity-60 text-center"
          style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
        >
          Out of Stock
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-2 transition-transform active:scale-95"
            style={{
              borderColor: added ? '#16a34a' : colors.primary,
              color: added ? '#16a34a' : colors.primary,
              backgroundColor: added ? '#16a34a10' : 'transparent',
              borderRadius: `${borderRadius}px`,
            }}
          >
            {added ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
            {added ? 'Added!' : 'Cart'}
          </button>
          <button
            onClick={onBuyNow}
            className="flex items-center gap-1.5 px-5 py-3 text-xs font-semibold transition-transform active:scale-95"
            style={{
              backgroundColor: colors.primary,
              color: '#fff',
              borderRadius: `${borderRadius}px`,
            }}
          >
            <Zap className="h-3.5 w-3.5" /> Buy Now
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileAddToCart;
