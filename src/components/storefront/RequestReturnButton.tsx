import { useState } from 'react';
import { useCreateReturn } from '@/hooks/useReturns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Undo2, Repeat2, Upload, X, Info } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  order: {
    id: string;
    store_id: string;
    total: number | null;
    items: any;
    status: string | null;
    delivered_at?: string | null;
    customer_address?: any;
  };
  primaryColor?: string;
  mode?: 'return' | 'exchange';
}

const btn = "text-xs font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors hover:bg-black/5";

const RequestReturnButton = ({ order, primaryColor, mode = 'return' }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const { user } = useCustomerAuth(slug || '');
  const create = useCreateReturn();
  const [open, setOpen] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];

  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const selected = items[selectedIdx] || {};
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState(mode === 'exchange' ? 'Size issue' : 'Damaged');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState<string>(String(order.total ?? 0));
  const [preferredSize, setPreferredSize] = useState('');
  const [preferredColor, setPreferredColor] = useState('');
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const isExchange = mode === 'exchange';
  const Icon = isExchange ? Repeat2 : Undo2;
  const label = isExchange ? 'Exchange' : 'Return';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const f of files.slice(0, 5)) {
      const path = `returns/${order.store_id}/${order.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from('product-images').upload(path, f);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setImages((p) => [...p, ...uploaded].slice(0, 5));
    setUploading(false);
  };

  const submit = async () => {
    if (!user?.id) return;
    const created = await create.mutateAsync({
      order_id: order.id,
      store_id: order.store_id,
      customer_user_id: user.id,
      reason,
      items: [{ ...selected, quantity: qty }],
      refund_amount: isExchange ? 0 : Number(amount) || 0,
      customer_notes: notes + (pickupAddress ? `\nPickup: ${pickupAddress}` : ''),
      request_type: mode,
      exchange_details: isExchange
        ? { preferred_size: preferredSize, preferred_color: preferredColor }
        : undefined,
    } as any);
    // attach images
    if (images.length && (created as any)?.id) {
      await supabase.from('returns' as any).update({ customer_photos: images } as any).eq('id', (created as any).id);
    }
    setOpen(false);
    if ((created as any)?.id) nav(`/store/${slug}/account/returns/${(created as any).id}`);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn} style={{ borderColor: (primaryColor || '#6366f1') + '40', color: primaryColor }}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isExchange ? 'Request Exchange' : 'Request Return'}</DialogTitle>
            <DialogDescription>Fill in the details below. Our team will review your request.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Eligibility banner */}
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Return window & policy</p>
                <p className="opacity-70 mt-0.5">Requests are accepted within the store's return window. Refund is processed after successful pickup and QC.</p>
              </div>
            </div>

            {/* Product picker */}
            {items.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select item</label>
                <select value={selectedIdx} onChange={(e) => setSelectedIdx(Number(e.target.value))} className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                  {items.map((it: any, i: number) => (
                    <option key={i} value={i}>{it.title} (Qty {it.quantity})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input type="number" min={1} max={selected?.quantity || 1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                  {isExchange ? (
                    <>
                      <option>Size issue</option><option>Colour mismatch</option>
                      <option>Wrong item received</option><option>Style preference</option><option>Other</option>
                    </>
                  ) : (
                    <>
                      <option>Damaged</option><option>Wrong item</option>
                      <option>Not as described</option><option>Quality issue</option><option>Other</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {isExchange ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred size</label>
                  <Input value={preferredSize} onChange={(e) => setPreferredSize(e.target.value)} placeholder="e.g. M / L / 42" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred colour</label>
                  <Input value={preferredColor} onChange={(e) => setPreferredColor(e.target.value)} placeholder="e.g. Navy blue" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected refund (₹)</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={0} max={order.total ?? 0} />
                <p className="text-[11px] opacity-60">Final refund is confirmed by the seller after QC.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Describe the issue in detail…" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pickup address (optional)</label>
              <Textarea value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} rows={2} placeholder="Leave empty to use delivery address" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Photos / videos ({images.length}/5)</label>
              <div className="flex flex-wrap gap-2">
                {images.map((u, i) => (
                  <div key={i} className="relative h-16 w-16 rounded-md overflow-hidden border">
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="h-16 w-16 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-muted">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 opacity-60" />}
                    <input type="file" accept="image/*,video/*" multiple hidden onChange={handleUpload} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestReturnButton;
