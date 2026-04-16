import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll';
import type { ReactNode } from 'react';

interface Props {
  animation?: string;
  speed?: 'slow' | 'normal' | 'fast' | number;
  children: ReactNode;
  marginTop?: number;
  marginBottom?: number;
  className?: string;
}

const AnimatedSection = ({ animation = 'none', speed = 'normal', children, marginTop, marginBottom, className = '' }: Props) => {
  const { ref, style, className: animClassName } = useAnimateOnScroll(animation, speed);

  return (
    <div
      ref={ref}
      style={{
        ...style,
        marginTop: marginTop ? `${marginTop}px` : undefined,
        marginBottom: marginBottom ? `${marginBottom}px` : undefined,
      }}
      className={`${className} ${animClassName}`.trim()}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
