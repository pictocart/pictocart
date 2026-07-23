import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { deriveLegacyThemeFields } from '@/lib/storefrontManifest';

export interface Store {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  logo_url: string | null;
  banner_url: string | null;
  theme: any;
  theme_id?: string | null;
  theme_tokens?: any;
  settings: any;
  resolved_storefront_manifest?: any;
  is_published: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

interface StoreContextValue {
  store: Store | null;
  loading: boolean;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
  refetchStore: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  // Track which user id we've fetched the store for. Without this, right after
  // a fresh sign-in consumers briefly see `loading=false, store=null` from the
  // previous (signed-out) state and incorrectly redirect to /onboarding.
  const [fetchedForUserId, setFetchedForUserId] = useState<string | null>(null);

  const fetchStore = useCallback(async () => {
    if (!user) {
      setStore(null);
      setFetchedForUserId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('[StoreContext] fetch error:', error);
      setLoading(false);
      return;
    }
    const row = ((data as Store[] | null)?.[0]) ?? null;
    setStore(row ? (deriveLegacyThemeFields(row) as Store) : null);
    setFetchedForUserId(user.id);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    // User changed (login/logout) — reset synchronously so consumers don't
    // render the previous user's empty state while the new fetch runs.
    if (user?.id !== fetchedForUserId) {
      setStore(null);
      setLoading(true);
    }
    fetchStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, fetchStore]);

  // Treat as loading until we've actually fetched for the current user.
  const effectiveLoading =
    loading || authLoading || (!!user && fetchedForUserId !== user.id);

  return (
    <StoreContext.Provider value={{ store, loading: effectiveLoading, setStore, refetchStore: fetchStore }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStoreContext = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext must be used within StoreProvider');
  return ctx;
};
