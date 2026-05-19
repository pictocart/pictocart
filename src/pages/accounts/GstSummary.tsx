import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import {
  DateRangePicker, ExportCsvButton, inr, todayISO, daysAgoISO,
} from '@/components/accounts/AccountsPrimitives';

const GstSummary = () => {
  const { store } = useStore();
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());

  const { data } = useQuery({
    queryKey: ['gst-summary', store?.id, from, to],
    enabled: !!store?.id,
    queryFn: async () => {
      const [sales, purchases] = await Promise.all([
        supabase.from('orders')
          .select('subtotal, tax, total, payment_status, created_at')
          .eq('store_id', store!.id)
          .eq('payment_status', 'paid')
          .gte('created_at', from + 'T00:00:00')
          .lte('created_at', to + 'T23:59:59'),
        supabase.from('purchase_bills' as any)
          .select('subtotal, tax, total, bill_date')
          .eq('store_id', store!.id)
          .gte('bill_date', from).lte('bill_date', to),
      ]);
      const outward = (sales.data ?? []).reduce(
        (a: any, o: any) => ({
          taxable: a.taxable + Number(o.subtotal || 0),
          tax: a.tax + Number(o.tax || 0),
          total: a.total + Number(o.total || 0),
        }), { taxable: 0, tax: 0, total: 0 });
      const inward = (purchases.data ?? []).reduce(
        (a: any, p: any) => ({
          taxable: a.taxable + Number(p.subtotal || 0),
          tax: a.tax + Number(p.tax || 0),
          total: a.total + Number(p.total || 0),
        }), { taxable: 0, tax: 0, total: 0 });
      return { outward, inward, net_tax_payable: outward.tax - inward.tax };
    },
  });

  const rows = data ? [
    { line: 'Outward supplies (sales) — taxable value', value: inr(data.outward.taxable) },
    { line: 'Outward GST collected', value: inr(data.outward.tax) },
    { line: 'Inward supplies (purchases) — taxable value', value: inr(data.inward.taxable) },
    { line: 'Inward GST paid (ITC)', value: inr(data.inward.tax) },
    { line: 'Net GST payable', value: inr(data.net_tax_payable) },
  ] : [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">GST Summary</h1>
          <p className="text-sm text-muted-foreground">{from} → {to}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <DateRangePicker from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <ExportCsvButton filename="gst-summary.csv" rows={rows} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-3">Outward supplies (sales) — taxable value</td><td className="py-3 text-right">{inr(data?.outward.taxable || 0)}</td></tr>
              <tr className="border-b"><td className="py-3">Outward GST collected</td><td className="py-3 text-right">{inr(data?.outward.tax || 0)}</td></tr>
              <tr className="border-b"><td className="py-3">Inward supplies (purchases) — taxable value</td><td className="py-3 text-right">{inr(data?.inward.taxable || 0)}</td></tr>
              <tr className="border-b"><td className="py-3">Inward GST paid (ITC)</td><td className="py-3 text-right">{inr(data?.inward.tax || 0)}</td></tr>
              <tr className="text-lg font-semibold"><td className="py-4">Net GST payable</td><td className="py-4 text-right">{inr(data?.net_tax_payable || 0)}</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">
            Informational only. Always reconcile with your CA before filing GSTR-1/3B.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GstSummary;
