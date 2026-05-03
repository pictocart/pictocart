import { tokens } from './tokens';
import { BazaarHero } from './Hero';
import { BazaarUSPStrip } from './sections/USPStrip';
import { BazaarProductCard } from './ProductCard';

interface Bundle {
  store: { name: string; description?: string | null; logo_url?: string | null };
  content: Record<string, unknown>;
  products: { featured: Array<{ id: string; title: string; price: number; compare_at_price?: number | null; images?: string[] }> };
}

/**
 * Bazaar theme root — renders a complete homepage from the storefront bundle.
 * Used by Theme Master Projects (storefront-bazaar). In this cockpit project it
 * lives as the canonical source.
 */
const BazaarTheme = ({ bundle }: { bundle: Bundle }) => {
  const hero = (bundle.content?.hero as Record<string, unknown> | undefined) ?? {
    kicker: 'इंडिलिपि',
    headline: 'Stories woven by hand.',
    subhead: 'Heritage Indian crafts, signed by the artisan who made them.',
    cta_label: 'Shop the collection',
    cta_href: '#shop',
  };

  return (
    <div style={{ background: tokens.colors.background, color: tokens.colors.text, minHeight: '100vh' }}>
      <header
        className="border-b"
        style={{ borderColor: tokens.colors.border, background: tokens.colors.background }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            {bundle.store.logo_url && (
              <img src={bundle.store.logo_url} alt={bundle.store.name} className="h-9 w-9 rounded" />
            )}
            <span className="text-xl tracking-wide" style={{ fontFamily: tokens.fonts.heading }}>
              {bundle.store.name}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#shop">Shop</a>
            <a href="#story">Our Craft</a>
            <a href="#blog">Journal</a>
          </nav>
        </div>
      </header>

      <BazaarHero content={hero as never} />
      <BazaarUSPStrip />

      <section id="shop" className="mx-auto max-w-6xl px-6 py-16">
        <h2
          className="mb-8 text-3xl md:text-4xl"
          style={{ fontFamily: tokens.fonts.heading }}
        >
          Featured pieces
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {bundle.products.featured.map((p) => (
            <BazaarProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t" style={{ borderColor: tokens.colors.border }}>
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm" style={{ color: tokens.colors.muted }}>
          © {new Date().getFullYear()} {bundle.store.name}. Made by hand, shipped with love.
        </div>
      </footer>
    </div>
  );
};

export default BazaarTheme;
export { tokens };
