import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Trophy } from "lucide-react";

const fmt = (n: number) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const isoToday = () => new Date().toISOString().slice(0, 10);
const isoAgo = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const AdminPartnerAnalytics = () => {
  const [from, setFrom] = useState(isoAgo(30));
  const [to, setTo] = useState(isoToday());
  const [metric, setMetric] = useState<"commission" | "licenses" | "gmv">("commission");

  const lbQ = useQuery({
    queryKey: ["partner-leaderboard", from, to, metric],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("partner_leaderboard", {
        _from: from, _to: to, _metric: metric, _head_partner_id: null,
      });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const totals = useMemo(() => {
    const rows = lbQ.data ?? [];
    return rows.reduce(
      (a, r: any) => ({
        gmv: a.gmv + Number(r.gmv || 0),
        commission: a.commission + Number(r.commission || 0),
        licenses: a.licenses + Number(r.licenses || 0),
      }),
      { gmv: 0, commission: 0, licenses: 0 },
    );
  }, [lbQ.data]);

  const exportCsv = () => {
    const rows = lbQ.data ?? [];
    const lines = [
      "rank,partner,tier,state,licenses,gmv,commission",
      ...rows.map((r: any) =>
        [r.rank, JSON.stringify(r.partner_name ?? ""), r.tier, JSON.stringify(r.state_name ?? ""), r.licenses, r.gmv, r.commission].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `partner-leaderboard-${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner Analytics</h1>
        <p className="text-sm text-muted-foreground">Leaderboard, GMV, commissions across all partners and downlines.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>Rank by</Label>
            <select className="border rounded h-9 px-2 text-sm" value={metric} onChange={(e) => setMetric(e.target.value as any)}>
              <option value="commission">Commission</option>
              <option value="gmv">GMV</option>
              <option value="licenses">Licenses</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2">
            {[
              { l: "7d", d: 7 }, { l: "30d", d: 30 }, { l: "90d", d: 90 }, { l: "YTD", d: 365 },
            ].map((p) => (
              <Button key={p.l} variant="outline" size="sm"
                onClick={() => { setFrom(isoAgo(p.d)); setTo(isoToday()); }}>
                {p.l}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="py-4">
          <div className="text-xs text-muted-foreground">Total GMV</div>
          <div className="text-2xl font-bold">{fmt(totals.gmv)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="text-xs text-muted-foreground">Total commission</div>
          <div className="text-2xl font-bold">{fmt(totals.commission)}</div>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="text-xs text-muted-foreground">Licenses sold</div>
          <div className="text-2xl font-bold">{totals.licenses}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Leaderboard</CardTitle>
          <CardDescription>Ranked by {metric} from {from} to {to}.</CardDescription>
        </CardHeader>
        <CardContent>
          {lbQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Licenses</TableHead>
                  <TableHead className="text-right">GMV</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lbQ.data ?? []).map((r: any) => (
                  <TableRow key={r.partner_id}>
                    <TableCell className="font-semibold">{r.rank}</TableCell>
                    <TableCell>{r.partner_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.tier}</Badge></TableCell>
                    <TableCell className="text-xs">{r.state_name ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.licenses}</TableCell>
                    <TableCell className="text-right">{fmt(r.gmv)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.commission)}</TableCell>
                  </TableRow>
                ))}
                {(lbQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No data in this range.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPartnerAnalytics;
