import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Undo2, Repeat2, Truck, ExternalLink, MapPin, Clock } from 'lucide-react';
import { RETURN_STATUSES } from '@/hooks/useReturns';
import { cn } from '@/lib/utils';

interface Props {
  orderId: string;
  courier?: string | null;
  awb?: string | null;
  trackingNumber?: string | null;
  deliveredAt?: string | null;
  shippingLabelUrl?: string | null;
  podUrl?: string | null;
  deliveryAttempts?: number | null;
}

const OrderRelatedCards = ({ orderId, courier, awb, trackingNumber, deliveredAt, shippingLabelUrl, podUrl, deliveryAttempts }: Props) => {
  const { data: returns = [] } = useQuery({
    queryKey: ['order-returns', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns' as any)
        .select('id, status, reason, refund_amount, refund_status, request_type, exchange_details, replacement_awb, replacement_courier, replacement_delivered_at, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const returnReq = returns.find((r) => r.request_type === 'return');
  const exchangeReq = returns.find((r) => r.request_type === 'exchange');
  const track = awb || trackingNumber;

  return (
    <>
      {returnReq && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Undo2 className="h-4 w-4" /> Return Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Return status" value={<StatusPill status={returnReq.status} />} />
            <Row label="Refund status" value={<RefundBadge s={returnReq.refund_status} />} />
            <Row label="Reason" value={<span className="text-right max-w-[60%]">{returnReq.reason}</span>} />
            <Row label="Refund amount" value={<span className="font-semibold">₹{Number(returnReq.refund_amount).toLocaleString('en-IN')}</span>} />
            <Row label="Requested" value={<span>{format(new Date(returnReq.created_at), 'dd MMM yyyy')}</span>} />
            <Button variant="outline" size="sm" asChild className="w-full mt-2">
              <Link to="/returns">View Return Details</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {exchangeReq && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Repeat2 className="h-4 w-4" /> Exchange Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Exchange status" value={<StatusPill status={exchangeReq.status} />} />
            <Row label="Wants" value={
              <span className="text-right">
                {exchangeReq.exchange_details?.preferred_size && <>Size <strong>{exchangeReq.exchange_details.preferred_size}</strong></>}
                {exchangeReq.exchange_details?.preferred_color && <> · Colour <strong>{exchangeReq.exchange_details.preferred_color}</strong></>}
                {!exchangeReq.exchange_details?.preferred_size && !exchangeReq.exchange_details?.preferred_color && '—'}
              </span>
            } />
            {exchangeReq.replacement_awb && (
              <Row label="Replacement AWB" value={<span className="font-mono text-xs">{exchangeReq.replacement_awb}</span>} />
            )}
            {exchangeReq.replacement_delivered_at && (
              <Row label="Delivered" value={<span>{format(new Date(exchangeReq.replacement_delivered_at), 'dd MMM yyyy')}</span>} />
            )}
            <Button variant="outline" size="sm" asChild className="w-full mt-2">
              <Link to="/exchanges">View Exchange Details</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {track && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" /> Shipment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Courier" value={<span>{courier ?? 'Shiprocket'}</span>} />
            <Row label="Tracking / AWB" value={<span className="font-mono text-xs">{track}</span>} />
            {typeof deliveryAttempts === 'number' && deliveryAttempts > 0 && (
              <Row label="Delivery attempts" value={<span>{deliveryAttempts}</span>} />
            )}
            {deliveredAt && (
              <Row label="Delivered on" value={<span>{format(new Date(deliveredAt), 'dd MMM yyyy')}</span>} />
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link to="/shipments"><MapPin className="h-3.5 w-3.5 mr-1" /> Track Shipment</Link>
              </Button>
              {shippingLabelUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={shippingLabelUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-muted-foreground">{label}</span>
    {value}
  </div>
);

const StatusPill = ({ status }: { status: string }) => {
  const meta = RETURN_STATUSES.find((s) => s.value === status);
  return <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', meta?.color ?? 'bg-gray-100 text-gray-800 border-gray-200')}>{meta?.label ?? status}</span>;
};

const RefundBadge = ({ s }: { s: string | null | undefined }) => {
  if (!s) return <span className="text-muted-foreground text-xs">Not started</span>;
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', map[s] ?? 'bg-gray-100 text-gray-800')}>{s}</span>;
};

export default OrderRelatedCards;
