import { Link, useParams } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { useCustomerReturn } from '@/hooks/useCustomerReturns';
import { Loader2, ChevronLeft, Undo2, Repeat2, IndianRupee, ClipboardCheck, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import OrderTimeline from '@/components/storefront/OrderTimeline';

const statusColor: Record<string, string> = {
  requested: '#f59e0b', approved: '#0ea5e9', rejected: '#ef4444',
  pickup_scheduled: '#8b5cf6', picked_up: '#6366f1',
  qc_passed: '#16a34a', qc_failed: '#ef4444', received: '#16a34a',
  refund_initiated: '#0ea5e9', refund_completed: '#16a34a', refunded: '#16a34a',
  replacement_shipped: '#6366f1', replacement_delivered: '#16a34a',
  cancelled: '#78716c',
};

const CustomerReturnDetail = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const { data: ret, isLoading } = useCustomerReturn(id);

  if (storeLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!store) return null;
  const theme = resolveTheme(getStoreThemeTokens(store));
  const { colors, fonts, borderRadius } = theme;
  const br = `${borderRadius}px`, brHalf = `${borderRadius / 2}px`;

  if (!ret) return (
    <StorefrontLayout store={store}><div className="max-w-3xl mx-auto p-8 text-center text-sm opacity-70">Request not found.</div></StorefrontLayout>
  );

  const isExch = ret.request_type === 'exchange';
  const Icon = isExch ? Repeat2 : Undo2;
  const items = Array.isArray(ret.items) ? ret.items : [];
  const photos = Array.isArray(ret.customer_photos) ? ret.customer_photos : [];

  const Section = ({ title, children }: any) => (
    <div className="p-5 border" style={{ borderColor: colors.secondary, borderRadius: br }}>
      <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: fonts.heading }}>{title}</h2>
      {children}
    </div>
  );

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-4">
        <Link to={`/store/${slug}/account`} className="text-xs opacity-60 hover:opacity-100 inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="p-5 md:p-6" style={{ background: `linear-gradient(135deg, ${colors.primary}14, ${colors.primary}04)`, borderRadius: br, border: `1px solid ${colors.secondary}` }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs opacity-50 uppercase tracking-wider flex items-center gap-1"><Icon className="h-3 w-3" /> {isExch ? 'Exchange' : 'Return'}</p>
              <h1 className="text-xl md:text-2xl font-bold font-mono">#{ret.id.slice(0, 8).toUpperCase()}</h1>
              <p className="text-xs opacity-60 mt-1">Requested {format(new Date(ret.created_at), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase" style={{ backgroundColor: (statusColor[ret.status] || '#888') + '20', color: statusColor[ret.status] || '#888' }}>
              {ret.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <Section title="Items">
              {items.map((it: any, i: number) => (
                <div key={i} className="flex gap-3 items-center p-3 border mb-2 last:mb-0" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf }}>
                  {it.image && <img src={it.image} alt="" className="h-14 w-14 object-cover rounded-md" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.title}</p>
                    <p className="text-xs opacity-60">Qty: {it.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">₹{Number((it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </Section>

            <Section title="Timeline & History">
              <OrderTimeline order={{ created_at: ret.created_at, status: null, payment_status: null }} returns={[ret]} primary={colors.primary} />
            </Section>

            {photos.length > 0 && (
              <Section title="Customer Photos">
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((u: string, i: number) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="block aspect-square rounded-md overflow-hidden border">
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {ret.customer_notes && (
              <Section title="Your Note">
                <p className="text-sm whitespace-pre-wrap opacity-80">{ret.customer_notes}</p>
              </Section>
            )}
          </div>

          <div className="space-y-4">
            <Section title={isExch ? 'Exchange Details' : 'Refund Details'}>
              <dl className="text-sm space-y-1.5">
                <div className="flex justify-between"><dt className="opacity-60">Reason</dt><dd className="font-medium">{ret.reason}</dd></div>
                {!isExch && (
                  <>
                    <div className="flex justify-between"><dt className="opacity-60">Amount</dt><dd className="font-semibold" style={{ color: colors.primary }}><IndianRupee className="inline h-3 w-3" />{Number(ret.refund_amount || 0).toLocaleString('en-IN')}</dd></div>
                    <div className="flex justify-between"><dt className="opacity-60">Refund status</dt><dd>{ret.refund_status || 'Pending'}</dd></div>
                    {ret.refund_completed_at && <div className="flex justify-between"><dt className="opacity-60">Completed</dt><dd>{format(new Date(ret.refund_completed_at), 'dd MMM')}</dd></div>}
                  </>
                )}
                {isExch && ret.exchange_details && (
                  <>
                    {ret.exchange_details.preferred_size && <div className="flex justify-between"><dt className="opacity-60">Size</dt><dd>{ret.exchange_details.preferred_size}</dd></div>}
                    {ret.exchange_details.preferred_color && <div className="flex justify-between"><dt className="opacity-60">Colour</dt><dd>{ret.exchange_details.preferred_color}</dd></div>}
                  </>
                )}
              </dl>
            </Section>

            {(ret.pickup_scheduled_at || ret.pickup_courier || ret.pickup_awb) && (
              <Section title="Pickup">
                <dl className="text-sm space-y-1.5">
                  {ret.pickup_courier && <div className="flex justify-between"><dt className="opacity-60">Courier</dt><dd>{ret.pickup_courier}</dd></div>}
                  {ret.pickup_awb && <div className="flex justify-between"><dt className="opacity-60">AWB</dt><dd className="font-mono">{ret.pickup_awb}</dd></div>}
                  {ret.pickup_scheduled_at && <div className="flex justify-between"><dt className="opacity-60">Scheduled</dt><dd>{format(new Date(ret.pickup_scheduled_at), 'dd MMM')}</dd></div>}
                  {ret.picked_up_at && <div className="flex justify-between"><dt className="opacity-60">Picked up</dt><dd>{format(new Date(ret.picked_up_at), 'dd MMM')}</dd></div>}
                </dl>
              </Section>
            )}

            {ret.qc_status && (
              <Section title="Quality Check">
                <p className="text-sm flex items-center gap-2"><ClipboardCheck className="h-4 w-4" style={{ color: colors.primary }} /> <span className="font-medium capitalize">{ret.qc_status}</span></p>
                {ret.qc_notes && <p className="text-xs opacity-70 mt-2">{ret.qc_notes}</p>}
              </Section>
            )}

            <Link to={`/store/${slug}/contact`} className="block p-4 border-2 border-dashed text-center hover:bg-muted/30" style={{ borderColor: colors.secondary, borderRadius: br }}>
              <MessageCircle className="h-5 w-5 mx-auto mb-1 opacity-60" />
              <p className="text-sm font-medium">Contact Support</p>
            </Link>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default CustomerReturnDetail;
