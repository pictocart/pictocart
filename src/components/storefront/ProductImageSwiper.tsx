import { useRef, useState, useEffect } from 'react';
import { Play } from 'lucide-react';

type MediaItem = { type: 'image' | 'video'; url: string };

interface Props {
  images: string[];
  videos?: string[];
  title: string;
  colors: any;
  borderRadius: number;
}

const ProductImageSwiper = ({ images, videos = [], title, colors, borderRadius }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items: MediaItem[] = [
    ...videos.map((url) => ({ type: 'video' as const, url })),
    ...images.map((url) => ({ type: 'image' as const, url })),
  ];

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

  if (!items.length) {
    return (
      <div
        className="aspect-[4/5] flex items-center justify-center text-sm opacity-30"
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
        {items.map((item, i) => (
          <div
            key={i}
            className="w-full shrink-0 snap-center aspect-[4/5] relative flex items-center justify-center"
            style={{ backgroundColor: colors.secondary }}
          >
            {item.type === 'image' ? (
              <img src={item.url} alt={`${title} ${i + 1}`} className="w-full h-full object-contain" />
            ) : (
              <video
                src={item.url}
                className="w-full h-full object-contain bg-black"
                controls
                playsInline
                preload="metadata"
              />
            )}
            {item.type === 'video' && (
              <div className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white flex items-center gap-1">
                <Play className="h-3 w-3 fill-white" /> Video
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
        >
          {activeIndex + 1}/{items.length}
        </div>
      )}

      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_, i) => (
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
