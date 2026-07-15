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
  { id: 'fashion',         label: 'Fashion',           desc: 'Clothing & accessories',   icon: Shirt,           iconColor: 'text-pink-500',    selBg: '#fdf2f8', selBorder: '#f472b6' },
  { id: 'food',            label: 'Food & Beverages',  desc: 'Snacks, drinks & gourmet',  icon: UtensilsCrossed, iconColor: 'text-amber-500',   selBg: '#fffbeb', selBorder: '#fbbf24' },
  { id: 'beauty_services', label: 'Salon / Stylist',   desc: 'Bookings & services',       icon: Scissors,        iconColor: 'text-fuchsia-500', selBg: '#fdf4ff', selBorder: '#d946ef' },
  { id: 'electronics',     label: 'Electronics',       desc: 'Gadgets & tech',            icon: Cpu,             iconColor: 'text-blue-500',    selBg: '#eff6ff', selBorder: '#3b82f6' },
  { id: 'handmade',        label: 'Handmade & Craft',  desc: 'Artisan & DIY',             icon: Gem,             iconColor: 'text-purple-500',  selBg: '#faf5ff', selBorder: '#a855f7' },
  { id: 'beauty',          label: 'Beauty & Wellness', desc: 'Skincare & makeup',         icon: Sparkles,        iconColor: 'text-rose-500',    selBg: '#fff1f2', selBorder: '#fb7185' },
  { id: 'other',           label: 'Other',             desc: 'Something unique',          icon: MoreHorizontal,  iconColor: 'text-gray-500',    selBg: '#f9fafb', selBorder: '#9ca3af' },
];

const StepCategory = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isPaused = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll using requestAnimationFrame for smoothness
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let lastTime = 0;
    const SPEED = 0.6; // px per ms

    const tick = (now: number) => {
      if (!isPaused.current && el) {
        const delta = now - lastTime;
        lastTime = now;
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
          el.scrollLeft = 0;
        } else {
          el.scrollLeft += SPEED * Math.min(delta, 32);
        }
      } else {
        lastTime = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame((now) => { lastTime = now; rafRef.current = requestAnimationFrame(tick); });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const pauseScroll = () => {
    isPaused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    // Resume after 3s of no interaction
    resumeTimer.current = setTimeout(() => { isPaused.current = false; }, 3000);
  };

  const selected = data.category;

  return (
    <div className={`flex flex-col transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold tracking-tight">What do you sell?</h2>
        <p className="text-xs text-muted-foreground mt-1">This helps us customize your store experience.</p>
      </div>

      {/* Horizontal scroll strip */}
      <div className="relative">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-background to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background to-transparent" />

        <div
          ref={scrollRef}
          onMouseDown={pauseScroll}
          onMouseMove={(e) => { if (e.buttons === 1) pauseScroll(); }}
          onTouchStart={pauseScroll}
          onTouchMove={pauseScroll}
          className="flex gap-4 overflow-x-auto px-8 py-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}
        >
          {categories.map((cat) => {
            const isSelected = selected === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setData(d => ({ ...d, category: cat.id })); }}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center gap-3 rounded-2xl border-2 transition-all duration-200 active:scale-95',
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
                {/* Icon box */}
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-200"
                  style={isSelected
                    ? { background: 'white', border: `1.5px solid ${cat.selBorder}40` }
                    : { background: '#f3f4f6' }
                  }
                >
                  <cat.icon className={cn('h-6 w-6 transition-colors duration-200', isSelected ? cat.iconColor : 'text-slate-400')} />
                </div>

                {/* Label */}
                <div className="text-center">
                  <p className={cn('text-[11px] font-semibold leading-tight', isSelected ? 'text-foreground' : 'text-slate-500')}>
                    {cat.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{cat.desc}</p>
                </div>

                {/* Selected indicator dot */}
                <div
                  className="h-1.5 w-1.5 rounded-full transition-all duration-200"
                  style={{ background: isSelected ? cat.selBorder : 'transparent' }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Scroll hint on first load */}
      {!selected && (
        <p className="text-center text-[10px] text-muted-foreground mt-2 animate-in fade-in duration-500">
          ← swipe to browse →
        </p>
      )}

      {/* Selected label */}
      {selected && (
        <p className="text-center text-xs text-muted-foreground mt-3 animate-in fade-in duration-200">
          Selected: <span className="font-semibold text-foreground">
            {categories.find(c => c.id === selected)?.label}
          </span>
        </p>
      )}

      {/* FSSAI for food */}
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
