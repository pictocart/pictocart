import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCashBook } from '@/hooks/useAccounts';
import {
  DateRangePicker, ExportCsvButton, inr, todayISO, daysAgoISO,
} from '@/components/accounts/AccountsPrimitives';
import { Badge } from '@/components/ui/badge';

const CashBook = () => {
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const { data: rows = [] } = useCashBook(from, to);

  const cashIn = rows.reduce((s, r) => s + r.in, 0);
  const cashOut = rows.reduce((s, r) => s + r.out, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cash Book</h1>
          <p className="text-sm text-muted-foreground">
            In: <b className="text-emerald-700">{inr(cashIn)}</b> · Out: <b className="text-rose-700">{inr(cashOut)}</b> · Net: <b>{inr(cashIn - cashOut)}</b>
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <DateRangePicker from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
          <ExportCsvButton filename="cash-book.csv" rows={rows.map(r => ({
            date: r.date, description: r.description, mode: r.mode, in: r.in, out: r.out, running: r.running,
          }))} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Mode</th>
                  <th className="text-right p-3">In</th>
                  <th className="text-right p-3">Out</th>
                  <th className="text-right p-3">Running</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">{r.description}</td>
                    <td className="p-3"><Badge variant="outline" className="capitalize">{r.mode}</Badge></td>
                    <td className="p-3 text-right text-emerald-700">{r.in ? inr(r.in) : ''}</td>
                    <td className="p-3 text-right text-rose-700">{r.out ? inr(r.out) : ''}</td>
                    <td className="p-3 text-right font-medium">{inr(r.running)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>No movement in this range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashBook;
