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
  { id: 'fashion',         label: 'Fashion',           desc: 'Clothing & accessories', icon: Shirt,           iconColor: 'text-pink-500',    selBg: '#fdf2f8', selBorder: '#f472b6' },
  { id: 'food',            label: 'Food & Beverages',  desc: 'Snacks, drinks & gourmet', icon: UtensilsCrossed, iconColor: 'text-amber-500',   selBg: '#fffbeb', selBorder: '#fbbf24' },
  { id: 'beauty_services', label: 'Salon / Stylist',   desc: 'Bookings & services',    icon: Scissors,        iconColor: 'text-fuchsia-500', selBg: '#fdf4ff', selBorder: '#d946ef' },
  { id: 'electronics',     label: 'Electronics',       desc: 'Gadgets & tech',         icon: Cpu,             iconColor: 'text-blue-500',    selBg: '#eff6ff', selBorder: '#3b82f6' },
  { id: 'handmade',        label: 'Handmade & Craft',  desc: 'Artisan & DIY',          icon: Gem,             iconColor: 'text-purple-500',  selBg: '#faf5ff', selBorder: '#a855f7' },
  { id: 'beauty',          label: 'Beauty & Wellness', desc: 'Skincare & makeup',      icon: Sparkles,        iconColor: 'text-rose-500',    selBg: '#fff1f2', selBorder: '#fb7185' },
  { id: 'other',           label: 'Other',             desc: 'Something unique',       icon: MoreHorizontal,  iconColor: 'text-gray-500',    selBg: '#f9fafb', selBorder: '#9ca3af' },
];

const StepCategory = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  // Auto-scroll: slowly drift right, reset when end reached
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    autoScrollRef.current = setInterval(() => {
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        // reached end — scroll back to start smoothly
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollLeft += 1;
      }
    }, 20);

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [mounted]);

  // Pause auto-scroll on user interaction
  const pauseScroll = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
  };

  const handleSelect = (id: string) => {
    setData(d => ({ ...d, category: id }));
  };

  const selected = data.category;

  return (
    <div className={`flex flex-col gap-5 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight">What do you sell?</h2>
        <p className="text-xs text-muted-foreground">This helps us customize your store experience.</p>
      </div>

      {/* Horizontal scroll */}
      <div className="relative">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-background to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-background to-transparent" />

        <div
          ref={scrollRef}
          onMouseDown={pauseScroll}
          onTouchStart={pauseScroll}
          className="flex gap-4 overflow-x-auto px-6 py-3 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((cat) => {
            const isSelected = selected === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className={cn(
                  'snap-center flex-shrink-0 flex flex-col items-center gap-3 rounded-2xl border transition-all duration-200',
                  'w-[140px] py-5 px-3',
                  !isSelected && 'border-border bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5'
                )}
                style={isSelected ? {
                  background: cat.selBg,
                  borderColor: cat.selBorder,
                  borderWidth: 2,
                  boxShadow: `0 6px 20px ${cat.selBorder}45`,
                  transform: 'translateY(-2px)',
                } : {}}
              >
                {/* Icon */}
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl"
                  style={isSelected
                    ? { background: 'white', border: `1.5px solid ${cat.selBorder}` }
                    : { background: '#f3f4f6' }
                  }
                >
                  <cat.icon className={cn('h-6 w-6', isSelected ? cat.iconColor : 'text-muted-foreground')} />
                </div>

                {/* Text */}
                <div className="text-center space-y-0.5">
                  <p className={cn('text-xs font-semibold leading-tight', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
                    {cat.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{cat.desc}</p>
                </div>

                {/* Selected dot */}
                {isSelected && (
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: cat.selBorder }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected label */}
      {selected && (
        <p className="text-center text-xs text-muted-foreground animate-in fade-in duration-200">
          Selected: <span className="font-semibold text-foreground">
            {categories.find(c => c.id === selected)?.label}
          </span>
        </p>
      )}

      {/* FSSAI for food */}
      {selected === 'food' && (
        <div className="max-w-sm mx-auto rounded-xl border border-amber-400/40 bg-amber-50/60 p-3 animate-in fade-in duration-200">
          <Label htmlFor="fssai-real" className="flex items-center gap-1.5 text-xs font-medium mb-1">
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
