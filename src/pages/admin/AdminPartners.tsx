import { useState } from "react";
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
import { toast } from "sonner";
import { Plus, Eye, IndianRupee, Mail, Loader2, Copy, Ban, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const AdminPartners = () => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

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

  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ qty: 1, unit_price: 0, notes: "" });

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

  const invite = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        license_unit_price: form.partner_type === "intern" ? 0 : form.license_unit_price,
      };
      const { data, error } = await supabase.functions.invoke("partner-invite", { body: payload });
      if (error) throw error;
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

  const addBatch = useMutation({
    mutationFn: async () => {
      const total = batchForm.qty * batchForm.unit_price;
      const { error } = await supabase.from("partner_license_batches").insert({
        partner_id: selected.id,
        qty: batchForm.qty,
        unit_price_inr: batchForm.unit_price,
        total_inr: total,
        notes: batchForm.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Licenses added");
      setAddBatchOpen(false);
      setBatchForm({ qty: 1, unit_price: 0, notes: "" });
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
      toast.success(`Revoked ${count} available license${count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["partner-batches", selected.id] });
      qc.invalidateQueries({ queryKey: ["partner-summary", selected.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      // Block delete if partner already has consumed licenses / stores
      const { data: stores } = await supabase.from("stores").select("id").eq("owned_by_partner_id", id).limit(1);
      if (stores && stores.length > 0) {
        throw new Error("Cannot delete: partner has client stores. Reassign or remove them first.");
      }
      // Remove dependents that may not cascade
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Program</h1>
          <p className="text-muted-foreground">Agencies, freelancers and interns building stores for clients.</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setLastAcceptUrl(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-1" /> Invite partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invite a new partner</DialogTitle>
              <DialogDescription>
                Allocate licenses at a custom price. Interns are free (₹0). An invite email branded as Pic To Cart will be sent.
              </DialogDescription>
            </DialogHeader>
            {lastAcceptUrl ? (
              <div className="space-y-3">
                <p className="text-sm">Invite created. Share this link if email is delayed:</p>
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
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Partner type *</Label>
                    <Select value={form.partner_type} onValueChange={(v: any) => setForm({ ...form, partner_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agency">Agency</SelectItem>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                        <SelectItem value="intern">Intern / Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label># of licenses *</Label>
                    <Input type="number" min={1} value={form.license_qty} onChange={(e) => setForm({ ...form, license_qty: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Price per license (₹)</Label>
                    <Input
                      type="number" min={0}
                      disabled={form.partner_type === "intern"}
                      value={form.partner_type === "intern" ? 0 : form.license_unit_price}
                      onChange={(e) => setForm({ ...form, license_unit_price: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: ₹{((form.partner_type === "intern" ? 0 : form.license_unit_price) * form.license_qty).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label>Internal notes</Label>
                    <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => invite.mutate()} disabled={invite.isPending || !form.name || !form.email} className="bg-orange-600 hover:bg-orange-700">
                    {invite.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Send invite
                  </Button>
                </DialogFooter>
              </div>
            )}
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
            <div className="text-center text-muted-foreground py-10">No partners yet. Click "Invite partner" to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">Partner</th>
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
                        <div className="font-medium">{p.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
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
                          <div className="font-medium">{b.qty} licenses @ ₹{Number(b.unit_price_inr).toLocaleString("en-IN")}</div>
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

                <div className="flex gap-2 pt-4 border-t">
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
    </div>
  );
};

export default AdminPartners;
