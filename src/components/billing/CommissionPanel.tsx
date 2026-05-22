import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Receipt, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

declare global { interface Window { Razorpay: any } }

type Invoice = {
  id: string;
  invoice_number: string | null;
  period_start: string;
  period_end: string;
  total_gmv: number;
  total_commission: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  due_date: string;
  paid_at: string | null;
  paid_via: string | null;
};

interface Props {
  storeId: string;
  storeName: string;
  storeSettings: Record<string, any> | null | undefined;
  commissionPercent: number;
}

const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function CommissionPanel({ storeId, storeName, storeSettings, commissionPercent }: Props) {
  const [accrued, setAccrued] = useState({ count: 0, gmv: 0, commission: 0 });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [autoPay, setAutoPay] = useState<boolean>(storeSettings?.auto_pay_commission_from_credits !== false);

  const load = async () => {
    setLoading(true);
    // Current-month accrued
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: accrue } = await supabase
      .from('order_commissions')
      .select('gmv_amount, commission_amount')
      .eq('store_id', storeId)
      .eq('status', 'accrued')
      .gte('created_at', monthStart.toISOString());
    const a = (accrue ?? []).reduce(
      (acc, r: any) => ({
        count: acc.count + 1,
        gmv: acc.gmv + Number(r.gmv_amount || 0),
        commission: acc.commission + Number(r.commission_amount || 0),
      }),
      { count: 0, gmv: 0, commission: 0 },
    );
    setAccrued(a);

    const { data: inv } = await supabase
      .from('commission_invoices')
      .select('id, invoice_number, period_start, period_end, total_gmv, total_commission, status, due_date, paid_at, paid_via')
      .eq('store_id', storeId)
      .order('period_end', { ascending: false })
      .limit(12);
    setInvoices((inv ?? []) as Invoice[]);
    setLoading(false);
  };

  useEffect(() => {
    if (storeId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const toggleAutoPay = async (val: boolean) => {
    setAutoPay(val);
    const nextSettings = { ...(storeSettings || {}), auto_pay_commission_from_credits: val };
    const { error } = await supabase.from('stores').update({ settings: nextSettings }).eq('id', storeId);
    if (error) {
      toast.error('Failed to update preference');
      setAutoPay(!val);
    } else {
      toast.success(val ? 'Auto-pay from credits enabled' : 'Auto-pay disabled');
    }
  };

  const payInvoice = async (invoice: Invoice) => {
    setPaying(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-commission-payment', {
        body: { invoice_id: invoice.id },
      });
      if (error || !data?.order_id) throw new Error(error?.message || data?.error || 'Payment failed');

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(script);
      await new Promise((res) => { script.onload = res; });

      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: 'INR',
        order_id: data.order_id,
        name: 'Pic to Cart',
        description: `Commission ${invoice.invoice_number}`,
        theme: { color: '#F97316' },
        handler: () => {
          toast.success('Payment received. Receipt will be emailed.');
          setTimeout(load, 2500);
        },
        modal: { ondismiss: () => setPaying(null) },
      });
      rzp.open();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Payment failed');
    } finally {
      setPaying(null);
    }
  };

  const pending = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">GMV Commission</CardTitle>
            <Badge variant="secondary">{commissionPercent}% of paid orders</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="autopay" className="text-xs text-muted-foreground">Auto-pay from AI credits</Label>
            <Switch id="autopay" checked={autoPay} onCheckedChange={toggleAutoPay} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live this-month accrual */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-muted/40">
          <div>
            <div className="text-xs text-muted-foreground">This month — orders</div>
            <div className="text-lg font-semibold">{accrued.count}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">GMV (subtotal)</div>
            <div className="text-lg font-semibold">{fmt(accrued.gmv)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Accruing</div>
            <div className="text-lg font-semibold text-primary">{fmt(accrued.commission)}</div>
          </div>
        </div>

        {/* Pending invoices */}
        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-md border-amber-200 bg-amber-50/50">
                <div>
                  <div className="text-sm font-medium">{inv.invoice_number ?? 'Invoice'}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.period_start} → {inv.period_end} · GMV {fmt(inv.total_gmv)} · Due {inv.due_date}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold">{fmt(inv.total_commission)}</div>
                  <Button size="sm" onClick={() => payInvoice(inv)} disabled={paying === inv.id}>
                    {paying === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay now'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">No invoices yet. Your first commission invoice will be generated on the 1st of next month.</p>
        ) : (
          <div className="text-xs space-y-1.5">
            <div className="font-medium text-muted-foreground">History</div>
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between">
                <span>{inv.invoice_number ?? '—'} · {inv.period_start} → {inv.period_end}</span>
                <span className="flex items-center gap-2">
                  {fmt(inv.total_commission)}
                  <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'waived' ? 'secondary' : 'destructive'}>
                    {inv.status}{inv.paid_via ? ` · ${inv.paid_via}` : ''}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
