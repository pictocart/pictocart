import { useRef, useState, useEffect } from 'react';

interface Props {
  images: string[];
  title: string;
  colors: any;
  borderRadius: number;
}

const ProductImageSwiper = ({ images, title, colors, borderRadius }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const index = Math.round(container.scrollLeft / container.clientWidth);
      setActiveIndex(index);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (!images.length) {
    return (
      <div
        className="aspect-square flex items-center justify-center text-sm opacity-30"
        style={{ backgroundColor: colors.secondary, borderRadius: `${borderRadius}px` }}
      >
        No image
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ borderRadius: `${borderRadius}px`, scrollbarWidth: 'none' }}
      >
        {images.map((img, i) => (
          <div key={i} className="w-full shrink-0 snap-center aspect-square relative" style={{ backgroundColor: colors.secondary }}>
            <img src={img} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
        >
          {activeIndex + 1}/{images.length}
        </div>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === activeIndex ? 18 : 7,
                height: 7,
                backgroundColor: i === activeIndex ? colors.primary : 'rgba(255,255,255,0.6)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageSwiper;
