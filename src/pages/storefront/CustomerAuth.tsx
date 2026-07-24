import { useState } from 'react';
import { Navigate, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import OtpVerifyBlock from '@/components/storefront/OtpVerifyBlock';
import { Loader2, Eye, EyeOff, Mail, ShieldCheck, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'login' | 'signup' | 'signup_verify' | 'forgot_email' | 'forgot_otp' | 'forgot_newpw';

export default function CustomerAuth() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const { store, loading: storeLoading } = useStorefront(slug || '');
  const {
    user, loading: authLoading,
    signInWithEmail, sendPasswordResetOtp, resetPasswordWithOtp,
    sendSignupOtp, verifySignupOtp,
  } = useCustomerAuth(slug || '');

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dest = () => {
    if (redirectParam === 'checkout') return `/store/${slug}/checkout`;
    if (redirectParam === 'cart') return `/store/${slug}/cart`;
    return `/store/${slug}`;
  };

  if (storeLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!store) return null;
  if (user) return <Navigate to={dest()} replace />;

  const theme = resolveTheme(getStoreThemeTokens(store));
  const { colors, fonts, borderRadius } = theme;
  const pr = colors.primary;

  // ── styles ────────────────────────────────────────────────────────────
  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '12px 16px', fontSize: '14px',
    backgroundColor: `${pr}06`,
    border: `1.5px solid ${colors.secondary}`,
    borderRadius: 10, color: colors.text, outline: 'none',
    transition: 'border-color 0.2s',
    ...extra,
  });

  const btnPri = (disabled?: boolean): React.CSSProperties => ({
    width: '100%', padding: '14px', fontSize: '14px', fontWeight: 700,
    background: disabled ? `${pr}66` : pr, color: '#fff', border: 'none',
    borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: disabled ? 'none' : `0 6px 24px ${pr}44`,
    letterSpacing: '0.015em', transition: 'all 0.2s',
  });

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: colors.text, opacity: 0.45, marginBottom: 6,
  };

  // ── handlers ─────────────────────────────────────────────────────────
  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    setSubmitting(true);
    const { error } = await signInWithEmail(email, password);
    setSubmitting(false);
    if (error) { toast.error(error.message || 'Invalid email or password'); return; }
    toast.success('Welcome back!');
    navigate(dest(), { replace: true });
  };

  const doSignupSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error('Name is required');
    if (!email) return toast.error('Email is required');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setSubmitting(true);
    const { error } = await sendSignupOtp(email, fullName, password);
    setSubmitting(false);
    if (error) { toast.error(error.message || 'Could not send verification code'); return; }
    toast.success('Verification code sent!'); setOtp(''); setStep('signup_verify');
  };

  const doSignupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error('Enter the 6-digit code');
    setSubmitting(true);
    const { error } = await verifySignupOtp(email, otp);
    setSubmitting(false);
    if (error) { toast.error(error.message || 'Invalid or expired code'); return; }
    toast.success(`Welcome to ${store.name}!`);
    navigate(dest(), { replace: true });
  };

  const doForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Enter your email');
    setSubmitting(true);
    const { error } = await sendPasswordResetOtp(email);
    setSubmitting(false);
    if (error) { toast.error(error.message || 'Could not send code'); return; }
    toast.success('Reset code sent!'); setOtp(''); setStep('forgot_otp');
  };

  const doForgotNewPw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('Min 6 characters');
    setSubmitting(true);
    const { error, data } = await resetPasswordWithOtp(email, otp, newPassword);
    setSubmitting(false);
    if (error) { toast.error(error.message || 'Could not reset password'); return; }
    toast.success('Password updated! You are now signed in.');
    if ((data as any)?.requires_signin) { setStep('login'); return; }
    navigate(dest(), { replace: true });
  };

  const resendSignupOtp = async () => {
    const { error } = await sendSignupOtp(email, fullName, password);
    if (error) toast.error(error.message || 'Could not resend'); else toast.success('New code sent!');
  };

  const resendForgotOtp = async () => {
    const { error } = await sendPasswordResetOtp(email);
    if (error) toast.error(error.message || 'Could not resend'); else toast.success('New code sent!');
  };

  const goBack = (to: Step) => (
    <button type="button" onClick={() => setStep(to)}
      className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-90 transition-opacity"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, opacity: 0.45 }}>
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );

  const titles: Record<Step, string> = {
    login: 'Welcome back', signup: 'Create account',
    signup_verify: 'Verify your email', forgot_email: 'Reset password',
    forgot_otp: 'Enter reset code', forgot_newpw: 'Set new password',
  };
  const subs: Record<Step, string> = {
    login: `Sign in to your ${store.name} account`,
    signup: 'Join us — it only takes a minute',
    signup_verify: `Enter the code sent to ${email}`,
    forgot_email: "We'll send a 6-digit code to your email",
    forgot_otp: `Check your inbox at ${email}`,
    forgot_newpw: 'Almost done — choose a strong password',
  };

  return (
    <StorefrontLayout store={store}>
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-[430px]">

          {/* ── Card ── */}
          <div className="relative overflow-hidden"
            style={{
              backgroundColor: colors.card, borderRadius: borderRadius + 8,
              color: colors.text,
              boxShadow: '0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
            }}>

            {/* Top accent bar */}
            <div style={{
              height: 3, borderRadius: `${borderRadius + 8}px ${borderRadius + 8}px 0 0`,
              background: `linear-gradient(90deg, ${pr}, ${pr}bb, ${pr}33)`,
            }} />

            {/* Badge + title row */}
            <div className="px-7 pt-6 pb-1">
              <div className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full mb-3"
                style={{ background: `${pr}10`, border: `1px solid ${pr}20` }}>
                <Sparkles className="h-3 w-3" style={{ color: pr }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: pr }}>
                  {store.name}
                </span>
              </div>
              <h1 className="text-[22px] font-bold leading-tight"
                style={{ fontFamily: fonts.heading, color: colors.text }}>
                {titles[step]}
              </h1>
              <p className="text-[13px] mt-1" style={{ color: colors.text, opacity: 0.5 }}>
                {subs[step]}
              </p>
            </div>

            {/* Tab switcher */}
            {(step === 'login' || step === 'signup') && (
              <div className="mx-7 mt-4 flex gap-1 p-1 rounded-xl"
                style={{ background: `${colors.secondary}66` }}>
                {(['login', 'signup'] as Step[]).map(s => (
                  <button key={s} type="button" onClick={() => setStep(s)}
                    className="flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition-all"
                    style={{
                      background: step === s ? colors.card : 'transparent',
                      color: step === s ? pr : colors.text,
                      border: 'none', cursor: 'pointer',
                      boxShadow: step === s ? '0 2px 8px rgba(0,0,0,0.09)' : 'none',
                    }}>
                    {s === 'login' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>
            )}

            {/* Back nav */}
            {['forgot_email','forgot_otp','forgot_newpw','signup_verify'].includes(step) && (
              <div className="px-7 mt-4">
                {step === 'forgot_email' && goBack('login')}
                {step === 'forgot_otp' && goBack('forgot_email')}
                {step === 'forgot_newpw' && goBack('forgot_otp')}
                {step === 'signup_verify' && goBack('signup')}
              </div>
            )}

            <div className="px-7 py-5 space-y-4">

              {/* LOGIN */}
              {step === 'login' && (
                <form onSubmit={doLogin} className="space-y-4">
                  <div>
                    <span style={lbl}>Email</span>
                    <input type="email" placeholder="you@example.com" value={email}
                      onChange={e => setEmail(e.target.value)} style={inp()} required autoFocus />
                  </div>
                  <div>
                    <span style={lbl}>Password</span>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)}
                        style={inp({ paddingRight: 44 })} required />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:colors.text, opacity:0.4 }}>
                        {showPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end -mt-1">
                    <button type="button"
                      onClick={() => { setStep('forgot_email'); setOtp(''); }}
                      className="text-[12px] font-semibold hover:underline"
                      style={{ color: pr, background:'none', border:'none', cursor:'pointer' }}>
                      Forgot password?
                    </button>
                  </div>
                  <button type="submit" disabled={submitting} style={btnPri(submitting)}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin"/>} Sign In
                  </button>
                </form>
              )}

              {/* SIGNUP */}
              {step === 'signup' && (
                <form onSubmit={doSignupSend} className="space-y-4">
                  <div>
                    <span style={lbl}>Full Name</span>
                    <input placeholder="Your full name" value={fullName}
                      onChange={e => setFullName(e.target.value)} style={inp()} required autoFocus />
                  </div>
                  <div>
                    <span style={lbl}>Email</span>
                    <input type="email" placeholder="you@example.com" value={email}
                      onChange={e => setEmail(e.target.value)} style={inp()} required />
                  </div>
                  <div>
                    <span style={lbl}>Password</span>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters"
                        value={password} onChange={e => setPassword(e.target.value)}
                        style={inp({ paddingRight: 44 })} required />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:colors.text, opacity:0.4 }}>
                        {showPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} style={btnPri(submitting)}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mail className="h-4 w-4"/>}
                    {submitting ? 'Sending code…' : 'Continue'}
                  </button>
                </form>
              )}

              {/* SIGNUP VERIFY — OTP + countdown */}
              {step === 'signup_verify' && (
                <OtpVerifyBlock
                  email={email} otp={otp} onOtpChange={setOtp}
                  onSubmit={doSignupVerify} onResend={resendSignupOtp}
                  submitting={submitting} primaryColor={pr}
                  cardColor={colors.card} borderColor={colors.secondary} textColor={colors.text}
                  ctaLabel="Verify & Create Account"
                />
              )}

              {/* FORGOT EMAIL */}
              {step === 'forgot_email' && (
                <form onSubmit={doForgotSend} className="space-y-4">
                  <div>
                    <span style={lbl}>Your Email</span>
                    <input type="email" placeholder="you@example.com" value={email}
                      onChange={e => setEmail(e.target.value)} style={inp()} required autoFocus />
                  </div>
                  <button type="submit" disabled={submitting} style={btnPri(submitting)}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mail className="h-4 w-4"/>}
                    {submitting ? 'Sending…' : 'Send Reset Code'}
                  </button>
                </form>
              )}

              {/* FORGOT OTP — with countdown */}
              {step === 'forgot_otp' && (
                <OtpVerifyBlock
                  email={email} otp={otp} onOtpChange={setOtp}
                  onSubmit={(e) => { e.preventDefault(); if (otp.length >= 6) setStep('forgot_newpw'); }}
                  onResend={resendForgotOtp}
                  submitting={false} primaryColor={pr}
                  cardColor={colors.card} borderColor={colors.secondary} textColor={colors.text}
                  ctaLabel="Continue"
                />
              )}

              {/* FORGOT NEW PW */}
              {step === 'forgot_newpw' && (
                <form onSubmit={doForgotNewPw} className="space-y-4">
                  <div>
                    <span style={lbl}>New Password</span>
                    <div className="relative">
                      <input type={showNewPw ? 'text' : 'password'} placeholder="Min 6 characters"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        style={inp({ paddingRight: 44 })} required autoFocus />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                        style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:colors.text, opacity:0.4 }}>
                        {showNewPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} style={btnPri(submitting)}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin"/>} Set New Password
                  </button>
                </form>
              )}

            </div>

            {/* Footer */}
            <div className="px-7 pb-6 flex items-center justify-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: colors.text, opacity: 0.2 }}/>
              <span className="text-[11px]" style={{ color: colors.text, opacity: 0.2 }}>
                256-bit encrypted · Secured by Supabase
              </span>
            </div>

          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
