import { cn } from '@/lib/utils';
import { Shirt, UtensilsCrossed, Cpu, Gem, Sparkles, ShoppingBasket, MoreHorizontal } from 'lucide-react';
import type { OnboardingData } from '@/pages/Onboarding';

interface Props {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const categories = [
  { id: 'fashion', label: 'Fashion', icon: Shirt, color: 'bg-pink-50 text-pink-600' },
  { id: 'food', label: 'Food & Beverages', icon: UtensilsCrossed, color: 'bg-amber-50 text-amber-600' },
  { id: 'electronics', label: 'Electronics', icon: Cpu, color: 'bg-blue-50 text-blue-600' },
  { id: 'handmade', label: 'Handmade & Craft', icon: Gem, color: 'bg-purple-50 text-purple-600' },
  { id: 'beauty', label: 'Beauty & Wellness', icon: Sparkles, color: 'bg-rose-50 text-rose-600' },
  { id: 'grocery', label: 'Grocery', icon: ShoppingBasket, color: 'bg-green-50 text-green-600' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-50 text-gray-600' },
];

const StepCategory = ({ data, setData }: Props) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">What do you sell?</h2>
        <p className="text-sm text-muted-foreground">
          This helps us customize your store experience.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setData((d) => ({ ...d, category: cat.id }))}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:shadow-sm',
              data.category === cat.id
                ? 'border-primary bg-accent shadow-sm'
                : 'border-border hover:border-primary/40'
            )}
          >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cat.color)}>
              <cat.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepCategory;
