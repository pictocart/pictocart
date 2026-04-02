import { ShoppingBag, Check } from 'lucide-react';

interface Props {
  price: number;
  comparePrice?: number | null;
  onAdd: () => void;
  added: boolean;
  colors: any;
  borderRadius: number;
}

const MobileAddToCart = ({ price, comparePrice, onAdd, added, colors, borderRadius }: Props) => {
  return (
    <div
      className="fixed left-0 right-0 z-[60] flex items-center gap-4 p-3 border-t md:hidden backdrop-blur-md"
      style={{
        borderColor: colors.secondary + '80',
        backgroundColor: colors.card + 'f5',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 52px)',
      }}
    >
      <div className="flex-1">
        <span className="text-lg font-bold" style={{ color: colors.primary }}>
          ₹{price.toLocaleString('en-IN')}
        </span>
        {comparePrice && comparePrice > price && (
          <span className="text-xs line-through opacity-40 ml-2">
            ₹{comparePrice.toLocaleString('en-IN')}
          </span>
        )}
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-transform active:scale-95"
        style={{
          backgroundColor: added ? '#16a34a' : colors.primary,
          color: '#fff',
          borderRadius: `${borderRadius}px`,
        }}
      >
        {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
        {added ? 'Added!' : 'Add to Cart'}
      </button>
    </div>
  );
};

export default MobileAddToCart;
