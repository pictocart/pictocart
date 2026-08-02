import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PLATFORM_HOSTS = [
  'localhost',
  '127.0.0.1',
  'pictocart.in',
  'www.pictocart.in',
  'fallback.pictocart.in',
];

const PLATFORM_SUFFIXES = [
  '.lovable.app',
  '.lovableproject.com',
  '.lovable.dev',
  '.vercel.app',
];

export const isPlatformHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (PLATFORM_HOSTS.includes(host)) return true;
  if (PLATFORM_SUFFIXES.some((s) => host.endsWith(s))) return true;
  return false;
};

/**
 * Resolves the current browser hostname to a store row (for Cloudflare-for-SaaS
 * custom domains). Returns null on platform hosts so normal routing applies.
 */
export const useStoreByHost = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isPlatform = isPlatformHost(hostname);

  return useQuery({
    queryKey: ['store-by-host', hostname],
    enabled: !isPlatform && !!hostname,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const apex = hostname.replace(/^www\./i, '');
      const { data, error } = await supabase
        .from('stores')
        .select('slug')
        .or(`custom_domain.eq.${hostname},custom_domain.eq.${apex}`)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
};
