import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { lovable } from '@/integrations/lovable/index';
import { Loader2, Mail, Phone, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const CustomerAuth = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const { user, signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp } = useCustomerAuth(slug || '');
  const [mode, setMode] = useState<'login' | 'signup' | 'otp' | 'verify-otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) return null;

  // Redirect if already logged in
  if (user) {
    navigate(`/store/${slug}/account`, { replace: true });
    return null;
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
        toast.success('Check your email for verification link!');
        setMode('login');
      }
    } else {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate(`/store/${slug}`);
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
      navigate(`/store/${slug}`);
    }
    setSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error('Google sign-in failed');
      setSubmitting(false);
      return;
    }
    if (result.redirected) return;
    navigate(`/store/${slug}`);
    setSubmitting(false);
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

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 py-3 text-sm font-medium border transition-colors hover:opacity-90"
            style={{
              borderColor: colors.secondary,
              borderRadius: `${borderRadius / 2}px`,
              backgroundColor: colors.background,
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: colors.secondary }} />
            <span className="text-xs opacity-40">or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: colors.secondary }} />
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
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm border"
                  style={inputStyle}
                  required
                  minLength={6}
                />
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
              </form>
            </>
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
