import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { usePnl } from '@/hooks/useAccounts';
import {
  DateRangePicker, ExportCsvButton, inr, todayISO, daysAgoISO,
} from '@/components/accounts/AccountsPrimitives';

const ProfitLossReport = () => {
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const { data: pnl } = usePnl(from, to);

  const rows = pnl ? [
    { line: 'Revenue (paid sales, net of GST)', value: inr(pnl.revenue) },
    { line: 'Less: Cost of goods sold', value: inr(pnl.cogs) },
    { line: 'Less: Operating expenses', value: inr(pnl.expenses_total) },
    { line: 'GST collected (info)', value: inr(pnl.tax_collected) },
    { line: 'Net profit', value: inr(pnl.net_profit) },
  ] : [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 print:p-0">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Profit &amp; Loss</h1>
          <p className="text-sm text-muted-foreground">{from} → {to}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <DateRangePicker from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <ExportCsvButton filename="profit-loss.csv" rows={rows} />
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Profit &amp; Loss — {from} to {to}</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-3">Revenue (paid sales, net of GST)</td><td className="py-3 text-right font-medium">{inr(pnl?.revenue || 0)}</td></tr>
              <tr className="border-b text-rose-700"><td className="py-3">Cost of goods sold</td><td className="py-3 text-right">({inr(pnl?.cogs || 0)})</td></tr>
              <tr className="border-b font-medium"><td className="py-3">Gross profit</td><td className="py-3 text-right">{inr((pnl?.revenue || 0) - (pnl?.cogs || 0))}</td></tr>
              <tr className="border-b text-rose-700"><td className="py-3">Operating expenses</td><td className="py-3 text-right">({inr(pnl?.expenses_total || 0)})</td></tr>
              <tr className="border-b text-muted-foreground text-xs"><td className="py-2">GST collected (informational)</td><td className="py-2 text-right">{inr(pnl?.tax_collected || 0)}</td></tr>
              <tr className="text-lg font-semibold"><td className="py-4">Net profit</td><td className="py-4 text-right text-emerald-700">{inr(pnl?.net_profit || 0)}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitLossReport;
