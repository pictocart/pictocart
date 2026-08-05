import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useSubscribeNewsletter } from '@/hooks/useNewsletterSubscribers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';

interface Props {
  storeId: string;
  title?: string;
  subtitle?: string;
  colors: any;
  borderRadius: number;
}

const NewsletterSection = ({ storeId, title, subtitle, colors, borderRadius }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useCustomerAuth(slug || '');
  const [email, setEmail] = useState('');
  const [isSubscribedState, setIsSubscribedState] = useState(false);
  const subscribe = useSubscribeNewsletter();

  // Query database for logged-in user's subscription status using secure RPC function
  const { data: isDbSubscribed, isLoading: checkLoading } = useQuery({
    queryKey: ['newsletter-check', storeId, user?.email],
    queryFn: async () => {
      if (!storeId || !user?.email) return false;
      const { data, error } = await (supabase as any).rpc('check_newsletter_subscription', {
        p_store_id: storeId,
        p_email: user.email,
      });
      if (error) throw error;
      return !!data;
    },
    enabled: !!storeId && !!user?.email,
  });

  const isSubscribed = isDbSubscribed || isSubscribedState;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) return;
    subscribe.mutate(
      { store_id: storeId, email },
      {
        onSuccess: (data) => {
          if (data?.alreadySubscribed) {
            toast.success('Already subscribed! 🎉');
          } else {
            toast.success('Subscribed! 🎉');
          }
          setEmail('');
          setIsSubscribedState(true);
        },
        onError: (err: any) => toast.error(err.message || 'Failed to subscribe'),
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (checkLoading) {
    return (
      <section className="py-12 px-4" style={{ backgroundColor: colors.secondary }}>
        <div className="max-w-md mx-auto text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto opacity-60" style={{ color: colors.text }} />
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4" style={{ backgroundColor: colors.secondary }}>
      <div className="max-w-md mx-auto text-center">
        <Mail className="h-8 w-8 mx-auto mb-3 opacity-60" style={{ color: colors.text }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: colors.text }}>{title || 'Stay Updated'}</h2>
        <p className="text-sm opacity-60 mb-6" style={{ color: colors.text }}>{subtitle || 'Subscribe to our newsletter for the latest updates and offers.'}</p>
        
        {isSubscribed ? (
          <div 
            className="px-6 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
            style={{ borderRadius: `${borderRadius}px` }}
          >
            🎉 You are already subscribed!
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="your@email.com"
              className="flex-1 px-4 py-2.5 text-sm border-0 outline-none"
              style={{ backgroundColor: colors.card, color: colors.text, borderRadius: `${borderRadius}px` }}
            />
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={subscribe.isPending}
              className="px-6 py-2.5 text-sm font-semibold shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ 
                backgroundColor: colors.text, 
                color: colors.secondary, 
                borderRadius: `${borderRadius}px` 
              }}
            >
              {subscribe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subscribe'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsletterSection;
