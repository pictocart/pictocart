import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  ShoppingCart, CreditCard, CheckCircle2, Package, Truck, MapPin, PackageCheck,
  Undo2, XCircle, CalendarClock, PackageOpen, ClipboardCheck, ShieldCheck, ShieldAlert,
  Banknote, Repeat2, Send, Home, Ban, User, Bot, ArrowRight, Loader2, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orderId: string;
}

type Actor = 'System' | 'Customer' | 'Admin' | 'Merchant';

interface Event {
  at: string;
  title: string;
  from?: string | null;
  to?: string | null;
  by: Actor;
  note?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  tone: string; // badge color classes
}

const toneMap: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-800 border-slate-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  rose: 'bg-rose-100 text-rose-800 border-rose-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  teal: 'bg-teal-100 text-teal-800 border-teal-200',
  sky: 'bg-sky-100 text-sky-800 border-sky-200',
};

const STATUS_META: Record<string, { label: string; icon: any; tone: string }> = {
  new:               { label: 'Order Created',       icon: ShoppingCart, tone: 'emerald' },
  pending:           { label: 'Pending',              icon: Clock,        tone: 'yellow' },
  confirmed:         { label: 'Order Confirmed',      icon: CheckCircle2, tone: 'blue' },
  processing:        { label: 'Processing',           icon: Loader2,      tone: 'purple' },
  packed:            { label: 'Packed',               icon: PackageCheck, tone: 'cyan' },
  shipped:           { label: 'Shipped',              icon: Truck,        tone: 'indigo' },
  out_for_delivery:  { label: 'Out for Delivery',     icon: MapPin,       tone: 'sky' },
  delivered:         { label: 'Delivered',            icon: Home,         tone: 'green' },
  rejected:          { label: 'Order Rejected',       icon: Ban,          tone: 'orange' },
  cancelled:         { label: 'Order Cancelled',      icon: XCircle,      tone: 'red' },
  returned:          { label: 'Returned',             icon: Undo2,        tone: 'slate' },

  requested:              { label: 'Return Requested',       icon: Undo2,        tone: 'yellow' },
  approved:               { label: 'Return Approved',        icon: CheckCircle2, tone: 'blue' },
  pickup_scheduled:       { label: 'Pickup Scheduled',       icon: CalendarClock,tone: 'cyan' },
  picked_up:              { label: 'Pickup Completed',       icon: PackageOpen,  tone: 'indigo' },
  qc_pending:             { label: 'Quality Check Started',  icon: ClipboardCheck,tone: 'amber' },
  qc_passed:              { label: 'Quality Check Passed',   icon: ShieldCheck,  tone: 'emerald' },
  qc_failed:              { label: 'Quality Check Failed',   icon: ShieldAlert,  tone: 'rose' },
  received:               { label: 'Return Received',        icon: PackageCheck, tone: 'purple' },
  refund_initiated:       { label: 'Refund Initiated',       icon: Banknote,     tone: 'teal' },
  refund_completed:       { label: 'Refund Completed',       icon: Banknote,     tone: 'green' },
  refunded:               { label: 'Refunded',               icon: Banknote,     tone: 'green' },
  replacement_packed:     { label: 'Replacement Packed',     icon: PackageCheck, tone: 'cyan' },
  replacement_shipped:    { label: 'Replacement Shipped',    icon: Send,         tone: 'indigo' },
  replacement_delivered:  { label: 'Replacement Delivered',  icon: Home,         tone: 'green' },
  cancelled_return:       { label: 'Return Cancelled',       icon: XCircle,      tone: 'slate' },
};

const metaFor = (status?: string | null) => (status && STATUS_META[status]) || { label: status || 'Update', icon: Clock, tone: 'slate' };

