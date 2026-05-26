import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Clock, Wallet as WalletIcon, Plus, RefreshCw } from 'lucide-react';
import RechargeSheet from '@/components/wallet/RechargeSheet';
import { format } from 'date-fns';

const Wallet = () => {
  const { wallet, transactions, loading, refetch } = useWallet();
  const [rechargeOpen, setRechargeOpen] = useState(false);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const balance = wallet?.balance ?? 0;
  const savedInr = Number(wallet?.lifetime_saved_inr ?? 0);
  const savedMin = wallet?.lifetime_saved_minutes ?? 0;
  const savedHrs = (savedMin / 60).toFixed(1);

  return (
    <div className="space-y-6 pb-20 md:pb-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <WalletIcon className="h-6 w-6 text-primary" /> AI Credits Wallet
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Power every AI feature in your store</p>
        </div>
        <Button data-tour="wallet-recharge" onClick={() => setRechargeOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Recharge
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-tour="wallet-balance" className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Balance</div>
            <div className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {balance.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">credits available</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Money saved
            </div>
            <div className="text-3xl font-bold text-emerald-600">₹{savedInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="text-xs text-muted-foreground mt-1">vs hiring help</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Time saved
            </div>
            <div className="text-3xl font-bold">{savedHrs} hrs</div>
            <div className="text-xs text-muted-foreground mt-1">{savedMin.toLocaleString()} minutes total</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Activity</CardTitle>
          <Button size="sm" variant="ghost" onClick={refetch}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activity yet. Recharge to start using AI features.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((t) => {
                const isDebit = t.type === 'debit';
                return (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {t.action_key || t.reason || (t.type === 'credit' ? 'Recharge' : t.type)}
                        {t.cache_hit && <Badge variant="secondary" className="text-[10px]">♻ reused</Badge>}
                        {t.promo_code && <Badge variant="outline" className="text-[10px]">{t.promo_code}</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {format(new Date(t.created_at), 'dd MMM, HH:mm')}
                        {t.manual_cost_inr > 0 && isDebit && (
                          <span className="ml-2 text-emerald-600">· saved ₹{Math.round(Number(t.manual_cost_inr) - Number(t.inr_value))}</span>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold tabular-nums ${isDebit ? 'text-foreground' : 'text-emerald-600'}`}>
                      {isDebit ? '−' : '+'}{t.credits.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <RechargeSheet open={rechargeOpen} onOpenChange={setRechargeOpen} onSuccess={refetch} />
    </div>
  );
};

export default Wallet;
