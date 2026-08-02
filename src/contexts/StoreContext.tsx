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
  custom_domain?: string | null;
  owned_by_partner_id?: string | null;
  is_partner_build?: boolean | null;
  created_at: string;
  updated_at: string;
}

interface StoreContextValue {
  store: Store | null;
  loading: boolean;
  isStaff: boolean;
  staffRole: string | null;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
  refetchStore: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [store, setStore] = useState<Store | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Track which user id we've fetched the store for. Without this, right after
  // a fresh sign-in consumers briefly see `loading=false, store=null` from the
  // previous (signed-out) state and incorrectly redirect to /onboarding.
  const [fetchedForUserId, setFetchedForUserId] = useState<string | null>(null);

  // Use userId (string | null) as dependency — NOT the full user object which
  // gets a new reference on every auth token refresh, causing unnecessary refetches.
  const fetchStore = useCallback(async () => {
    if (!userId) {
      setStore(null);
      setIsStaff(false);
      setStaffRole(null);
      setFetchedForUserId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('[StoreContext] fetch error:', error);
      setLoading(false);
      return;
    }

    let row = ((data as Store[] | null)?.[0]) ?? null;
    let staffFound = false;
    let sRole: string | null = null;

    if (!row) {
      // Check if they are a staff member of some store
      const { data: staffData, error: staffError } = await supabase
        .from('store_staff')
        .select('store_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (staffError) {
        console.error('[StoreContext] staff fetch error:', staffError);
      } else if (staffData?.store_id) {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', staffData.store_id)
          .maybeSingle();

        if (storeError) {
          console.error('[StoreContext] store fetch for staff error:', storeError);
        } else if (storeData) {
          row = storeData as Store;
          // Set onboarding_step to 4 so staff bypasses onboarding redirects
          row.onboarding_step = 4;
          staffFound = true;
          sRole = staffData.role;
        }
      }
    }

    setStore(row ? (deriveLegacyThemeFields(row) as Store) : null);
    setIsStaff(staffFound);
    setStaffRole(sRole);
    setFetchedForUserId(userId);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    // Only reset store when user actually changes (login/logout/switch).
    // Token refreshes keep the same userId so we skip the reset → no blink.
    if (userId !== fetchedForUserId) {
      setStore(null);
      setIsStaff(false);
      setStaffRole(null);
      setLoading(true);
    }
    fetchStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, fetchStore]);

  // Treat as loading until we've actually fetched for the current user.
  const effectiveLoading =
    loading || authLoading || (!!userId && fetchedForUserId !== userId);

  return (
    <StoreContext.Provider value={{ store, loading: effectiveLoading, isStaff, staffRole, setStore, refetchStore: fetchStore }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStoreContext = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext must be used within StoreProvider');
  return ctx;
};
