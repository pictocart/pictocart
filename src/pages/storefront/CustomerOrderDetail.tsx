import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Loader2, ChevronLeft, Truck, MapPin, CreditCard, FileText, Package, Copy, Star, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import OrderTimeline from '@/components/storefront/OrderTimeline';
import OrderActions from '@/components/storefront/OrderActions';

const statusColors: Record<string, string> = {
  pending: '#f59e0b', confirmed: '#3b82f6', processing: '#8b5cf6',
  packed: '#8b5cf6', shipped: '#6366f1', out_for_delivery: '#f97316',
  delivered: '#16a34a', cancelled: '#ef4444', returned: '#78716c',
};

const CustomerOrderDetail = () => {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const { user } = useCustomerAuth(slug || '');
  const [order, setOrder] = useState<any>(null);
  const [returns, setReturns] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const [o, r, rf] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).maybeSingle(),
      supabase.from('returns' as any).select('*').eq('order_id', id).order('created_at'),
      supabase.from('refunds' as any).select('*').eq('order_id', id).order('created_at'),
    ]);
    setOrder(o.data);
    setReturns((r.data as any[]) || []);
    setRefunds((rf.data as any[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const theme = useMemo(() => (store ? resolveTheme(getStoreThemeTokens(store)) : null), [store]);

  if (storeLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!store || !user || !theme) return null;
  if (!order) return (
    <StorefrontLayout store={store}><div className="max-w-3xl mx-auto p-8 text-center text-sm opacity-70">Order not found.</div></StorefrontLayout>
  );

  const { colors, fonts, borderRadius } = theme;
  const br = `${borderRadius}px`, brHalf = `${borderRadius / 2}px`;
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const addr = order.customer_address || {};
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success('Copied'); };

  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="p-5 border" style={{ borderColor: colors.secondary, borderRadius: br }}>
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ fontFamily: fonts.heading }}>
        <Icon className="h-4 w-4" style={{ color: colors.primary }} /> {title}
      </h2>
      {children}
    </div>
  );

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-4">
        <Link to={`/store/${slug}/account`} className="text-xs opacity-60 hover:opacity-100 inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>

        {/* Header */}
        <div className="p-5 md:p-6" style={{ background: `linear-gradient(135deg, ${colors.primary}14, ${colors.primary}04)`, borderRadius: br, border: `1px solid ${colors.secondary}` }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs opacity-50 uppercase tracking-wider">Order</p>
              <h1 className="text-xl md:text-2xl font-bold font-mono">{order.order_number}</h1>
              <p className="text-xs opacity-60 mt-1">Placed on {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ backgroundColor: (statusColors[order.status] || '#888') + '20', color: statusColors[order.status] || '#888' }}>{order.status}</span>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase" style={{ backgroundColor: (order.payment_status === 'paid' ? '#16a34a' : '#f59e0b') + '20', color: order.payment_status === 'paid' ? '#16a34a' : '#f59e0b' }}>{order.payment_status}</span>
            </div>
          </div>
          <div className="mt-4">
            <OrderActions order={order} primaryColor={colors.primary} onChanged={load} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            {/* Products */}
            <Section title="Products" icon={Package}>
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="flex gap-3 items-center p-3 border" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf }}>
                    {it.image && <img src={it.image} alt="" className="h-16 w-16 object-cover rounded-md" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.title}</p>
                      {it.variant && <p className="text-xs opacity-60 mt-0.5">{typeof it.variant === 'string' ? it.variant : Object.values(it.variant).join(' · ')}</p>}
                      <p className="text-xs opacity-50 mt-0.5">Qty: {it.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold whitespace-nowrap">₹{Number((it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Timeline */}
            <Section title="Order Timeline" icon={Truck}>
              <OrderTimeline order={order} returns={returns} primary={colors.primary} />
            </Section>

            {/* Tracking */}
            {(order.tracking_number || order.awb || order.courier || order.courier_provider) && (
              <Section title="Shipment Tracking" icon={Truck}>
                <div className="text-sm space-y-1.5">
                  {(order.courier || order.courier_provider) && <p><span className="opacity-60">Courier:</span> <span className="font-medium">{order.courier || order.courier_provider}</span></p>}
                  {(order.awb || order.tracking_number) && (
                    <p className="flex items-center gap-2"><span className="opacity-60">Tracking:</span>
                      <span className="font-mono">{order.awb || order.tracking_number}</span>
                      <button onClick={() => copy(order.awb || order.tracking_number)} className="opacity-50 hover:opacity-100"><Copy className="h-3 w-3" /></button>
                    </p>
                  )}
                  {order.delivered_at && <p><span className="opacity-60">Delivered:</span> {format(new Date(order.delivered_at), 'dd MMM yyyy')}</p>}
                  <div className="mt-3 h-32 rounded-md flex items-center justify-center bg-muted/40 border border-dashed">
                    <p className="text-xs opacity-50 flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Live map coming soon</p>
                  </div>
                </div>
              </Section>
            )}
          </div>

          <div className="space-y-4">
            {/* Bill */}
            <Section title="Payment Summary" icon={CreditCard}>
              <dl className="text-sm space-y-1.5">
                <div className="flex justify-between"><dt className="opacity-60">Subtotal</dt><dd>₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between"><dt className="opacity-60">Shipping</dt><dd>₹{Number(order.shipping || 0).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between"><dt className="opacity-60">Tax</dt><dd>₹{Number(order.tax || 0).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between font-semibold pt-2 border-t mt-2" style={{ borderColor: colors.secondary }}><dt>Total</dt><dd style={{ color: colors.primary }}>₹{Number(order.total || 0).toLocaleString('en-IN')}</dd></div>
                {Number(order.amount_refunded || 0) > 0 && (
                  <div className="flex justify-between text-xs opacity-70 pt-1"><dt>Refunded</dt><dd>₹{Number(order.amount_refunded).toLocaleString('en-IN')}</dd></div>
                )}
                <p className="text-xs opacity-50 pt-2">Method: {order.payment_method || 'N/A'}</p>
                {order.invoice_number && <p className="text-xs opacity-50">Invoice: {order.invoice_number}</p>}
              </dl>
            </Section>

            {/* Address */}
            <Section title="Shipping Address" icon={MapPin}>
              <div className="text-sm">
                <p className="font-medium">{addr.name || order.customer_name}</p>
                <p className="opacity-70 mt-0.5">{addr.address}{addr.landmark ? `, ${addr.landmark}` : ''}</p>
                <p className="opacity-70">{addr.city}{addr.state ? `, ${addr.state}` : ''}{addr.pincode ? ` — ${addr.pincode}` : ''}</p>
                {addr.phone && <p className="text-xs opacity-50 mt-1">{addr.phone}</p>}
              </div>
            </Section>

            {/* Returns / Refunds */}
            {(returns.length > 0 || refunds.length > 0) && (
              <Section title="Requests & Refunds" icon={FileText}>
                <div className="space-y-2 text-sm">
                  {returns.map((r) => (
                    <Link key={r.id} to={`/store/${slug}/account/returns/${r.id}`} className="block p-2.5 rounded-md border hover:bg-muted/40" style={{ borderColor: colors.secondary + '80' }}>
                      <p className="font-medium capitalize">{r.request_type} · {r.status.replace(/_/g, ' ')}</p>
                      <p className="text-xs opacity-60">₹{Number(r.refund_amount || 0).toLocaleString('en-IN')} · {format(new Date(r.created_at), 'dd MMM')}</p>
                    </Link>
                  ))}
                  {refunds.map((r) => (
                    <div key={r.id} className="p-2.5 rounded-md border" style={{ borderColor: colors.secondary + '80' }}>
                      <p className="font-medium">Refund · {r.status}</p>
                      <p className="text-xs opacity-60">₹{Number(r.amount || 0).toLocaleString('en-IN')} · {r.processor_ref_id || '—'}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Link to={`/store/${slug}/contact`} className="block p-4 border-2 border-dashed text-center hover:bg-muted/30" style={{ borderColor: colors.secondary, borderRadius: br }}>
              <HelpCircle className="h-5 w-5 mx-auto mb-1 opacity-60" />
              <p className="text-sm font-medium">Need help with this order?</p>
              <p className="text-xs opacity-60">Contact support</p>
            </Link>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
};

export default CustomerOrderDetail;
