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
  { id: 'fashion',         label: 'Fashion',           desc: 'Clothing & accessories',  icon: Shirt,           iconColor: 'text-pink-500',    selBg: '#fdf2f8', selBorder: '#f472b6' },
  { id: 'food',            label: 'Food & Beverages',  desc: 'Snacks, drinks & gourmet', icon: UtensilsCrossed, iconColor: 'text-amber-500',   selBg: '#fffbeb', selBorder: '#fbbf24' },
  { id: 'beauty_services', label: 'Salon / Stylist',   desc: 'Bookings & services',      icon: Scissors,        iconColor: 'text-fuchsia-500', selBg: '#fdf4ff', selBorder: '#d946ef' },
  { id: 'electronics',     label: 'Electronics',       desc: 'Gadgets & tech',           icon: Cpu,             iconColor: 'text-blue-500',    selBg: '#eff6ff', selBorder: '#3b82f6' },
  { id: 'handmade',        label: 'Handmade & Craft',  desc: 'Artisan & DIY',            icon: Gem,             iconColor: 'text-purple-500',  selBg: '#faf5ff', selBorder: '#a855f7' },
  { id: 'beauty',          label: 'Beauty & Wellness', desc: 'Skincare & makeup',        icon: Sparkles,        iconColor: 'text-rose-500',    selBg: '#fff1f2', selBorder: '#fb7185' },
  { id: 'other',           label: 'Other',             desc: 'Something unique',         icon: MoreHorizontal,  iconColor: 'text-gray-500',    selBg: '#f9fafb', selBorder: '#9ca3af' },
];

const StepCategory = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const rafRef      = useRef<number | null>(null);
  const isAuto      = useRef(true);   // auto-scroll active flag
  const accumulator = useRef(0);

  // drag state
  const isDragging = useRef(false);
  const startX     = useRef(0);
  const scrollL    = useRef(0);
  const didDrag    = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* ── One-shot auto scroll: plays once on mount, stops at end ── */
  useEffect(() => {
    if (!mounted) return;
    const el = scrollRef.current;
    if (!el) return;

    const SPEED = 0.05; // px per ms — gentle
    let last = performance.now();

    const tick = (now: number) => {
      if (!isAuto.current) return; // stopped — never restart

      const dt = Math.min(now - last, 50);
      last = now;

      accumulator.current += SPEED * dt;
      if (accumulator.current >= 1) {
        const step = Math.floor(accumulator.current);
        accumulator.current -= step;

        // reached end → stop permanently
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
          isAuto.current = false;
          return;
        }
        el.scrollLeft += step;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [mounted]);

  /* ── Stop auto-scroll immediately ── */
  const stopAuto = () => {
    isAuto.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  /* ── Mouse drag ── */
  const onMouseDown = (e: React.MouseEvent) => {
    stopAuto();
    isDragging.current = true;
    didDrag.current    = false;
    startX.current     = e.clientX;
    scrollL.current    = scrollRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = startX.current - e.clientX;
    if (Math.abs(dx) > 3) didDrag.current = true;
    scrollRef.current.scrollLeft = scrollL.current + dx;
  };
  const onMouseUp = () => { isDragging.current = false; };

  /* ── Touch drag ── */
  const onTouchStart = (e: React.TouchEvent) => {
    stopAuto();
    didDrag.current = false;
    startX.current  = e.touches[0].clientX;
    scrollL.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    const dx = startX.current - e.touches[0].clientX;
    if (Math.abs(dx) > 3) didDrag.current = true;
    scrollRef.current.scrollLeft = scrollL.current + dx;
  };

  const selected = data.category;

  return (
    <div className={`flex flex-col transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold tracking-tight">What do you sell?</h2>
        <p className="text-xs text-muted-foreground mt-1">This helps us customize your store experience.</p>
      </div>

      {/* Scroll strip */}
      <div
        className="relative select-none"
        onMouseEnter={stopAuto}  // hover → stop
      >
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background to-transparent" />

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-8 py-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          {categories.map((cat) => {
            const isSelected = selected === cat.id;
            return (
              <button
                key={cat.id}
                onMouseUp={() => {
                  stopAuto();
                  if (!didDrag.current) setData(d => ({ ...d, category: cat.id }));
                }}
                onTouchEnd={() => {
                  stopAuto();
                  if (!didDrag.current) setData(d => ({ ...d, category: cat.id }));
                }}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center gap-3 rounded-2xl border-2 transition-all duration-200',
                  'w-[148px] py-6 px-4',
                  !isSelected && 'border-border/70 bg-white hover:border-primary/40 hover:shadow-md hover:-translate-y-1'
                )}
                style={isSelected ? {
                  background: cat.selBg,
                  borderColor: cat.selBorder,
                  boxShadow: `0 8px 24px ${cat.selBorder}50`,
                  transform: 'translateY(-4px)',
                } : {}}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl"
                  style={isSelected
                    ? { background: 'white', border: `1.5px solid ${cat.selBorder}40` }
                    : { background: '#f3f4f6' }}
                >
                  <cat.icon className={cn('h-6 w-6', isSelected ? cat.iconColor : 'text-slate-400')} />
                </div>
                <div className="text-center">
                  <p className={cn('text-[11px] font-semibold leading-tight', isSelected ? 'text-foreground' : 'text-slate-500')}>
                    {cat.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{cat.desc}</p>
                </div>
                <div className="h-1.5 w-1.5 rounded-full transition-all duration-200"
                  style={{ background: isSelected ? cat.selBorder : 'transparent' }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Hint */}
      {!selected && (
        <p className="text-center text-[10px] text-muted-foreground mt-1">← swipe to browse →</p>
      )}

      {/* Selected label */}
      {selected && (
        <p className="text-center text-xs text-muted-foreground mt-3 animate-in fade-in duration-200">
          Selected: <span className="font-semibold text-foreground">
            {categories.find(c => c.id === selected)?.label}
          </span>
        </p>
      )}

      {/* FSSAI */}
      {selected === 'food' && (
        <div className="max-w-sm mx-auto mt-4 rounded-xl border border-amber-400/40 bg-amber-50/60 p-3 animate-in fade-in duration-200">
          <Label htmlFor="fssai-real" className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
            <Receipt className="h-3.5 w-3.5 text-amber-600" />
            FSSAI License Number
            <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="fssai-real"
            placeholder="14-digit FSSAI number"
            value={data.fssaiNumber || ''}
            onChange={(e) => setData(d => ({ ...d, fssaiNumber: e.target.value.replace(/[^0-9]/g, '').slice(0, 14) }))}
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
