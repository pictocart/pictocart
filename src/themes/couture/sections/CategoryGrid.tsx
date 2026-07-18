import { tokens } from '../tokens';

interface Category {
  name: string;
  image_url?: string | null;
}

export const CoutureCategoryGrid = ({ categories }: { categories?: Category[] }) => {
  if (!categories?.length) return null;
  return (
    <section style={{ background: tokens.colors.background }}>
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p
          className="mb-2 text-center text-xs tracking-[0.3em] uppercase"
          style={{ color: tokens.colors.accent, fontFamily: tokens.fonts.accent }}
        >
          Collections
        </p>
        <h2
          className="mb-12 text-center text-3xl md:text-4xl"
          style={{ fontFamily: tokens.fonts.heading, color: tokens.colors.text }}
        >
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {categories.slice(0, 4).map((cat) => (
            <a
              key={cat.name}
              href={`#/category/${cat.name.toLowerCase()}`}
              className="group relative aspect-[3/4] overflow-hidden"
              style={{ borderRadius: tokens.radius.sm }}
            >
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent})` }}
                />
              )}
              <div className="absolute inset-0 bg-black/20 transition duration-300 group-hover:bg-black/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="px-6 py-2 text-sm font-medium uppercase tracking-widest text-white"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {cat.name}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
