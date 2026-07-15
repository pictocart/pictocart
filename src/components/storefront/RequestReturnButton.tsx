import { useState } from 'react';
import { useCreateReturn } from '@/hooks/useReturns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Undo2, Repeat2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

interface Props {
  order: {
    id: string;
    store_id: string;
    total: number | null;
    items: any;
    status: string | null;
  };
  primaryColor?: string;
  mode?: 'return' | 'exchange';
}

const RequestReturnButton = ({ order, primaryColor, mode = 'return' }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useCustomerAuth(slug || '');
  const create = useCreateReturn();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(mode === 'exchange' ? 'Size issue' : 'Damaged');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState(String(order.total ?? 0));
  // Exchange-specific
  const [preferredSize, setPreferredSize] = useState('');
  const [preferredColor, setPreferredColor] = useState('');

  const eligible = order.status === 'delivered' || order.status === 'shipped';
  if (!eligible) return null;

  const isExchange = mode === 'exchange';

  const submit = async () => {
    if (!user?.id) return;
    await create.mutateAsync({
      order_id: order.id,
      store_id: order.store_id,
      customer_user_id: user.id,
      reason,
      items: Array.isArray(order.items) ? order.items : [],
      refund_amount: isExchange ? 0 : Number(amount) || 0,
      customer_notes: notes,
      request_type: mode,
      exchange_details: isExchange
        ? { preferred_size: preferredSize, preferred_color: preferredColor }
        : undefined,
    });
    setOpen(false);
  };

  const Icon = isExchange ? Repeat2 : Undo2;
  const label = isExchange ? 'Request exchange' : 'Request return';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium underline-offset-4 hover:underline opacity-70"
        style={{ color: primaryColor }}
      >
        <Icon className="inline h-3 w-3 mr-1" /> {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isExchange ? 'Request exchange' : 'Request return'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              >
                {isExchange ? (
                  <>
                    <option>Size issue</option>
                    <option>Colour mismatch</option>
                    <option>Wrong item received</option>
                    <option>Style preference</option>
                    <option>Other</option>
                  </>
                ) : (
                  <>
                    <option>Damaged</option>
                    <option>Wrong item</option>
                    <option>Not as described</option>
                    <option>Quality issue</option>
                    <option>Other</option>
                  </>
                )}
              </select>
            </div>

            {isExchange ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred size</label>
                  <Input
                    value={preferredSize}
                    onChange={(e) => setPreferredSize(e.target.value)}
                    placeholder="e.g. M / L / 42"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred colour</label>
                  <Input
                    value={preferredColor}
                    onChange={(e) => setPreferredColor(e.target.value)}
                    placeholder="e.g. Navy blue"
                  />
                </div>
              </div>
            ) : (
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
            )}

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
