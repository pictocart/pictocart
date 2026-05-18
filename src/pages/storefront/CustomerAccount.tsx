import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, Package, MapPin, LogOut, Plus, Trash2, User, Edit2, Check, Star, ChevronRight, Heart, Settings, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import RequestReturnButton from '@/components/storefront/RequestReturnButton';

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#6366f1',
  delivered: '#16a34a',
  cancelled: '#ef4444',
  returned: '#78716c',
};

type TabKey = 'profile' | 'orders' | 'addresses';

const CustomerAccount = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const { user, signOut } = useCustomerAuth(slug || '');
  const { data: orders, isLoading: ordersLoading } = useCustomerOrders(user?.id, store?.id);
  const [tab, setTab] = useState<TabKey>('profile');

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Address state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({ label: '', name: '', address: '', landmark: '', city: '', state: '', pincode: '', phone: '', isDefault: false });

  useEffect(() => {
    if (!user) return;
    setProfileName(user.user_metadata?.full_name || '');
    setProfilePhone(user.phone || user.user_metadata?.phone || '');
  }, [user]);

  const customerMeta = user?.user_metadata || {};
  const displayEmail = customerMeta.customer_email || user?.email || '';

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
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!store || !user) return null;
  const displayName = customerMeta.full_name || 'Welcome!';

  const theme = resolveTheme(store.theme);
  const { colors, fonts, borderRadius } = theme;
  const br = `${borderRadius}px`;
  const brHalf = `${borderRadius / 2}px`;

  const inputCls = "w-full px-3 py-2.5 text-sm border outline-none transition-colors focus:ring-2";
  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.card,
    borderColor: colors.secondary,
    borderRadius: brHalf,
    color: colors.text,
  };
  const focusRing = { '--tw-ring-color': colors.primary + '40' } as React.CSSProperties;

  // Profile save
  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: profileName, phone: profilePhone } });
      if (error) throw error;
      setProfileEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Address helpers
  const resetAddrForm = () => {
    setAddrForm({ label: '', name: '', address: '', landmark: '', city: '', state: '', pincode: '', phone: '', isDefault: false });
    setShowAddForm(false);
    setEditingAddrId(null);
  };

  const saveAddresses = async (updated: any[]) => {
    const { error } = await supabase
      .from('customers')
      .upsert({ user_id: user.id, store_id: store.id, saved_addresses: updated }, { onConflict: 'user_id,store_id' });
    if (error) { toast.error('Failed to save'); return false; }
    setAddresses(updated);
    return true;
  };

  const saveAddress = async () => {
    if (!addrForm.name || !addrForm.address || !addrForm.city || !addrForm.pincode || !addrForm.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    let updated: any[];
    if (editingAddrId) {
      updated = addresses.map((a) => a.id === editingAddrId ? { ...addrForm, id: editingAddrId } : a);
    } else {
      updated = [...addresses, { ...addrForm, id: Date.now().toString() }];
    }
    // If setting as default, unset others
    if (addrForm.isDefault) {
      const targetId = editingAddrId || updated[updated.length - 1].id;
      updated = updated.map((a) => ({ ...a, isDefault: a.id === targetId }));
    }
    if (await saveAddresses(updated)) {
      resetAddrForm();
      toast.success(editingAddrId ? 'Address updated!' : 'Address added!');
    }
  };

  const removeAddress = async (id: string) => {
    const updated = addresses.filter((a: any) => a.id !== id);
    if (await saveAddresses(updated)) toast.success('Address removed');
  };

  const setDefault = async (id: string) => {
    const updated = addresses.map((a: any) => ({ ...a, isDefault: a.id === id }));
    if (await saveAddresses(updated)) toast.success('Default address updated');
  };

  const editAddress = (addr: any) => {
    setAddrForm({ label: addr.label || '', name: addr.name || '', address: addr.address || '', landmark: addr.landmark || '', city: addr.city || '', state: addr.state || '', pincode: addr.pincode || '', phone: addr.phone || '', isDefault: addr.isDefault || false });
    setEditingAddrId(addr.id);
    setShowAddForm(true);
  };

  const orderStats = {
    total: orders?.length || 0,
    delivered: orders?.filter((o: any) => o.status === 'delivered').length || 0,
    active: orders?.filter((o: any) => ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)).length || 0,
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'orders', label: 'Orders', icon: Package },
    { key: 'addresses', label: 'Addresses', icon: MapPin },
  ];

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        {/* Profile Hero Card */}
        <div className="p-5 md:p-6 mb-6" style={{ background: `linear-gradient(135deg, ${colors.primary}18, ${colors.primary}08)`, borderRadius: br, border: `1px solid ${colors.secondary}` }}>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0" style={{ backgroundColor: colors.primary + '25', color: colors.primary }}>
              {(displayName || displayEmail || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate" style={{ fontFamily: fonts.heading }}>
                {displayName}
              </h1>
              <p className="text-sm opacity-60 truncate">{displayEmail || user.phone}</p>
              {user.phone && user.email && <p className="text-xs opacity-40 mt-0.5">{user.phone}</p>}
            </div>
            <button onClick={signOut} className="hidden md:flex items-center gap-2 px-4 py-2 text-sm border opacity-70 hover:opacity-100 transition-opacity" style={{ borderColor: colors.secondary, borderRadius: brHalf }}>
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Total Orders', value: orderStats.total, color: colors.primary },
              { label: 'Active', value: orderStats.active, color: '#6366f1' },
              { label: 'Delivered', value: orderStats.delivered, color: '#16a34a' },
            ].map((s) => (
              <div key={s.label} className="text-center p-3" style={{ backgroundColor: colors.card, borderRadius: brHalf }}>
                <p className="text-xl md:text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] md:text-xs opacity-50 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 mb-6 overflow-x-auto" style={{ backgroundColor: colors.secondary, borderRadius: brHalf }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap px-3"
                style={{
                  backgroundColor: tab === t.key ? colors.card : 'transparent',
                  fontWeight: tab === t.key ? 600 : 400,
                  borderRadius: `${Math.max(borderRadius / 2 - 2, 4)}px`,
                  boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ─── PROFILE TAB ─── */}
        {tab === 'profile' && (
          <div className="space-y-4">
            {/* Wishlist Quick Link */}
            <Link
              to={`/store/${slug}/account/wishlist`}
              className="flex items-center gap-3 p-4 border transition-colors hover:shadow-sm"
              style={{ borderColor: colors.secondary, borderRadius: br }}
            >
              <Heart className="h-5 w-5" style={{ color: '#ef4444', fill: '#ef4444' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold">My Wishlist</p>
                <p className="text-xs opacity-50">View your saved products</p>
              </div>
              <ChevronRight className="h-4 w-4 opacity-40" />
            </Link>
            <div className="p-5 border space-y-4" style={{ borderColor: colors.secondary, borderRadius: br }}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: fonts.heading }}>
                  <Shield className="h-4 w-4" style={{ color: colors.primary }} /> Personal Information
                </h2>
                {!profileEditing ? (
                  <button onClick={() => setProfileEditing(true)} className="text-xs flex items-center gap-1 px-3 py-1.5 border transition-colors hover:bg-black/5" style={{ borderColor: colors.secondary, borderRadius: brHalf, color: colors.primary }}>
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                ) : (
                  <button
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 font-semibold transition-colors"
                    style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: brHalf, opacity: profileSaving ? 0.6 : 1 }}
                  >
                    {profileSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium opacity-60 mb-1.5 block">Full Name</label>
                  {profileEditing ? (
                    <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="Your full name" />
                  ) : (
                    <p className="text-sm py-2.5 px-3 border" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf, backgroundColor: colors.secondary + '30' }}>
                      {profileName || <span className="opacity-40">Not set</span>}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium opacity-60 mb-1.5 block">Email</label>
                  <p className="text-sm py-2.5 px-3 border flex items-center gap-2" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf, backgroundColor: colors.secondary + '30' }}>
                    {displayEmail || <span className="opacity-40">Not set</span>}
                    {displayEmail && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#16a34a20', color: '#16a34a' }}>Verified</span>}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium opacity-60 mb-1.5 block">Phone Number</label>
                  {profileEditing ? (
                    <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="+91 9876543210" />
                  ) : (
                    <p className="text-sm py-2.5 px-3 border" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf, backgroundColor: colors.secondary + '30' }}>
                      {profilePhone || <span className="opacity-40">Not set</span>}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium opacity-60 mb-1.5 block">Member Since</label>
                  <p className="text-sm py-2.5 px-3 border" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf, backgroundColor: colors.secondary + '30' }}>
                    {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile sign out */}
            <button onClick={signOut} className="w-full md:hidden flex items-center justify-center gap-2 py-3 text-sm border opacity-70 hover:opacity-100" style={{ borderColor: colors.secondary, borderRadius: brHalf }}>
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        )}

        {/* ─── ORDERS TAB ─── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : !orders?.length ? (
              <div className="text-center py-16 border" style={{ borderColor: colors.secondary, borderRadius: br }}>
                <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm opacity-50 mb-1">No orders yet</p>
                <p className="text-xs opacity-30 mb-4">Your order history will appear here</p>
                <Link to={`/store/${slug}`} className="inline-block px-5 py-2 text-sm font-semibold" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: brHalf }}>
                  Start Shopping
                </Link>
              </div>
            ) : (
              orders.map((order: any) => (
                <div key={order.id} className="p-4 border hover:shadow-sm transition-shadow" style={{ borderColor: colors.secondary, borderRadius: br }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-mono font-semibold">{order.order_number}</span>
                      <span className="text-xs opacity-40 ml-2">{format(new Date(order.created_at), 'dd MMM yyyy')}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ backgroundColor: (statusColors[order.status] || '#888') + '18', color: statusColors[order.status] || '#888' }}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {(Array.isArray(order.items) ? order.items : []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 shrink-0 p-2 border" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf }}>
                        {item.image && <img src={item.image} alt="" className="h-12 w-12 rounded object-cover" />}
                        <div className="text-xs">
                          <p className="font-medium truncate max-w-[140px]">{item.title}</p>
                          <p className="opacity-40 mt-0.5">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: colors.secondary + '50' }}>
                    <span className="text-sm font-bold" style={{ color: colors.primary }}>₹{Number(order.total).toLocaleString('en-IN')}</span>
                    <div className="flex items-center gap-3">
                      {order.tracking_number && <span className="text-xs opacity-50">Tracking: <span className="font-mono">{order.tracking_number}</span></span>}
                      <RequestReturnButton order={order} primaryColor={colors.primary} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── ADDRESSES TAB ─── */}
        {tab === 'addresses' && (
          <div className="space-y-4">
            {/* Default address highlight */}
            {addresses.find((a: any) => a.isDefault) && !showAddForm && (
              <div className="p-4 border-2" style={{ borderColor: colors.primary + '60', borderRadius: br, background: `linear-gradient(135deg, ${colors.primary}08, ${colors.primary}04)` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>Default</span>
                  <span className="text-xs font-medium opacity-70">{addresses.find((a: any) => a.isDefault)?.label || 'Primary Address'}</span>
                </div>
                {(() => {
                  const a = addresses.find((a: any) => a.isDefault);
                  return (
                    <div className="text-sm">
                      <p className="font-medium">{a.name}</p>
                      <p className="opacity-70 mt-0.5">{a.address}{a.landmark ? `, ${a.landmark}` : ''}</p>
                      <p className="opacity-70">{a.city}, {a.state} — {a.pincode}</p>
                      <p className="opacity-50 mt-1 text-xs">{a.phone}</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* All addresses */}
            {addresses.map((addr: any) => (
              <div key={addr.id} className="p-4 border group hover:shadow-sm transition-shadow" style={{ borderColor: addr.isDefault ? colors.primary + '30' : colors.secondary, borderRadius: br }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {addr.label && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: colors.secondary, color: colors.text + 'aa' }}>{addr.label}</span>}
                      {addr.isDefault && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>Default</span>}
                    </div>
                    <p className="text-sm font-medium">{addr.name}</p>
                    <p className="text-sm opacity-70 mt-0.5">{addr.address}{addr.landmark ? `, ${addr.landmark}` : ''}</p>
                    <p className="text-sm opacity-70">{addr.city}, {addr.state} — {addr.pincode}</p>
                    {addr.phone && <p className="text-xs opacity-40 mt-1.5">{addr.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.isDefault && (
                      <button onClick={() => setDefault(addr.id)} className="text-[10px] px-2 py-1 border opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity" style={{ borderColor: colors.secondary, borderRadius: brHalf }}>
                        Set Default
                      </button>
                    )}
                    <button onClick={() => editAddress(addr)} className="p-1.5 opacity-40 hover:opacity-100 transition-opacity">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeAddress(addr.id)} className="p-1.5 opacity-40 hover:opacity-100 transition-opacity text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add / Edit form */}
            {showAddForm ? (
              <div className="p-5 border-2 space-y-4" style={{ borderColor: colors.primary + '50', borderRadius: br }}>
                <h3 className="text-sm font-semibold" style={{ fontFamily: fonts.heading }}>
                  {editingAddrId ? 'Edit Address' : 'Add New Address'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium opacity-60 mb-1 block">Label</label>
                    <div className="flex gap-2 flex-wrap">
                      {['Home', 'Office', 'Other'].map((l) => (
                        <button key={l} onClick={() => setAddrForm((p) => ({ ...p, label: l }))} className="text-xs px-3 py-1.5 border transition-colors" style={{ borderColor: addrForm.label === l ? colors.primary : colors.secondary, borderRadius: brHalf, backgroundColor: addrForm.label === l ? colors.primary + '15' : 'transparent', color: addrForm.label === l ? colors.primary : undefined }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium opacity-60 mb-1 block">Full Name *</label>
                    <input value={addrForm.name} onChange={(e) => setAddrForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="Recipient name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium opacity-60 mb-1 block">Address *</label>
                  <input value={addrForm.address} onChange={(e) => setAddrForm((p) => ({ ...p, address: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="House no, Building, Street" />
                </div>
                <div>
                  <label className="text-xs font-medium opacity-60 mb-1 block">Landmark</label>
                  <input value={addrForm.landmark} onChange={(e) => setAddrForm((p) => ({ ...p, landmark: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="Near, Opposite..." />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium opacity-60 mb-1 block">City *</label>
                    <input value={addrForm.city} onChange={(e) => setAddrForm((p) => ({ ...p, city: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium opacity-60 mb-1 block">State</label>
                    <input value={addrForm.state} onChange={(e) => setAddrForm((p) => ({ ...p, state: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium opacity-60 mb-1 block">Pincode *</label>
                    <input value={addrForm.pincode} onChange={(e) => setAddrForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} maxLength={6} inputMode="numeric" />
                  </div>
                  <div>
                    <label className="text-xs font-medium opacity-60 mb-1 block">Phone *</label>
                    <input value={addrForm.phone} onChange={(e) => setAddrForm((p) => ({ ...p, phone: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="+91..." inputMode="tel" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm((p) => ({ ...p, isDefault: e.target.checked }))} className="h-4 w-4 accent-current" style={{ accentColor: colors.primary }} />
                  <span className="text-sm">Set as default address</span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveAddress} className="px-5 py-2.5 text-sm font-semibold" style={{ backgroundColor: colors.primary, color: '#fff', borderRadius: brHalf }}>
                    {editingAddrId ? 'Update Address' : 'Save Address'}
                  </button>
                  <button onClick={resetAddrForm} className="px-5 py-2.5 text-sm opacity-60 hover:opacity-100 border" style={{ borderColor: colors.secondary, borderRadius: brHalf }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddForm(true)} className="w-full py-4 text-sm font-medium flex items-center justify-center gap-2 border-2 border-dashed transition-colors hover:border-solid" style={{ borderColor: colors.secondary, borderRadius: br }}>
                <Plus className="h-4 w-4" style={{ color: colors.primary }} />
                <span style={{ color: colors.primary }}>Add New Address</span>
              </button>
            )}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
};

export default CustomerAccount;
