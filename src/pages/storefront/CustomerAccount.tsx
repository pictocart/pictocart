import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import StorefrontLayout, { resolveTheme } from '@/components/storefront/StorefrontLayout';
import { getStoreThemeTokens } from '@/lib/storefrontManifest';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { useCustomerReturns } from '@/hooks/useCustomerReturns';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, Package, MapPin, LogOut, Plus, Trash2, User, Edit2, Check, ChevronRight, Heart, Shield,
  Search, Undo2, MessageCircle, UserCheck, ShieldCheck, Mail, Phone, Calendar, Lock, Clock, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import OrderActions from '@/components/storefront/OrderActions';

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  packed: '#8b5cf6',
  shipped: '#6366f1',
  out_for_delivery: '#f97316',
  delivered: '#16a34a',
  cancelled: '#ef4444',
  returned: '#78716c',
  refunded: '#16a34a',
  exchanged: '#0ea5e9',
};

type TabKey = 'profile' | 'orders' | 'returns' | 'support' | 'addresses';

const ORDER_FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'pending', label: 'Pending', match: (s) => ['pending','confirmed','processing','packed'].includes(s) },
  { key: 'shipped', label: 'Shipped', match: (s) => ['shipped','out_for_delivery'].includes(s) },
  { key: 'delivered', label: 'Delivered', match: (s) => s === 'delivered' },
  { key: 'cancelled', label: 'Cancelled', match: (s) => s === 'cancelled' },
  { key: 'returned', label: 'Returned', match: (s) => s === 'returned' },
];

