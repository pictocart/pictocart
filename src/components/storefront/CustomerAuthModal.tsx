import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Eye, EyeOff, Mail, ShieldCheck, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import OtpVerifyBlock from './OtpVerifyBlock';

interface Props {
  storeSlug: string; storeName: string;
  primaryColor?: string; cardColor?: string;
  borderColor?: string; textColor?: string;
  borderRadius?: number; onClose: () => void; redirectTo?: string;
}
type Step = 'login' | 'signup' | 'signup_verify' | 'forgot_email' | 'forgot_otp' | 'forgot_newpw';

export default function CustomerAuthModal({
  storeSlug, storeName,
  primaryColor = '#6366f1', cardColor = '#ffffff',
  borderColor = '#e5e7eb', textColor = '#111827',
  borderRadius = 20, onClose, redirectTo,
}: Props) {
  const navigate = useNavigate();
  const { user, signInWithEmail, sendPasswordResetOtp, resetPasswordWithOtp, sendSignupOtp, verifySignupOtp } = useCustomerAuth(storeSlug);

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [btnHovered, setBtnHovered] = useState(false);

  useEffect(() => { if (user) onClose(); }, [user]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const dest = redirectTo || `/store/${storeSlug}`;
  const pr = primaryColor;

  // ── styles ──────────────────────────────────────────────────────────────
  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '12px 16px', fontSize: '14px',
    backgroundColor: `${pr}06`,
    border: `1.5px solid ${borderColor}`,
    borderRadius: 10, color: textColor, outline: 'none',
    transition: 'all 0.2s ease-in-out',
    ...extra,
  });

  const getInpStyle = (fieldName: string, extra?: React.CSSProperties) => inp({
    borderColor: focusedField === fieldName ? pr : borderColor,
    boxShadow: focusedField === fieldName ? `0 0 0 3.5px ${pr}22` : 'none',
    backgroundColor: focusedField === fieldName ? (cardColor === '#ffffff' ? '#ffffff' : cardColor) : `${pr}06`,
    ...extra,
  });

  const btnPri = (disabled?: boolean): React.CSSProperties => ({
    width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700,
    background: disabled ? `${pr}66` : (btnHovered ? `linear-gradient(135deg, ${pr} 0%, ${pr}dd 100%)` : pr),
    color: '#fff', border: 'none',
    borderRadius: 11, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: disabled ? 'none' : (btnHovered ? `0 8px 28px ${pr}55` : `0 6px 20px ${pr}33`),
    transform: btnHovered && !disabled ? 'translateY(-1.5px)' : 'none',
    letterSpacing: '0.015em', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  const label: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    color: textColor, opacity: 0.45, marginBottom: 6,
  };

  // ── handlers ────────────────────────────────────────────────────────────
  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return toast.error('Please enter a valid email address');
    }
    setSubmitting(true);
    const { error } = await signInWithEmail(email, password);
    setSubmitting(false);
    if (error) { toast.error(error.message || 'Invalid email or password'); return; }
    toast.success('Welcome back!'); onClose(); navigate(dest, { replace: true });
  };

  const doSignupSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error('Name is required');
    if (!email) return toast.error('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return toast.error('Please enter a valid email address');
    }
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setSubmitting(true);
    const { error } = await sendSignupOtp(email, fullName, password);
    setSubmitting(false);
    if (error) { toast.error(error.message || 'Could not send code'); return; }
    toast.success('Verification code sent!'); setOtp(''); setStep('signup_verify');
  };

  const doSignupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error('Enter the 6-digit code');
    setSubmitting(true);
    const { error } = await verifySignupOtp(email, otp);
    setSubmitting(false);
    if (error) { toast.error(error.message || 'Invalid or expired code'); return; }
    toast.success(`Welcome to ${storeName}!`); onClose(); navigate(dest, { replace: true });
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
    onClose(); navigate(dest, { replace: true });
  };

  const resendSignupOtp = async () => {
    const { error } = await sendSignupOtp(email, fullName, password);
    if (error) toast.error(error.message || 'Could not resend'); else toast.success('New code sent!');
  };

  const resendForgotOtp = async () => {
    const { error } = await sendPasswordResetOtp(email);
    if (error) toast.error(error.message || 'Could not resend'); else toast.success('New reset code sent!');
  };

  const goBack = (to: Step) => (
    <button type="button" onClick={() => setStep(to)}
      className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-100 transition-opacity"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: textColor, opacity: 0.45 }}>
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );

  // ── titles ───────────────────────────────────────────────────────────────
  const titles: Record<Step, string> = {
    login: 'Welcome back', signup: 'Create account',
    signup_verify: 'Verify your email', forgot_email: 'Reset password',
    forgot_otp: 'Enter reset code', forgot_newpw: 'Set new password',
  };
  const subs: Record<Step, string> = {
    login: `Sign in to ${storeName}`, signup: 'Join us — it only takes a minute',
    signup_verify: `Enter the code sent to ${email}`,
    forgot_email: 'We\'ll send a 6-digit code to your email',
    forgot_otp: `Check your inbox at ${email}`,
    forgot_newpw: 'Almost done — choose a strong password',
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-[410px] relative"
        style={{ backgroundColor: cardColor, borderRadius, color: textColor,
          boxShadow: '0 40px 100px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)' }}>

        {/* Decorative top bar */}
        <div style={{ height: 3, borderRadius: `${borderRadius}px ${borderRadius}px 0 0`,
          background: `linear-gradient(90deg, ${pr}, ${pr}bb, ${pr}44)` }} />

        {/* Sparkle badge + close */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: `${pr}12`, border: `1px solid ${pr}22` }}>
            <Sparkles className="h-3 w-3" style={{ color: pr }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: pr }}>
              {storeName}
            </span>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
            style={{ background: `${borderColor}`, border: 'none', cursor: 'pointer', color: textColor }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-3 pb-1">
          <h2 className="text-xl font-bold" style={{ color: textColor }}>{titles[step]}</h2>
          <p className="text-[12.5px] mt-0.5" style={{ color: textColor, opacity: 0.5 }}>{subs[step]}</p>
        </div>

        {/* Tab pills */}
        {(step === 'login' || step === 'signup') && (
          <div className="mx-6 mt-4 flex gap-1 p-1 rounded-xl"
            style={{ background: `${borderColor}66` }}>
            {(['login', 'signup'] as Step[]).map(s => (
              <button key={s} type="button" onClick={() => setStep(s)}
                className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all"
                style={{
                  background: step === s ? cardColor : 'transparent',
                  color: step === s ? pr : textColor,
                  border: 'none', cursor: 'pointer',
                  boxShadow: step === s ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
                }}>
                {s === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Back nav */}
        {['forgot_email','forgot_otp','forgot_newpw','signup_verify'].includes(step) && (
          <div className="px-6 mt-4">
            {step === 'forgot_email' && goBack('login')}
            {step === 'forgot_otp' && goBack('forgot_email')}
            {step === 'forgot_newpw' && goBack('forgot_otp')}
            {step === 'signup_verify' && goBack('signup')}
          </div>
        )}

        <div className="px-6 py-5 space-y-4">

          {/* LOGIN */}
          {step === 'login' && (
            <form onSubmit={doLogin} className="space-y-3.5">
              <div><span style={label}>Email</span>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('login_email')}
                  onBlur={() => setFocusedField(null)}
                  style={getInpStyle('login_email')} required autoFocus />
              </div>
              <div><span style={label}>Password</span>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('login_password')}
                    onBlur={() => setFocusedField(null)}
                    style={getInpStyle('login_password', { paddingRight: 44 })} required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:textColor, opacity:0.4 }}>
                    {showPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
              </div>
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={() => { setStep('forgot_email'); setOtp(''); }}
                  className="text-[12px] font-semibold hover:underline"
                  style={{ color: pr, background:'none', border:'none', cursor:'pointer' }}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={submitting}
                onMouseEnter={() => setBtnHovered(true)}
                onMouseLeave={() => setBtnHovered(false)}
                style={btnPri(submitting)}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin"/>} Sign In
              </button>
            </form>
          )}

          {/* SIGNUP */}
          {step === 'signup' && (
            <form onSubmit={doSignupSend} className="space-y-3.5">
              <div><span style={label}>Full Name</span>
                <input placeholder="Your full name" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onFocus={() => setFocusedField('signup_name')}
                  onBlur={() => setFocusedField(null)}
                  style={getInpStyle('signup_name')} required autoFocus />
              </div>
              <div><span style={label}>Email</span>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('signup_email')}
                  onBlur={() => setFocusedField(null)}
                  style={getInpStyle('signup_email')} required />
              </div>
              <div><span style={label}>Password</span>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('signup_password')}
                    onBlur={() => setFocusedField(null)}
                    style={getInpStyle('signup_password', { paddingRight: 44 })} required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:textColor, opacity:0.4 }}>
                    {showPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={submitting}
                onMouseEnter={() => setBtnHovered(true)}
                onMouseLeave={() => setBtnHovered(false)}
                style={btnPri(submitting)}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mail className="h-4 w-4"/>}
                {submitting ? 'Sending code…' : 'Continue'}
              </button>
            </form>
          )}

          {/* SIGNUP VERIFY — OTP with countdown */}
          {step === 'signup_verify' && (
            <OtpVerifyBlock
              email={email} otp={otp} onOtpChange={setOtp}
              onSubmit={doSignupVerify} onResend={resendSignupOtp}
              submitting={submitting} primaryColor={pr}
              cardColor={cardColor} borderColor={borderColor} textColor={textColor}
              ctaLabel="Verify & Create Account"
            />
          )}

          {/* FORGOT EMAIL */}
          {step === 'forgot_email' && (
            <form onSubmit={doForgotSend} className="space-y-3.5">
              <div><span style={label}>Your Email</span>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('forgot_email')}
                  onBlur={() => setFocusedField(null)}
                  style={getInpStyle('forgot_email')} required autoFocus />
              </div>
              <button type="submit" disabled={submitting}
                onMouseEnter={() => setBtnHovered(true)}
                onMouseLeave={() => setBtnHovered(false)}
                style={btnPri(submitting)}>
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
              cardColor={cardColor} borderColor={borderColor} textColor={textColor}
              ctaLabel="Continue"
            />
          )}

          {/* FORGOT NEW PW */}
          {step === 'forgot_newpw' && (
            <form onSubmit={doForgotNewPw} className="space-y-3.5">
              <div><span style={label}>New Password</span>
                <div className="relative">
                  <input type={showNewPw ? 'text' : 'password'} placeholder="Min 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    onFocus={() => setFocusedField('forgot_new_pw')}
                    onBlur={() => setFocusedField(null)}
                    style={getInpStyle('forgot_new_pw', { paddingRight: 44 })} required autoFocus />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:textColor, opacity:0.4 }}>
                    {showNewPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={submitting}
                onMouseEnter={() => setBtnHovered(true)}
                onMouseLeave={() => setBtnHovered(false)}
                style={btnPri(submitting)}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin"/>} Set New Password
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: textColor, opacity: 0.2 }}/>
          <span className="text-[11px]" style={{ color: textColor, opacity: 0.2 }}>256-bit encrypted · Secured by Supabase</span>
        </div>
      </div>
    </div>
  );
}
