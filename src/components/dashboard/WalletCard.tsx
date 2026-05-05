import { Link } from 'react-router-dom';
import { Sparkles, Plus, TrendingUp, Clock, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet, useCreditSettings } from '@/hooks/useWallet';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

const WalletCard = () => {
  const { wallet, loading } = useWallet();
  const { data: settings } = useCreditSettings();

  const balance = wallet?.balance ?? 0;
  const savedInr = Number(wallet?.lifetime_saved_inr ?? 0);
  const savedMin = wallet?.lifetime_saved_minutes ?? 0;

  const animBalance = useCountUp(balance);
  const animInr = useCountUp(Math.round(savedInr));
  const animMin = useCountUp(savedMin);

  const low = balance < (settings?.low_balance_threshold ?? 200);
  const critical = balance < (settings?.critical_balance_threshold ?? 50);

  if (loading) {
    return <Card className="h-[148px] animate-pulse bg-muted/40" />;
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-primary/20 group',
        'bg-gradient-to-br from-primary/15 via-primary/5 to-background'
      )}
    >
      {/* animated glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl opacity-50" />
      {/* shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1400ms] ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative p-5 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Balance */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-md animate-pulse" />
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-7 w-7 text-white drop-shadow" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              AI Credits Wallet
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={cn(
                  'text-3xl sm:text-4xl font-bold tabular-nums tracking-tight bg-gradient-to-r bg-clip-text text-transparent',
                  critical
                    ? 'from-destructive to-rose-500'
                    : low
                      ? 'from-amber-600 to-orange-500'
                      : 'from-primary to-amber-500'
                )}
              >
                {Math.round(animBalance).toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-medium text-muted-foreground">credits</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              {critical ? (
                <span className="text-destructive font-medium flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Critical — top up to keep AI running
                </span>
              ) : low ? (
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  Running low — recharge soon
                </span>
              ) : (
                <span>Power every AI feature in your store</span>
              )}
            </div>
          </div>
        </div>

        {/* Savings stats */}
        <div className="flex items-center gap-4 sm:gap-6 sm:border-l sm:border-primary/15 sm:pl-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Saved
            </div>
            <div className="text-lg font-bold text-emerald-600 tabular-nums">
              ₹{Math.round(animInr).toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Time
            </div>
            <div className="text-lg font-bold tabular-nums">
              {(animMin / 60).toFixed(1)}<span className="text-xs font-medium text-muted-foreground ml-0.5">hrs</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex sm:flex-col gap-2 sm:items-end shrink-0">
          <Button asChild size="sm" className="gap-1.5 shadow-md hover:shadow-lg transition-shadow">
            <Link to="/wallet">
              <Plus className="h-3.5 w-3.5" /> Recharge
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="text-xs h-8">
            <Link to="/wallet">View activity</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default WalletCard;
