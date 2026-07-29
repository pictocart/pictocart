import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { PrivacyControls } from '@/components/profile/PrivacyControls';
import { useFssaiHistory } from '@/hooks/useFssaiHistory';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User, Mail, Phone, Store, Calendar, Camera, Lock, Eye, EyeOff,
  ExternalLink, CheckCircle2, AlertCircle, Receipt, Trash2, Plus, History, Ticket, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

/* Food-like categories that require FSSAI */
const FOOD_CATEGORIES = ['food', 'grocery', 'bakery', 'restaurant', 'cafe', 'cloud kitchen', 'beverage', 'organic', 'catering', 'dairy', 'snacks', 'sweets'];
const isFoodStore = (category?: string | null) =>
  FOOD_CATEGORIES.some((k) => category?.toLowerCase().includes(k));

const SellerProfile = () => {
  const { user } = useAuth();
  const { store, setStore } = useStore();
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const qc = useQueryClient();

  // License Key fields
  const [licenseKey, setLicenseKey] = useState('');
  const [applyingLicense, setApplyingLicense] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [linkingReferral, setLinkingReferral] = useState(false);

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }
    setLinkingReferral(true);
    try {
      // Find partner by referral code
      const { data: partner, error: pErr } = await supabase
        .from('partners')
        .select('id, name')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .maybeSingle();

      if (pErr) throw pErr;
      if (!partner) {
        throw new Error('Invalid referral code. Please check and try again.');
      }

      // Update store to link to partner (plan remains unchanged)
      const { error: sErr } = await supabase
        .from('stores')
        .update({ owned_by_partner_id: partner.id })
        .eq('id', store.id);

      if (sErr) throw sErr;

      toast.success(`Store successfully linked to Partner "${partner.name}"!`);
      setReferralCode('');
      
      qc.invalidateQueries({ queryKey: ['store'] });
      qc.invalidateQueries({ queryKey: ['linked-partner-details'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to link referral code.');
    } finally {
      setLinkingReferral(false);
    }
  };

  const { data: linkedPartner } = useQuery({
    enabled: !!store?.owned_by_partner_id,
    queryKey: ['linked-partner-details', store?.owned_by_partner_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('partners')
        .select('name, partner_id_code')
        .eq('id', store.owned_by_partner_id)
        .maybeSingle();
      return data;
    }
  });

  const handleApplyLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }
    setApplyingLicense(true);
    try {
      const { error } = await supabase.rpc('apply_partner_license_key', {
        _store_id: store.id,
        _key: licenseKey.trim()
      });

      if (error) throw error;

      toast.success('License key applied successfully! Your plan has been upgraded.');
      setLicenseKey('');
      
      qc.invalidateQueries({ queryKey: ['store'] });
      qc.invalidateQueries({ queryKey: ['store-subscription'] });
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (e: any) {
      toast.error(e.message || 'Failed to apply license key. Please check and try again.');
    } finally {
      setApplyingLicense(false);
    }
  };

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Store name edit
  const [storeName, setStoreName] = useState('');
  const [storeNameLoading, setStoreNameLoading] = useState(false);

  // FSSAI history
  const { history: fssaiHistory, activeFssai, addFssai, deleteFssai } = useFssaiHistory();
  const [newFssai, setNewFssai] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchProfile();
    if (store) {
      setStoreName(store.name);
    }
  }, [user, store]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, avatar_url: avatarUrl })
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatars/profile.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('store-assets')
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error('Upload failed');
      setAvatarUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(path);
    setAvatarUrl(publicUrl);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
    toast.success('Avatar updated');
    setAvatarUploading(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  const initials = (fullName || user?.email || '?').charAt(0).toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings and store identity</p>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-6 w-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-semibold">{fullName || 'Seller'}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Store className="h-3 w-3 mr-1" />
                  Seller
                </Badge>
                {store?.is_published ? (
                  <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Store Live
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Store Draft
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your name and contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email Address</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support for assistance.</p>
          </div>
          <Button onClick={handleSaveProfile} disabled={loading} className="w-fit">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Store Quick Info */}
      {store && (
        <Card>
        <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" />
              Store Overview
            </CardTitle>
            <CardDescription>Your store details at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Store Name</Label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Your store name"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium">{store.category || 'Not set'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Store URL (cannot be changed)</p>
                <a
                  href={`${window.location.origin}/store/${store.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  /store/{store.slug}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {new Date(store.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <Button
              onClick={async () => {
                if (!storeName.trim()) { toast.error('Store name cannot be empty'); return; }
                setStoreNameLoading(true);
                const { error } = await supabase.from('stores').update({ name: storeName.trim() }).eq('id', store.id);
                if (error) { toast.error('Failed to update store name'); }
                else { toast.success('Store name updated'); setStore({ ...store, name: storeName.trim() }); }
                setStoreNameLoading(false);
              }}
              disabled={storeNameLoading || storeName.trim() === store.name}
              className="w-fit"
            >
              {storeNameLoading ? 'Saving...' : 'Save Store Name'}
            </Button>

            {/* FSSAI — only visible for food-related stores */}
            {isFoodStore(store.category) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-amber-600" />
                    FSSAI License Number
                    <span className="text-muted-foreground font-normal">(14 digits)</span>
                  </Label>

                  {/* Active FSSAI */}
                  {activeFssai ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-sm font-mono font-semibold text-emerald-800">{activeFssai.fssai_number}</p>
                          <p className="text-[11px] text-emerald-600">
                            Active · Added {format(new Date(activeFssai.added_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={() => setDeleteTarget(activeFssai.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      No active FSSAI number. Add one below.
                    </div>
                  )}

                  {/* Add new FSSAI */}
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={newFssai}
                        onChange={(e) => setNewFssai(e.target.value.replace(/[^0-9]/g, '').slice(0, 14))}
                        placeholder={activeFssai ? 'Enter new number to replace…' : 'e.g. 10012345000123'}
                        className="font-mono"
                        maxLength={14}
                        inputMode="numeric"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {newFssai.length}/14 digits
                        {newFssai.length > 0 && newFssai.length < 14 && (
                          <span className="text-amber-600 ml-1">— needs {14 - newFssai.length} more</span>
                        )}
                        {newFssai.length === 14 && (
                          <span className="text-emerald-600 ml-1">✓ valid</span>
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        await addFssai.mutateAsync(newFssai);
                        setNewFssai('');
                      }}
                      disabled={addFssai.isPending || newFssai.length !== 14}
                      variant="outline"
                      size="sm"
                      className="shrink-0 mt-0.5"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {addFssai.isPending ? 'Saving…' : activeFssai ? 'Update' : 'Add'}
                    </Button>
                  </div>

                  {/* History */}
                  {fssaiHistory.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <History className="h-3 w-3" /> History
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {fssaiHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className={`flex items-center justify-between rounded-md px-3 py-1.5 text-xs ${
                              entry.deleted_by_user
                                ? 'bg-muted/40 text-muted-foreground line-through'
                                : 'bg-muted/20'
                            }`}
                          >
                            <span className="font-mono">{entry.fssai_number}</span>
                            <span className="ml-3 shrink-0 opacity-60">
                              {entry.deleted_by_user
                                ? `Removed ${format(new Date(entry.deleted_at!), 'dd MMM yyyy')}`
                                : `Added ${format(new Date(entry.added_at), 'dd MMM yyyy')}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Each FSSAI number is kept in history even after removal. This helps with compliance audits.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Partner Connection & Upgrade section */}
      {store && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4 text-orange-500" />
              Partner Connection & Upgrades
            </CardTitle>
            <CardDescription>
              Link your store to a partner using their Referral Code, or enter an optional License Key to upgrade your subscription plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1. Referral Code Linkage */}
            <div className="space-y-3 border-b pb-4 border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800">1. Partner Linkage (Referral Code)</h4>
              {store.owned_by_partner_id ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800">Linked Partner</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Your store is linked to Partner <span className="font-medium">{linkedPartner?.name || "..."}</span> ({linkedPartner?.partner_id_code || "N/A"}).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="referral_code" className="text-xs">Partner Referral Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="referral_code"
                      placeholder="e.g. AFB36A1"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase().trim())}
                      className="font-mono uppercase"
                    />
                    <Button
                      onClick={handleApplyReferral}
                      disabled={linkingReferral || !referralCode}
                      className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                    >
                      {linkingReferral ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link Partner"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Linking with a referral code tags your store under a partner for connection tracking (your current subscription plan remains unchanged).
                  </p>
                </div>
              )}
            </div>

            {/* 2. License Key Upgrade (Optional) */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">2. Subscription Plan Upgrade (License Key - Optional)</h4>
              <div className="space-y-2">
                <Label htmlFor="license_key" className="text-xs">Partner License Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="license_key"
                    placeholder="e.g. PCC123-BASE-A1B2"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase().trim())}
                    className="font-mono"
                  />
                  <Button
                    onClick={handleApplyLicense}
                    disabled={applyingLicense || !licenseKey}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    {applyingLicense ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade Plan"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Applying a license key will instantly link your store (if not linked already) and upgrade your store subscription plan to Starter (Basic Key) or Growth (Premium Key).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirm Password</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <Button onClick={handlePasswordChange} disabled={passwordLoading || !newPassword} variant="outline" className="w-fit">
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      <PrivacyControls />

      {/* FSSAI delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove FSSAI number?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the FSSAI number from your store and product pages. The record will be
              kept in history for compliance purposes but will no longer be visible to customers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) {
                  await deleteFssai.mutateAsync(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              Yes, Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SellerProfile;
