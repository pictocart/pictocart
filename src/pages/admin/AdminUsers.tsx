import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Trash2, ShieldPlus, ShieldMinus, Eye, UserPlus, Users, KeyRound } from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminUser {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  roles: string[];
  storeName: string | null;
  storeSlug: string | null;
  isCustomer: boolean;
}

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-full'],
    queryFn: async () => {
      // Fetch profiles, roles, stores, customers, and auth users in parallel
      const [profilesRes, rolesRes, storesRes, customersRes, authRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.from('stores').select('user_id, name, slug'),
        supabase.from('customers').select('user_id, name, email, phone'),
        supabase.functions.invoke('admin-manage-user', { body: { action: 'list_users' } }),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const customerMap = new Map<string, { name: string | null; email: string | null; phone: string | null }>();
      (customersRes.data || []).forEach((c: any) => {
        if (c.user_id && !customerMap.has(c.user_id)) {
          customerMap.set(c.user_id, { name: c.name, email: c.email, phone: c.phone });
        }
      });

      const roleMap = new Map<string, string[]>();
      (rolesRes.data || []).forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      const storeMap = new Map<string, { name: string; slug: string }>();
      (storesRes.data || []).forEach((s) => storeMap.set(s.user_id, { name: s.name, slug: s.slug }));
      const storeSlugMap = new Map<string, { name: string; slug: string }>();
      (storesRes.data || []).forEach((s) => storeSlugMap.set(s.slug, { name: s.name, slug: s.slug }));

      const authMap = new Map<string, any>();
      if (authRes.data?.users) {
        authRes.data.users.forEach((u: any) => authMap.set(u.id, u));
      }

      const profileRows: AdminUser[] = (profilesRes.data || []).map((p) => {
        const auth = authMap.get(p.user_id);
        const meta = auth?.user_metadata || {};
        const aliasStoreSlug = auth?.email?.match(/@([a-z0-9-]+)\.customers\.pictocart\.in$/)?.[1];
        const isCustomer = meta.is_customer === true || Boolean(aliasStoreSlug);
        const store = isCustomer ? storeSlugMap.get(meta.store_slug || aliasStoreSlug) : storeMap.get(p.user_id);
        const rawRoles = roleMap.get(p.user_id) || (isCustomer ? ['customer'] : ['seller']);
        // Customer accounts should only ever show the customer role
        const roles = isCustomer
          ? Array.from(new Set([...rawRoles.filter((r) => r !== 'seller'), 'customer']))
          : rawRoles;
        const cust = customerMap.get(p.user_id);
        return {
          ...p,
          email: meta.customer_email || cust?.email || (aliasStoreSlug ? auth?.email?.split('@')[0]?.replace('-at-', '@') : auth?.email) || null,
          full_name: p.full_name || meta.full_name || cust?.name || null,
          phone: p.phone || meta.phone || cust?.phone || null,
          last_sign_in_at: auth?.last_sign_in_at || null,
          email_confirmed_at: auth?.email_confirmed_at || null,
          roles,
          storeName: store?.name || null,
          storeSlug: store?.slug || null,
          isCustomer,
        };
      });

      const profiledUserIds = new Set(profileRows.map((u) => u.user_id));
      const customerAuthRows: AdminUser[] = Array.from(authMap.values())
        .filter((auth: any) => {
          const aliasStoreSlug = auth?.email?.match(/@([a-z0-9-]+)\.customers\.pictocart\.in$/)?.[1];
          return (auth?.user_metadata?.is_customer === true || Boolean(aliasStoreSlug)) && !profiledUserIds.has(auth.id);
        })
        .map((auth: any) => {
          const meta = auth.user_metadata || {};
          const aliasStoreSlug = auth?.email?.match(/@([a-z0-9-]+)\.customers\.pictocart\.in$/)?.[1];
          const store = storeSlugMap.get(meta.store_slug || aliasStoreSlug);
          const rawRoles = roleMap.get(auth.id) || ['customer'];
          const roles = Array.from(new Set([...rawRoles.filter((r) => r !== 'seller'), 'customer']));
          const cust = customerMap.get(auth.id);
          return {
            id: auth.id,
            user_id: auth.id,
            full_name: meta.full_name || cust?.name || null,
            phone: meta.phone || cust?.phone || null,
            avatar_url: meta.avatar_url || null,
            created_at: auth.created_at,
            email: meta.customer_email || cust?.email || (aliasStoreSlug ? auth.email?.split('@')[0]?.replace('-at-', '@') : auth.email) || null,
            last_sign_in_at: auth.last_sign_in_at || null,
            email_confirmed_at: auth.email_confirmed_at || null,
            roles,
            storeName: store?.name || null,
            storeSlug: store?.slug || meta.store_slug || null,
            isCustomer: true,
          };
        });

      return [...profileRows, ...customerAuthRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  const manageMutation = useMutation({
    mutationFn: async (body: { action: string; userId: string; role?: string; newPassword?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-full'] });
    },
  });

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await manageMutation.mutateAsync({ action: 'reset_password', userId: resetUser.user_id, newPassword });
      toast.success(`Password reset for ${resetUser.full_name || resetUser.email}`);
      setResetUser(null);
      setNewPassword('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to reset password');
    }
  };

  const handleAddRole = async (user: AdminUser, role: string) => {
    try {
      await manageMutation.mutateAsync({ action: 'add_role', userId: user.user_id, role });
      toast.success(`Added ${role} role to ${user.full_name || 'user'}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add role');
    }
  };

  const handleRemoveRole = async (user: AdminUser, role: string) => {
    try {
      await manageMutation.mutateAsync({ action: 'remove_role', userId: user.user_id, role });
      toast.success(`Removed ${role} role from ${user.full_name || 'user'}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove role');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      await manageMutation.mutateAsync({ action: 'delete_user', userId: deleteUser.user_id });
      toast.success(`Deleted user ${deleteUser.full_name || deleteUser.email}`);
      setDeleteUser(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user');
    }
  };

  const filtered = useMemo(() => {
    let list = users || [];
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.roles.includes(roleFilter));
    }
    if (storeFilter !== 'all') {
      list = list.filter((u) => (storeFilter === '__none__' ? !u.storeSlug : u.storeSlug === storeFilter));
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (u) =>
          (u.full_name || '').toLowerCase().includes(s) ||
          (u.email || '').toLowerCase().includes(s) ||
          (u.phone || '').includes(s) ||
          (u.storeName || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [users, search, roleFilter, storeFilter]);

  const storeOptions = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach((u) => {
      if (u.storeSlug && u.storeName) map.set(u.storeSlug, u.storeName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  const stats = useMemo(() => {
    const all = users || [];
    return {
      total: all.length,
      admins: all.filter((u) => u.roles.includes('admin')).length,
      sellers: all.filter((u) => u.roles.includes('seller')).length,
      customers: all.filter((u) => u.isCustomer || u.roles.includes('customer')).length,
    };
  }, [users]);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">View, manage roles, and administer platform users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: stats.total, icon: Users },
          { label: 'Admins', value: stats.admins, icon: ShieldPlus },
          { label: 'Sellers', value: stats.sellers, icon: UserPlus },
          { label: 'Customers', value: stats.customers, icon: Eye },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, phone, store..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="seller">Seller</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            <SelectItem value="__none__">No Store</SelectItem>
            {storeOptions.map(([slug, name]) => (
              <SelectItem key={slug} value={slug}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {(user.full_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-medium text-sm truncate">{user.full_name || 'Unknown'}</p>
                          {(user.isCustomer || user.roles.includes('customer')) && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/40 text-primary shrink-0">Customer</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground md:hidden">{user.email || 'No email'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{user.email || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {user.storeName ? (
                      <span className="text-foreground">{user.storeName}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role: string) => (
                        <Badge
                          key={role}
                          variant={role === 'admin' ? 'destructive' : role === 'customer' ? 'outline' : 'secondary'}
                          className={role === 'customer' ? 'text-[10px] border-primary/40 text-primary' : 'text-[10px]'}
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(user.last_sign_in_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewUser(user)}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        {!user.roles.includes('admin') && (
                          <DropdownMenuItem onClick={() => handleAddRole(user, 'admin')}>
                            <ShieldPlus className="h-4 w-4 mr-2" /> Make Admin
                          </DropdownMenuItem>
                        )}
                        {user.roles.includes('admin') && (
                          <DropdownMenuItem onClick={() => handleRemoveRole(user, 'admin')}>
                            <ShieldMinus className="h-4 w-4 mr-2" /> Remove Admin
                          </DropdownMenuItem>
                        )}
                        {!user.roles.includes('customer') && (
                          <DropdownMenuItem onClick={() => handleAddRole(user, 'customer')}>
                            <UserPlus className="h-4 w-4 mr-2" /> Add Customer Role
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setResetUser(user); setNewPassword(''); }}>
                          <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {stats.total} users</p>

      {/* View Details Dialog */}
      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {viewUser.avatar_url ? (
                  <img src={viewUser.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
                    {(viewUser.full_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{viewUser.full_name || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground">{viewUser.email || 'No email'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p>{viewUser.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Store</p>
                  <p>{viewUser.storeName || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Store Slug</p>
                  <p>{viewUser.storeSlug || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Joined</p>
                  <p>{formatDate(viewUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Last Sign In</p>
                  <p>{formatDate(viewUser.last_sign_in_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email Verified</p>
                  <p>{viewUser.email_confirmed_at ? formatDate(viewUser.email_confirmed_at) : 'Not verified'}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Roles</p>
                <div className="flex gap-1.5">
                  {viewUser.roles.map((role: string) => (
                    <Badge key={role} variant={role === 'admin' ? 'destructive' : 'secondary'}>{role}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteUser?.full_name || deleteUser?.email}</strong> and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={manageMutation.isPending}>
              {manageMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(o) => { if (!o) { setResetUser(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetUser?.full_name || resetUser?.email}</strong>. The user will need to use this password on their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              type="text"
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetUser(null); setNewPassword(''); }}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={manageMutation.isPending || newPassword.length < 6}>
              {manageMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;