const OrderHistoryDialog = ({ open, onOpenChange, orderId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['order-history', orderId],
    enabled: open && !!orderId,
    queryFn: async () => {
      const [{ data: order }, { data: history }, { data: returns }, { data: refunds }] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).maybeSingle(),
        supabase.from('order_status_history' as any).select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
        supabase.from('returns' as any).select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
        supabase.from('refunds' as any).select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
      ]);
      return {
        order: order as any,
        history: (history || []) as any[],
        returns: (returns || []) as any[],
        refunds: (refunds || []) as any[],
      };
    },
  });

  const events: Event[] = [];

  if (data?.order) {
    const o = data.order;
    const historyRows = data.history || [];

    if (historyRows.length === 0) {
      // Fallback if history missing
      events.push({
        at: o.created_at,
        title: 'Order Created',
        to: o.status,
        by: 'Customer',
        note: `Order #${o.order_number} placed`,
        icon: ShoppingCart,
        tone: 'emerald',
      });
    } else {
      historyRows.forEach((h: any) => {
        const m = metaFor(h.to_status);
        const isCreation = !h.from_status;
        events.push({
          at: h.created_at,
          title: isCreation ? 'Order Created' : `Status changed to ${m.label}`,
          from: h.from_status,
          to: h.to_status,
          by: (h.actor as Actor) || 'System',
          note: isCreation ? `Order #${o.order_number} placed` : (h.note || null),
          icon: isCreation ? ShoppingCart : m.icon,
          tone: isCreation ? 'emerald' : m.tone,
        });
      });
    }

    // Payment
    if (o.payment_status === 'paid') {
      events.push({
        at: o.updated_at || o.created_at,
        title: 'Payment Received',
        to: 'paid',
        by: o.payment_method === 'razorpay' ? 'System' : 'Merchant',
        note: o.payment_method ? `via ${String(o.payment_method).toUpperCase()}` : null,
        icon: CreditCard,
        tone: 'green',
      });
    }
    // Shipped
    if (o.tracking_number || o.awb) {
      events.push({
        at: o.shipped_at || o.updated_at || o.created_at,
        title: 'Shipped',
        from: 'processing', to: 'shipped',
        by: 'Merchant',
        note: `AWB ${o.awb || o.tracking_number}${o.courier ? ` · ${o.courier}` : ''}`,
        icon: Truck,
        tone: 'indigo',
      });
    }
    if (o.delivered_at) {
      events.push({
        at: o.delivered_at,
        title: 'Delivered',
        from: 'out_for_delivery', to: 'delivered',
        by: 'System',
        note: o.pod_url ? 'POD available' : null,
        icon: Home,
        tone: 'green',
      });
    }
  }

  // Returns & exchanges — merge timeline entries
  (data?.returns || []).forEach((r) => {
    const label = r.request_type === 'exchange' ? 'Exchange Requested' : 'Return Requested';
    events.push({
      at: r.created_at,
      title: label,
      to: r.status,
      by: 'Customer',
      note: r.reason,
      icon: r.request_type === 'exchange' ? Repeat2 : Undo2,
      tone: 'yellow',
    });
    const tl = Array.isArray(r.timeline) ? r.timeline : [];
    tl.forEach((t: any, i: number) => {
      const m = metaFor(t.status);
      events.push({
        at: t.at || r.updated_at || r.created_at,
        title: t.note || m.label,
        from: i > 0 ? tl[i - 1]?.status : r.status,
        to: t.status,
        by: (t.by as Actor) || 'Merchant',
        note: t.remarks || null,
        icon: m.icon,
        tone: m.tone,
      });
    });
  });

  (data?.refunds || []).forEach((rf) => {
    events.push({
      at: rf.created_at,
      title: rf.status === 'completed' ? 'Refund Completed' : 'Refund Initiated',
      to: rf.status,
      by: 'Merchant',
      note: rf.amount ? `₹${Number(rf.amount).toLocaleString('en-IN')}${rf.reason ? ` · ${rf.reason}` : ''}` : rf.reason,
      icon: Banknote,
      tone: rf.status === 'completed' ? 'green' : 'teal',
    });
  });

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const actorIcon = (a: Actor) => (a === 'Customer' ? User : a === 'System' ? Bot : User);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Order History
          </DialogTitle>
          <DialogDescription>Complete chronological lifecycle of this order.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No history available yet.</p>
            ) : (
              <ol className="relative border-l-2 border-dashed border-muted ml-4 space-y-6">
                {events.map((e, i) => {
                  const Icon = e.icon;
                  const ActorIcon = actorIcon(e.by);
                  return (
                    <li key={i} className="ml-6">
                      <span className={cn('absolute -left-[17px] flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-background border', toneMap[e.tone])}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{e.title}</p>
                            {(e.from || e.to) && (
                              <div className="flex items-center gap-1 text-xs">
                                {e.from && <Badge variant="outline" className="font-normal">{metaFor(e.from).label}</Badge>}
                                {e.from && e.to && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                                {e.to && <Badge className={cn('font-normal border', toneMap[e.tone])}>{metaFor(e.to).label}</Badge>}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-medium">{format(new Date(e.at), 'dd MMM yyyy')}</p>
                            <p className="text-[11px] text-muted-foreground">{format(new Date(e.at), 'hh:mm a')}</p>
                          </div>
                        </div>
                        {e.note && <p className="text-xs text-muted-foreground mt-1.5">{e.note}</p>}
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                          <ActorIcon className="h-3 w-3" />
                          <span>Updated by <span className="font-medium text-foreground">{e.by}</span></span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default OrderHistoryDialog;
