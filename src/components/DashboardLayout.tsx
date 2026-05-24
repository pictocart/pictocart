import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Palette,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Menu,
  Shield,
  CreditCard,
  Banknote,
  Truck,
  Globe,
  Ticket,
  Search,
  FileText,
  Mail,
  TrendingUp,
  FolderTree,
  UserCircle,
  Crown,
  ShoppingBag,
  Users,
  Megaphone,
  Settings as SettingsIcon,
  Sparkles,
  Star,
  Utensils,
  QrCode,
  ChefHat,
  Receipt,
  Wallet as WalletIcon,
  CalendarClock,
  Stethoscope,
  Scissors,
  HeartHandshake,
} from 'lucide-react';


import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import CreditBadge from '@/components/wallet/CreditBadge';
import { HelpLauncher } from '@/components/HelpLauncher';
import { useStore } from '@/hooks/useStore';
import { SubscriptionGate } from '@/components/billing/SubscriptionGate';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { Link as RLink } from 'react-router-dom';

type NavLeaf = { label: string; icon: any; path: string };
type NavGroup = { label: string; icon: any; key: string; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const isGroup = (e: NavEntry): e is NavGroup => 'children' in e;

const navTree: NavEntry[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  {
    label: 'Catalog',
    icon: Package,
    key: 'catalog',
    children: [
      { label: 'Products', icon: Package, path: '/products' },
      { label: 'Menu', icon: Utensils, path: '/menu' },
      { label: 'Categories', icon: FolderTree, path: '/categories' },
    ],
  },
  {
    label: 'Sales',
    icon: ShoppingBag,
    key: 'sales',
    children: [
      { label: 'Orders', icon: ShoppingCart, path: '/orders' },
      { label: 'Kitchen Desk', icon: ChefHat, path: '/kitchen' },
      { label: 'Returns', icon: Truck, path: '/returns' },
      { label: 'Reviews', icon: FileText, path: '/reviews' },
      { label: 'Customers', icon: Users, path: '/customers' },
      { label: 'Coupons', icon: Ticket, path: '/coupons' },
    ],
  },
  {
    label: 'Bookings',
    icon: CalendarClock,
    key: 'bookings',
    children: [
      { label: 'Appointments', icon: CalendarClock, path: '/appointments' },
      { label: 'Services', icon: HeartHandshake, path: '/services' },
      { label: 'Doctors / Staff', icon: Stethoscope, path: '/providers' },
      { label: 'Family Plans', icon: Users, path: '/family-plans' },
    ],
  },
  {
    label: 'Accounts',
    icon: WalletIcon,
    key: 'accounts',
    children: [
      { label: 'Overview', icon: LayoutDashboard, path: '/accounts' },
      { label: 'Purchases', icon: ShoppingBag, path: '/accounts/purchases' },
      { label: 'Expenses', icon: Banknote, path: '/accounts/expenses' },
      { label: 'Suppliers', icon: Truck, path: '/accounts/suppliers' },
      { label: 'Customer Khata', icon: Users, path: '/accounts/khata' },
      { label: 'Inventory Ledger', icon: Package, path: '/accounts/inventory' },
      { label: 'Invoices', icon: Receipt, path: '/invoices' },
      { label: 'Profit & Loss', icon: TrendingUp, path: '/accounts/reports/pnl' },
      { label: 'Cash Book', icon: WalletIcon, path: '/accounts/reports/cashbook' },
      { label: 'GST Summary', icon: FileText, path: '/accounts/reports/gst' },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    key: 'marketing',
    children: [
      { label: 'Blog Posts', icon: FileText, path: '/blog-posts' },
      { label: 'Testimonials', icon: Star, path: '/testimonials' },
      { label: 'Google Reviews', icon: Star, path: '/google-reviews' },
      { label: 'Subscribers', icon: Mail, path: '/subscribers' },
      { label: 'SEO', icon: Search, path: '/settings/seo' },
    ],
  },
  {
    label: 'Storefront',
    icon: Sparkles,
    key: 'storefront',
    children: [
      { label: 'Themes', icon: Palette, path: '/themes' },
      { label: 'Customise', icon: SettingsIcon, path: '/customise' },
      { label: 'Policies & Pages', icon: FileText, path: '/policies' },
      { label: 'Analytics', icon: TrendingUp, path: '/analytics' },
    ],
  },
  {
    label: 'Settings',
    icon: SettingsIcon,
    key: 'settings',
    children: [
      { label: 'Payments', icon: CreditCard, path: '/settings/payments' },
      { label: 'COD Rules', icon: Banknote, path: '/settings/cod' },
      { label: 'Shipping', icon: Truck, path: '/settings/shipping' },
      { label: 'Fulfillment', icon: Utensils, path: '/settings/fulfillment' },
      { label: 'QR Codes', icon: QrCode, path: '/settings/qr' },
      { label: 'Domain', icon: Globe, path: '/settings/domain' },
      { label: 'Email Branding', icon: Mail, path: '/settings/email' },
      { label: 'Billing', icon: Crown, path: '/billing' },
      { label: 'AI Wallet', icon: Sparkles, path: '/wallet' },
    ],
  },
];

const mobileBottomNav: NavLeaf[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Products', icon: Package, path: '/products' },
  { label: 'Orders', icon: ShoppingCart, path: '/orders' },
  { label: 'Design', icon: Palette, path: '/customise' },
  { label: 'Profile', icon: UserCircle, path: '/profile' },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const { store } = useStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const cat = String(store?.category || '').toLowerCase();
  const isFnB = ['food', 'food_beverages', 'food-and-beverages', 'restaurant', 'cafe'].includes(cat);
  const isService = ['healthcare', 'beauty_services'].includes(cat);

  const filteredNavTree = useMemo<NavEntry[]>(() => {
    const fnbPaths = new Set(['/menu', '/kitchen', '/settings/qr']);
    const servicePaths = new Set(['/appointments', '/services', '/providers', '/family-plans']);
    return navTree
      .map((entry) => {
        if (!isGroup(entry)) return entry;
        const children = entry.children.filter((c) => {
          if (fnbPaths.has(c.path)) return isFnB;
          if (servicePaths.has(c.path)) return isService;
          return true;
        });
        return { ...entry, children };
      })
      .filter((entry) => isGroup(entry) ? entry.children.length > 0 : true);
  }, [isFnB, isService]);


  const initiallyOpen = useMemo(() => {
    const open: Record<string, boolean> = {};
    for (const entry of navTree) {
      if (isGroup(entry) && entry.children.some((c) => location.pathname.startsWith(c.path))) {
        open[entry.key] = true;
      }
    }
    return open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initiallyOpen);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const entry of navTree) {
        if (isGroup(entry) && entry.children.some((c) => location.pathname === c.path)) {
          next[entry.key] = true;
        }
      }
      return next;
    });
  }, [location.pathname]);

  const toggleGroup = (key: string) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const renderLeaf = (item: NavLeaf, indent = false) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
          collapsed && 'justify-center px-2'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={cn('flex h-14 items-center border-b border-sidebar-border px-4', collapsed && 'justify-center')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
            P
          </div>
          {!collapsed && (
            <span className="ml-2 font-semibold text-sidebar-foreground truncate">
              Pic to Cart
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNavTree.map((entry) => {
            if (!isGroup(entry)) return renderLeaf(entry);

            if (collapsed) {
              return (
                <div key={entry.key} className="space-y-1">
                  {entry.children.map((c) => renderLeaf(c))}
                </div>
              );
            }

            const open = openGroups[entry.key];
            const hasActive = entry.children.some((c) => location.pathname === c.path);
            return (
              <div key={entry.key}>
                <button
                  onClick={() => toggleGroup(entry.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    hasActive
                      ? 'text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                  aria-expanded={open}
                >
                  <entry.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{entry.label}</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="mt-1 space-y-1 border-l border-sidebar-border/60 ml-4 pl-2">
                    {entry.children.map((c) => renderLeaf(c))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === '/profile'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
              collapsed && 'justify-center px-2'
            )}
          >
            <UserCircle className="h-4 w-4 shrink-0" />
            {!collapsed && <span>My Profile</span>}
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors',
                collapsed && 'justify-center px-2'
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={signOut}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn('flex-1 transition-all duration-200', collapsed ? 'md:ml-16' : 'md:ml-60')}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <CreditBadge />
          <Link to="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle className="h-5 w-5" />
            </Button>
          </Link>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6">
          <GraceBanner />
          <SubscriptionGate>{children}</SubscriptionGate>
        </div>
        <HelpLauncher />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background md:hidden">
        {mobileBottomNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

const GraceBanner = () => {
  const { inGrace, graceDaysLeft } = useSubscriptionAccess();
  if (!inGrace) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
      <span>
        Your subscription payment is overdue. <strong>{graceDaysLeft} day{graceDaysLeft === 1 ? '' : 's'} left</strong> to renew before your store is paused.
      </span>
      <RLink to="/billing" className="font-semibold underline whitespace-nowrap">Renew now</RLink>
    </div>
  );
};

export default DashboardLayout;
