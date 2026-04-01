import { useEffect, useState } from 'react';
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

export const useStore = () => {
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStore(null);
      setLoading(false);
      return;
    }

    const fetchStore = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setStore(data as Store);
      }
      setLoading(false);
    };

    fetchStore();
  }, [user]);

  return { store, loading, setStore };
};
