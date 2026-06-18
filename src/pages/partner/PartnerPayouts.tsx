import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Save, IndianRupee } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const PartnerPayouts = () => {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ upi_id: "", bank_account_number: "", bank_ifsc: "", bank_account_holder: "", pan: "" });

  const partnerQ = useQuery({
    enabled: !!user,
    queryKey: ["my-partner-payouts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (partnerQ.data) {
      setForm({
        upi_id: partnerQ.data.upi_id ?? "",
        bank_account_number: partnerQ.data.bank_account_number ?? "",
        bank_ifsc: partnerQ.data.bank_ifsc ?? "",
        bank_account_holder: partnerQ.data.bank_account_holder ?? "",
        pan: partnerQ.data.pan ?? "",
      });
    }
  }, [partnerQ.data]);

  const statsQ = useQuery({
    enabled: !!partnerQ.data?.id,
    queryKey: ["partner-self-stats", partnerQ.data?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("partner_self_stats", { _partner_id: partnerQ.data!.id });
      return Array.isArray(data) ? data[0] : data;
    },
  });

  const payoutsQ = useQuery({
    enabled: !!partnerQ.data?.id,
    queryKey: ["my-payouts", partnerQ.data?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_payouts")
        .select("*")
        .eq("partner_id", partnerQ.data!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const commissionsQ = useQuery({
    enabled: !!partnerQ.data?.id,
    queryKey: ["my-commissions", partnerQ.data?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_commissions")
        .select("*")
        .eq("partner_id", partnerQ.data!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partners").update(form).eq("id", partnerQ.data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout details saved");
      qc.invalidateQueries({ queryKey: ["my-partner-payouts"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  if (authLoading || partnerQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!partnerQ.data) return <Navigate to="/partner" replace />;

  const s = statsQ.data ?? ({} as any);

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/partner" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
            <h1 className="text-2xl font-bold mt-1">My Payouts</h1>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Card><CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Lifetime earned</div>
            <div className="text-2xl font-bold">{fmt(s.lifetime_commission ?? 0)}</div>
          </CardContent></Card>
          <Card><CardContent className="py-4">
            <div className="text-xs text-muted-foreground">This month</div>
            <div className="text-2xl font-bold">{fmt(s.this_month_commission ?? 0)}</div>
          </CardContent></Card>
          <Card><CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Pending payout</div>
            <div className="text-2xl font-bold text-amber-600">{fmt(s.pending_payout ?? 0)}</div>
          </CardContent></Card>
          <Card><CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Paid out</div>
            <div className="text-2xl font-bold">{fmt(s.paid_out ?? 0)}</div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payout details</CardTitle>
            <CardDescription>We'll use these to send your commissions monthly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>UPI ID</Label>
                <Input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} placeholder="name@bank" />
              </div>
              <div>
                <Label>PAN</Label>
                <Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
              </div>
              <div>
                <Label>Account holder name</Label>
                <Input value={form.bank_account_holder} onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })} />
              </div>
              <div>
                <Label>Bank account number</Label>
                <Input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
              </div>
              <div>
                <Label>IFSC</Label>
                <Input value={form.bank_ifsc} onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" />
              </div>
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payout history</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>UTR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payoutsQ.data ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.period ?? "—"}</TableCell>
                    <TableCell className="uppercase text-xs">{p.method}</TableCell>
                    <TableCell className="font-mono text-xs">{p.utr ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(p.amount)}</TableCell>
                  </TableRow>
                ))}
                {(payoutsQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No payouts yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Recent commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(commissionsQ.data ?? []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.period_month}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.commission_type}</Badge></TableCell>
                    <TableCell className="text-xs">{c.source_kind ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{c.status}</Badge></TableCell>
                    <TableCell className="text-right">{fmt(c.base_amount)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(c.commission_amount)}</TableCell>
                  </TableRow>
                ))}
                {(commissionsQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No commissions yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerPayouts;
