import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  Shield,
  Camera,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Activity,
  Users,
  Store,
  Package,
  ShoppingCart,
} from 'lucide-react';

const AdminProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Platform stats for admin overview
  const { data: stats } = useQuery({
    queryKey: ['admin-profile-stats'],
    queryFn: async () => {
      const [storesRes, usersRes, ordersRes, productsRes] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);
      return {
        stores: storesRes.count || 0,
        users: usersRes.count || 0,
        orders: ordersRes.count || 0,
        products: productsRes.count || 0,
      };
    },
  });

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
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, avatar_url: avatarUrl })
      .eq('user_id', user.id);
    if (error) toast.error('Failed to update profile');
    else toast.success('Profile updated');
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatars/profile.${ext}`;
    const { error } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed'); setAvatarUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(path);
    setAvatarUrl(publicUrl);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
    toast.success('Avatar updated');
    setAvatarUploading(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success('Password updated'); setNewPassword(''); setConfirmPassword(''); }
    setPasswordLoading(false);
  };

  const initials = (fullName || user?.email || '?').charAt(0).toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  const quickStats = [
    { label: 'Total Users', value: stats?.users || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Total Stores', value: stats?.stores || 0, icon: Store, color: 'text-emerald-500' },
    { label: 'Total Orders', value: stats?.orders || 0, icon: ShoppingCart, color: 'text-orange-500' },
    { label: 'Total Products', value: stats?.products || 0, icon: Package, color: 'text-violet-500' },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your admin account and platform overview</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-2xl font-bold bg-destructive text-destructive-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-6 w-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-semibold">{fullName || 'Admin'}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start flex-wrap">
                <Badge variant="destructive" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Super Admin
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <stat.icon className={`h-5 w-5 mx-auto mb-1.5 ${stat.color}`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your admin profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Admin Name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email Address</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Email cannot be changed from here.</p>
          </div>
          <Button onClick={handleSaveProfile} disabled={loading} className="w-fit">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </CardTitle>
          <CardDescription>Keep your admin account secure</CardDescription>
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

      {/* Admin Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Session Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="font-mono text-xs mt-0.5 truncate">{user?.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Sign In</p>
              <p className="mt-0.5">
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString('en-IN')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Auth Provider</p>
              <p className="mt-0.5 capitalize">{user?.app_metadata?.provider || 'email'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email Verified</p>
              <p className="mt-0.5">
                {user?.email_confirmed_at ? (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Verified</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Not verified</Badge>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProfile;
