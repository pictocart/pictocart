import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Shirt, UtensilsCrossed, Cpu, Gem, Sparkles, ShoppingBasket, MoreHorizontal, Receipt, Stethoscope, Scissors } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const categories = [
  { id: 'fashion', label: 'Fashion', desc: 'Clothing, accessories & more', icon: Shirt, gradient: 'from-pink-500/10 to-pink-500/5', iconColor: 'text-pink-600', ring: 'ring-pink-500/30' },
  { id: 'food', label: 'Food & Beverages', desc: 'Snacks, drinks & gourmet', icon: UtensilsCrossed, gradient: 'from-amber-500/10 to-amber-500/5', iconColor: 'text-amber-600', ring: 'ring-amber-500/30' },
  { id: 'healthcare', label: 'Doctor / Clinic', desc: 'Appointments & prescriptions', icon: Stethoscope, gradient: 'from-teal-500/10 to-teal-500/5', iconColor: 'text-teal-600', ring: 'ring-teal-500/30' },
  { id: 'beauty_services', label: 'Salon / Stylist', desc: 'Bookings & services', icon: Scissors, gradient: 'from-fuchsia-500/10 to-fuchsia-500/5', iconColor: 'text-fuchsia-600', ring: 'ring-fuchsia-500/30' },
  { id: 'electronics', label: 'Electronics', desc: 'Gadgets, devices & tech', icon: Cpu, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600', ring: 'ring-blue-500/30' },
  { id: 'handmade', label: 'Handmade & Craft', desc: 'Artisan products & DIY', icon: Gem, gradient: 'from-purple-500/10 to-purple-500/5', iconColor: 'text-purple-600', ring: 'ring-purple-500/30' },
  { id: 'beauty', label: 'Beauty & Wellness', desc: 'Skincare, makeup & health', icon: Sparkles, gradient: 'from-rose-500/10 to-rose-500/5', iconColor: 'text-rose-600', ring: 'ring-rose-500/30' },
  { id: 'grocery', label: 'Grocery', desc: 'Daily essentials & staples', icon: ShoppingBasket, gradient: 'from-green-500/10 to-green-500/5', iconColor: 'text-green-600', ring: 'ring-green-500/30' },
  { id: 'other', label: 'Other', desc: 'Something unique', icon: MoreHorizontal, gradient: 'from-gray-500/10 to-gray-500/5', iconColor: 'text-gray-600', ring: 'ring-gray-500/30' },
];

const FOOD_LIKE = new Set(['food', 'grocery']);

const StepCategory = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const showFssai = FOOD_LIKE.has(data.category);

  return (
    <div className={`space-y-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What do you sell?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This helps us customize your store experience and suggest the right features.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => setData((d) => ({ ...d, category: cat.id }))}
            style={{ transitionDelay: `${i * 50}ms` }}
            className={cn(
              'group flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
              data.category === cat.id
                ? `border-primary bg-gradient-to-br ${cat.gradient} shadow-md ring-2 ${cat.ring}`
                : 'border-border hover:border-primary/30 bg-card'
            )}
          >
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300',
              data.category === cat.id
                ? `bg-white/80 shadow-sm ${cat.iconColor}`
                : `bg-muted/80 text-muted-foreground group-hover:${cat.iconColor}`
            )}>
              <cat.icon className="h-6 w-6" />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold block">{cat.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{cat.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {showFssai && (
        <div className="max-w-md mx-auto rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Label htmlFor="fssai-real" className="flex items-center gap-2 text-sm font-medium mb-1.5">
            <Receipt className="h-4 w-4 text-amber-600" />
            FSSAI License Number
            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="fssai-real"
            placeholder="14-digit FSSAI number"
            value={data.fssaiNumber || ''}
            onChange={(e) => setData((d) => ({ ...d, fssaiNumber: e.target.value.replace(/[^0-9]/g, '').slice(0, 14) }))}
            className="h-11 font-mono"
            maxLength={14}
            inputMode="numeric"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Required by FSSAI (Food Safety and Standards Authority of India) for selling food online. You can add this later from Settings.
          </p>
        </div>
      )}
    </div>
  );
};

export default StepCategory;
