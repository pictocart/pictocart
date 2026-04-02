import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';

const AdminUsers = () => {
  const [search, setSearch] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get roles
      const { data: roles } = await supabase.from('user_roles').select('*');
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      // Get stores
      const { data: stores } = await supabase.from('stores').select('user_id, name');
      const storeMap = new Map<string, string>();
      (stores || []).forEach((s) => storeMap.set(s.user_id, s.name));

      return (profiles || []).map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id) || ['seller'],
        storeName: storeMap.get(p.user_id) || null,
      }));
    },
  });

  const filtered = (users || []).filter((u) =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').includes(search)
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">View all registered users and their roles</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center gap-4 py-4">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {(user.full_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{user.full_name || 'Unknown'}</h3>
                  <p className="text-xs text-muted-foreground">{user.phone || 'No phone'} · {user.storeName || 'No store'}</p>
                </div>
                <div className="flex gap-1.5">
                  {user.roles.map((role: string) => (
                    <Badge
                      key={role}
                      variant={role === 'admin' ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-sm text-muted-foreground">No users found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
