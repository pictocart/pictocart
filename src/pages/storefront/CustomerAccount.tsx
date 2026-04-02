import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, MapPin, LogOut, Plus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#6366f1',
  delivered: '#16a34a',
  cancelled: '#ef4444',
  returned: '#78716c',
};

const CustomerAccount = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const { user, signOut } = useCustomerAuth(slug || '');
  const { data: orders, isLoading: ordersLoading } = useCustomerOrders(user?.id, store?.id);
  const [tab, setTab] = useState<'orders' | 'addresses'>('orders');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: '', address: '', city: '', state: '', pincode: '', phone: '' });

  useEffect(() => {
    if (!user || !store) return;
    supabase
      .from('customers')
      .select('saved_addresses')
      .eq('user_id', user.id)
      .eq('store_id', store.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.saved_addresses) {
          setAddresses(Array.isArray(data.saved_addresses) ? data.saved_addresses : []);
        }
      });
  }, [user, store]);

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store || !user) return null;

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;

  const inputStyle = {
    backgroundColor: colors.card,
    borderColor: colors.secondary,
    borderRadius: `${borderRadius / 2}px`,
    color: colors.text,
  };

  const saveAddress = async () => {
    if (!newAddr.address || !newAddr.city || !newAddr.pincode) {
      toast.error('Fill in required fields');
      return;
    }
    const updated = [...addresses, { ...newAddr, id: Date.now().toString() }];
    const { error } = await supabase
      .from('customers')
      .upsert({ user_id: user.id, store_id: store.id, saved_addresses: updated }, { onConflict: 'user_id,store_id' });
    if (error) {
      toast.error('Failed to save address');
      return;
    }
    setAddresses(updated);
    setNewAddr({ label: '', address: '', city: '', state: '', pincode: '', phone: '' });
    setShowAddForm(false);
    toast.success('Address saved!');
  };

  const removeAddress = async (id: string) => {
    const updated = addresses.filter((a: any) => a.id !== id);
    await supabase
      .from('customers')
      .upsert({ user_id: user.id, store_id: store.id, saved_addresses: updated }, { onConflict: 'user_id,store_id' });
    setAddresses(updated);
    toast.success('Address removed');
  };

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: colors.primary + '20', color: colors.primary }}
            >
              {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: fonts.heading }}>
                {user.user_metadata?.full_name || 'Customer'}
              </h1>
              <p className="text-xs opacity-60">{user.email || user.phone}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ backgroundColor: colors.secondary }}>
          {(['orders', 'addresses'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize flex items-center justify-center gap-2"
              style={{
                backgroundColor: tab === t ? colors.card : 'transparent',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === 'orders' ? <Package className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              {t === 'orders' ? 'My Orders' : 'Saved Addresses'}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : !orders?.length ? (
              <div className="text-center py-12 opacity-50">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No orders yet</p>
                <Link
                  to={`/store/${slug}`}
                  className="inline-block mt-4 text-sm underline"
                  style={{ color: colors.primary }}
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              orders.map((order: any) => (
                <div
                  key={order.id}
                  className="p-4 border space-y-3"
                  style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-semibold">{order.order_number}</span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
                      style={{ backgroundColor: (statusColors[order.status] || '#888') + '20', color: statusColors[order.status] || '#888' }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs opacity-60">
                    <span>{format(new Date(order.created_at), 'dd MMM yyyy')}</span>
                    <span className="font-semibold" style={{ color: colors.primary }}>
                      ₹{Number(order.total).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {order.tracking_number && (
                    <p className="text-xs">Tracking: <span className="font-mono">{order.tracking_number}</span></p>
                  )}
                  <div className="flex gap-2 overflow-x-auto">
                    {(Array.isArray(order.items) ? order.items : []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 shrink-0">
                        {item.image && (
                          <img src={item.image} alt="" className="h-10 w-10 rounded object-cover" />
                        )}
                        <div className="text-xs">
                          <p className="font-medium truncate max-w-[120px]">{item.title}</p>
                          <p className="opacity-50">×{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Addresses Tab */}
        {tab === 'addresses' && (
          <div className="space-y-4">
            {addresses.map((addr: any) => (
              <div
                key={addr.id}
                className="p-4 border flex justify-between"
                style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}
              >
                <div className="text-sm">
                  {addr.label && <p className="font-semibold text-xs uppercase opacity-60 mb-1">{addr.label}</p>}
                  <p>{addr.address}</p>
                  <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                  {addr.phone && <p className="opacity-60 mt-1">{addr.phone}</p>}
                </div>
                <button onClick={() => removeAddress(addr.id)} className="opacity-40 hover:opacity-100 self-start">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {showAddForm ? (
              <div className="p-4 border space-y-3" style={{ borderColor: colors.primary, borderRadius: `${borderRadius}px` }}>
                <input placeholder="Label (Home, Office...)" value={newAddr.label} onChange={(e) => setNewAddr(p => ({...p, label: e.target.value}))} className="w-full px-3 py-2 text-sm border" style={inputStyle} />
                <input placeholder="Address *" value={newAddr.address} onChange={(e) => setNewAddr(p => ({...p, address: e.target.value}))} className="w-full px-3 py-2 text-sm border" style={inputStyle} required />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="City *" value={newAddr.city} onChange={(e) => setNewAddr(p => ({...p, city: e.target.value}))} className="px-3 py-2 text-sm border" style={inputStyle} required />
                  <input placeholder="State" value={newAddr.state} onChange={(e) => setNewAddr(p => ({...p, state: e.target.value}))} className="px-3 py-2 text-sm border" style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Pincode *" value={newAddr.pincode} onChange={(e) => setNewAddr(p => ({...p, pincode: e.target.value}))} className="px-3 py-2 text-sm border" style={inputStyle} required />
                  <input placeholder="Phone" value={newAddr.phone} onChange={(e) => setNewAddr(p => ({...p, phone: e.target.value}))} className="px-3 py-2 text-sm border" style={inputStyle} />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveAddress} className="px-4 py-2 text-sm font-semibold" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: `${borderRadius / 2}px` }}>Save</button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm opacity-60">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-3 text-sm font-medium flex items-center justify-center gap-2 border border-dashed"
                style={{ borderColor: colors.secondary, borderRadius: `${borderRadius}px` }}
              >
                <Plus className="h-4 w-4" /> Add New Address
              </button>
            )}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
};

export default CustomerAccount;
