import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, Loader2, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { usePacks, useCreditSettings } from '@/hooks/useWallet';
import { toast } from 'sonner';

declare global { interface Window { Razorpay: any } }

const loadRzp = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) return resolve(true);
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess?: (creditedTotal: number) => void;
}

const RechargeSheet = ({ open, onOpenChange, onSuccess }: Props) => {
  const { store } = useStore();
  const { data: packs = [] } = usePacks();
  const { data: settings } = useCreditSettings();
  const [selected, setSelected] = useState<string | 'custom' | null>(null);
  const [customInr, setCustomInr] = useState<string>('');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecharge = async () => {
    if (!store?.id || !selected) return;
    setLoading(true);
    try {
      const ready = await loadRzp();
      if (!ready) throw new Error('Failed to load Razorpay');

      const body: any = { store_id: store.id, promo_code: promoCode.trim() || undefined };
      if (selected === 'custom') {
        const inr = Number(customInr);
        if (!Number.isFinite(inr) || inr < (settings?.custom_min_inr || 99)) {
          throw new Error(`Minimum ₹${settings?.custom_min_inr || 99}`);
        }
        body.custom_inr = inr;
      } else {
        body.pack_id = selected;
      }

      const { data, error } = await supabase.functions.invoke('wallet-create-recharge', { body });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Recharge failed');

      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'PictoCart',
        description: `${data.pack_name} — ${data.total_credits.toLocaleString()} credits`,
        order_id: data.razorpay_order_id,
        theme: { color: '#F97316' },
        handler: async (resp: any) => {
          const { data: vd, error: ve } = await supabase.functions.invoke('wallet-verify-recharge', {
            body: {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              store_id: store.id,
            },
          });
          if (ve || vd?.error) {
            toast.error(vd?.error || 've.message');
            return;
          }
          toast.success(`✨ ${data.total_credits.toLocaleString()} credits added`);
          onSuccess?.(data.total_credits);
          onOpenChange(false);
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Recharge AI Credits
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {packs.map((p: any) => {
            const isSel = selected === p.id;
            const totalCredits = p.credits + Math.floor(p.credits * (p.bonus_pct || 0) / 100);
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.name}</span>
                      {p.badge && <Badge variant="secondary" className="text-[10px]">{p.badge}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {totalCredits.toLocaleString()} credits
                      {p.bonus_pct > 0 && <span className="ml-1 text-emerald-600 font-medium">(+{p.bonus_pct}% bonus)</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">₹{p.price_inr}</div>
                    {isSel && <Check className="h-4 w-4 text-primary ml-auto mt-1" />}
                  </div>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => setSelected('custom')}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              selected === 'custom' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            }`}
          >
            <div className="font-semibold">Custom amount</div>
            <div className="text-sm text-muted-foreground mt-1">
              Min ₹{settings?.custom_min_inr || 99}, {settings?.custom_recharge_rate || 10} credits per ₹1
            </div>
            {selected === 'custom' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-lg font-medium">₹</span>
                <Input
                  type="number"
                  value={customInr}
                  onChange={(e) => setCustomInr(e.target.value)}
                  placeholder="500"
                  min={settings?.custom_min_inr || 99}
                  max={settings?.custom_max_inr || 50000}
                  className="h-10"
                />
              </div>
            )}
          </button>

          <div className="space-y-1.5 pt-2">
            <Label className="text-xs flex items-center gap-1.5"><Tag className="h-3 w-3" /> Promo code (optional)</Label>
            <Input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH50"
              className="h-10 uppercase"
            />
          </div>

          <Button
            onClick={handleRecharge}
            disabled={!selected || loading}
            className="w-full h-11 mt-4"
            size="lg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay & add credits'}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">Secure payment via Razorpay · GST invoice provided</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RechargeSheet;
