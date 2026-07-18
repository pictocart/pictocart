import { tokens } from './tokens';
import { CoutureHero } from './Hero';
import { CoutureProductCard } from './ProductCard';
import { CoutureCategoryGrid } from './sections/CategoryGrid';
import { CoutureLookbook } from './sections/Lookbook';
import { CoutureNewsletter } from './sections/Newsletter';

interface Bundle {
  store: { name: string; slug: string; description?: string | null; logo_url?: string | null };
  content: Record<string, unknown>;
  products: { featured: Array<{ id: string; title: string; price: number; compare_at_price?: number | null; images?: string[] }> };
  categories?: Array<{ name: string; image_url?: string | null }>;
}

const CoutureTheme = ({ bundle }: { bundle: Bundle }) => {
  const hero = (bundle.content?.hero as Record<string, unknown> | undefined) ?? {
    kicker: 'New Season',
    headline: 'Where Fashion Meets Attitude',
    subhead: 'Discover curated edits from the worlds most daring designers.',
    cta_label: 'Explore Collection',
    cta_href: '#shop',
  };

  return (
    <div style={{ background: tokens.colors.background, color: tokens.colors.text, minHeight: '100vh' }}>
      <header
        className="fixed top-0 z-50 w-full"
        style={{ background: 'rgba(26, 26, 46, 0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {bundle.store.logo_url && (
              <img src={bundle.store.logo_url} alt={bundle.store.name} className="h-8 w-8 rounded-full object-cover" />
            )}
            <span className="text-lg tracking-widest uppercase" style={{ fontFamily: tokens.fonts.accent, color: '#fff' }}>
              {bundle.store.name}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-xs tracking-widest uppercase">
            <a href="#shop" style={{ color: '#9CA3AF' }} className="transition-colors hover:text-white">New In</a>
            <a href="#collections" style={{ color: '#9CA3AF' }} className="transition-colors hover:text-white">Collections</a>
            <a href="#lookbook" style={{ color: '#9CA3AF' }} className="transition-colors hover:text-white">Lookbook</a>
          </nav>
          <button
            className="md:hidden flex flex-col gap-1"
            style={{ color: '#fff' }}
            aria-label="Menu"
          >
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
          </button>
        </div>
      </header>

      <CoutureHero content={hero as never} />

      {bundle.categories && bundle.categories.length > 0 && (
        <CoutureCategoryGrid categories={bundle.categories} />
      )}

      <section id="shop" className="mx-auto max-w-6xl px-6 py-20" style={{ scrollMarginTop: 80 }}>
        <p
          className="mb-2 text-center text-xs tracking-[0.3em] uppercase"
          style={{ color: tokens.colors.accent, fontFamily: tokens.fonts.accent }}
        >
          Featured
        </p>
        <h2
          className="mb-12 text-center text-3xl md:text-4xl"
          style={{ fontFamily: tokens.fonts.heading, color: tokens.colors.text }}
        >
          New Arrivals
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {bundle.products.featured.slice(0, 6).map((p) => (
            <CoutureProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <CoutureLookbook items={bundle.content?.lookbook as any} />

      <CoutureNewsletter />

      <footer style={{ background: tokens.colors.primary, borderTop: `1px solid rgba(255,255,255,0.1)` }}>
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-4 text-xs tracking-widest uppercase text-white">Shop</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
                <li><a href="#" className="hover:text-white transition-colors">New In</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Clothing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Accessories</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sale</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-xs tracking-widest uppercase text-white">Company</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-xs tracking-widest uppercase text-white">Support</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Shipping</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Returns</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Size Guide</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-xs tracking-widest uppercase text-white">Connect</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
                <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pinterest</a></li>
              </ul>
            </div>
          </div>
          <div
            className="mt-12 pt-8 text-center text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: '#6B7280' }}
          >
            &copy; {new Date().getFullYear()} {bundle.store.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CoutureTheme;
export { tokens };
