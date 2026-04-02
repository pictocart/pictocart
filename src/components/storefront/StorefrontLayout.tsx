import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Search, User } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { THEME_TEMPLATES, type ThemeTemplate } from '@/lib/themes';
import BottomNav from './BottomNav';
import SearchOverlay from './SearchOverlay';

interface Props {
  children: ReactNode;
  store: {
    name: string;
    slug: string;
    logo_url?: string | null;
    theme?: any;
  };
  products?: any[];
}

function resolveTheme(themeData: any): ThemeTemplate {
  const base = THEME_TEMPLATES.find((t) => t.id === themeData?.name) || THEME_TEMPLATES[0];
  return {
    ...base,
    colors: themeData?.colors || base.colors,
    fonts: themeData?.fonts || base.fonts,
  };
}

const StorefrontLayout = ({ children, store, products = [] }: Props) => {
  const theme = resolveTheme(store.theme);
  const { colors, fonts } = theme;
  const { totalItems } = useCart(store.slug);
  const { user } = useCustomerAuth(store.slug);
  const [searchOpen, setSearchOpen] = useState(false);

  // Load Google Fonts
  useEffect(() => {
    [fonts.heading, fonts.body].forEach((font) => {
      const id = `gfont-${font.replace(/\s+/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    });
  }, [fonts]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: colors.background, color: colors.text, fontFamily: fonts.body }}
    >
      {/* Navigation */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-sm"
        style={{ borderColor: colors.secondary + '80', backgroundColor: colors.card + 'ee' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to={`/store/${store.slug}`} className="flex items-center gap-2">
            {store.logo_url && (
              <img src={store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            )}
            <span className="font-bold text-lg" style={{ fontFamily: fonts.heading }}>
              {store.name}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Desktop search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm opacity-60 hover:opacity-100 border rounded-full"
              style={{ borderColor: colors.secondary }}
            >
              <Search className="h-4 w-4" />
              Search
            </button>

            <Link
              to={user ? `/store/${store.slug}/account` : `/store/${store.slug}/account/auth`}
              className="hidden md:block"
            >
              <User className="h-5 w-5" style={{ color: colors.text }} />
            </Link>

            <Link to={`/store/${store.slug}/cart`} className="relative">
              <ShoppingBag className="h-5 w-5" style={{ color: colors.text }} />
              {totalItems > 0 && (
                <span
                  className="absolute -top-2 -right-2 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* Footer */}
      <footer
        className="border-t py-6 text-center text-xs opacity-50 hidden md:block"
        style={{ borderColor: colors.secondary + '40' }}
      >
        <p>© {new Date().getFullYear()} {store.name}. Powered by Antariksh Commerce</p>
      </footer>

      {/* Mobile Bottom Nav */}
      <BottomNav colors={colors} onSearchOpen={() => setSearchOpen(true)} />

      {/* Search Overlay */}
      {searchOpen && (
        <SearchOverlay
          products={products}
          storeSlug={store.slug}
          colors={colors}
          fonts={fonts}
          borderRadius={theme.borderRadius}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
};

export default StorefrontLayout;
export { resolveTheme };
