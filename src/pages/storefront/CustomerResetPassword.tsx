import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const CustomerResetPassword = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery tokens from the URL hash and emits
    // a PASSWORD_RECOVERY event. We mark the form as ready once that fires.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    // If user lands here without a recovery token, allow attempting anyway
    // after a short delay (so they can see a meaningful error).
    const t = setTimeout(() => setReady(true), 1500);
    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!store) return null;

  const theme = resolveTheme(getStoreThemeTokens(store));
  const { colors, fonts, borderRadius } = theme;

  const inputStyle = {
    backgroundColor: colors.card,
    borderColor: colors.secondary,
    borderRadius: `${borderRadius / 2}px`,
    color: colors.text,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || 'Could not update password. The link may have expired.');
      return;
    }
    toast.success('Password updated! You are signed in.');
    navigate(`/store/${slug}/account`, { replace: true });
  };

  return (
    <StorefrontLayout store={store}>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md p-8 space-y-6"
          style={{
            backgroundColor: colors.card,
            borderRadius: `${borderRadius}px`,
            border: `1px solid ${colors.secondary}`,
          }}
        >
          <div className="text-center space-y-2">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              <KeyRound className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: fonts.heading }}>
              Set a new password
            </h1>
            <p className="text-sm opacity-60">For your {store.name} account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 text-sm border"
                style={inputStyle}
                required
                minLength={6}
                disabled={!ready}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
                style={{ color: colors.text }}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 text-sm border"
              style={inputStyle}
              required
              minLength={6}
              disabled={!ready}
            />
            <button
              type="submit"
              disabled={submitting || !ready}
              className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] disabled:opacity-60"
              style={{
                backgroundColor: colors.primary,
                color: '#fff',
                borderRadius: `${borderRadius / 2}px`,
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Update password
            </button>
          </form>
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default CustomerResetPassword;
