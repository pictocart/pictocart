import { useState } from 'react';
import { useCreateReturn } from '@/hooks/useReturns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Undo2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  order: {
    id: string;
    store_id: string;
    total: number | null;
    items: any;
    status: string | null;
  };
  primaryColor?: string;
}

const RequestReturnButton = ({ order, primaryColor }: Props) => {
  const { user } = useAuth();
  const create = useCreateReturn();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('Damaged');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState(String(order.total ?? 0));

  const eligible = order.status === 'delivered' || order.status === 'shipped';
  if (!eligible) return null;

  const submit = async () => {
    if (!user?.id) return;
    await create.mutateAsync({
      order_id: order.id,
      store_id: order.store_id,
      customer_user_id: user.id,
      reason,
      items: Array.isArray(order.items) ? order.items : [],
      refund_amount: Number(amount) || 0,
      customer_notes: notes,
    });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium underline-offset-4 hover:underline opacity-70"
        style={{ color: primaryColor }}
      >
        <Undo2 className="inline h-3 w-3 mr-1" /> Request return
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              >
                <option>Damaged</option>
                <option>Wrong item</option>
                <option>Not as described</option>
                <option>Quality issue</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Refund amount (₹)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                max={order.total ?? 0}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note for the seller</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestReturnButton;
