import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Compass } from 'lucide-react';
import { useTour } from '@/tours/TourProvider';
import { toast } from 'sonner';

// Map tour key -> a route where its anchors live
const TOUR_ROUTE: Record<string, string> = {
  dashboard: '/dashboard',
  'products-list': '/products',
  'product-form': '/products/new',
  orders: '/orders',
  customise: '/customise',
  themes: '/themes',
  shipping: '/settings/shipping',
  payments: '/settings/payments',
  cod: '/settings/cod',
  domain: '/settings/domain',
  seo: '/settings/seo',
  'email-branding': '/settings/email',
  coupons: '/coupons',
  categories: '/categories',
  blog: '/blog-posts',
  analytics: '/analytics',
  sourcing: '/sourcing',
  wallet: '/wallet',
  accounts: '/accounts',
  customers: '/customers',
};

const TourReplayList = () => {
  const { allTours, completedKeys, resetTour } = useTour();
  const navigate = useNavigate();

  const replay = async (key: string) => {
    await resetTour(key);
    const route = TOUR_ROUTE[key];
    if (route) navigate(route);
    toast.success('Tour will start on this page');
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
        <Compass className="h-4 w-4 text-primary" /> Take the guided tours
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Replay any walkthrough — we'll point at every important control on that page.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {allTours.map((t) => {
          const done = completedKeys.has(t.key);
          return (
            <div key={t.key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {done ? 'Completed' : 'Not seen yet'} · {t.steps.length} steps
                </div>
              </div>
              <Button size="sm" variant={done ? 'outline' : 'default'} onClick={() => replay(t.key)} className="gap-1 shrink-0">
                {done ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {done ? 'Replay' : 'Start'}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TourReplayList;
