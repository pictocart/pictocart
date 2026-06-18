import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Store, Ticket, Loader2, LogOut, Send } from "lucide-react";
import { toast } from "sonner";

const PartnerDashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();

  const partnerQ = useQuery({
    enabled: !!user,
    queryKey: ["my-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const summaryQ = useQuery({
    enabled: !!partnerQ.data?.id,
    queryKey: ["partner-license-summary", partnerQ.data?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("partner_license_summary", { _partner_id: partnerQ.data!.id });
      return Array.isArray(data) ? data[0] : data;
    },
  });

  const storesQ = useQuery({
    enabled: !!partnerQ.data?.id,
    queryKey: ["partner-stores", partnerQ.data?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, slug, is_published, partner_handover_status, created_at, user_id")
        .eq("owned_by_partner_id", partnerQ.data!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (partnerQ.isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!partnerQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Not a partner account</CardTitle>
            <CardDescription>
              This area is only available to invited Pic To Cart partners. If you should have access, contact us at partners@pictocart.in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = summaryQ.data ?? { total: 0, available: 0, consumed: 0, revoked: 0 };
  const partner = partnerQ.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 to-amber-50/40">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-orange-600 tracking-widest">PIC TO CART</div>
            <h1 className="text-xl font-bold">Partner Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {(partner.tier === "state_head" || partner.tier === "regional_head") && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/partner/hierarchy">Hierarchy</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/partner/payouts">My Payouts</Link>
            </Button>
            <div className="text-right text-sm">
              <div className="font-semibold">{partner.name}</div>
              <div className="text-muted-foreground capitalize">
                {partner.tier && partner.tier !== "partner" ? String(partner.tier).replace("_", " ") : partner.partner_type}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Available licenses" value={s.available} icon={<Ticket className="w-5 h-5 text-orange-600" />} accent />
          <StatCard label="Stores built" value={s.consumed} icon={<Store className="w-5 h-5" />} />
          <StatCard label="Total purchased" value={s.total} />
          <StatCard label="Revoked" value={s.revoked} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your client stores</CardTitle>
              <CardDescription>Build a store using one license, then hand it over to your client.</CardDescription>
            </div>
            <Button asChild className="bg-orange-600 hover:bg-orange-700" disabled={s.available <= 0}>
              <Link to="/partner/stores/new">
                <Plus className="w-4 h-4 mr-1" /> New client store
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {storesQ.isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : storesQ.data?.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No client stores yet. Click "New client store" to spend a license and start building.
              </div>
            ) : (
              <div className="divide-y">
                {storesQ.data!.map((store: any) => (
                  <div key={store.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">{store.name || store.slug}</div>
                      <div className="text-xs text-muted-foreground">/{store.slug}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge store={store} />
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/dashboard?store=${store.id}`}>Manage</Link>
                      </Button>
                      {!store.partner_handover_status && (
                        <HandoverButton storeId={store.id} storeName={store.name || store.slug} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How licenses work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Each license you spend creates one client store you can build and customise completely.</p>
            <p>• When ready, hand over the store to your client by entering their email and selecting a plan (Starter ₹5,500 / Growth ₹16,500 / Scale ₹55,000 per year).</p>
            <p>• Your client pays Pic To Cart for the yearly plan directly. You charge them separately for your build & customisation work.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const HandoverButton = ({ storeId, storeName }: { storeId: string; storeName: string }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("starter");
  const [submitting, setSubmitting] = useState(false);

  const send = async () => {
    if (!email.includes("@")) { toast.error("Enter a valid client email"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-handover-invite", {
        body: { store_id: storeId, client_email: email, plan },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      toast.success(`Invite sent to ${email}`);
      qc.invalidateQueries({ queryKey: ["partner-stores"] });
      setOpen(false);
      setEmail("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
          <Send className="w-3.5 h-3.5 mr-1" /> Send to client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hand over "{storeName}"</DialogTitle>
          <DialogDescription>
            Your client will get an email to set a password and take ownership of the store.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Client email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter — ₹5,500 / year</SelectItem>
                <SelectItem value="growth">Growth — ₹16,500 / year</SelectItem>
                <SelectItem value="scale">Scale — ₹55,000 / year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={send} disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const StatCard = ({ label, value, icon, accent }: { label: string; value: number; icon?: React.ReactNode; accent?: boolean }) => (
  <Card className={accent ? "border-orange-200 bg-orange-50/50" : ""}>
    <CardContent className="pt-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold">{value ?? 0}</div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ store }: { store: any }) => {
  if (store.partner_handover_status === "paid") return <Badge className="bg-green-500">Live</Badge>;
  if (store.partner_handover_status === "accepted") return <Badge className="bg-blue-500">Awaiting payment</Badge>;
  if (store.partner_handover_status === "pending") return <Badge variant="secondary">Invited client</Badge>;
  return <Badge variant="outline">Building</Badge>;
};

export default PartnerDashboard;
