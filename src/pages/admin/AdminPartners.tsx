import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, IndianRupee, Mail, Loader2, Copy, Ban, Trash2, Key, Users, BookOpen, Sparkles, CheckCircle2, X, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const parseEdgeFunctionError = async (error: any): Promise<Error> => {
  let errMsg = error.message;
  if (error.context) {
    try {
      const res = typeof error.context.clone === 'function' ? error.context.clone() : error.context;
      if (typeof res.json === 'function') {
        const body = await res.json();
        if (body && body.error) {
          errMsg = body.error;
        }
      }
    } catch (e) {
      console.error("Failed to parse edge function error response body", e);
    }
  }
  return new Error(errMsg);
};

const AdminPartners = () => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [showNewPasswordPlain, setShowNewPasswordPlain] = useState(false);

  // Invite form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    partner_type: "agency" as "agency" | "freelancer" | "intern",
    license_qty: 10,
    license_unit_price: 500,
    notes: "",
  });
  const [lastAcceptUrl, setLastAcceptUrl] = useState<string | null>(null);

  // Direct Creation form state
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "pictocart",
    partner_type: "intern" as "agency" | "freelancer" | "intern",
    partner_id_code: "",
    password: "",
  });

  const [createOpenEffect, setCreateOpenEffect] = useState(false);
  // Auto-generate Partner ID and temporary password when modal opens
  useEffect(() => {
    if (createOpen) {
      const randomId = "pcc" + Math.floor(100 + Math.random() * 900);
      const randomPassword = "temp" + Math.floor(1000 + Math.random() * 9000);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        company_name: "pictocart",
        partner_type: "intern",
        partner_id_code: randomId,
        password: randomPassword,
      });
      setCreateError(null);
    }
  }, [createOpen]);

  // Demo Shop form state
  const [demoForm, setDemoForm] = useState({
    category: "Grocery",
    shop_name: "",
    shop_id: "",
    password: "",
    direct_access_url: "",
    extra_message: "",
  });

  // One time code form state
  const [otcCredits, setOtcCredits] = useState<number>(5000);

  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ qty: 1, unit_price: 0, notes: "", license_type: "starter" });
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ tier: "state_head", override_pct: 5, region_name: "", state_name: "" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignParentId, setAssignParentId] = useState<string>("");

  // 1. Partners Query
  const partnersQ = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Demo Shops Query
  const demoShopsQ = useQuery({
    queryKey: ["admin-demo-shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_demo_shops")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  // 3. One Time Codes Query
  const otcQ = useQuery({
    queryKey: ["admin-one-time-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_one_time_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  const summaryQ = useQuery({
    enabled: !!selected,
    queryKey: ["partner-summary", selected?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("partner_license_summary", { _partner_id: selected.id });
      return Array.isArray(data) ? data[0] : data;
    },
  });

  const batchesQ = useQuery({
    enabled: !!selected,
    queryKey: ["partner-batches", selected?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_license_batches")
        .select("*")
        .eq("partner_id", selected.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const licensesQ = useQuery({
    enabled: !!selected,
    queryKey: ["partner-licenses-admin", selected?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_licenses")
        .select(`
          id,
          license_type,
          license_key,
          status,
          consumed_at,
          consumed_by_store_id,
          stores ( name, slug )
        `)
        .eq("partner_id", selected.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const hiddenDemoShopsQ = useQuery({
    enabled: !!selected,
    queryKey: ["partner-hidden-demo-shops", selected?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partner_hidden_demo_shops")
        .select("demo_shop_id")
        .eq("partner_id", selected.id);
      if (error) throw error;
      return (data || []).map((row: any) => row.demo_shop_id) as string[];
    },
  });

  const storesQ = useQuery({
    enabled: !!selected,
    queryKey: ["partner-stores-admin", selected?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, slug, partner_handover_status, is_published, created_at")
        .eq("owned_by_partner_id", selected.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Mutate: Invite
  const invite = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        license_unit_price: form.partner_type === "intern" ? 0 : form.license_unit_price,
      };
      const { data, error } = await supabase.functions.invoke("partner-invite", { body: payload });
      if (error) {
        throw await parseEdgeFunctionError(error);
      }
      if (!data?.success) throw new Error(data?.error || "Failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Invite sent to ${form.email}`);
      setLastAcceptUrl(data.accept_url);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      setForm({ ...form, name: "", email: "", phone: "", company_name: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Mutate: Direct Create
  const [createError, setCreateError] = useState<string | null>(null);

  const directCreate = useMutation({
    mutationFn: async () => {
      setCreateError(null);
      if (createForm.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (!createForm.partner_id_code.startsWith("pcc")) {
        throw new Error("Partner ID Code must start with 'pcc'");
      }

      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "create_partner",
          email: createForm.email,
          password: createForm.password,
          partnerIdCode: createForm.partner_id_code,
          name: createForm.name,
          companyName: createForm.company_name,
          phone: createForm.phone,
          partnerType: createForm.partner_type,
        }
      });
      if (error) {
        throw await parseEdgeFunctionError(error);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success(`Partner ${createForm.name} created successfully with Partner ID ${createForm.partner_id_code}!`);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => {
      toast.error(e.message);
      setCreateError(e.message);
    },
  });

  const changePartnerPassword = useMutation({
    mutationFn: async () => {
      if (!selected?.user_id) throw new Error("No user ID associated with this partner");
      if (newPasswordVal.length < 6) throw new Error("Password must be at least 6 characters");

      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: "reset_password",
          userId: selected.user_id,
          newPassword: newPasswordVal,
        }
      });
      if (error) throw await parseEdgeFunctionError(error);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success(`Password updated successfully for partner ${selected?.name}!`);
      setChangePasswordOpen(false);
      setNewPasswordVal("");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to update password");
    }
  });

  // Mutate: Add Demo Shop
  const addDemoShop = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("partner_demo_shops")
        .insert(demoForm);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demo shop added!");
      setDemoOpen(false);
      setDemoForm({
        category: "Grocery",
        shop_name: "",
        shop_id: "",
        password: "",
        direct_access_url: "",
        extra_message: "",
      });
      qc.invalidateQueries({ queryKey: ["admin-demo-shops"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Mutate: Delete Demo Shop
  const deleteDemoShop = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_demo_shops")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demo shop deleted");
      qc.invalidateQueries({ queryKey: ["admin-demo-shops"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Mutate: Generate One Time Code
  const generateOneTimeCode = useMutation({
    mutationFn: async () => {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `OTC-${randomPart}`;
      
      const { error } = await supabase
        .from("partner_one_time_codes")
        .insert({
          code,
          credits: otcCredits,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("One time credit code generated!");
      qc.invalidateQueries({ queryKey: ["admin-one-time-codes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addBatch = useMutation({
    mutationFn: async () => {
      const total = batchForm.qty * batchForm.unit_price;
      const { error } = await supabase.from("partner_license_batches").insert({
        partner_id: selected.id,
        qty: batchForm.qty,
        unit_price_inr: batchForm.unit_price,
        total_inr: total,
        notes: batchForm.notes,
        license_type: batchForm.license_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Licenses added");
      setAddBatchOpen(false);
      setBatchForm({ qty: 1, unit_price: 0, notes: "", license_type: "starter" });
      qc.invalidateQueries({ queryKey: ["partner-batches", selected.id] });
      qc.invalidateQueries({ queryKey: ["partner-summary", selected.id] });
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("partners").update({ invite_status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeBatch = useMutation({
    mutationFn: async (batchId: string) => {
      const { error, count } = await supabase
        .from("partner_licenses")
        .update({ status: "revoked" }, { count: "exact" })
        .eq("batch_id", batchId)
        .eq("status", "available");
      if (error) throw error;
      return count ?? 0;
    },
    onSuccess: (count) => {
      toast.success(`Revoked ${count} available licenses`);
      qc.invalidateQueries({ queryKey: ["partner-batches", selected.id] });
      qc.invalidateQueries({ queryKey: ["partner-summary", selected.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeLicense = useMutation({
    mutationFn: async (licenseId: string) => {
      const { error } = await supabase
        .from("partner_licenses")
        .update({ status: "revoked" })
        .eq("id", licenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("License revoked successfully");
      qc.invalidateQueries({ queryKey: ["partner-licenses-admin", selected.id] });
      qc.invalidateQueries({ queryKey: ["partner-summary", selected.id] });
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLicense = useMutation({
    mutationFn: async (licenseId: string) => {
      const { error } = await supabase
        .from("partner_licenses")
        .delete()
        .eq("id", licenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("License deleted successfully");
      qc.invalidateQueries({ queryKey: ["partner-licenses-admin", selected.id] });
      qc.invalidateQueries({ queryKey: ["partner-summary", selected.id] });
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hideDemoShopForPartner = useMutation({
    mutationFn: async (demoShopId: string) => {
      const { error } = await (supabase as any)
        .from("partner_hidden_demo_shops")
        .insert({ partner_id: selected.id, demo_shop_id: demoShopId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-hidden-demo-shops", selected.id] });
      toast.success("Demo shop hidden for this partner");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const showDemoShopForPartner = useMutation({
    mutationFn: async (demoShopId: string) => {
      const { error } = await (supabase as any)
        .from("partner_hidden_demo_shops")
        .delete()
        .eq("partner_id", selected.id)
        .eq("demo_shop_id", demoShopId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-hidden-demo-shops", selected.id] });
      toast.success("Demo shop visibility restored");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { data: stores } = await supabase.from("stores").select("id").eq("owned_by_partner_id", id).limit(1);
      if (stores && stores.length > 0) {
        throw new Error("Cannot delete: partner has client stores. Reassign or remove them first.");
      }
      await supabase.from("partner_licenses").delete().eq("partner_id", id);
      await supabase.from("partner_license_batches").delete().eq("partner_id", id);
      await supabase.from("partner_invites").delete().eq("partner_id", id);
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partner deleted");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const promote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_promote_partner", {
        _partner_id: selected.id,
        _tier: promoteForm.tier,
        _override_pct: promoteForm.override_pct,
        _region_name: promoteForm.region_name || null,
        _state_name: promoteForm.state_name || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partner promoted");
      setPromoteOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      setSelected({ ...selected, tier: promoteForm.tier, override_commission_pct: promoteForm.override_pct });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignParent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("partners")
        .update({ parent_partner_id: assignParentId || null })
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parent partner updated");
      setAssignOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      setSelected({ ...selected, parent_partner_id: assignParentId });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const heads = (partnersQ.data ?? []).filter((p: any) => p.tier === "state_head" || p.tier === "regional_head");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage PicToCart partners, issue licensing, configure demo stores, and generate wallet credit codes.</p>
      </div>

      <Tabs defaultValue="partners" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg border">
          <TabsTrigger value="partners" className="gap-2"><Users className="w-4 h-4" /> Partners</TabsTrigger>
          <TabsTrigger value="demo-shops" className="gap-2"><BookOpen className="w-4 h-4" /> Demo Shops</TabsTrigger>
          <TabsTrigger value="one-time-codes" className="gap-2"><Key className="w-4 h-4" /> One-Time Codes</TabsTrigger>
        </TabsList>

        {/* TAB 1: Partners */}
        <TabsContent value="partners" className="space-y-6">
          <div className="flex items-center justify-end gap-2">
            {/* 1. Invite Partner */}
            <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setLastAcceptUrl(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-slate-300">
                  <Mail className="w-4 h-4 mr-2 text-slate-500" /> Invite Partner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite a new partner</DialogTitle>
                  <DialogDescription>
                    Sends an invitation email. Partner signs up and links their account.
                  </DialogDescription>
                </DialogHeader>
                {lastAcceptUrl ? (
                  <div className="space-y-3">
                    <p className="text-sm">Invite created. Share this link:</p>
                    <div className="flex gap-2">
                      <Input value={lastAcceptUrl} readOnly />
                      <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(lastAcceptUrl); toast.success("Copied"); }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => { setLastAcceptUrl(null); setInviteOpen(false); }}>Done</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Full name *</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Phone number</Label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div>
                        <Label>Company name</Label>
                        <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Partner type</Label>
                        <Select value={form.partner_type} onValueChange={(v: any) => setForm({ ...form, partner_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agency">Agency</SelectItem>
                            <SelectItem value="freelancer">Freelancer</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.partner_type !== "intern" && (
                        <div>
                          <Label>Unit Price (INR)</Label>
                          <Input type="number" value={form.license_unit_price} onChange={(e) => setForm({ ...form, license_unit_price: parseInt(e.target.value) || 0 })} />
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>License quantity</Label>
                      <Input type="number" value={form.license_qty} onChange={(e) => setForm({ ...form, license_qty: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>Internal notes</Label>
                      <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <DialogFooter>
                      <Button onClick={() => invite.mutate()} disabled={invite.isPending || !form.name || !form.email} className="bg-orange-600 hover:bg-orange-700">
                        {invite.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Send Invite
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* 2. Create Partner Directly */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-1" /> Create Partner Directly
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Partner Directly</DialogTitle>
                  <DialogDescription>
                    Instantly creates a partner account, user credentials, and provisions default basic/premium packages.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {createError && (
                    <div className="bg-red-50 text-red-600 border border-red-200 text-xs p-3 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{createError}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="c_name">Full Name *</Label>
                      <Input id="c_name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="c_id">Partner ID (pcc...) *</Label>
                      <Input id="c_id" placeholder="e.g. pcc123" value={createForm.partner_id_code} onChange={(e) => setCreateForm({ ...createForm, partner_id_code: e.target.value.toLowerCase().trim() })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="c_email">Email *</Label>
                      <Input id="c_email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value.trim() })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="c_pass">Password *</Label>
                      <Input id="c_pass" type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="c_phone">Phone</Label>
                      <Input id="c_phone" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="c_company">Company</Label>
                      <Input id="c_company" value={createForm.company_name} disabled className="bg-slate-100 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="c_type">Partner Type</Label>
                    <Select value={createForm.partner_type} onValueChange={(v: any) => setCreateForm({ ...createForm, partner_type: v })}>
                      <SelectTrigger id="c_type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                        <SelectItem value="agency">Agency</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={() => directCreate.mutate()} disabled={directCreate.isPending || !createForm.name || !createForm.email || !createForm.partner_id_code || !createForm.password} className="bg-orange-600 hover:bg-orange-700">
                      {directCreate.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Partner
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All partners ({partnersQ.data?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {partnersQ.isLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : partnersQ.data?.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">No partners yet. Click "Create Partner Directly" to add one.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                      <tr>
                        <th className="py-2">Partner</th>
                        <th>Partner ID</th>
                        <th>Tier</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Licenses</th>
                        <th>Total paid</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnersQ.data!.map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3">
                            <div className="font-medium text-slate-800">{p.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{p.email}</div>
                          </td>
                          <td className="font-mono text-xs">{p.partner_id_code || "—"}</td>
                          <td>
                            {p.tier && p.tier !== "partner" ? (
                              <Badge className={p.tier === "regional_head" ? "bg-purple-600" : "bg-blue-600"}>
                                {String(p.tier).replace("_", " ")} • {p.override_commission_pct}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Partner</span>
                            )}
                          </td>
                          <td className="capitalize">{p.partner_type}</td>
                          <td>
                            <Badge variant={p.invite_status === "active" ? "default" : p.invite_status === "suspended" ? "destructive" : "secondary"}>
                              {p.invite_status}
                            </Badge>
                          </td>
                          <td>{p.total_licenses_purchased}</td>
                          <td>₹{Number(p.total_amount_paid || 0).toLocaleString("en-IN")}</td>
                          <td className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => setSelected(p)}>
                              <Eye className="w-4 h-4 mr-1" /> View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Demo Shops */}
        <TabsContent value="demo-shops" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Demo Store Catalog</h2>
            
            <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-1" /> Add Demo Shop
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Demo Store</DialogTitle>
                  <DialogDescription>
                    Create a sandbox store reference details that partners can access instantly for demonstrations.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="d_cat">Category *</Label>
                      <Select value={demoForm.category} onValueChange={(v) => setDemoForm({ ...demoForm, category: v })}>
                        <SelectTrigger id="d_cat"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Grocery">Grocery</SelectItem>
                          <SelectItem value="Clothing">Clothing</SelectItem>
                          <SelectItem value="Restaurant">Restaurant</SelectItem>
                          <SelectItem value="Electronics">Electronics</SelectItem>
                          <SelectItem value="Jewellery">Jewellery</SelectItem>
                          <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="d_name">Shop Name *</Label>
                      <Input id="d_name" value={demoForm.shop_name} onChange={(e) => setDemoForm({ ...demoForm, shop_name: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="d_id">Shop / User ID *</Label>
                      <Input id="d_id" value={demoForm.shop_id} onChange={(e) => setDemoForm({ ...demoForm, shop_id: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="d_pass">Password *</Label>
                      <Input id="d_pass" value={demoForm.password} onChange={(e) => setDemoForm({ ...demoForm, password: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="d_url">Direct Access URL</Label>
                    <Input id="d_url" placeholder="https://..." value={demoForm.direct_access_url} onChange={(e) => setDemoForm({ ...demoForm, direct_access_url: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="d_msg">Extra Notes/Message</Label>
                    <Textarea id="d_msg" rows={2} placeholder="e.g. Try applying custom orange template" value={demoForm.extra_message} onChange={(e) => setDemoForm({ ...demoForm, extra_message: e.target.value })} />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => setDemoOpen(false)}>Cancel</Button>
                    <Button onClick={() => addDemoShop.mutate()} disabled={addDemoShop.isPending || !demoForm.shop_name || !demoForm.shop_id || !demoForm.password} className="bg-orange-600 hover:bg-orange-700">
                      {addDemoShop.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save Shop
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {demoShopsQ.isLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : demoShopsQ.data?.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">No demo shops configured. Click "Add Demo Shop" to add one.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                      <tr>
                        <th className="py-2">Category</th>
                        <th>Shop Name</th>
                        <th>Shop ID</th>
                        <th>Password</th>
                        <th>URL</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoShopsQ.data!.map((shop: any) => (
                        <tr key={shop.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 font-semibold text-orange-600">{shop.category}</td>
                          <td className="font-medium text-slate-800">{shop.shop_name}</td>
                          <td className="font-mono text-xs">{shop.shop_id}</td>
                          <td className="font-mono text-xs text-slate-500">{shop.password}</td>
                          <td className="max-w-[200px] truncate font-mono text-xs text-slate-400">
                            {shop.direct_access_url ? (
                              <a href={shop.direct_access_url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-orange-500">
                                {shop.direct_access_url}
                              </a>
                            ) : "—"}
                          </td>
                          <td className="text-right">
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => deleteDemoShop.mutate(shop.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: One-Time Credit Codes */}
        <TabsContent value="one-time-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Credit Codes</CardTitle>
              <CardDescription>Codes created here can be shared with partners to recharge their AI wallets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end gap-4 max-w-md bg-slate-50 p-4 rounded-lg border">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="code_credits">Credit Value</Label>
                  <Input 
                    id="code_credits" 
                    type="number" 
                    value={otcCredits} 
                    onChange={(e) => setOtcCredits(parseInt(e.target.value) || 0)} 
                    className="bg-white"
                  />
                </div>
                <Button onClick={() => generateOneTimeCode.mutate()} disabled={generateOneTimeCode.isPending} className="bg-orange-600 hover:bg-orange-700">
                  {generateOneTimeCode.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Generate Code
                </Button>
              </div>

              {/* Codes list */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Generated Recharge Codes</h3>
                {otcQ.isLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : otcQ.data?.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10 border border-dashed rounded-lg bg-slate-50/50">No codes generated yet.</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-left text-xs uppercase text-muted-foreground border-b">
                        <tr>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Credits</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Used By</th>
                          <th className="px-4 py-3">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otcQ.data!.map((code: any) => (
                          <tr key={code.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800 flex items-center gap-2 select-all">
                              {code.code}
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-slate-600" onClick={() => { navigator.clipboard.writeText(code.code); toast.success("Copied!"); }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">{code.credits.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              {code.is_used ? (
                                <Badge className="bg-slate-100 text-slate-500 border-slate-200" variant="outline">Redeemed</Badge>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100" variant="outline">Unused</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">
                              {code.is_used ? (partnersQ.data?.find((p: any) => p.id === code.used_by_partner_id)?.name || code.used_by_partner_id || "N/A") : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {new Date(code.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Side Sheet details remain intact for Partner list */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{selected.email} • <span className="capitalize">{selected.partner_type}</span></SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="rounded-lg bg-orange-50 p-3">
                    <div className="text-2xl font-bold text-orange-600">{summaryQ.data?.available ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Available</div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-2xl font-bold">{summaryQ.data?.consumed ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Used</div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-2xl font-bold">{summaryQ.data?.total ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-2xl font-bold">{summaryQ.data?.revoked ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Revoked</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">License batches</h3>
                    <Dialog open={addBatchOpen} onOpenChange={setAddBatchOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" /> Add licenses</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add licenses to {selected.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <Label>License Type</Label>
                            <Select 
                              value={batchForm.license_type} 
                              onValueChange={(val) => setBatchForm({ ...batchForm, license_type: val })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select license type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="starter">Starter</SelectItem>
                                <SelectItem value="growth">Growth</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input type="number" min={1} value={batchForm.qty} onChange={(e) => setBatchForm({ ...batchForm, qty: parseInt(e.target.value) || 1 })} />
                          </div>
                          <div>
                            <Label>Price per license (₹)</Label>
                            <Input type="number" min={0} value={batchForm.unit_price} onChange={(e) => setBatchForm({ ...batchForm, unit_price: parseFloat(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <Label>Notes</Label>
                            <Textarea rows={2} value={batchForm.notes} onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Total: ₹{(batchForm.qty * batchForm.unit_price).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => addBatch.mutate()} disabled={addBatch.isPending}>
                            {addBatch.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Add
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="border rounded-lg divide-y text-sm">
                    {batchesQ.data?.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No batches yet</div>
                    ) : batchesQ.data?.map((b: any) => (
                      <div key={b.id} className="p-3 flex justify-between items-center gap-3">
                        <div>
                          <div className="font-medium">
                            {b.qty} x <span className="capitalize font-semibold">{b.license_type || "starter"}</span> @ ₹{Number(b.unit_price_inr).toLocaleString("en-IN")}
                          </div>
                          <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div className="font-semibold flex items-center"><IndianRupee className="w-3 h-3" />{Number(b.total_inr).toLocaleString("en-IN")}</div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" title="Revoke remaining available licenses in this batch">
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke remaining licenses?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This marks all unused licenses in this batch as revoked. Already-consumed licenses (active client stores) are unaffected.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeBatch.mutate(b.id)}>Revoke</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2">All License Keys ({licensesQ.data?.length ?? 0})</h3>
                  <div className="border rounded-lg divide-y text-sm max-h-80 overflow-y-auto">
                    {licensesQ.isLoading ? (
                      <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-orange-500" /></div>
                    ) : licensesQ.data?.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No licenses found</div>
                    ) : licensesQ.data?.map((l: any) => (
                      <div key={l.id} className="p-3 flex justify-between items-center gap-3 hover:bg-slate-50/50">
                        <div className="space-y-1">
                          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{l.license_key || "No Key"}</div>
                          <div className="flex gap-2 items-center text-xs">
                            <span className="capitalize font-semibold text-slate-600 dark:text-slate-400">{l.license_type || "starter"}</span>
                            <span>•</span>
                            <span className={`capitalize ${
                              l.status === 'available' ? 'text-emerald-600 font-medium' :
                              l.status === 'consumed' ? 'text-slate-500' : 'text-red-500'
                            }`}>{l.status}</span>
                            {l.status === 'consumed' && l.stores?.name && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600 dark:text-slate-400 font-medium">Used by: {l.stores.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {l.status === 'available' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => revokeLicense.mutate(l.id)}
                              disabled={revokeLicense.isPending}
                              className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                              title="Revoke License"
                            >
                              Revoke
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              if (confirm("Are you sure you want to permanently delete this license key?")) {
                                deleteLicense.mutate(l.id);
                              }
                            }}
                            disabled={deleteLicense.isPending}
                            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-red-50"
                            title="Delete License"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Demo Store Visibility</h3>
                  <div className="border rounded-lg divide-y text-sm max-h-60 overflow-y-auto">
                    {demoShopsQ.isLoading || hiddenDemoShopsQ.isLoading ? (
                      <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-orange-500" /></div>
                    ) : (demoShopsQ.data || []).length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No demo stores configured</div>
                    ) : (demoShopsQ.data || []).map((shop: any) => {
                      const isHidden = (hiddenDemoShopsQ.data || []).includes(shop.id);
                      return (
                        <div key={shop.id} className="p-3 flex justify-between items-center gap-3 hover:bg-slate-50/50">
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">{shop.shop_name}</div>
                            <div className="flex gap-2 items-center text-xs text-slate-500 mt-0.5">
                              <span className="capitalize">{shop.category}</span>
                              <span>•</span>
                              <span>ID: {shop.shop_id}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={isHidden ? "destructive" : "outline"}
                            onClick={() => {
                              if (isHidden) {
                                showDemoShopForPartner.mutate(shop.id);
                              } else {
                                hideDemoShopForPartner.mutate(shop.id);
                              }
                            }}
                            disabled={hideDemoShopForPartner.isPending || showDemoShopForPartner.isPending}
                            className="h-8 text-xs shrink-0"
                          >
                            {isHidden ? "Hidden (Show)" : "Visible (Hide)"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Client stores ({storesQ.data?.length ?? 0})</h3>
                  <div className="border rounded-lg divide-y text-sm">
                    {storesQ.data?.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No stores built yet</div>
                    ) : storesQ.data?.map((s: any) => (
                      <div key={s.id} className="p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{s.name || s.slug}</div>
                          <div className="text-xs text-muted-foreground">/{s.slug}</div>
                        </div>
                        <Badge variant={s.partner_handover_status === "paid" ? "default" : "secondary"}>
                          {s.partner_handover_status || "building"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Hierarchy</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setPromoteForm({
                          tier: selected.tier === "regional_head" ? "regional_head" : "state_head",
                          override_pct: selected.override_commission_pct || 5,
                          region_name: selected.region_name || "",
                          state_name: selected.state_name || "",
                        });
                        setPromoteOpen(true);
                      }}>Promote</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setAssignParentId(selected.parent_partner_id || "");
                        setAssignOpen(true);
                      }}>Assign parent</Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                    <div>Tier: <span className="font-medium capitalize text-foreground">{String(selected.tier || "partner").replace("_", " ")}</span></div>
                    <div>Override: <span className="font-medium text-foreground">{selected.override_commission_pct || 0}%</span></div>
                    <div>Region: <span className="text-foreground">{selected.region_name || "—"}</span></div>
                    <div>State: <span className="text-foreground">{selected.state_name || "—"}</span></div>
                    <div className="col-span-2">Parent: <span className="text-foreground">
                      {selected.parent_partner_id ? (partnersQ.data?.find((p: any) => p.id === selected.parent_partner_id)?.name || "—") : "None"}
                    </span></div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t flex-wrap">
                  {selected.invite_status === "active" ? (
                    <Button variant="destructive" size="sm" onClick={() => updateStatus.mutate({ id: selected.id, status: "suspended" })}>
                      Suspend partner
                    </Button>
                  ) : selected.invite_status === "suspended" ? (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: selected.id, status: "active" })}>
                      Reactivate
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled><Mail className="w-3.5 h-3.5 mr-1" /> Invite pending</Button>
                  )}
                  {selected.user_id && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const randomPassword = "temp" + Math.floor(1000 + Math.random() * 9000);
                        setNewPasswordVal(randomPassword);
                        setShowNewPasswordPlain(true);
                        setChangePasswordOpen(true);
                      }}
                    >
                      <Key className="w-3.5 h-3.5 mr-1" /> Change Password
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-auto text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete partner
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the partner along with all their licenses, batches and pending invites. Partners with active client stores cannot be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deletePartner.mutate(selected.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password for {selected?.name}</DialogTitle>
            <DialogDescription>
              Set a new login password for this partner. For security reasons, the current password cannot be read from the database, but you can override it or generate a temporary one here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="partner_new_pass">New Password *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    id="partner_new_pass"
                    type={showNewPasswordPlain ? "text" : "password"} 
                    placeholder="Enter at least 6 characters"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordPlain(!showNewPasswordPlain)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    title={showNewPasswordPlain ? "Hide password" : "Show password"}
                  >
                    {showNewPasswordPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    const rand = "temp" + Math.floor(1000 + Math.random() * 9000);
                    setNewPasswordVal(rand);
                    setShowNewPasswordPlain(true);
                  }}
                  title="Generate random password"
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => changePartnerPassword.mutate()} 
              disabled={changePartnerPassword.isPending || newPasswordVal.length < 6}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {changePartnerPassword.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote {selected?.name}</DialogTitle>
            <DialogDescription>
              Set as a State Head or Regional Head. They will earn override commission on every sale by partners in their downline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tier</Label>
              <Select value={promoteForm.tier} onValueChange={(v) => setPromoteForm({ ...promoteForm, tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner (revert)</SelectItem>
                  <SelectItem value="state_head">State Head</SelectItem>
                  <SelectItem value="regional_head">Regional Head</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Override commission %</Label>
              <Input type="number" min={0} max={50} step={0.5}
                value={promoteForm.override_pct}
                onChange={(e) => setPromoteForm({ ...promoteForm, override_pct: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>State name</Label>
                <Input value={promoteForm.state_name} onChange={(e) => setPromoteForm({ ...promoteForm, state_name: e.target.value })} placeholder="e.g. Maharashtra" />
              </div>
              <div>
                <Label>Region name</Label>
                <Input value={promoteForm.region_name} onChange={(e) => setPromoteForm({ ...promoteForm, region_name: e.target.value })} placeholder="e.g. North India" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)}>Cancel</Button>
            <Button onClick={() => promote.mutate()} disabled={promote.isPending} className="bg-orange-600 hover:bg-orange-700">
              {promote.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign parent for {selected?.name}</DialogTitle>
            <DialogDescription>
              Attach this partner under a State Head or Regional Head. Their sales will accrue override commission to the upline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Parent (State / Regional Head)</Label>
              <Select value={assignParentId || "__none__"} onValueChange={(v) => setAssignParentId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select a head" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {heads.filter((h: any) => h.id !== selected?.id).map((h: any) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} — {String(h.tier).replace("_", " ")} ({h.override_commission_pct}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={() => assignParent.mutate()} disabled={assignParent.isPending} className="bg-orange-600 hover:bg-orange-700">
              {assignParent.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPartners;
