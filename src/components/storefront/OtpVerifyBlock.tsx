/**
 * Reusable OTP verification block with 2-minute countdown and resend.
 * Used in both CustomerAuthModal and CustomerAuth page.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, ShieldCheck, RotateCcw, Clock } from 'lucide-react';

const OTP_TTL = 120; // 2 minutes in seconds

interface OtpVerifyBlockProps {
  email: string;
  otp: string;
  onOtpChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => Promise<void>;
  submitting: boolean;
  primaryColor: string;
  cardColor: string;
  borderColor: string;
  textColor: string;
  ctaLabel?: string;
}

export default function OtpVerifyBlock({
  email, otp, onOtpChange, onSubmit, onResend,
  submitting, primaryColor, cardColor, borderColor, textColor,
  ctaLabel = 'Verify & Continue',
}: OtpVerifyBlockProps) {
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setSecondsLeft(OTP_TTL);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => { startTimer(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  const handleResend = async () => {
    setResending(true);
    await onResend();
    setResending(false);
    onOtpChange('');
    startTimer();
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const expired = secondsLeft === 0;

  // Progress ring
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = (secondsLeft / OTP_TTL) * circumference;
  const ringColor = secondsLeft > 30 ? primaryColor : secondsLeft > 10 ? '#f59e0b' : '#ef4444';

  const inp: React.CSSProperties = {
    width: '100%', padding: '14px 16px', fontSize: 22, fontWeight: 800,
    textAlign: 'center', letterSpacing: '0.55em', fontFamily: 'monospace',
    backgroundColor: `${primaryColor}08`,
    border: `2px solid ${expired ? '#ef4444' : primaryColor}44`,
    borderRadius: 12, color: textColor, outline: 'none',
    transition: 'border-color 0.3s',
  };

  return (
    <div className="space-y-5">
      {/* Email card */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: `${primaryColor}0d`, border: `1px solid ${primaryColor}22` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${primaryColor}18` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: primaryColor }}>Code sent to</p>
          <p className="text-sm font-bold truncate" style={{ color: textColor }}>{email}</p>
        </div>
      </div>

      {/* Countdown ring + timer */}
      <div className="flex flex-col items-center gap-2 py-1">
        <div className="relative w-14 h-14">
          <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
            <circle cx="28" cy="28" r={radius} fill="none" stroke={`${borderColor}`} strokeWidth="3.5" />
            <circle cx="28" cy="28" r={radius} fill="none" stroke={ringColor} strokeWidth="3.5"
              strokeDasharray={circumference} strokeDashoffset={circumference - progress}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {expired
              ? <Clock className="h-5 w-5" style={{ color: '#ef4444' }} />
              : <span className="text-[13px] font-bold tabular-nums" style={{ color: ringColor }}>{mins}:{secs}</span>
            }
          </div>
        </div>
        <p className="text-[11px] font-medium" style={{ color: expired ? '#ef4444' : textColor, opacity: expired ? 1 : 0.5 }}>
          {expired ? 'Code expired' : 'Code valid for'}
        </p>
      </div>

      {/* OTP input */}
      <input
        type="text"
        placeholder="• • • • • •"
        value={otp}
        onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ''))}
        style={inp}
        maxLength={8}
        inputMode="numeric"
        required
        autoFocus
        disabled={expired}
      />

      {/* Submit or resend */}
      {!expired ? (
        <form onSubmit={onSubmit}>
          <button
            type="submit"
            disabled={submitting || otp.length < 6}
            style={{
              width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700,
              background: otp.length >= 6 ? primaryColor : `${primaryColor}55`,
              color: '#fff', border: 'none', borderRadius: 12, cursor: otp.length >= 6 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: otp.length >= 6 ? `0 4px 20px ${primaryColor}44` : 'none',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {submitting ? 'Verifying…' : ctaLabel}
          </button>
        </form>
      ) : null}

      {/* Resend section */}
      <div className="text-center">
        {expired ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all"
            style={{
              background: primaryColor, color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: `0 4px 16px ${primaryColor}44`,
            }}
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {resending ? 'Sending…' : 'Resend Code'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline transition-opacity"
            style={{ color: primaryColor, background: 'none', border: 'none', cursor: 'pointer', opacity: resending ? 0.6 : 0.8 }}
          >
            {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            {resending ? 'Sending…' : "Didn't receive it? Resend"}
          </button>
        )}
      </div>
    </div>
  );
}
