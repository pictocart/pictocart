import { tokens } from '../tokens';

interface LookbookItem {
  image_url?: string;
  title?: string;
  subtitle?: string;
}

export const CoutureLookbook = ({ items }: { items?: LookbookItem[] }) => {
  const looks: LookbookItem[] = items?.length
    ? items.slice(0, 3)
    : [
        { title: 'Summer Edit', subtitle: 'Light layers, bold colours' },
        { title: 'Evening Luxe', subtitle: 'Silhouettes that captivate' },
        { title: 'Street Chic', subtitle: 'Urban edge meets comfort' },
      ];

  return (
    <section style={{ background: tokens.colors.surface }}>
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p
          className="mb-2 text-center text-xs tracking-[0.3em] uppercase"
          style={{ color: tokens.colors.accent, fontFamily: tokens.fonts.accent }}
        >
          The Lookbook
        </p>
        <h2
          className="mb-12 text-center text-3xl md:text-4xl"
          style={{ fontFamily: tokens.fonts.heading, color: tokens.colors.text }}
        >
          Curated Looks
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {looks.map((look, i) => (
            <a
              key={i}
              href="#"
              className="group relative overflow-hidden"
              style={{
                borderRadius: tokens.radius.sm,
                aspectRatio: i === 0 ? '3/4' : '4/5',
              }}
            >
              {look.image_url ? (
                <img
                  src={look.image_url}
                  alt={look.title || ''}
                  className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${i === 0 ? tokens.colors.primary : tokens.colors.accent}, ${i === 0 ? tokens.colors.accent : tokens.colors.primary})`,
                  }}
                />
              )}
              <div
                className="absolute bottom-0 left-0 right-0 p-6"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                }}
              >
                <h3
                  className="text-xl font-bold text-white"
                  style={{ fontFamily: tokens.fonts.heading }}
                >
                  {look.title}
                </h3>
                {look.subtitle && (
                  <p className="mt-1 text-sm text-white/70">{look.subtitle}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
