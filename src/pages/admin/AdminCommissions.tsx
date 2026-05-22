import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

type Row = {
  id: string;
  store_id: string;
  invoice_number: string | null;
  period_start: string;
  period_end: string;
  total_gmv: number;
  total_commission: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  due_date: string;
  paid_at: string | null;
  paid_via: string | null;
  store?: { name?: string | null };
};

const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const AdminCommissions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [waiveTarget, setWaiveTarget] = useState<Row | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('commission_invoices')
      .select('*, store:stores(name)')
      .order('period_end', { ascending: false })
      .limit(500);
    if (status !== 'all') q = q.eq('status', status as any);
    const { data } = await q;
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const filtered = rows.filter((r) =>
    !search ||
    r.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.store?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totals = filtered.reduce(
    (acc, r) => ({
      gmv: acc.gmv + Number(r.total_gmv || 0),
      commission: acc.commission + Number(r.total_commission || 0),
      paid: acc.paid + (r.status === 'paid' ? Number(r.total_commission || 0) : 0),
    }),
    { gmv: 0, commission: 0, paid: 0 },
  );

  const markPaid = async (r: Row) => {
    const { error } = await supabase.from('commission_invoices').update({
      status: 'paid', paid_at: new Date().toISOString(), paid_via: 'manual',
    }).eq('id', r.id);
    if (error) toast.error(error.message); else { toast.success('Marked as paid'); load(); }
  };

  const waive = async () => {
    if (!waiveTarget) return;
    const { error } = await supabase.from('commission_invoices').update({
      status: 'waived', waive_reason: waiveReason || 'Waived by admin',
    }).eq('id', waiveTarget.id);
    if (error) toast.error(error.message);
    else {
      await supabase.from('order_commissions').update({ status: 'waived' }).eq('invoice_id', waiveTarget.id);
      toast.success('Invoice waived');
      setWaiveTarget(null); setWaiveReason(''); load();
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-commission-invoices', { body: {} });
      if (error) throw error;
      toast.success(`Generated: ${(data?.results || []).length} stores processed`);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setRunning(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Commissions</h1>
          <p className="text-sm text-muted-foreground">GMV commission invoices across all stores.</p>
        </div>
        <Button onClick={runNow} disabled={running} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run invoice generation now
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: 'Total GMV (filter)', value: fmt(totals.gmv) },
          { label: 'Total commission (filter)', value: fmt(totals.commission) },
          { label: 'Collected (filter)', value: fmt(totals.paid) },
        ].map((s) => (
          <Card key={s.label}><CardContent className="py-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base mr-auto">Invoices</CardTitle>
            <Input placeholder="Search store / invoice #" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">GMV</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.invoice_number ?? '—'}</TableCell>
                    <TableCell>{r.store?.name ?? r.store_id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{r.period_start} → {r.period_end}</TableCell>
                    <TableCell className="text-right">{fmt(r.total_gmv)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.total_commission)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'paid' ? 'default' : r.status === 'waived' ? 'secondary' : 'destructive'}>
                        {r.status}{r.paid_via ? ` · ${r.paid_via}` : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {r.status !== 'paid' && r.status !== 'waived' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => markPaid(r)}>Mark paid</Button>
                          <Button size="sm" variant="ghost" onClick={() => setWaiveTarget(r)}>Waive</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No invoices.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!waiveTarget} onOpenChange={(o) => !o && setWaiveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Waive commission invoice</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {waiveTarget?.invoice_number} · {fmt(waiveTarget?.total_commission ?? 0)}
          </p>
          <Input placeholder="Reason (optional)" value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWaiveTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={waive}>Waive invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCommissions;
