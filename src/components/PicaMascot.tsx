import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Generic yellow chibi mascot — designed to be obviously NOT Pikachu
// (round body, no ears with black tips, no lightning tail, no red cheeks pattern).
// Cycles through friendly expressions to feel alive.
type Expression = 'smile' | 'wink' | 'tongue' | 'wow' | 'happy';

export const PicaMascot = ({
  size = 28,
  className,
  animate = true,
  expression: forced,
}: {
  size?: number;
  className?: string;
  animate?: boolean;
  expression?: Expression;
}) => {
  const [exp, setExp] = useState<Expression>('smile');

  useEffect(() => {
    if (!animate || forced) return;
    const cycle: Expression[] = ['smile', 'wink', 'happy', 'tongue', 'wow'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % cycle.length;
      setExp(cycle[i]);
    }, 1400);
    return () => clearInterval(id);
  }, [animate, forced]);

  const e = forced ?? exp;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('drop-shadow-sm', className)}
      aria-hidden="true"
    >
      {/* Body — soft yellow circle */}
      <defs>
        <radialGradient id="picaBody" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFF3B0" />
          <stop offset="60%" stopColor="#FFD23A" />
          <stop offset="100%" stopColor="#E8A800" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="34" r="26" fill="url(#picaBody)" stroke="#7a5a00" strokeWidth="1.5" />

      {/* Little tufts on top (rounded, not pointy ears) */}
      <circle cx="18" cy="12" r="5" fill="url(#picaBody)" stroke="#7a5a00" strokeWidth="1.2" />
      <circle cx="46" cy="12" r="5" fill="url(#picaBody)" stroke="#7a5a00" strokeWidth="1.2" />

      {/* Peach blush (oval, distinct from red circles) */}
      <ellipse cx="17" cy="38" rx="4" ry="2.4" fill="#FF9AA2" opacity="0.85" />
      <ellipse cx="47" cy="38" rx="4" ry="2.4" fill="#FF9AA2" opacity="0.85" />

      {/* Eyes */}
      {e === 'wink' ? (
        <>
          <circle cx="24" cy="30" r="2.8" fill="#1a1a1a" />
          <circle cx="24.7" cy="29.2" r="0.9" fill="#fff" />
          <path d="M37 30 Q40 27 43 30" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : e === 'wow' ? (
        <>
          <circle cx="24" cy="30" r="3.4" fill="#1a1a1a" />
          <circle cx="40" cy="30" r="3.4" fill="#1a1a1a" />
          <circle cx="25" cy="29" r="1.1" fill="#fff" />
          <circle cx="41" cy="29" r="1.1" fill="#fff" />
        </>
      ) : (
        <>
          <circle cx="24" cy="30" r="2.8" fill="#1a1a1a" />
          <circle cx="40" cy="30" r="2.8" fill="#1a1a1a" />
          <circle cx="24.7" cy="29.2" r="0.9" fill="#fff" />
          <circle cx="40.7" cy="29.2" r="0.9" fill="#fff" />
        </>
      )}

      {/* Mouth */}
      {e === 'tongue' ? (
        <>
          <path d="M26 41 Q32 47 38 41" stroke="#1a1a1a" strokeWidth="2" fill="#1a1a1a" strokeLinejoin="round" />
          <path d="M30 44 Q32 48 34 44 Z" fill="#FF5C7A" />
        </>
      ) : e === 'wow' ? (
        <ellipse cx="32" cy="43" rx="3" ry="3.6" fill="#1a1a1a" />
      ) : e === 'happy' ? (
        <path d="M25 40 Q32 47 39 40" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M27 41 Q32 45 37 41" stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
};
