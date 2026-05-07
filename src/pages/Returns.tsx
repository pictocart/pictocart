import { useState } from 'react';
import { useStoreReturns, RETURN_STATUSES, type ReturnStatus } from '@/hooks/useReturns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Undo2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Returns = () => {
  const { returns, loading, updateStatus } = useStoreReturns();
  const [filter, setFilter] = useState<string>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<ReturnStatus>('approved');

  const active = returns.find((r) => r.id === activeId);
  const filtered = filter === 'all' ? returns : returns.filter((r) => r.status === filter);

  const openManage = (id: string) => {
    const r = returns.find((x) => x.id === id);
    if (!r) return;
    setActiveId(id);
    setNotes(r.seller_notes || '');
    setNextStatus(r.status === 'requested' ? 'approved' : r.status);
  };

  const submit = async () => {
    if (!activeId) return;
    await updateStatus.mutateAsync({ id: activeId, status: nextStatus, seller_notes: notes });
    setActiveId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Returns</h1>
          <p className="text-sm text-muted-foreground">{returns.length} return request(s)</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RETURN_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <Undo2 className="h-7 w-7 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No return requests</h3>
          <p className="text-sm text-muted-foreground mt-1">
            When customers request returns, they will appear here for your approval.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const meta = RETURN_STATUSES.find((s) => s.value === r.status);
            return (
              <Card key={r.id}>
                <CardContent className="py-4 flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Link to={`/orders/${r.order_id}`} className="text-sm font-semibold hover:underline">
                        Order
                      </Link>
                      <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', meta?.color)}>
                        {meta?.label}
                      </span>
                    </div>
                    <p className="text-sm mt-1"><span className="text-muted-foreground">Reason:</span> {r.reason}</p>
                    {r.customer_notes && (
                      <p className="text-xs text-muted-foreground mt-1">"{r.customer_notes}"</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{Number(r.refund_amount).toLocaleString('en-IN')}</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => openManage(r.id)}>
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!activeId} onOpenChange={(o) => !o && setActiveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Return</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><strong>Reason:</strong> {active.reason}</p>
                <p><strong>Refund amount:</strong> ₹{Number(active.refund_amount).toLocaleString('en-IN')}</p>
                {active.customer_notes && <p className="text-muted-foreground">"{active.customer_notes}"</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Set status</label>
                <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ReturnStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RETURN_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Internal note (optional)</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveId(null)}>Cancel</Button>
                <Button onClick={submit} disabled={updateStatus.isPending}>
                  {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Returns;
