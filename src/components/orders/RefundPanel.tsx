import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  orderId: string;
  total: number;
  amountRefunded: number;
  hasRazorpayPayment: boolean;
  paymentStatus: string | null;
  onRefunded?: () => void;
}

const RefundPanel = ({ orderId, total, amountRefunded, hasRazorpayPayment, paymentStatus, onRefunded }: Props) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const refundable = Math.max(0, Number(total) - Number(amountRefunded || 0));
  const [amount, setAmount] = useState<string>(refundable.toFixed(2));
  const [reason, setReason] = useState('');
  const [speed, setSpeed] = useState<'normal' | 'optimum'>('normal');
  const [loading, setLoading] = useState(false);

  const { data: refunds = [], refetch } = useQuery({
    queryKey: ['refunds', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select('id, amount, status, speed, reason, razorpay_refund_id, error_message, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const canRefund = hasRazorpayPayment && refundable > 0 &&
    (paymentStatus === 'paid' || paymentStatus === 'partially_refunded');

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > refundable) {
      toast.error(`Enter an amount between ₹0.01 and ₹${refundable.toFixed(2)}`);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('razorpay-refund', {
        body: { order_id: orderId, amount: amt, reason: reason || undefined, speed },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Refund failed');
      }
      toast.success(`Refund initiated: ₹${amt.toFixed(2)}`);
      setOpen(false);
      setReason('');
      await refetch();
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      onRefunded?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasRazorpayPayment && refunds.length === 0) return null;

  return (
    <div className="space-y-3 pt-3 border-t">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Refunded</p>
          <p className="text-sm font-medium">₹{Number(amountRefunded || 0).toFixed(2)} of ₹{Number(total).toFixed(2)}</p>
        </div>
        <Button size="sm" variant="outline" disabled={!canRefund} onClick={() => setOpen(true)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refund
        </Button>
      </div>

      {refunds.length > 0 && (
        <div className="space-y-1.5">
          {refunds.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-xs rounded-md bg-muted/40 px-2 py-1.5">
              <div>
                <span className="font-medium">₹{Number(r.amount).toFixed(2)}</span>
                <span className="text-muted-foreground"> · {format(new Date(r.created_at), 'dd MMM, HH:mm')}</span>
                {r.reason && <p className="text-muted-foreground mt-0.5">{r.reason}</p>}
              </div>
              <Badge variant={r.status === 'processed' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="refund-amount" className="text-xs">Amount (₹)</Label>
              <Input
                id="refund-amount"
                type="number"
                min={0.01}
                max={refundable}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Refundable: ₹{refundable.toFixed(2)}
              </p>
            </div>
            <div>
              <Label className="text-xs">Speed</Label>
              <Select value={speed} onValueChange={(v) => setSpeed(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (5–7 days, free)</SelectItem>
                  <SelectItem value="optimum">Instant (where supported, fee applies)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="refund-reason" className="text-xs">Reason (optional)</Label>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer requested cancellation"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RefundPanel;