const CustomerAccount = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, loading: storeLoading } = useStorefront(slug || '');
  const { user, signOut } = useCustomerAuth(slug || '');
  const { data: orders, isLoading: ordersLoading } = useCustomerOrders(user?.id, store?.id);
  const [tab, setTab] = useState<TabKey>('profile');
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const f = ORDER_FILTERS.find((x) => x.key === orderFilter) || ORDER_FILTERS[0];
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o: any) => {
      if (!f.match(o.status || '')) return false;
      if (!q) return true;
      if (o.order_number?.toLowerCase().includes(q)) return true;
      const items = Array.isArray(o.items) ? o.items : [];
      return items.some((it: any) => (it.title || '').toLowerCase().includes(q));
    });
  }, [orders, orderFilter, orderSearch]);

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Address state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({ label: '', name: '', address: '', landmark: '', city: '', state: '', pincode: '', phone: '', isDefault: false });

  // Contact message history state
  const [msgHistory, setMsgHistory] = useState<any[]>([]);
  const [msgHistoryLoading, setMsgHistoryLoading] = useState(false);
  const [msgExpandedId, setMsgExpandedId] = useState<string | null>(null);

  const fetchMsgHistory = useCallback(async () => {
    if (!user?.id || !store?.id) return;
    setMsgHistoryLoading(true);
    try {
      const userEmail = (user.email || user.user_metadata?.customer_email || '').toLowerCase();

      const [byId, byEmail] = await Promise.all([
        (supabase as any)
          .from('contact_messages')
          .select('id, subject, message, status, created_at')
          .eq('customer_user_id', user.id)
          .eq('store_id', store.id),
        userEmail
          ? (supabase as any)
              .from('contact_messages')
              .select('id, subject, message, status, created_at, customer_user_id')
              .eq('email', userEmail)
              .eq('store_id', store.id)
          : Promise.resolve({ data: [] }),
      ]);

      const merged = [...(byId.data || []), ...(byEmail.data || [])];
      const seen = new Set<string>();
      const unique = merged.filter((m: any) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      unique.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMsgHistory(unique);

      // Backfill customer_user_id on old unlinked messages
      const toBackfill = (byEmail.data || []).filter((m: any) => !m.customer_user_id).map((m: any) => m.id);
      if (toBackfill.length > 0) {
        await (supabase as any)
          .from('contact_messages')
          .update({ customer_user_id: user.id })
          .in('id', toBackfill);
      }
    } finally {
      setMsgHistoryLoading(false);
    }
  }, [user?.id, store?.id]);

  useEffect(() => {
    if (tab === 'support') fetchMsgHistory();
  }, [tab, fetchMsgHistory]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.user_metadata?.full_name || '');
    setProfilePhone(user.phone || user.user_metadata?.phone || '');
  }, [user]);

  const customerMeta = user?.user_metadata || {};
  const displayEmail = customerMeta.customer_email || user?.email || '';

  // Load addresses & wishlist count
  useEffect(() => {
    if (!user || !store) return;
    
    // Addresses
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

    // Wishlist Count
    supabase
      .from('customer_wishlists' as any)
      .select('product_id')
      .eq('customer_user_id', user.id)
      .eq('store_id', store.id)
      .then(({ data }) => {
        if (data) setWishlistCount(data.length);
      });
  }, [user, store]);

  if (storeLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!store || !user) return null;
  const displayName = customerMeta.full_name || 'Welcome!';

  const theme = resolveTheme(getStoreThemeTokens(store));
  const { colors, fonts, borderRadius } = theme;
  const br = `${borderRadius}px`;
  const brHalf = `${borderRadius / 2}px`;

  const inputCls = "w-full px-3 py-2.5 text-sm border outline-none transition-all focus:ring-2 focus:ring-offset-1";
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
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Password update handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPasswordUpdating(false);
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
    if (error) { toast.error('Failed to save addresses'); return false; }
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
    { key: 'profile', label: 'My Profile', icon: User },
    { key: 'orders', label: 'Order History', icon: Package },
    { key: 'returns', label: 'Returns & Refunds', icon: Undo2 },
    { key: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { key: 'support', label: 'Customer Support', icon: MessageCircle },
  ];

  return (
    <StorefrontLayout store={store}>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          
          {/* LEFT SIDEBAR: Profile summary card & Tab Menu */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Sidebar Card */}
            <div 
              className="p-6 text-center border relative overflow-hidden transition-shadow hover:shadow-md" 
              style={{ 
                backgroundColor: colors.card, 
                borderColor: colors.secondary, 
                borderRadius: br 
              }}
            >
              {/* Subtle background decoration */}
              <div 
                className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-10 pointer-events-none"
                style={{ backgroundColor: colors.primary }}
              />
              
              <div className="relative inline-block mb-3">
                <div 
                  className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto border-4" 
                  style={{ 
                    backgroundColor: colors.primary + '12', 
                    color: colors.primary,
                    borderColor: colors.primary + '30'
                  }}
                >
                  {(displayName || displayEmail || 'U')[0].toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-full border-2 border-white text-white">
                  <ShieldCheck className="h-3 w-3" />
                </span>
              </div>
              
              <h2 className="text-lg font-bold truncate leading-snug" style={{ fontFamily: fonts.heading }}>
                {displayName}
              </h2>
              <p className="text-xs opacity-60 truncate mb-4">{displayEmail || user.phone}</p>
              
              <div className="border-t pt-4 my-2 grid grid-cols-3 gap-2" style={{ borderColor: colors.secondary + '60' }}>
                <div className="text-center">
                  <p className="text-sm font-bold" style={{ color: colors.primary }}>{orderStats.total}</p>
                  <p className="text-[10px] opacity-50 uppercase font-medium">Orders</p>
                </div>
                <div className="text-center border-x" style={{ borderColor: colors.secondary + '60' }}>
                  <p className="text-sm font-bold text-amber-500">{orderStats.active}</p>
                  <p className="text-[10px] opacity-50 uppercase font-medium">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-emerald-600">{wishlistCount}</p>
                  <p className="text-[10px] opacity-50 uppercase font-medium">Wishlist</p>
                </div>
              </div>

              <button 
                onClick={signOut} 
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs font-semibold border transition-all hover:bg-red-500/5 hover:text-red-500" 
                style={{ borderColor: colors.secondary, borderRadius: brHalf }}
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>

            {/* Navigation Menu Links */}
            <div 
              className="p-2 border" 
              style={{ 
                backgroundColor: colors.card, 
                borderColor: colors.secondary, 
                borderRadius: br 
              }}
            >
              <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const isActive = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="py-2.5 px-4 text-xs font-semibold flex items-center gap-3 rounded-lg transition-all shrink-0 md:shrink w-full text-left"
                      style={{
                        backgroundColor: isActive ? colors.primary + '12' : 'transparent',
                        color: isActive ? colors.primary : colors.text + 'c0',
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? colors.primary : undefined }} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT VIEW PANEL: Renders the active tab details */}
          <div className="md:col-span-3">
            <div 
              className="p-6 md:p-8 border shadow-sm"
              style={{ 
                backgroundColor: colors.card, 
                borderColor: colors.secondary, 
                borderRadius: br 
              }}
            >
              
              {/* ─── PROFILE TAB ─── */}
              {tab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: colors.secondary }}>
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: fonts.heading }}>
                      <User className="h-5 w-5" style={{ color: colors.primary }} /> Personal Information
                    </h2>
                    {!profileEditing ? (
                      <button 
                        onClick={() => setProfileEditing(true)} 
                        className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 border transition-all hover:bg-black/5" 
                        style={{ borderColor: colors.secondary, borderRadius: brHalf, color: colors.primary }}
                      >
                        <Edit2 className="h-3 w-3" /> Edit Profile
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={saveProfile}
                          disabled={profileSaving}
                          className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: colors.primary, borderRadius: brHalf }}
                        >
                          {profileSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                        </button>
                        <button 
                          onClick={() => setProfileEditing(false)}
                          className="text-xs font-medium px-3 py-1.5 border hover:bg-black/5"
                          style={{ borderColor: colors.secondary, borderRadius: brHalf }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold opacity-50 flex items-center gap-1"><UserCheck className="h-3 w-3" /> Full Name</label>
                      {profileEditing ? (
                        <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="Enter name" />
                      ) : (
                        <p className="text-sm font-medium p-3 border" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf, backgroundColor: colors.secondary + '15' }}>
                          {profileName || <span className="opacity-40">Not set</span>}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold opacity-50 flex items-center gap-1"><Mail className="h-3 w-3" /> Email Address</label>
                      <p className="text-sm font-medium p-3 border flex items-center justify-between" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf, backgroundColor: colors.secondary + '15' }}>
                        <span className="truncate">{displayEmail}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Verified</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold opacity-50 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number</label>
                      {profileEditing ? (
                        <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="+91..." />
                      ) : (
                        <p className="text-sm font-medium p-3 border" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf, backgroundColor: colors.secondary + '15' }}>
                          {profilePhone || <span className="opacity-40">Not set</span>}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold opacity-50 flex items-center gap-1"><Calendar className="h-3 w-3" /> Member Since</label>
                      <p className="text-sm font-medium p-3 border" style={{ borderColor: colors.secondary + '60', borderRadius: brHalf, backgroundColor: colors.secondary + '15' }}>
                        {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Wishlist Link Card */}
                  <Link
                    to={`/store/${slug}/account/wishlist`}
                    className="flex items-center gap-4 p-4 border transition-all hover:shadow-md hover:scale-[1.01] mb-6"
                    style={{ borderColor: colors.secondary, borderRadius: br, backgroundColor: colors.card }}
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-red-50">
                      <Heart className="h-5 w-5 fill-red-500 text-red-500 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">My Wishlist ({wishlistCount})</p>
                      <p className="text-xs opacity-50">View and checkout your favorite saved products</p>
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-40" />
                  </Link>

                  {/* Change Password Card */}
                  <div
                    className="p-5 border space-y-4"
                    style={{ borderColor: colors.secondary, borderRadius: br, backgroundColor: colors.card }}
                  >
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ fontFamily: fonts.heading }}>
                      <Lock className="h-4 w-4" style={{ color: colors.primary }} /> Change Password
                    </h3>
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold opacity-50">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={inputCls}
                            style={{ ...inputStyle, ...focusRing }}
                            placeholder="Min 6 characters"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold opacity-50">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={inputCls}
                            style={{ ...inputStyle, ...focusRing }}
                            placeholder="Repeat new password"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={passwordUpdating}
                        className="px-5 py-2.5 text-xs font-bold text-white transition-all hover:opacity-90 flex items-center gap-2"
                        style={{ backgroundColor: colors.primary, borderRadius: brHalf }}
                      >
                        {passwordUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Update Password
                      </button>
                    </form>
                  </div>

                </div>
              )}

              {/* ─── ORDERS TAB ─── */}
              {tab === 'orders' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b" style={{ borderColor: colors.secondary }}>
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: fonts.heading }}>
                      <Package className="h-5 w-5" style={{ color: colors.primary }} /> Order History
                    </h2>
                    
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-2 max-w-md w-full">
                      <div className="relative flex-1">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                        <input
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          placeholder="Search order ID or items..."
                          className="w-full pl-9 pr-3 py-2 text-xs border outline-none"
                          style={{ ...inputStyle, ...focusRing }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {ORDER_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setOrderFilter(f.key)}
                        className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition-all"
                        style={{
                          backgroundColor: orderFilter === f.key ? colors.primary : 'transparent',
                          color: orderFilter === f.key ? '#fff' : colors.text + 'aa',
                          borderColor: orderFilter === f.key ? colors.primary : colors.secondary,
                          borderRadius: brHalf
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {ordersLoading ? (
                    <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                  ) : !filteredOrders.length ? (
                    <div className="text-center py-16 border rounded-xl" style={{ borderColor: colors.secondary }}>
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-semibold opacity-60">No orders found</p>
                      <p className="text-xs opacity-40 mb-4">Your purchase items will show up here</p>
                      <Link to={`/store/${slug}`} className="inline-block px-5 py-2.5 text-xs font-semibold text-white" style={{ backgroundColor: colors.primary, borderRadius: brHalf }}>
                        Shop Now
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredOrders.map((order: any) => {
                        const items = Array.isArray(order.items) ? order.items : [];
                        const addr = order.customer_address || {};
                        return (
                          <div 
                            key={order.id} 
                            className="p-5 border transition-all hover:shadow-md" 
                            style={{ borderColor: colors.secondary, borderRadius: br, backgroundColor: colors.card }}
                          >
                            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap pb-3 border-b border-dashed" style={{ borderColor: colors.secondary }}>
                              <div>
                                <Link to={`/store/${slug}/account/orders/${order.id}`} className="text-sm font-mono font-bold hover:underline flex items-center gap-1" style={{ color: colors.primary }}>
                                  {order.order_number}
                                </Link>
                                <p className="text-xs opacity-50 mt-0.5">
                                  Placed {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <span 
                                  className="text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border" 
                                  style={{ 
                                    backgroundColor: (statusColors[order.status] || '#888') + '10', 
                                    color: statusColors[order.status] || '#888',
                                    borderColor: (statusColors[order.status] || '#888') + '30'
                                  }}
                                >
                                  ● {order.status.replace(/_/g, ' ')}
                                </span>
                                {order.payment_status && (
                                  <span 
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border" 
                                    style={{ 
                                      backgroundColor: (order.payment_status === 'paid' ? '#16a34a' : '#f59e0b') + '10', 
                                      color: order.payment_status === 'paid' ? '#16a34a' : '#f59e0b',
                                      borderColor: (order.payment_status === 'paid' ? '#16a34a' : '#f59e0b') + '30'
                                    }}
                                  >
                                    {order.payment_status}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {items.map((item: any, i: number) => (
                                <div key={i} className="flex gap-3 items-center">
                                  <div className="h-12 w-12 rounded overflow-hidden border shrink-0 bg-muted" style={{ borderColor: colors.secondary }}>
                                    {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                                  </div>
                                  <div className="flex-1 min-w-0 text-xs">
                                    <p className="font-semibold truncate">{item.title}</p>
                                    <p className="opacity-50 mt-0.5">Qty: {item.quantity} {item.variant ? `(${item.variant})` : ''}</p>
                                  </div>
                                  <p className="text-xs font-bold">₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</p>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t gap-3 flex-wrap" style={{ borderColor: colors.secondary + '60' }}>
                              <div className="text-xs">
                                <span className="opacity-50">Total Amount:</span>
                                <span className="font-bold text-sm ml-1" style={{ color: colors.primary }}>₹{Number(order.total).toLocaleString('en-IN')}</span>
                              </div>
                              <OrderActions order={order} primaryColor={colors.primary} onChanged={() => {}} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── RETURNS TAB ─── */}
              {tab === 'returns' && (
                <div className="space-y-6">
                  <div className="pb-3 border-b" style={{ borderColor: colors.secondary }}>
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: fonts.heading }}>
                      <Undo2 className="h-5 w-5" style={{ color: colors.primary }} /> Returns & Refunds
                    </h2>
                  </div>
                  <ReturnsTabContent slug={slug!} userId={user.id} storeId={store.id} colors={colors} br={br} brHalf={brHalf} />
                </div>
              )}

              {/* ─── ADDRESSES TAB ─── */}
              {tab === 'addresses' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: colors.secondary }}>
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: fonts.heading }}>
                      <MapPin className="h-5 w-5" style={{ color: colors.primary }} /> Saved Addresses
                    </h2>
                    {!showAddForm && (
                      <button 
                        onClick={() => setShowAddForm(true)}
                        className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: colors.primary, borderRadius: brHalf }}
                      >
                        <Plus className="h-4 w-4" /> Add Address
                      </button>
                    )}
                  </div>

                  {/* Add / Edit Form */}
                  {showAddForm ? (
                    <div className="p-5 border space-y-4" style={{ borderColor: colors.primary + '40', borderRadius: br, backgroundColor: colors.card }}>
                      <h3 className="text-sm font-bold" style={{ fontFamily: fonts.heading }}>
                        {editingAddrId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold opacity-60 mb-1.5 block">Address Label</label>
                          <div className="flex gap-2">
                            {['Home', 'Office', 'Other'].map((l) => (
                              <button 
                                key={l} 
                                type="button"
                                onClick={() => setAddrForm((p) => ({ ...p, label: l }))} 
                                className="text-xs font-semibold px-4 py-2 border transition-colors" 
                                style={{ 
                                  borderColor: addrForm.label === l ? colors.primary : colors.secondary, 
                                  borderRadius: brHalf, 
                                  backgroundColor: addrForm.label === l ? colors.primary + '12' : 'transparent', 
                                  color: addrForm.label === l ? colors.primary : undefined 
                                }}
                              >
                                {l === 'Home' ? '🏠 Home' : l === 'Office' ? '🏢 Office' : '📍 Other'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold opacity-60 mb-1 block">Full Name *</label>
                          <input value={addrForm.name} onChange={(e) => setAddrForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="Recipient's name" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold opacity-60 mb-1 block">Mobile Number *</label>
                          <input value={addrForm.phone} onChange={(e) => setAddrForm((p) => ({ ...p, phone: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="10-digit mobile" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold opacity-60 mb-1 block">Address (House, Flat, Street) *</label>
                          <input value={addrForm.address} onChange={(e) => setAddrForm((p) => ({ ...p, address: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="Flat / House no, building name, street" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold opacity-60 mb-1 block">Landmark (optional)</label>
                          <input value={addrForm.landmark} onChange={(e) => setAddrForm((p) => ({ ...p, landmark: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} placeholder="E.g. near metro station" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                          <div>
                            <label className="text-xs font-semibold opacity-60 mb-1 block">City *</label>
                            <input value={addrForm.city} onChange={(e) => setAddrForm((p) => ({ ...p, city: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold opacity-60 mb-1 block">State *</label>
                            <input value={addrForm.state} onChange={(e) => setAddrForm((p) => ({ ...p, state: e.target.value }))} className={inputCls} style={{ ...inputStyle, ...focusRing }} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold opacity-60 mb-1 block">Pincode *</label>
                            <input 
                              value={addrForm.pincode} 
                              onChange={(e) => setAddrForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} 
                              className={inputCls} 
                              style={{ ...inputStyle, ...focusRing }} 
                              maxLength={6} 
                              inputMode="numeric" 
                            />
                          </div>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-2">
                        <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm((p) => ({ ...p, isDefault: e.target.checked }))} className="h-4 w-4 rounded accent-current" style={{ accentColor: colors.primary }} />
                        <span className="text-xs font-semibold opacity-70">Set as default delivery address</span>
                      </label>

                      <div className="flex gap-2 pt-2">
                        <button onClick={saveAddress} className="px-5 py-2.5 text-xs font-bold text-white transition-all hover:opacity-90" style={{ backgroundColor: colors.primary, borderRadius: brHalf }}>
                          {editingAddrId ? 'Update Address' : 'Save Address'}
                        </button>
                        <button onClick={resetAddrForm} className="px-5 py-2.5 text-xs font-semibold border hover:bg-black/5" style={{ borderColor: colors.secondary, borderRadius: brHalf }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {addresses.length === 0 ? (
                        <div className="text-center py-12 border rounded-xl" style={{ borderColor: colors.secondary }}>
                          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
                          <p className="text-sm font-semibold opacity-60">No saved addresses</p>
                          <button onClick={() => setShowAddForm(true)} className="mt-3 text-xs font-bold" style={{ color: colors.primary }}>
                            Create one now
                          </button>
                        </div>
                      ) : (
                        addresses.map((addr) => (
                          <div 
                            key={addr.id} 
                            className="p-4 border transition-all hover:shadow-sm flex items-start gap-3 justify-between" 
                            style={{ 
                              borderColor: addr.isDefault ? colors.primary : colors.secondary, 
                              borderRadius: br,
                              backgroundColor: addr.isDefault ? colors.primary + '05' : colors.card
                            }}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/5 text-muted-foreground uppercase">{addr.label || 'Home'}</span>
                                {addr.isDefault && <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: colors.primary }}>Default</span>}
                              </div>
                              <p className="text-sm font-bold">{addr.name}</p>
                              <p className="text-xs opacity-75">{addr.address}{addr.landmark ? `, ${addr.landmark}` : ''}</p>
                              <p className="text-xs opacity-75">{addr.city}, {addr.state} - {addr.pincode}</p>
                              <p className="text-xs opacity-50 pt-1 font-semibold">Phone: {addr.phone}</p>
                            </div>
                            <div className="flex flex-col gap-1 items-end shrink-0">
                              {!addr.isDefault && (
                                <button onClick={() => setDefault(addr.id)} className="text-[10px] font-bold px-2 py-1 border hover:bg-black/5" style={{ borderColor: colors.secondary, borderRadius: brHalf }}>
                                  Set Default
                                </button>
                              )}
                              <div className="flex gap-1 mt-1">
                                <button onClick={() => editAddress(addr)} className="p-1.5 border hover:bg-black/5" style={{ borderColor: colors.secondary, borderRadius: brHalf }}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => removeAddress(addr.id)} className="p-1.5 border hover:bg-red-50 text-red-500" style={{ borderColor: colors.secondary, borderRadius: brHalf }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* ─── SUPPORT TAB ─── */}
              {tab === 'support' && (
                <div className="space-y-6">
                  <div className="pb-3 border-b" style={{ borderColor: colors.secondary }}>
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: fonts.heading }}>
                      <MessageCircle className="h-5 w-5" style={{ color: colors.primary }} /> Customer Support
                    </h2>
                    <p className="text-xs opacity-50 mt-1">Messages you've sent to this store.</p>
                  </div>

                  {/* Send new message link */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm opacity-60">Have a new question?</p>
                    <Link
                      to={`/store/${slug}/contact`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-lg transition hover:opacity-90"
                      style={{ backgroundColor: colors.primary, borderRadius: brHalf }}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Send a Message
                    </Link>
                  </div>

                  {/* Message history */}
                  {msgHistoryLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : msgHistory.length === 0 ? (
                    <div className="text-center py-14 border rounded-xl" style={{ borderColor: colors.secondary }}>
                      <Mail className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-semibold opacity-60">No messages yet</p>
                      <p className="text-xs opacity-40 mt-1">Messages you send via the Contact page will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {msgHistory.map((msg: any) => {
                        const statusMap: Record<string, { label: string; color: string }> = {
                          unread:  { label: 'Sent',    color: '#3b82f6' },
                          read:    { label: 'Seen',    color: '#6b7280' },
                          replied: { label: 'Replied', color: '#10b981' },
                        };
                        const s = statusMap[msg.status] ?? statusMap.unread;
                        const isOpen = msgExpandedId === msg.id;
                        return (
                          <div
                            key={msg.id}
                            className="border overflow-hidden transition-shadow hover:shadow-sm"
                            style={{ borderColor: colors.secondary, borderRadius: br, backgroundColor: colors.card }}
                          >
                            <button
                              type="button"
                              onClick={() => setMsgExpandedId(isOpen ? null : msg.id)}
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate">{msg.subject || '(No subject)'}</p>
                                <p className="text-xs opacity-50 mt-0.5 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(msg.created_at), 'dd MMM yyyy, hh:mm a')}
                                </p>
                              </div>
                              <span
                                className="shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                                style={{ color: s.color, borderColor: s.color + '30', backgroundColor: s.color + '12' }}
                              >
                                {s.label}
                              </span>
                              <X
                                className="h-4 w-4 shrink-0 transition-transform"
                                style={{ color: colors.text, opacity: 0.4, transform: isOpen ? 'rotate(0deg)' : 'rotate(45deg)' }}
                              />
                            </button>
                            {isOpen && (
                              <div className="px-4 pb-4 pt-2 border-t space-y-3" style={{ borderColor: colors.secondary }}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-80">{msg.message}</p>
                                {msg.status === 'replied' && (
                                  <p
                                    className="text-xs font-semibold px-3 py-2 rounded-lg"
                                    style={{ backgroundColor: colors.primary + '15', color: colors.primary }}
                                  >
                                    ✓ Store has replied — check your email inbox for their response.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </StorefrontLayout>
  );
};

const ReturnsTabContent = ({ slug, userId, storeId, colors, br, brHalf }: any) => {
  const { data: returns, isLoading } = useCustomerReturns(userId, storeId);
  if (isLoading) return <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!returns?.length) return (
    <div className="text-center py-16 border rounded-xl" style={{ borderColor: colors.secondary }}>
      <Undo2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p className="text-sm font-semibold opacity-60">No return or exchange requests found</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {returns.map((r: any) => (
        <Link 
          key={r.id} 
          to={`/store/${slug}/account/returns/${r.id}`} 
          className="block p-4 border hover:shadow-sm transition-shadow" 
          style={{ borderColor: colors.secondary, borderRadius: br, backgroundColor: colors.card }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold capitalize">{r.request_type} · {r.reason}</p>
              <p className="text-xs opacity-50 mt-0.5">{format(new Date(r.created_at), 'dd MMM yyyy')} · ₹{Number(r.refund_amount || 0).toLocaleString('en-IN')}</p>
            </div>
            <span 
              className="text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border" 
              style={{ 
                backgroundColor: (statusColors[r.status] || '#888') + '10', 
                color: statusColors[r.status] || '#888',
                borderColor: (statusColors[r.status] || '#888') + '30',
                borderRadius: brHalf
              }}
            >
              {r.status.replace(/_/g, ' ')}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default CustomerAccount;
