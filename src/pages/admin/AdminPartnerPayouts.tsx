import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Play, IndianRupee, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const todayMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const AdminPartnerPayouts = () => {
  const qc = useQueryClient();
  const [periodMonth, setPeriodMonth] = useState<string>(todayMonth());
  const [runOpen, setRunOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [utr, setUtr] = useState("");
  const [method, setMethod] = useState<string>("upi");

  const pendingQ = useQuery({
    queryKey: ["admin-pending-payouts", periodMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_pending_payouts_summary", { _period_month: periodMonth });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const payoutsQ = useQuery({
    queryKey: ["admin-partner-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_payouts")
        .select("*, partner:partners(name, email, upi_id, bank_account_number, bank_ifsc, tier)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalPending = (pendingQ.data ?? []).reduce((s, r: any) => s + Number(r.pending_amount || 0), 0);
  const totalPartners = (pendingQ.data ?? []).length;

  const runBatch = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc("admin_run_payout_batch", {
        _period_month: periodMonth,
        _method: method,
      });
      if (error) throw error;
      const res = Array.isArray(data) ? data[0] : data;
      toast.success(`Created ${res?.payouts_created ?? 0} payouts · ${fmt(res?.total_amount ?? 0)}`);
      setRunOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-pending-payouts"] });
      qc.invalidateQueries({ queryKey: ["admin-partner-payouts"] });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setRunning(false);
    }
  };

  const markPaid = useMutation({
    mutationFn: async () => {
      if (!payTarget) return;
      const { error } = await supabase.rpc("admin_mark_payout_paid", {
        _payout_id: payTarget.id,
        _utr: utr || null,
        _method: payTarget.method || method,
      });
      if (error) throw error;
      // Notification email (fire-and-forget)
      if (payTarget.partner?.email) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "partner-payout-paid",
            recipientEmail: payTarget.partner.email,
            idempotencyKey: `payout-paid-${payTarget.id}`,
            templateData: {
              partnerName: payTarget.partner.name,
              amountInr: Number(payTarget.amount),
              utr: utr || payTarget.utr || undefined,
              method: payTarget.method || method,
              periodLabel: payTarget.period || undefined,
              commissionCount: payTarget.commission_count ?? 0,
            },
          },
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      toast.success("Payout marked as paid");
      setPayTarget(null);
      setUtr("");
      qc.invalidateQueries({ queryKey: ["admin-partner-payouts"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Partner Payouts</h1>
          <p className="text-sm text-muted-foreground">Generate monthly payout batches and track partner payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="w-44"
          />
          <Button onClick={() => setRunOpen(true)} className="gap-2">
            <Play className="h-4 w-4" /> Run batch
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="py-4">
          <div className="text-xs text-muted-foreground">Partners owed</div>
          <div className="text-2xl font-bold">{totalPartners}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="text-xs text-muted-foreground">Total pending</div>
          <div className="text-2xl font-bold">{fmt(totalPending)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="text-xs text-muted-foreground">Period cutoff</div>
          <div className="text-2xl font-bold">{periodMonth}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending commissions by partner</CardTitle>
          <CardDescription>All unpaid commissions up to and including the selected month.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Payout details</TableHead>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">Direct</TableHead>
                  <TableHead className="text-right">Override</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pendingQ.data ?? []).map((r: any) => (
                  <TableRow key={r.partner_id}>
                    <TableCell>
                      <div className="font-medium">{r.partner_name}</div>
                      <div className="text-xs text-muted-foreground">{r.partner_email}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.tier}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {r.upi_id ? <div>UPI: {r.upi_id}</div> : null}
                      {r.bank_account_number ? <div>A/C: {r.bank_account_number} · {r.bank_ifsc}</div> : null}
                      {!r.upi_id && !r.bank_account_number && <span className="text-destructive">No payout method</span>}
                    </TableCell>
                    <TableCell className="text-right">{r.commission_count}</TableCell>
                    <TableCell className="text-right">{fmt(r.direct_amount)}</TableCell>
                    <TableCell className="text-right">{fmt(r.override_amount)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.pending_amount)}</TableCell>
                  </TableRow>
                ))}
                {(pendingQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No pending payouts.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutsQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>UTR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payoutsQ.data ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.partner?.name ?? p.partner_id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{p.partner?.email}</div>
                    </TableCell>
                    <TableCell className="text-xs">{p.period ?? "—"}</TableCell>
                    <TableCell className="uppercase text-xs">{p.method ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.utr ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(p.amount)}</TableCell>
                    <TableCell className="text-right">
                      {p.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => { setPayTarget(p); setUtr(p.utr ?? ""); setMethod(p.method ?? "upi"); }}>
                          Mark paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(payoutsQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No payouts yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run payout batch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create one payout per partner for all pending commissions on or before <strong>{periodMonth}</strong>.
            Total: <strong>{fmt(totalPending)}</strong> across <strong>{totalPartners}</strong> partners.
          </p>
          <div className="space-y-2">
            <Label>Default method</Label>
            <select className="w-full border rounded h-9 px-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRunOpen(false)}>Cancel</Button>
            <Button onClick={runBatch} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <IndianRupee className="h-4 w-4" />}
              Create payouts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark payout as paid</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {payTarget?.partner?.name} · {fmt(payTarget?.amount ?? 0)} ({payTarget?.period})
          </p>
          <div className="space-y-2">
            <Label>UTR / Reference</Label>
            <Input placeholder="e.g. AXIS123456789" value={utr} onChange={(e) => setUtr(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button onClick={() => markPaid.mutate()} disabled={markPaid.isPending} className="gap-2">
              {markPaid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPartnerPayouts;
