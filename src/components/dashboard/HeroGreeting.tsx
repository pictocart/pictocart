import { useMemo } from 'react';
import { Sparkles, Crown, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '@/hooks/useCountUp';

interface Props {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  storeName?: string;
}

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return { label: 'Good morning', emoji: '☀️' };
  if (h < 17) return { label: 'Good afternoon', emoji: '🌤️' };
  if (h < 21) return { label: 'Good evening', emoji: '🌆' };
  return { label: 'Working late', emoji: '🌙' };
};

const HeroGreeting = ({ todayRevenue, todayOrders, pendingOrders, storeName }: Props) => {
  const { user } = useAuth();
  const { planConfig } = useSubscription();
  const navigate = useNavigate();
  const g = useMemo(greet, []);

  const animRev = useCountUp(todayRevenue);
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  // Streak: stored in localStorage per user — last visit date
  const streak = useMemo(() => {
    if (!user?.id) return 1;
    const k = `pic2cart:streak:${user.id}`;
    try {
      const today = new Date().toDateString();
      const raw = localStorage.getItem(k);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed) {
        localStorage.setItem(k, JSON.stringify({ last: today, count: 1 }));
        return 1;
      }
      if (parsed.last === today) return parsed.count;
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const next = parsed.last === yesterday.toDateString() ? parsed.count + 1 : 1;
      localStorage.setItem(k, JSON.stringify({ last: today, count: next }));
      return next;
    } catch { return 1; }
  }, [user?.id]);

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-indigo-500/5 p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-indigo-400/15 blur-3xl" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {g.label}, {name} <span className="inline-block">{g.emoji}</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {storeName ? <>Welcome back to <span className="font-medium text-foreground">{storeName}</span>.</> : 'Welcome back.'} Here's your store today.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Flame className="h-3.5 w-3.5" /> {streak}-day streak
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
              <Crown className="h-3.5 w-3.5" /> {planConfig?.display_name || 'Free'} plan
            </span>
            {pendingOrders > 0 && (
              <button onClick={() => navigate('/orders?status=pending')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/15 transition">
                <Sparkles className="h-3.5 w-3.5" /> {pendingOrders} order{pendingOrders > 1 ? 's' : ''} need shipping
              </button>
            )}
          </div>
        </div>

        <div className="flex items-stretch gap-3 shrink-0">
          <div className="rounded-2xl bg-card/70 backdrop-blur border border-border px-4 py-3 min-w-[140px]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Today's Revenue</div>
            <div className="text-2xl font-bold tabular-nums bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
              ₹{Math.round(animRev).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="rounded-2xl bg-card/70 backdrop-blur border border-border px-4 py-3 min-w-[110px]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Orders</div>
            <div className="text-2xl font-bold tabular-nums">{todayOrders}</div>
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate('/products/new')} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Add product with AI
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/orders')}>View orders</Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/customise')}>Customise store</Button>
      </div>
    </Card>
  );
};

export default HeroGreeting;
