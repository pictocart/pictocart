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
      const scrollLeft = container.scrollLeft;
      const width = container.clientWidth;
      const index = Math.round(scrollLeft / width);
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
          <div
            key={i}
            className="w-full shrink-0 snap-center aspect-square"
            style={{ backgroundColor: colors.secondary }}
          >
            <img src={img} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === activeIndex ? 16 : 6,
                height: 6,
                backgroundColor: i === activeIndex ? colors.primary : colors.text + '40',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageSwiper;
