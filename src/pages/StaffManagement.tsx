import { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagement() {
  const { store } = useStore();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'waiter' | 'chef' | 'manager' | 'employee'>('employee');
  const [empIdInput, setEmpIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog state variables
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'waiter' | 'chef' | 'manager' | 'employee'>('employee');
  const [editEmpId, setEditEmpId] = useState('');
  const [updating, setUpdating] = useState(false);

  // Validation states
  const [emailTaken, setEmailTaken] = useState(false);
  const [empIdTaken, setEmpIdTaken] = useState(false);
  const [editEmailTaken, setEditEmailTaken] = useState(false);
  const [editEmpIdTaken, setEditEmpIdTaken] = useState(false);

  const cat = String(store?.category || '').toLowerCase();
  const isFnB = ['food', 'food_beverages', 'food-and-beverages', 'restaurant', 'cafe'].includes(cat);

  useEffect(() => {
    if (store) {
      const isFood = ['food', 'food_beverages', 'food-and-beverages', 'restaurant', 'cafe'].includes(String(store.category || '').toLowerCase());
      setRole(isFood ? 'waiter' : 'employee');
    }
  }, [store]);

  // Real-time email validation for ADD
  useEffect(() => {
    if (!email.trim()) {
      setEmailTaken(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('check_email_exists', {
        p_email: email.trim()
      });
      if (!error) {
        setEmailTaken(!!data);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  // Real-time employee ID validation for ADD
  useEffect(() => {
    if (!empIdInput.trim()) {
      setEmpIdTaken(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('check_employee_id_exists', {
        p_employee_id: empIdInput.trim()
      });
      if (!error) {
        setEmpIdTaken(!!data);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [empIdInput]);

  // Real-time email validation for EDIT
  useEffect(() => {
    if (!editEmail.trim() || !editingStaff?.user_id) {
      setEditEmailTaken(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('check_email_exists', {
        p_email: editEmail.trim(),
        p_exclude_user_id: editingStaff.user_id
      });
      if (!error) {
        setEditEmailTaken(!!data);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [editEmail, editingStaff]);

  // Real-time employee ID validation for EDIT
  useEffect(() => {
    if (!editEmpId.trim() || !editingStaff?.id) {
      setEditEmpIdTaken(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('check_employee_id_exists', {
        p_employee_id: editEmpId.trim(),
        p_exclude_staff_id: editingStaff.id
      });
      if (!error) {
        setEditEmpIdTaken(!!data);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [editEmpId, editingStaff]);

  // Fetch staff list for current store
  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['store-staff', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await (supabase as any).rpc('get_store_staff_with_email', {
        _store_id: store.id
      });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!store?.id,
  });

  // Create staff member
  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id) return;
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (emailTaken) {
      toast.error('This email is already taken');
      return;
    }
    if (empIdTaken) {
      toast.error('This Employee ID is already taken');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_store_staff_member' as any, {
        p_email: email.trim(),
        p_password: password,
        p_name: name.trim(),
        p_role: role,
        p_store_id: store.id,
        p_employee_id: empIdInput.trim() || null,
      });

      if (error) throw error;
      const res = data as any;
      if (!res.success) {
        throw new Error(res.message || 'Failed to create staff member');
      }

      toast.success('Staff member registered successfully!');
      setName('');
      setEmail('');
      setPassword('');
      setEmpIdInput('');
      qc.invalidateQueries({ queryKey: ['store-staff', store.id] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error creating staff member');
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog and populate current values
  const startEdit = (staff: any) => {
    setEditingStaff(staff);
    setEditName(staff.name || '');
    setEditEmail(staff.auth_email || '');
    setEditPassword('');
    setEditRole(staff.role || 'employee');
    setEditEmpId(staff.employee_id || '');
    setEditOpen(true);
  };

  // Update staff member
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editName || !editEmail) {
      toast.error('Name and Email are required');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (editEmailTaken) {
      toast.error('This email is already in use');
      return;
    }
    if (editEmpIdTaken) {
      toast.error('This Employee ID is already in use');
      return;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('update_store_staff_member' as any, {
        p_staff_id: editingStaff.id,
        p_email: editEmail.trim(),
        p_password: editPassword || null,
        p_name: editName.trim(),
        p_role: editRole,
        p_employee_id: editEmpId.trim() || null
      });

      if (error) throw error;
      const res = data as any;
      if (!res.success) {
        throw new Error(res.message || 'Failed to update staff member');
      }

      toast.success('Staff member details updated successfully!');
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ['store-staff', store?.id] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating staff member');
    } finally {
      setUpdating(false);
    }
  };

  // Delete staff member and auth account
  const deleteMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const { data, error } = await supabase.rpc('delete_store_staff_member' as any, {
        p_staff_id: staffId
      });
      if (error) throw error;
      const res = data as any;
      if (!res.success) {
        throw new Error(res.message || 'Failed to remove staff member');
      }
    },
    onSuccess: () => {
      toast.success('Staff member permanently removed');
      qc.invalidateQueries({ queryKey: ['store-staff', store?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove staff member');
    },
  });

  if (!store) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading store configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage waiter, chef, and manager accounts for your store.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add Staff Member</CardTitle>
            <CardDescription>
              Create a standard login account for your waiter, chef, or manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className={emailTaken ? "text-destructive" : ""}>Login Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. waiter1@yourstore.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={emailTaken ? "border-destructive text-destructive focus-visible:ring-destructive" : ""}
                />
                {emailTaken && (
                  <p className="text-xs text-destructive font-medium mt-1">This email is already in use in the system.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password / PIN</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empIdInput" className={empIdTaken ? "text-destructive" : ""}>Employee ID (Optional)</Label>
                <Input
                  id="empIdInput"
                  placeholder="e.g. EMP-001 (Auto-generated if blank)"
                  value={empIdInput}
                  onChange={(e) => setEmpIdInput(e.target.value)}
                  className={empIdTaken ? "border-destructive text-destructive focus-visible:ring-destructive" : ""}
                />
                {empIdTaken && (
                  <p className="text-xs text-destructive font-medium mt-1">This Employee ID is already in use globally.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(val: any) => setRole(val)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {isFnB ? (
                      <>
                        <SelectItem value="waiter">Waiter</SelectItem>
                        <SelectItem value="chef">Chef / Kitchen</SelectItem>
                        <SelectItem value="manager">Manager / Counter</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="employee">Employee</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || emailTaken || empIdTaken}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff Member
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Staff List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Staff Accounts</CardTitle>
            <CardDescription>
              Registered employees who have dashboard access to this store.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg space-y-2">
                <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No staff members registered yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Login Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{staff.employee_id || '—'}</TableCell>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>{staff.auth_email || 'N/A'}</TableCell>
                      <TableCell className="capitalize">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${
                            staff.role === 'manager'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : staff.role === 'chef'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : staff.role === 'employee'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}
                        >
                          {staff.role === 'chef' ? 'Chef / Kitchen' : staff.role === 'manager' ? 'Manager / Counter' : staff.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => startEdit(staff)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/15"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${staff.name}? This will permanently remove their credentials and auth account.`)) {
                              deleteMutation.mutate(staff.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Staff Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Staff Details</DialogTitle>
              <DialogDescription>
                Modify staff properties or reset password. Leave password blank to keep the current one.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Full Name</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editEmail" className={editEmailTaken ? "text-destructive" : ""}>Login Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className={editEmailTaken ? "border-destructive text-destructive focus-visible:ring-destructive" : ""}
                />
                {editEmailTaken && (
                  <p className="text-xs text-destructive font-medium mt-1">This email is already in use in the system.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPassword">Reset Password (Optional)</Label>
                <Input
                  id="editPassword"
                  type="password"
                  placeholder="Enter new password to reset, or leave empty"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editEmpId" className={editEmpIdTaken ? "text-destructive" : ""}>Employee ID</Label>
                <Input
                  id="editEmpId"
                  value={editEmpId}
                  onChange={(e) => setEditEmpId(e.target.value)}
                  className={editEmpIdTaken ? "border-destructive text-destructive focus-visible:ring-destructive" : ""}
                />
                {editEmpIdTaken && (
                  <p className="text-xs text-destructive font-medium mt-1">This Employee ID is already in use globally.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editRole}
                  onValueChange={(val: any) => setEditRole(val)}
                >
                  <SelectTrigger id="editRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isFnB ? (
                      <>
                        <SelectItem value="waiter">Waiter</SelectItem>
                        <SelectItem value="chef">Chef / Kitchen</SelectItem>
                        <SelectItem value="manager">Manager / Counter</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="employee">Employee</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating || editEmailTaken || editEmpIdTaken}>
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
