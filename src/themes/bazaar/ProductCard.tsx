import { tokens } from './tokens';

interface Product {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number | null;
  images?: string[];
}

export const BazaarProductCard = ({ product, href }: { product: Product; href?: string }) => {
  const img = product.images?.[0];
  return (
    <a
      href={href ?? `#/product/${product.id}`}
      className="group block transition-transform hover:-translate-y-1"
      style={{ color: tokens.colors.text }}
    >
      <div
        className="relative overflow-hidden border"
        style={{
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
          background: tokens.colors.surface,
        }}
      >
        {img ? (
          <img src={img} alt={product.title} className="w-full aspect-[4/5] object-cover" loading="lazy" />
        ) : (
          <div className="w-full aspect-[4/5]" style={{ background: tokens.colors.background }} />
        )}
        {/* corner motif */}
        <span
          aria-hidden
          className="absolute top-2 right-2 h-6 w-6"
          style={{
            background: `radial-gradient(circle at center, ${tokens.colors.accent} 25%, transparent 30%)`,
          }}
        />
      </div>
      <div className="pt-3">
        <p className="text-base" style={{ fontFamily: tokens.fonts.heading }}>
          {product.title}
        </p>
        <p className="mt-1 text-sm" style={{ color: tokens.colors.primary, fontFamily: tokens.fonts.heading }}>
          ₹{Number(product.price).toLocaleString('en-IN')}
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="ml-2 line-through text-xs" style={{ color: tokens.colors.muted }}>
              ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
            </span>
          )}
        </p>
      </div>
    </a>
  );
};
