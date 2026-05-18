import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    google?: any;
  }
}

const CustomerAuth = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, requestPasswordReset, signInWithGoogle } = useCustomerAuth(slug || '');
  const [mode, setMode] = useState<'login' | 'signup' | 'otp' | 'verify-otp' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleSignedInRef = useRef(false);

  useEffect(() => {
    if (!slug) return;
    supabase.functions.invoke('customer-auth', { body: { action: 'config', storeSlug: slug } })
      .then(({ data }) => { if (data?.googleClientId) setGoogleClientId(data.googleClientId); })
      .catch(() => {});
  }, [slug]);

  const destinationAfterAuth = () => {
    if (redirectParam === 'checkout') return `/store/${slug}/checkout`;
    if (redirectParam === 'cart') return `/store/${slug}/cart`;
    return `/store/${slug}/account`;
  };

  useEffect(() => {
    if (!googleClientId || user) return;
    if (mode !== 'login' && mode !== 'signup') return;
    const SCRIPT_ID = 'gsi-client';
    const init = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (resp: { credential: string }) => {
          if (!resp?.credential || googleSignedInRef.current) return;
          googleSignedInRef.current = true;
          setSubmitting(true);
          const { error } = await signInWithGoogle(resp.credential);
          setSubmitting(false);
          if (error) {
            googleSignedInRef.current = false;
            toast.error(error.message || 'Google sign-in failed');
          } else {
            navigate(destinationAfterAuth(), { replace: true });
          }
        },
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: mode === 'signup' ? 'signup_with' : 'continue_with',
      });
    };
    if (document.getElementById(SCRIPT_ID)) {
      init();
    } else {
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    }
  }, [mode, user, googleClientId, signInWithGoogle, navigate]);

  if (storeLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) return null;

  // Redirect if already logged in
  if (user) {
    return <Navigate to={destinationAfterAuth()} replace />;
  }

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;

  const inputStyle = {
    backgroundColor: colors.card,
    borderColor: colors.secondary,
    borderRadius: `${borderRadius / 2}px`,
    color: colors.text,
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (mode === 'signup') {
      const { error } = await signUpWithEmail(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Account created! Welcome.');
        navigate(destinationAfterAuth(), { replace: true });
      }
    } else {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate(destinationAfterAuth(), { replace: true });
      }
    }
    setSubmitting(false);
  };

  const handleOtpSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signInWithOtp(phone);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('OTP sent to your phone!');
      setMode('verify-otp');
    }
    setSubmitting(false);
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await verifyOtp(phone, otpToken);
    if (error) {
      toast.error(error.message);
    } else {
      navigate(destinationAfterAuth(), { replace: true });
    }
    setSubmitting(false);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Enter your email first');
      return;
    }
    setSubmitting(true);
    const { error } = await requestPasswordReset(email);
    setSubmitting(false);
    if (error) {
      toast.error(error.message || 'Could not send reset email');
      return;
    }
    toast.success("If an account exists, we've emailed you a reset link.");
    setMode('login');
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
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ fontFamily: fonts.heading }}>
              {mode === 'signup' ? 'Create Account' : mode === 'otp' || mode === 'verify-otp' ? 'Phone Login' : 'Welcome Back'}
            </h1>
            <p className="text-sm opacity-60 mt-1">
              {mode === 'signup'
                ? `Join ${store.name} to track orders & more`
                : `Sign in to ${store.name}`}
            </p>
          </div>

          {/* Mode tabs */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.secondary }}>
                <button
                  onClick={() => setMode('login')}
                  className="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: mode === 'login' ? colors.card : 'transparent',
                    fontWeight: mode === 'login' ? 600 : 400,
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className="flex-1 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: mode === 'signup' ? colors.card : 'transparent',
                    fontWeight: mode === 'signup' ? 600 : 400,
                  }}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <input
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 text-sm border"
                    style={inputStyle}
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 text-sm border"
                  style={inputStyle}
                  required
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 text-sm border"
                    style={inputStyle}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: colors.text }}
                  >
                    <span className="relative block h-4 w-4">
                      <Eye
                        className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${
                          showPassword ? 'opacity-0 scale-75 rotate-12' : 'opacity-100 scale-100 rotate-0'
                        }`}
                      />
                      <EyeOff
                        className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${
                          showPassword ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-12'
                        }`}
                      />
                    </span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                  style={{
                    backgroundColor: colors.primary,
                    color: '#fff',
                    borderRadius: `${borderRadius / 2}px`,
                  }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="w-full text-center text-xs opacity-60 hover:opacity-100 transition-opacity -mt-1"
                  >
                    Forgot password?
                  </button>
                )}
              </form>

              {googleClientId && (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" style={{ borderColor: colors.secondary }} />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                      <span className="px-2" style={{ backgroundColor: colors.card, color: colors.text, opacity: 0.5 }}>
                        Or
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center" ref={googleBtnRef} />
                </div>
              )}
            </>
          )}

          {/* Forgot password */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-sm text-center opacity-70">
                Enter your email and we'll send you a reset link.
              </p>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm border"
                style={inputStyle}
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.primary,
                  color: '#fff',
                  borderRadius: `${borderRadius / 2}px`,
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send reset link
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs opacity-60 hover:opacity-100"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* OTP */}
          {mode === 'otp' && (
            <form onSubmit={handleOtpSend} className="space-y-4">
              <input
                type="tel"
                placeholder="+91 Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 text-sm border"
                style={inputStyle}
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.primary,
                  color: '#fff',
                  borderRadius: `${borderRadius / 2}px`,
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Send OTP
              </button>
            </form>
          )}

          {mode === 'verify-otp' && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <p className="text-sm text-center opacity-60">Enter the 6-digit code sent to {phone}</p>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                className="w-full px-4 py-3 text-sm border text-center tracking-[0.5em] font-mono text-lg"
                style={inputStyle}
                maxLength={6}
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.primary,
                  color: '#fff',
                  borderRadius: `${borderRadius / 2}px`,
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Verify & Sign In
              </button>
            </form>
          )}

          {/* Toggle to OTP */}
          {(mode === 'login' || mode === 'signup') && (
            <button
              onClick={() => setMode('otp')}
              className="w-full text-center text-sm opacity-60 hover:opacity-100 flex items-center justify-center gap-2"
            >
              <Phone className="h-3.5 w-3.5" />
              Sign in with Phone OTP instead
            </button>
          )}

          {(mode === 'otp' || mode === 'verify-otp') && (
            <button
              onClick={() => setMode('login')}
              className="w-full text-center text-sm opacity-60 hover:opacity-100 flex items-center justify-center gap-2"
            >
              <Mail className="h-3.5 w-3.5" />
              Sign in with Email instead
            </button>
          )}
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default CustomerAuth;
