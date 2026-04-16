import { useEffect, useRef, useState } from 'react';

export const useAnimateOnScroll = (animation: string = 'none') => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (animation === 'none' || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animation]);

  const getAnimationStyle = (): React.CSSProperties => {
    if (animation === 'none') return {};

    const base: React.CSSProperties = {
      transition: 'opacity 0.6s ease-out, transform 0.6s ease-out, filter 0.6s ease-out',
    };

    if (!isVisible) {
      switch (animation) {
        case 'fade-in':
          return { ...base, opacity: 0, transform: 'translateY(20px)' };
        case 'slide-up':
          return { ...base, opacity: 0, transform: 'translateY(40px)' };
        case 'slide-in-left':
          return { ...base, opacity: 0, transform: 'translateX(-40px)' };
        case 'slide-in-right':
          return { ...base, opacity: 0, transform: 'translateX(40px)' };
        case 'scale-in':
          return { ...base, opacity: 0, transform: 'scale(0.9)' };
        case 'parallax':
          return { ...base, opacity: 0 };
        case 'blur-in':
          return { ...base, opacity: 0, filter: 'blur(12px)', transform: 'translateY(8px)' };
        case 'flip-up':
          return { ...base, opacity: 0, transform: 'perspective(600px) rotateX(30deg) translateY(20px)' };
        case 'bounce-in':
          return { ...base, opacity: 0, transform: 'scale(0.3)' };
        case 'stagger-children':
          return { ...base, opacity: 0, transform: 'translateY(16px)' };
        default:
          return base;
      }
    }

    return { ...base, opacity: 1, transform: 'none', filter: 'none' };
  };

  const parallaxStyle = animation === 'parallax' ? { backgroundAttachment: 'fixed' as const } : {};
  const kenBurnsClass = animation === 'ken-burns' && isVisible ? 'animate-ken-burns' : '';
  const staggerClass = animation === 'stagger-children' && isVisible ? 'stagger-children' : '';

  return {
    ref,
    style: { ...getAnimationStyle(), ...parallaxStyle },
    isVisible,
    className: [kenBurnsClass, staggerClass].filter(Boolean).join(' '),
  };
};
