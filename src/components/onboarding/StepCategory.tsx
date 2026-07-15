import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Shirt, UtensilsCrossed, Cpu, Gem, Sparkles, MoreHorizontal, Receipt, Scissors } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const categories = [
  { id: 'fashion',         label: 'Fashion',           desc: 'Clothing, accessories & more',  icon: Shirt,          gradient: 'from-pink-500/20 to-pink-500/5',     iconColor: 'text-pink-600',    bg: '#fdf2f8', border: '#f9a8d4' },
  { id: 'food',            label: 'Food & Beverages',  desc: 'Snacks, drinks & gourmet',       icon: UtensilsCrossed,gradient: 'from-amber-500/20 to-amber-500/5',   iconColor: 'text-amber-600',   bg: '#fffbeb', border: '#fcd34d' },
  { id: 'beauty_services', label: 'Salon / Stylist',   desc: 'Bookings & services',            icon: Scissors,       gradient: 'from-fuchsia-500/20 to-fuchsia-500/5',iconColor: 'text-fuchsia-600', bg: '#fdf4ff', border: '#e879f9' },
  { id: 'electronics',     label: 'Electronics',       desc: 'Gadgets, devices & tech',        icon: Cpu,            gradient: 'from-blue-500/20 to-blue-500/5',     iconColor: 'text-blue-600',    bg: '#eff6ff', border: '#93c5fd' },
  { id: 'handmade',        label: 'Handmade & Craft',  desc: 'Artisan products & DIY',         icon: Gem,            gradient: 'from-purple-500/20 to-purple-500/5', iconColor: 'text-purple-600',  bg: '#faf5ff', border: '#c4b5fd' },
  { id: 'beauty',          label: 'Beauty & Wellness', desc: 'Skincare, makeup & health',      icon: Sparkles,       gradient: 'from-rose-500/20 to-rose-500/5',     iconColor: 'text-rose-600',    bg: '#fff1f2', border: '#fda4af' },
  { id: 'other',           label: 'Other',             desc: 'Something unique',               icon: MoreHorizontal, gradient: 'from-gray-500/20 to-gray-500/5',     iconColor: 'text-gray-600',    bg: '#f9fafb', border: '#d1d5db' },
];

const CARD_W = 140;
const CARD_GAP = 16;
const STEP = CARD_W + CARD_GAP;

