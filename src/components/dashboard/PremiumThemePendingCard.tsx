import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, X, Clock, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePremiumThemePurchase } from '@/hooks/usePremiumThemePurchase';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { applyMasterTheme } from '@/lib/applyMasterTheme';
import { getPremiumTrialStatus, PREMIUM_THEME_TRIAL_DAYS, type PendingPremiumTheme } from '@/lib/premiumThemeTrial';

/**
 * Shows when the merchant chose a premium theme but skipped payment.
 * Renders the live 14-day free-trial countdown.
 */
const PremiumThemePendingCard = () => {
  const { store, refetchStore } = useStore();
  const { purchase, loading } = usePremiumThemePurchase();
  const [dismissed, setDismissed] = useState(false);
  // Tick every minute so the countdown stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const pending = (store?.settings as any)?.pending_premium_theme as PendingPremiumTheme | undefined;
  const trial = getPremiumTrialStatus(pending);

  const { data: themeMeta } = useQuery({
    queryKey: ['theme-meta', pending?.theme_id],
    enabled: !!pending?.theme_id,
    queryFn: async () => {
      const { data } = await supabase.from('theme_master_projects')
        .select('name, preview_image, price')
        .eq('theme_id', pending!.theme_id).maybeSingle();
      return data;
    },
  });

  if (!pending || dismissed || !themeMeta) return null;

  const handlePay = async () => {
    const ok = await purchase('master', pending.theme_id);
    if (ok && store) {
      try {
        const { data: fresh } = await supabase.from('stores')
          .select('settings').eq('id', store.id).maybeSingle();
        await applyMasterTheme(store.id, pending.theme_id, (fresh?.settings as any) || {});
        await refetchStore();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const expired = trial.expired;
  const urgent = trial.active && trial.daysLeft <= 3;

  // Color story: amber while comfy, orange when urgent, red when expired.
  const wrapperClass = expired
    ? 'border-red-500/40 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/10'
    : urgent
    ? 'border-orange-500/40 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/10'
    : 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10';

  const headerLabel = expired
    ? 'Free trial ended'
    : trial.active
    ? `Free trial — ${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'} left`
    : 'Premium theme reserved';

  const headerIcon = expired ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />;
  const headerColor = expired
    ? 'text-red-700 dark:text-red-400'
    : urgent
    ? 'text-orange-700 dark:text-orange-400'
    : 'text-amber-700 dark:text-amber-400';

  // Progress bar: percent of trial consumed.
  const totalMs = PREMIUM_THEME_TRIAL_DAYS * 86400_000;
  const remainingMs = trial.endsAt ? Math.max(0, trial.endsAt.getTime() - Date.now()) : 0;
  const consumedPct = expired ? 100 : Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100));

  return (
    <Card className={`${wrapperClass} relative overflow-hidden`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-background/40 transition"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4 px-4">
        {themeMeta.preview_image && (
          <img src={themeMeta.preview_image} alt={themeMeta.name}
               className="h-16 w-24 rounded-lg object-cover border border-border shadow-md flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${headerColor} uppercase tracking-wider`}>
            {headerIcon} {headerLabel}
          </div>
          <p className="text-sm font-semibold mt-0.5 flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-amber-500" /> {themeMeta.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Sparkles className="h-3 w-3 text-amber-500" />
            {expired ? (
              <>Pay <span className="font-bold text-foreground">₹{themeMeta.price}</span> now to restore uninterrupted service, or switch to a free theme.</>
            ) : (
              <>Pay <span className="font-bold text-foreground">₹{themeMeta.price}</span> any time in your trial to keep this design after day {PREMIUM_THEME_TRIAL_DAYS}.</>
            )}
          </p>
          {/* Trial progress bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-background/60 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${expired ? 'bg-red-500' : urgent ? 'bg-orange-500' : 'bg-amber-500'}`}
              style={{ width: `${consumedPct}%` }}
            />
          </div>
        </div>
        <Button onClick={handlePay} disabled={loading} className="gap-2 shadow-lg shadow-amber-500/20">
          <Crown className="h-4 w-4" />
          {loading ? 'Opening…' : expired ? 'Pay & Restore' : 'Pay & Lock In'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PremiumThemePendingCard;
