import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  LayoutDashboard, Package, ShoppingCart, Palette, CreditCard, Banknote, Truck, Globe,
  Ticket, FileText, Mail, TrendingUp, FolderTree, UserCircle, Crown, ShoppingBag, Users,
  Megaphone, Settings as SettingsIcon, Sparkles, Star, Utensils, QrCode, ChefHat, Receipt,
  Wallet as WalletIcon, CalendarClock, Stethoscope, HeartHandshake, Shield,
} from 'lucide-react';

type Entry = {
  label: string;
  path: string;
  group: string;
  icon: any;
  keywords: string; // space-separated synonyms
};

const ENTRIES: Entry[] = [
  { group: 'Overview', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: 'home overview stats revenue orders summary' },

  { group: 'Catalog', label: 'Products', path: '/products', icon: Package, keywords: 'inventory items sku catalog stock add product' },
  { group: 'Catalog', label: 'Menu', path: '/menu', icon: Utensils, keywords: 'food beverages dishes restaurant cafe' },
  { group: 'Catalog', label: 'Categories', path: '/categories', icon: FolderTree, keywords: 'taxonomy collections subcategory tags' },

  { group: 'Sales', label: 'Orders', path: '/orders', icon: ShoppingCart, keywords: 'sales transactions purchase invoice fulfillment' },
  { group: 'Sales', label: 'Kitchen Desk', path: '/kitchen', icon: ChefHat, keywords: 'kot orders cooking food preparation' },
  { group: 'Sales', label: 'Returns', path: '/returns', icon: Truck, keywords: 'refund return rma reverse logistics' },
  { group: 'Sales', label: 'Reviews', path: '/reviews', icon: FileText, keywords: 'ratings testimonials moderation feedback' },
  { group: 'Sales', label: 'Customers', path: '/customers', icon: Users, keywords: 'buyers crm contacts users audience' },
  { group: 'Sales', label: 'Coupons', path: '/coupons', icon: Ticket, keywords: 'discount promo code offer voucher sale' },

  { group: 'Bookings', label: 'Appointments', path: '/appointments', icon: CalendarClock, keywords: 'booking schedule calendar slot reservation' },
  { group: 'Bookings', label: 'Services', path: '/services', icon: HeartHandshake, keywords: 'service catalog offerings treatments' },
  { group: 'Bookings', label: 'Doctors / Staff', path: '/providers', icon: Stethoscope, keywords: 'doctor staff therapist provider team' },
  { group: 'Bookings', label: 'Family Plans', path: '/family-plans', icon: Users, keywords: 'membership family package subscription plan' },
  { group: 'Bookings', label: 'Provider Payouts', path: '/providers/payouts', icon: WalletIcon, keywords: 'payout salary commission provider earnings' },

  { group: 'Accounts', label: 'Accounts Overview', path: '/accounts', icon: LayoutDashboard, keywords: 'accounting bookkeeping ledger finance' },
  { group: 'Accounts', label: 'Purchases', path: '/accounts/purchases', icon: ShoppingBag, keywords: 'buying procurement vendor bills' },
  { group: 'Accounts', label: 'Expenses', path: '/accounts/expenses', icon: Banknote, keywords: 'spend cost outflow bills payment' },
  { group: 'Accounts', label: 'Suppliers', path: '/accounts/suppliers', icon: Truck, keywords: 'vendor wholesaler distributor party' },
  { group: 'Accounts', label: 'Customer Khata', path: '/accounts/khata', icon: Users, keywords: 'udhaar credit ledger due receivable' },
  { group: 'Accounts', label: 'Inventory Ledger', path: '/accounts/inventory', icon: Package, keywords: 'stock movement adjustments warehouse' },
  { group: 'Accounts', label: 'Invoices', path: '/invoices', icon: Receipt, keywords: 'bill receipt gst tax invoice' },
  { group: 'Accounts', label: 'Profit & Loss', path: '/accounts/reports/pnl', icon: TrendingUp, keywords: 'pnl p&l report income statement margin' },
  { group: 'Accounts', label: 'Cash Book', path: '/accounts/reports/cashbook', icon: WalletIcon, keywords: 'cash flow daybook register' },
  { group: 'Accounts', label: 'GST Summary', path: '/accounts/reports/gst', icon: FileText, keywords: 'gst tax compliance return summary' },

  { group: 'Marketing', label: 'Blog Posts', path: '/blog-posts', icon: FileText, keywords: 'content blog articles seo writing' },
  { group: 'Marketing', label: 'Testimonials', path: '/testimonials', icon: Star, keywords: 'reviews social proof quotes' },
  { group: 'Marketing', label: 'Google Reviews', path: '/google-reviews', icon: Star, keywords: 'google business reviews ratings gmb' },
  { group: 'Marketing', label: 'Subscribers', path: '/subscribers', icon: Mail, keywords: 'newsletter email list marketing audience' },
  { group: 'Marketing', label: 'SEO Settings', path: '/settings/seo', icon: Search, keywords: 'seo meta title description sitemap rank' },

  { group: 'Storefront', label: 'Themes', path: '/themes', icon: Palette, keywords: 'theme template design premium free skin' },
  { group: 'Storefront', label: 'Customise Store', path: '/customise', icon: SettingsIcon, keywords: 'design editor colors fonts homepage builder layout' },
  { group: 'Storefront', label: 'Store Design', path: '/store-design', icon: Palette, keywords: 'design header footer ticker promo banner sections' },
  { group: 'Storefront', label: 'Promo Ticker', path: '/promo-ticker', icon: Megaphone, keywords: 'ticker marquee announcement promo bar offer banner' },
  { group: 'Storefront', label: 'Policies & Pages', path: '/policies', icon: FileText, keywords: 'terms privacy refund shipping policy pages legal' },
  { group: 'Storefront', label: 'Store Analytics', path: '/analytics', icon: TrendingUp, keywords: 'analytics traffic conversion funnel insights' },

  { group: 'Settings', label: 'Payments', path: '/settings/payments', icon: CreditCard, keywords: 'razorpay upi card stripe payment gateway' },
  { group: 'Settings', label: 'COD Rules', path: '/settings/cod', icon: Banknote, keywords: 'cash on delivery cod pincode limit' },
  { group: 'Settings', label: 'Shipping', path: '/settings/shipping', icon: Truck, keywords: 'shiprocket courier delivery rate zone weight' },
  { group: 'Settings', label: 'Fulfillment', path: '/settings/fulfillment', icon: Utensils, keywords: 'pickup delivery dine-in self serve fulfillment' },
  { group: 'Settings', label: 'QR Codes', path: '/settings/qr', icon: QrCode, keywords: 'qr code table menu scan' },
  { group: 'Settings', label: 'Custom Domain', path: '/settings/domain', icon: Globe, keywords: 'domain dns cname custom url branded' },
  { group: 'Settings', label: 'Email Branding', path: '/settings/email', icon: Mail, keywords: 'email sender from address branding smtp' },
  { group: 'Settings', label: 'Billing & Subscription', path: '/billing', icon: Crown, keywords: 'plan subscription upgrade premium pay invoice billing' },
  { group: 'Settings', label: 'AI Wallet', path: '/wallet', icon: Sparkles, keywords: 'ai credits wallet recharge tokens gpt gemini' },

  { group: 'Account', label: 'My Profile', path: '/profile', icon: UserCircle, keywords: 'profile account password security personal' },
  { group: 'Account', label: 'Admin Panel', path: '/admin', icon: Shield, keywords: 'admin super admin internal control' },
];

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdminRole();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredEntries = useMemo(() => {
    if (roleLoading) return [];
    return ENTRIES.filter((e) => e.path !== '/admin' || isAdmin);
  }, [isAdmin, roleLoading]);

  const grouped = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    for (const e of filteredEntries) {
      (map[e.group] ||= []).push(e);
    }
    return map;
  }, [filteredEntries]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 w-full max-w-md h-9 rounded-lg border border-input bg-secondary/40 hover:bg-secondary px-3 text-sm text-muted-foreground transition-colors"
        aria-label="Search features"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search features, settings, pages…</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search features, settings, or pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(grouped).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.path}
                  value={`${item.label} ${item.group} ${item.keywords}`}
                  onSelect={() => go(item.path)}
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{item.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;