const StepCategory = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  // Sync activeIdx when category already set
  useEffect(() => {
    if (data.category) {
      const idx = categories.findIndex(c => c.id === data.category);
      if (idx >= 0) setActiveIdx(idx);
    }
  }, []);

  const scrollToIdx = (idx: number) => {
    if (!trackRef.current) return;
    const clampedIdx = Math.max(0, Math.min(idx, categories.length - 1));
    setActiveIdx(clampedIdx);
    const containerW = trackRef.current.parentElement!.clientWidth;
    const offset = clampedIdx * STEP - (containerW / 2) + (CARD_W / 2);
    trackRef.current.scrollTo({ left: offset, behavior: 'smooth' });
  };

  const handleSelect = (idx: number, id: string) => {
    scrollToIdx(idx);
    setData(d => ({ ...d, category: id }));
  };

  // Mouse drag scroll
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (trackRef.current?.offsetLeft ?? 0);
    scrollLeft.current = trackRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    trackRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
  };
  const onMouseUp = () => { isDragging.current = false; };

  // Touch drag scroll
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].pageX;
    scrollLeft.current = trackRef.current?.scrollLeft ?? 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!trackRef.current) return;
    const diff = startX.current - e.touches[0].pageX;
    trackRef.current.scrollLeft = scrollLeft.current + diff;
  };

  const getCardStyle = (idx: number) => {
    const diff = idx - activeIdx;
    const absDiff = Math.abs(diff);
    const selected = data.category === categories[idx].id;

    // 3D effect based on distance from center
    const rotateY = diff * 18;
    const scale = absDiff === 0 ? 1.05 : absDiff === 1 ? 0.9 : 0.78;
    const translateZ = absDiff === 0 ? 30 : absDiff === 1 ? 0 : -30;
    const opacity = absDiff === 0 ? 1 : absDiff === 1 ? 0.75 : 0.5;

    return {
      transform: `perspective(600px) rotateY(${rotateY}deg) scale(${scale}) translateZ(${translateZ}px)`,
      opacity,
      transition: 'transform 0.35s cubic-bezier(.25,.8,.25,1), opacity 0.35s ease',
      zIndex: 10 - absDiff,
      background: selected ? `linear-gradient(135deg, ${categories[idx].bg}, white)` : 'white',
      borderColor: selected ? categories[idx].border : '#e5e7eb',
      borderWidth: selected ? 2 : 1.5,
      boxShadow: selected
        ? `0 8px 24px ${categories[idx].border}60`
        : absDiff === 0 ? '0 4px 16px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.06)',
    };
  };

  return (
    <div className={`space-y-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight">What do you sell?</h2>
        <p className="text-xs text-muted-foreground">
          This helps us customize your store experience.
        </p>
      </div>

      {/* 3D Carousel */}
      <div className="relative overflow-hidden py-4" style={{ perspective: '800px' }}>
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-20 bg-gradient-to-r from-background to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-20 bg-gradient-to-l from-background to-transparent" />

        {/* Scroll track */}
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto cursor-grab active:cursor-grabbing select-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingLeft: 'calc(50% - 70px)',
            paddingRight: 'calc(50% - 70px)',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onScroll={() => {
            if (!trackRef.current) return;
            const containerW = trackRef.current.parentElement!.clientWidth;
            const scrolled = trackRef.current.scrollLeft + containerW / 2 - CARD_W / 2;
            const nearest = Math.round(scrolled / STEP);
            setActiveIdx(Math.max(0, Math.min(nearest, categories.length - 1)));
          }}
        >
          {categories.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => handleSelect(i, cat.id)}
              style={{ ...getCardStyle(i), minWidth: CARD_W, width: CARD_W, borderStyle: 'solid', borderRadius: 16 }}
              className="flex flex-col items-center gap-2.5 p-4 flex-shrink-0"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${cat.bg}`, border: `1.5px solid ${cat.border}` }}
              >
                <cat.icon className={cn('h-5 w-5', cat.iconColor)} />
              </div>
              <div className="text-center">
                <span className="text-xs font-semibold block leading-tight">{cat.label}</span>
                <span className="text-[9px] text-muted-foreground leading-tight mt-0.5 block">{cat.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(i, cat.id)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIdx ? 20 : 6,
              height: 6,
              background: data.category === cat.id
                ? categories.find(c => c.id === data.category)?.border ?? '#f97316'
                : i === activeIdx ? '#f97316' : '#e5e7eb',
            }}
          />
        ))}
      </div>

      {/* Selected label */}
      {data.category && (
        <p className="text-center text-xs text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{categories.find(c => c.id === data.category)?.label}</span>
        </p>
      )}

      {/* FSSAI for food */}
      {data.category === 'food' && (
        <div className="max-w-sm mx-auto rounded-xl border border-amber-500/30 bg-amber-50/50 p-3 animate-in fade-in duration-300">
          <Label htmlFor="fssai-real" className="flex items-center gap-2 text-xs font-medium mb-1">
            <Receipt className="h-3.5 w-3.5 text-amber-600" />
            FSSAI License Number
            <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="fssai-real"
            placeholder="14-digit FSSAI number"
            value={data.fssaiNumber || ''}
            onChange={(e) => setData((d) => ({ ...d, fssaiNumber: e.target.value.replace(/[^0-9]/g, '').slice(0, 14) }))}
            className="h-9 font-mono text-sm"
            maxLength={14}
            inputMode="numeric"
          />
        </div>
      )}
    </div>
  );
};

export default StepCategory;
