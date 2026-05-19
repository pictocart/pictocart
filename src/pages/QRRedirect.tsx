import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const QRRedirect = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['qr-redirect', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase
        .from('store_qr_codes' as any)
        .select('id, target_path, is_active, scans_count')
        .eq('slug', slug)
        .maybeSingle();
      return data as any;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (data?.id) {
      // Fire-and-forget scan counter increment
      supabase
        .from('store_qr_codes' as any)
        .update({ scans_count: (data.scans_count || 0) + 1, last_scanned_at: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {});
    }
  }, [data?.id]); // eslint-disable-line

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data || !data.is_active) return <Navigate to="/" replace />;
  return <Navigate to={data.target_path} replace />;
};

export default QRRedirect;
