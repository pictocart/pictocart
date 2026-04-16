import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll';
import type { ReactNode } from 'react';

interface Props {
  animation?: string;
  children: ReactNode;
  marginTop?: number;
  marginBottom?: number;
  className?: string;
}

const AnimatedSection = ({ animation = 'none', children, marginTop, marginBottom, className = '' }: Props) => {
  const { ref, style, className: animClassName } = useAnimateOnScroll(animation);

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
