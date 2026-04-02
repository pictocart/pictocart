import { useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Search, User, ArrowLeft } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { THEME_TEMPLATES, type ThemeTemplate } from '@/lib/themes';

interface Props {
  children: ReactNode;
  store: {
    name: string;
    slug: string;
    logo_url?: string | null;
    theme?: any;
  };
}

function resolveTheme(themeData: any): ThemeTemplate {
  const base = THEME_TEMPLATES.find((t) => t.id === themeData?.name) || THEME_TEMPLATES[0];
  return {
    ...base,
    colors: themeData?.colors || base.colors,
    fonts: themeData?.fonts || base.fonts,
  };
}

const StorefrontLayout = ({ children, store }: Props) => {
  const theme = resolveTheme(store.theme);
  const { colors, fonts } = theme;
  const { items, totalItems } = useCart(store.slug);

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
          <div className="flex items-center gap-4">
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
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className="border-t py-6 text-center text-xs opacity-50"
        style={{ borderColor: colors.secondary + '40' }}
      >
        <p>© {new Date().getFullYear()} {store.name}. Powered by Antariksh Commerce</p>
      </footer>
    </div>
  );
};

export default StorefrontLayout;
export { resolveTheme };
