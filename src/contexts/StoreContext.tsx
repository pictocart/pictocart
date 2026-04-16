import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  settings: any;
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

  const fetchStore = useCallback(async () => {
    if (!user) {
      setStore(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[StoreContext] fetch error:', error);
      // Don't clobber existing store on transient error
      setLoading(false);
      return;
    }
    setStore((data as Store) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // Wait until auth has finished restoring the session before deciding
    // whether the user has a store. Otherwise we briefly see user=null and
    // incorrectly redirect to onboarding.
    if (authLoading) {
      setLoading(true);
      return;
    }
    fetchStore();
  }, [authLoading, fetchStore]);

  return (
    <StoreContext.Provider value={{ store, loading: loading || authLoading, setStore, refetchStore: fetchStore }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStoreContext = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext must be used within StoreProvider');
  return ctx;
};
