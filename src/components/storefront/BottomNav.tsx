import { Link, useParams, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, LogIn, Utensils } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useFulfillment } from '@/hooks/useFulfillment';

interface Props {
  colors: any;
  onSearchOpen: () => void;
  storeId?: string;
}

const BottomNav = ({ colors, onSearchOpen, storeId }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { totalItems } = useCart(slug || '');
  const { user } = useCustomerAuth(slug || '');
  const { enabledModes } = useFulfillment(storeId);
  const menuEnabled = enabledModes.includes('dine_in') || enabledModes.includes('takeaway');

  const items = [
    { icon: Home, label: 'Home', path: `/store/${slug}` },
    ...(menuEnabled ? [{ icon: Utensils, label: 'Menu', path: `/store/${slug}/menu` }] : []),
    { icon: Search, label: 'Search', action: onSearchOpen },
    { icon: ShoppingBag, label: 'Cart', path: `/store/${slug}/cart`, badge: totalItems },
    user
      ? { icon: User, label: 'Account', path: `/store/${slug}/account` }
      : { icon: LogIn, label: 'Sign in', path: `/store/${slug}/account/auth` },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t backdrop-blur-md"
      style={{
        borderColor: colors.secondary + '80',
        backgroundColor: colors.card + 'f0',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {items.map((item) => {
        const isActive = item.path ? location.pathname === item.path : false;
        const Component = item.path ? Link : 'button';
        const props = item.path ? { to: item.path } : { onClick: item.action };

        return (
          <Component
            key={item.label}
            {...(props as any)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors relative"
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
            <span>{item.label}</span>
          </Component>
        );
      })}
    </nav>
  );
};

export default BottomNav;
