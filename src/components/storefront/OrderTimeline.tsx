import { format } from 'date-fns';
import {
  Package, CreditCard, CheckCircle2, Box, Truck, MapPin, PackageCheck,
  Undo2, ThumbsUp, ThumbsDown, Calendar, ClipboardCheck, IndianRupee,
  Repeat2, XCircle, Clock,
} from 'lucide-react';

interface Props {
  order: any;
  returns?: any[];
  refunds?: any[];
  primary?: string;
}

const EVENT_META: Record<string, { icon: any; color: string; label: string }> = {
  order_placed: { icon: Package, color: '#6366f1', label: 'Order Placed' },
  payment_paid: { icon: CreditCard, color: '#16a34a', label: 'Payment Successful' },
  payment_pending: { icon: CreditCard, color: '#f59e0b', label: 'Payment Pending' },
  confirmed: { icon: CheckCircle2, color: '#0ea5e9', label: 'Order Confirmed' },
  packed: { icon: Box, color: '#8b5cf6', label: 'Packed' },
  shipped: { icon: Truck, color: '#6366f1', label: 'Shipped' },
  out_for_delivery: { icon: MapPin, color: '#f97316', label: 'Out for Delivery' },
  delivered: { icon: PackageCheck, color: '#16a34a', label: 'Delivered' },
  cancelled: { icon: XCircle, color: '#ef4444', label: 'Cancelled' },
  return_requested: { icon: Undo2, color: '#f59e0b', label: 'Return Requested' },
  return_approved: { icon: ThumbsUp, color: '#0ea5e9', label: 'Return Approved' },
  return_rejected: { icon: ThumbsDown, color: '#ef4444', label: 'Return Rejected' },
  pickup_scheduled: { icon: Calendar, color: '#8b5cf6', label: 'Pickup Scheduled' },
  picked_up: { icon: Truck, color: '#6366f1', label: 'Pickup Completed' },
  qc_passed: { icon: ClipboardCheck, color: '#16a34a', label: 'QC Passed' },
  qc_failed: { icon: ClipboardCheck, color: '#ef4444', label: 'QC Failed' },
  refund_initiated: { icon: IndianRupee, color: '#0ea5e9', label: 'Refund Initiated' },
  refund_completed: { icon: IndianRupee, color: '#16a34a', label: 'Refund Completed' },
  exchange_requested: { icon: Repeat2, color: '#f59e0b', label: 'Exchange Requested' },
  exchange_approved: { icon: Repeat2, color: '#0ea5e9', label: 'Exchange Approved' },
  replacement_packed: { icon: Box, color: '#8b5cf6', label: 'Replacement Packed' },
  replacement_shipped: { icon: Truck, color: '#6366f1', label: 'Replacement Shipped' },
  replacement_delivered: { icon: PackageCheck, color: '#16a34a', label: 'Replacement Delivered' },
};

interface Evt { key: string; at: string; note?: string }

export function buildOrderTimeline(order: any, returns: any[] = []): Evt[] {
  const events: Evt[] = [];
  if (order.created_at) events.push({ key: 'order_placed', at: order.created_at });
  if (order.payment_status === 'paid') events.push({ key: 'payment_paid', at: order.updated_at || order.created_at });
  else if (order.payment_status === 'pending') events.push({ key: 'payment_pending', at: order.created_at });

  const statusFlow: Array<[string, string]> = [
    ['confirmed', 'confirmed'], ['processing', 'confirmed'],
    ['packed', 'packed'], ['shipped', 'shipped'],
    ['out_for_delivery', 'out_for_delivery'], ['delivered', 'delivered'],
    ['cancelled', 'cancelled'],
  ];
  for (const [s, key] of statusFlow) {
    if (order.status === s) {
      events.push({ key, at: order.delivered_at || order.updated_at || order.created_at });
      break;
    }
  }

  for (const r of returns) {
    const isExch = r.request_type === 'exchange';
    events.push({ key: isExch ? 'exchange_requested' : 'return_requested', at: r.created_at, note: r.reason });
    (r.timeline || []).forEach((t: any) => {
      const map: Record<string, string> = {
        approved: isExch ? 'exchange_approved' : 'return_approved',
        rejected: 'return_rejected',
        pickup_scheduled: 'pickup_scheduled',
        picked_up: 'picked_up',
        qc_passed: 'qc_passed',
        qc_failed: 'qc_failed',
        refund_initiated: 'refund_initiated',
        refund_completed: 'refund_completed',
        replacement_packed: 'replacement_packed',
        replacement_shipped: 'replacement_shipped',
        replacement_delivered: 'replacement_delivered',
      };
      const k = map[t.status] || t.status;
      if (EVENT_META[k]) events.push({ key: k, at: t.at || r.updated_at, note: t.note });
    });
  }
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

const OrderTimeline = ({ order, returns = [], primary = '#6366f1' }: Props) => {
  const events = buildOrderTimeline(order, returns);
  if (!events.length) {
    return <p className="text-sm opacity-50 text-center py-8">No timeline events yet.</p>;
  }
  return (
    <ol className="relative border-l-2 pl-6 space-y-5" style={{ borderColor: primary + '30' }}>
      {events.map((e, i) => {
        const meta = EVENT_META[e.key] || { icon: Clock, color: '#64748b', label: e.key };
        const Icon = meta.icon;
        const isLast = i === events.length - 1;
        return (
          <li key={i} className="relative">
            <span
              className="absolute -left-[35px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background"
              style={{ backgroundColor: meta.color + '20', color: meta.color }}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold" style={{ color: isLast ? meta.color : undefined }}>{meta.label}</p>
              <p className="text-xs opacity-50">{format(new Date(e.at), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
            {e.note && <p className="text-xs opacity-70 mt-0.5">{e.note}</p>}
          </li>
        );
      })}
    </ol>
  );
};

export default OrderTimeline;
