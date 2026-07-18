import { tokens } from './tokens';

interface Product {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number | null;
  images?: string[];
}

export const CoutureProductCard = ({ product, href }: { product: Product; href?: string }) => {
  const img = product.images?.[0];
  return (
    <a
      href={href ?? `#/product/${product.id}`}
      className="group block"
      style={{ color: tokens.colors.text }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          background: tokens.colors.background,
          borderRadius: tokens.radius.sm,
        }}
      >
        {img ? (
          <img
            src={img}
            alt={product.title}
            className="w-full aspect-[3/4] object-cover transition-all duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[3/4]" style={{ background: tokens.colors.border }} />
        )}
        <div
          className="absolute bottom-0 left-0 right-0 translate-y-full p-4 transition-transform duration-300 group-hover:translate-y-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          }}
        >
          <span className="text-xs tracking-wider uppercase text-white">Quick view</span>
        </div>
      </div>
      <div className="pt-4">
        <p className="text-sm" style={{ fontFamily: tokens.fonts.body }}>
          {product.title}
        </p>
        <p className="mt-1 text-sm font-medium" style={{ color: tokens.colors.accent }}>
          ₹{Number(product.price).toLocaleString('en-IN')}
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="ml-2 text-xs line-through" style={{ color: tokens.colors.muted }}>
              ₹{Number(product.compare_at_price).toLocaleString('en-IN')}
            </span>
          )}
        </p>
      </div>
    </a>
  );
};
