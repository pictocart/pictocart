import { Link, useParams, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, LogIn, Utensils } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useFulfillment } from '@/hooks/useFulfillment';

interface Props {
  colors: any;
  onSearchOpen?: () => void;
  storeId?: string;
}

const BottomNav = ({ colors, storeId }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { totalItems } = useCart(slug || '');
  const { user } = useCustomerAuth(slug || '');
  const { enabledModes } = useFulfillment(storeId);
  
  const menuEnabled = enabledModes.includes('dine_in') || enabledModes.includes('takeaway');

  const isPlatform = window.location.hostname.includes('pictocart') || 
                     window.location.hostname.includes('localhost') || 
                     window.location.hostname.includes('127.0.0.1');

  const searchPath = isPlatform ? `/store/${slug}/search` : `/search`;
  const homePath = isPlatform ? `/store/${slug}` : `/`;
  const menuPath = isPlatform ? `/store/${slug}/menu` : `/menu`;
  const cartPath = isPlatform ? `/store/${slug}/cart` : `/cart`;
  const accountPath = isPlatform ? `/store/${slug}/account` : `/account`;
  const authPath = isPlatform ? `/store/${slug}/account/auth` : `/account/auth`;

  const items = [
    { icon: Home, label: 'Home', path: homePath },
    ...(menuEnabled ? [{ icon: Utensils, label: 'Menu', path: menuPath }] : []),
    { icon: Search, label: 'Search', path: searchPath },
    { icon: ShoppingBag, label: 'Cart', path: cartPath, badge: totalItems },
    user
      ? { icon: User, label: 'Account', path: accountPath }
      : { icon: LogIn, label: 'Sign in', path: authPath },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t backdrop-blur-md h-16 shadow-lg"
      style={{
        borderColor: colors.secondary + '80',
        backgroundColor: colors.card + 'f2',
      }}
    >
      {items.map((item) => {
        const isActive = item.path ? location.pathname === item.path : false;
        const Component = Link;
        const props = { to: item.path };

        return (
          <Component
            key={item.label}
            id={item.label === 'Cart' ? 'mobile-cart-btn' : undefined}
            {...(props as any)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors relative"
            style={{ color: isActive ? colors.primary : colors.text + '80' }}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.badge && item.badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 text-[8px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className="font-extrabold uppercase tracking-wider text-[8px] mt-0.5">{item.label}</span>
          </Component>
        );
      })}
    </nav>
  );
};

export default BottomNav;
