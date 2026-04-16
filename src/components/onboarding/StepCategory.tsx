import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Shirt, UtensilsCrossed, Cpu, Gem, Sparkles, ShoppingBasket, MoreHorizontal } from 'lucide-react';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const categories = [
  { id: 'fashion', label: 'Fashion', desc: 'Clothing, accessories & more', icon: Shirt, gradient: 'from-pink-500/10 to-pink-500/5', iconColor: 'text-pink-600', ring: 'ring-pink-500/30' },
  { id: 'food', label: 'Food & Beverages', desc: 'Snacks, drinks & gourmet', icon: UtensilsCrossed, gradient: 'from-amber-500/10 to-amber-500/5', iconColor: 'text-amber-600', ring: 'ring-amber-500/30' },
  { id: 'electronics', label: 'Electronics', desc: 'Gadgets, devices & tech', icon: Cpu, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600', ring: 'ring-blue-500/30' },
  { id: 'handmade', label: 'Handmade & Craft', desc: 'Artisan products & DIY', icon: Gem, gradient: 'from-purple-500/10 to-purple-500/5', iconColor: 'text-purple-600', ring: 'ring-purple-500/30' },
  { id: 'beauty', label: 'Beauty & Wellness', desc: 'Skincare, makeup & health', icon: Sparkles, gradient: 'from-rose-500/10 to-rose-500/5', iconColor: 'text-rose-600', ring: 'ring-rose-500/30' },
  { id: 'grocery', label: 'Grocery', desc: 'Daily essentials & staples', icon: ShoppingBasket, gradient: 'from-green-500/10 to-green-500/5', iconColor: 'text-green-600', ring: 'ring-green-500/30' },
  { id: 'other', label: 'Other', desc: 'Something unique', icon: MoreHorizontal, gradient: 'from-gray-500/10 to-gray-500/5', iconColor: 'text-gray-600', ring: 'ring-gray-500/30' },
];

const StepCategory = ({ data, setData }: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

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
    </div>
  );
};

export default StepCategory;
