import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, X, Utensils, ChevronRight } from 'lucide-react';

interface NavProps {
  store: { name: string; slug: string; logo_url?: string | null };
  colors: any;
  fonts: any;
  borderRadius: number;
  navStyle: 'top' | 'side' | 'hamburger';
  totalItems: number;
  user: any;
  customerName: string;
  menuEnabled: boolean;
  mergedNavLinks: any[];
  headerConfig: any;
  onSearchOpen: () => void;
}

// ─── TOP navbar (default — used by most themes) ──────────────────────────────
const TopNav = ({
  store, colors, fonts, borderRadius,
  totalItems, user, customerName, menuEnabled,
  mergedNavLinks, headerConfig, onSearchOpen,
}: NavProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const slug = store.slug;
  const br = `${borderRadius}px`;

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-sm"
      style={{ borderColor: colors.secondary + '80', backgroundColor: colors.card + 'ee' }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo + mobile hamburger */}
        <div className="flex items-center gap-2">
          {mergedNavLinks.length > 0 && (
            <button className="md:hidden p-1" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
          <Link to={`/store/${slug}`} className="flex items-center gap-2">
            {(headerConfig.logo_url || store.logo_url) && (
              <img src={headerConfig.logo_url || store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            )}
            {headerConfig.show_store_name !== false && (
              <span className="font-bold text-lg" style={{ fontFamily: fonts.heading }}>{store.name}</span>
            )}
          </Link>
        </div>

        {/* Desktop nav links */}
        {mergedNavLinks.length > 0 && (
          <nav className="hidden md:flex items-center" style={{ gap: `${headerConfig.nav_gap ?? 16}px` }}>
            {mergedNavLinks.map((link: any, i: number) => (
              <Link
                key={i}
                to={link.href.startsWith('/') ? `/store/${slug}${link.href}` : link.href || `/store/${slug}`}
                className="text-sm opacity-70 hover:opacity-100 transition-opacity"
                style={{ fontFamily: headerConfig.nav_font || 'inherit', fontWeight: Number(headerConfig.nav_weight || 500) }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right icons */}
        <div className="flex items-center gap-3">
          {menuEnabled && (
            <Link to={`/store/${slug}/menu`} className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full" style={{ backgroundColor: colors.primary, color: '#fff' }}>
              <Utensils className="h-4 w-4" /> Menu
            </Link>
          )}
          <button onClick={onSearchOpen} className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm opacity-60 hover:opacity-100 border rounded-full" style={{ borderColor: colors.secondary }}>
            <Search className="h-4 w-4" /> Search
          </button>
          <Link
            to={user ? `/store/${slug}/account` : `/store/${slug}/account/auth`}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors hover:opacity-80 max-w-40"
            style={{ borderColor: colors.primary, color: colors.primary }}
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{user ? customerName : 'Sign in'}</span>
          </Link>
          <Link
            to={user ? `/store/${slug}/account` : `/store/${slug}/account/auth`}
            className="md:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full max-w-28"
            style={{ backgroundColor: colors.primary, color: '#fff' }}
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{user ? customerName : 'Sign in'}</span>
          </Link>
          <Link to={`/store/${slug}/cart`} className="relative">
            <ShoppingBag className="h-5 w-5" style={{ color: colors.text }} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center" style={{ backgroundColor: colors.primary, color: '#fff' }}>
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      {mergedNavLinks.length > 0 && (
        <div
          className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: mobileOpen ? `${mergedNavLinks.length * 44 + 24}px` : '0px',
            opacity: mobileOpen ? 1 : 0,
            borderTop: mobileOpen ? `1px solid ${colors.secondary}80` : 'none',
            backgroundColor: colors.card,
          }}
        >
          <nav className="px-4 py-3 flex flex-col gap-1">
            {mergedNavLinks.map((link: any, i: number) => (
              <Link
                key={i}
                to={link.href.startsWith('/') ? `/store/${slug}${link.href}` : link.href || `/store/${slug}`}
                className="text-sm py-2 px-2 rounded hover:bg-black/5 transition-colors"
                style={{
                  fontFamily: headerConfig.nav_font || 'inherit',
                  fontWeight: Number(headerConfig.nav_weight || 500),
                  transform: mobileOpen ? 'translateX(0)' : 'translateX(-10px)',
                  opacity: mobileOpen ? 1 : 0,
                  transition: `transform 0.3s ease ${i * 0.05}s, opacity 0.3s ease ${i * 0.05}s`,
                }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

// ─── HAMBURGER navbar (Neon Pop style — full-screen overlay drawer) ───────────
const HamburgerNav = ({
  store, colors, fonts, borderRadius,
  totalItems, user, customerName, menuEnabled,
  mergedNavLinks, headerConfig, onSearchOpen,
}: NavProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slug = store.slug;
  const location = useLocation();

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{ backgroundColor: colors.card + 'f5', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${colors.secondary}60` }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3.5">
          {/* Logo */}
          <Link to={`/store/${slug}`} className="flex items-center gap-2.5">
            {(headerConfig.logo_url || store.logo_url) && (
              <img src={headerConfig.logo_url || store.logo_url} alt="" className="h-8 w-8 object-cover" style={{ borderRadius: `${borderRadius / 2}px` }} />
            )}
            {headerConfig.show_store_name !== false && (
              <span className="font-bold text-base tracking-wide" style={{ fontFamily: fonts.heading, color: colors.text }}>{store.name}</span>
            )}
          </Link>

          {/* Right: cart + hamburger */}
          <div className="flex items-center gap-4">
            <button onClick={onSearchOpen} className="opacity-60 hover:opacity-100 transition-opacity">
              <Search className="h-5 w-5" style={{ color: colors.text }} />
            </button>
            <Link to={`/store/${slug}/cart`} className="relative">
              <ShoppingBag className="h-5 w-5" style={{ color: colors.text }} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center" style={{ backgroundColor: colors.primary, color: '#fff' }}>
                  {totalItems}
                </span>
              )}
            </Link>
            <button onClick={() => setDrawerOpen(true)} className="p-1">
              <Menu className="h-5 w-5" style={{ color: colors.text }} />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen overlay drawer */}
      <div
        className="fixed inset-0 z-[100] flex flex-col transition-all duration-300"
        style={{
          backgroundColor: colors.background,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'all' : 'none',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${colors.secondary}60` }}>
          <Link to={`/store/${slug}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-2">
            {(headerConfig.logo_url || store.logo_url) && (
              <img src={headerConfig.logo_url || store.logo_url} alt="" className="h-8 w-8 object-cover" style={{ borderRadius: `${borderRadius / 2}px` }} />
            )}
            <span className="font-bold text-lg" style={{ fontFamily: fonts.heading, color: colors.text }}>{store.name}</span>
          </Link>
          <button onClick={() => setDrawerOpen(false)} className="p-2 opacity-60 hover:opacity-100">
            <X className="h-6 w-6" style={{ color: colors.text }} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-6 py-8 flex flex-col gap-2 overflow-y-auto">
          {[
            { label: 'Home', href: `/store/${slug}` },
            ...(menuEnabled ? [{ label: 'Menu', href: `/store/${slug}/menu` }] : []),
            ...mergedNavLinks.map((l: any) => ({
              label: l.label,
              href: l.href.startsWith('/') ? `/store/${slug}${l.href}` : l.href,
            })),
          ].map((link, i) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={i}
                to={link.href}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-between py-4 text-xl font-semibold border-b transition-opacity hover:opacity-100"
                style={{
                  fontFamily: fonts.heading,
                  color: isActive ? colors.primary : colors.text,
                  borderColor: colors.secondary + '40',
                  opacity: isActive ? 1 : 0.7,
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                {link.label}
                <ChevronRight className="h-5 w-5 opacity-40" />
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="px-6 py-6 flex items-center justify-between" style={{ borderTop: `1px solid ${colors.secondary}60` }}>
          <Link
            to={user ? `/store/${slug}/account` : `/store/${slug}/account/auth`}
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: colors.primary }}
          >
            <User className="h-4 w-4" />
            {user ? customerName : 'Sign In / Register'}
          </Link>
          <Link
            to={`/store/${slug}/cart`}
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius}px` }}
          >
            <ShoppingBag className="h-4 w-4" />
            Cart{totalItems > 0 ? ` (${totalItems})` : ''}
          </Link>
        </div>
      </div>
    </>
  );
};

// ─── Main ThemeNavbar — picks the right variant ───────────────────────────────
const ThemeNavbar = (props: NavProps) => {
  switch (props.navStyle) {
    case 'hamburger':
      return <HamburgerNav {...props} />;
    case 'top':
    default:
      return <TopNav {...props} />;
  }
};

export default ThemeNavbar;
