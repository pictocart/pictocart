import { useParams, useLocation } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { resolveTheme } from '@/components/storefront/StorefrontLayout';
import BottomNav from './BottomNav';

export default function GlobalStorefrontBottomNav() {
  const { slug } = useParams<{ slug: string }>();
  const { store } = useStore();
  const location = useLocation();

  const storeSlug = store?.slug || slug;

  // Render nothing if not on a storefront route
  if (!storeSlug) return null;

  // Render nothing if on dashboard / staff / admin / rider workspaces
  const lowerPath = location.pathname.toLowerCase();
  if (
    lowerPath.includes('/dashboard') ||
    lowerPath.includes('/admin') ||
    lowerPath.includes('/rider') ||
    lowerPath.includes('/staff')
  ) {
    return null;
  }

  // Resolve theme colors dynamically using store settings theme tokens
  const themeTokens = getStoreThemeTokens(store);
  const theme = resolveTheme(themeTokens, store);

  const colors = {
    primary: theme?.colors?.primary || '#f97316',
    secondary: theme?.colors?.secondary || 'rgba(0,0,0,0.1)',
    card: theme?.colors?.bg || '#ffffff',
    text: theme?.colors?.text || '#000000',
  };

  return (
    <BottomNav
      colors={colors}
      storeId={store?.id}
    />
  );
}
