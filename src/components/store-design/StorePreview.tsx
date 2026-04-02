import { type ThemeTemplate } from '@/lib/themes';
import { ShoppingBag, Search, User, Menu } from 'lucide-react';

interface StorePreviewProps {
  theme: ThemeTemplate;
  storeName: string;
}

const StorePreview = ({ theme, storeName }: StorePreviewProps) => {
  const { colors, fonts, borderRadius, preview } = theme;

  const fakeProducts = [
    { name: 'Classic White T-Shirt', price: '₹599', image: '' },
    { name: 'Denim Jacket', price: '₹1,999', image: '' },
    { name: 'Canvas Sneakers', price: '₹1,299', image: '' },
    { name: 'Leather Watch', price: '₹2,499', image: '' },
  ];

  return (
    <div
      className="overflow-hidden rounded-xl border shadow-lg"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: fonts.body,
      }}
    >
      {/* Nav */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: colors.secondary, backgroundColor: colors.card }}
      >
        <span className="font-bold text-sm" style={{ fontFamily: fonts.heading }}>
          {storeName || 'My Store'}
        </span>
        <div className="flex items-center gap-3">
          <Search className="h-3.5 w-3.5 opacity-50" />
          <ShoppingBag className="h-3.5 w-3.5 opacity-50" />
          <User className="h-3.5 w-3.5 opacity-50" />
        </div>
      </div>

      {/* Hero */}
      <div
        className="px-4 py-8 text-center"
        style={{ backgroundColor: colors.secondary }}
      >
        <h2 className="text-lg font-bold mb-1" style={{ fontFamily: fonts.heading, color: colors.text }}>
          {preview.heroStyle === 'full-width' ? 'NEW COLLECTION' : 'Welcome to our store'}
        </h2>
        <p className="text-xs opacity-60 mb-3">Discover our latest products</p>
        <div
          className="inline-block px-4 py-1.5 text-xs font-medium"
          style={{
            backgroundColor: colors.primary,
            color: '#fff',
            borderRadius: `${borderRadius}px`,
          }}
        >
          Shop Now
        </div>
      </div>

      {/* Products */}
      <div className="p-4">
        <h3
          className="text-sm font-semibold mb-3"
          style={{ fontFamily: fonts.heading }}
        >
          Featured Products
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {fakeProducts.map((p, i) => (
            <div
              key={i}
              className="overflow-hidden"
              style={{
                backgroundColor: preview.productCardStyle === 'overlay' ? colors.secondary : colors.card,
                borderRadius: `${borderRadius}px`,
                border: preview.productCardStyle === 'bordered' ? `1px solid ${colors.secondary}` : 'none',
                boxShadow: preview.productCardStyle === 'floating' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <div
                className="aspect-square flex items-center justify-center text-xs opacity-30"
                style={{ backgroundColor: colors.accent + '33' }}
              >
                {Math.floor(Math.random() * 200 + 100)}×{Math.floor(Math.random() * 200 + 100)}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: colors.primary }}>
                  {p.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 text-center text-[10px] opacity-40 border-t"
        style={{ borderColor: colors.secondary }}
      >
        Powered by Antariksh Commerce
      </div>
    </div>
  );
};

export default StorePreview;
