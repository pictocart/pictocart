import { useNavigate } from 'react-router-dom';
import { Truck, AlertCircle, Globe, Palette, Sparkles, ShoppingBag, ArrowRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Action {
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: 'rose' | 'amber' | 'emerald' | 'indigo' | 'primary';
  to: string;
  cta: string;
}

interface Props {
  pendingOrders: number;
  productCount: number;
  lowStockCount: number;
  hasCustomDomain: boolean;
  hasShipping: boolean;
  isPublished: boolean;
}

const TONE: Record<Action['tone'], string> = {
  rose:    'from-rose-500/10 to-background border-rose-500/20    [&_.ic]:bg-rose-500/15    [&_.ic]:text-rose-600',
  amber:   'from-amber-500/10 to-background border-amber-500/20  [&_.ic]:bg-amber-500/15   [&_.ic]:text-amber-600',
  emerald: 'from-emerald-500/10 to-background border-emerald-500/20 [&_.ic]:bg-emerald-500/15 [&_.ic]:text-emerald-600',
  indigo:  'from-indigo-500/10 to-background border-indigo-500/20 [&_.ic]:bg-indigo-500/15  [&_.ic]:text-indigo-600',
  primary: 'from-primary/10 to-background border-primary/20      [&_.ic]:bg-primary/15     [&_.ic]:text-primary',
};

const SmartActions = ({ pendingOrders, productCount, lowStockCount, hasCustomDomain, hasShipping, isPublished }: Props) => {
  const navigate = useNavigate();

  const actions: Action[] = [];
  if (pendingOrders > 0) actions.push({
    title: `Ship ${pendingOrders} pending order${pendingOrders > 1 ? 's' : ''}`,
    desc: 'Customers are waiting — print labels in one click.',
    icon: Truck, tone: 'rose', to: '/orders', cta: 'Open orders',
  });
  if (lowStockCount > 0) actions.push({
    title: `${lowStockCount} product${lowStockCount > 1 ? 's' : ''} running low`,
    desc: 'Restock to avoid out-of-stock signals to customers.',
    icon: AlertCircle, tone: 'amber', to: '/products', cta: 'Manage stock',
  });
  if (productCount === 0) actions.push({
    title: 'Add your first product',
    desc: 'Snap a photo, AI writes the title, description & SEO.',
    icon: Sparkles, tone: 'primary', to: '/products/new', cta: 'Add product',
  });
  if (productCount > 0 && !hasShipping) actions.push({
    title: 'Set up shipping rates',
    desc: 'Connect Delhivery to ship pan-India in 60 seconds.',
    icon: ShoppingBag, tone: 'indigo', to: '/settings/shipping', cta: 'Setup',
  });
  if (isPublished && !hasCustomDomain) actions.push({
    title: 'Connect your custom domain',
    desc: 'A pro domain builds trust and improves SEO.',
    icon: Globe, tone: 'emerald', to: '/settings/domain', cta: 'Connect',
  });
  if (!actions.length) actions.push({
    title: 'Try a fresh theme',
    desc: 'New themes added weekly — preview in one tap.',
    icon: Palette, tone: 'indigo', to: '/themes', cta: 'Browse',
  });

  const top = actions.slice(0, 3);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {top.map((a) => {
        const Icon = a.icon;
        return (
          <Card
            key={a.title}
            onClick={() => navigate(a.to)}
            className={cn(
              'group relative cursor-pointer overflow-hidden p-4 border bg-gradient-to-br transition-all hover:-translate-y-0.5 hover:shadow-md',
              TONE[a.tone]
            )}
          >
            <div className="flex items-start gap-3">
              <div className="ic h-9 w-9 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.desc}</div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-foreground/80 group-hover:gap-1.5 transition-all">
                  {a.cta} <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default SmartActions;
