import { useQuery } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Users, IndianRupee, TrendingUp } from "lucide-react";

const PartnerHierarchy = () => {
  const { user, loading: authLoading } = useAuth();

  const partnerQ = useQuery({
    enabled: !!user,
    queryKey: ["my-partner-head", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const partner = partnerQ.data;
  const isHead = partner && (partner.tier === "state_head" || partner.tier === "regional_head");

  const summaryQ = useQuery({
    enabled: !!partner?.id && !!isHead,
    queryKey: ["head-summary", partner?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("head_downline_summary", { _head_partner_id: partner!.id });
      return Array.isArray(data) ? data[0] : data;
    },
  });

  const downlineQ = useQuery({
    enabled: !!partner?.id && !!isHead,
    queryKey: ["head-downline", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, email, tier, partner_type, invite_status, total_licenses_purchased, total_amount_paid, state_name, region_name")
        .eq("parent_partner_id", partner!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const commissionsQ = useQuery({
    enabled: !!partner?.id && !!isHead,
    queryKey: ["head-commissions", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_commissions")
        .select("*")
        .eq("partner_id", partner!.id)
        .neq("commission_type", "direct")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (authLoading || partnerQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!partner) return <Navigate to="/partner" replace />;
  if (!isHead) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Hierarchy not available</CardTitle>
            <CardDescription>
              This area is only for State Heads and Regional Heads. Contact partners@pictocart.in to apply.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild><Link to="/partner"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = summaryQ.data ?? { downline_count: 0, licenses_sold: 0, gmv: 0, override_lifetime: 0, override_this_month: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 to-amber-50/40">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-orange-600 tracking-widest">PIC TO CART</div>
            <h1 className="text-xl font-bold">
              {partner.tier === "regional_head" ? "Regional Head" : "State Head"} Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              {partner.region_name || partner.state_name || partner.name} • {partner.override_commission_pct}% override
            </p>
          </div>
          <Button variant="outline" asChild><Link to="/partner"><ArrowLeft className="w-4 h-4 mr-1" /> Back to partner</Link></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Downline partners" value={s.downline_count} icon={<Users className="w-5 h-5 text-orange-600" />} accent />
          <Stat label="Licenses sold" value={s.licenses_sold} />
          <Stat label="Downline GMV" value={`₹${Number(s.gmv || 0).toLocaleString("en-IN")}`} />
          <Stat label="This month" value={`₹${Number(s.override_this_month || 0).toLocaleString("en-IN")}`} icon={<TrendingUp className="w-5 h-5 text-green-600" />} />
          <Stat label="Lifetime overrides" value={`₹${Number(s.override_lifetime || 0).toLocaleString("en-IN")}`} icon={<IndianRupee className="w-5 h-5" />} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your downline ({downlineQ.data?.length ?? 0})</CardTitle>
            <CardDescription>Partners reporting directly to you.</CardDescription>
          </CardHeader>
          <CardContent>
            {downlineQ.isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : downlineQ.data?.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No partners assigned to you yet. Ask the Pic To Cart team to attach partners to your account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="py-2">Partner</th>
                      <th>Tier</th>
                      <th>Region/State</th>
                      <th>Licenses</th>
                      <th>GMV</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downlineQ.data!.map((p: any) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.email}</div>
                        </td>
                        <td className="capitalize">{String(p.tier).replace("_", " ")}</td>
                        <td>{p.region_name || p.state_name || "—"}</td>
                        <td>{p.total_licenses_purchased}</td>
                        <td>₹{Number(p.total_amount_paid || 0).toLocaleString("en-IN")}</td>
                        <td>
                          <Badge variant={p.invite_status === "active" ? "default" : "secondary"}>
                            {p.invite_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent override earnings</CardTitle>
            <CardDescription>Commissions credited to you from your downline's sales.</CardDescription>
          </CardHeader>
          <CardContent>
            {commissionsQ.data?.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">No override earnings yet.</div>
            ) : (
              <div className="divide-y text-sm">
                {commissionsQ.data?.map((c: any) => (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium capitalize">
                        {String(c.source_kind || "sale").replace("_", " ")} • {c.commission_rate}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Base ₹{Number(c.base_amount).toLocaleString("en-IN")} • {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{Number(c.commission_amount).toLocaleString("en-IN")}</div>
                      <Badge variant={c.status === "paid" ? "default" : "secondary"} className="text-xs">{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const Stat = ({ label, value, icon, accent }: { label: string; value: string | number; icon?: React.ReactNode; accent?: boolean }) => (
  <Card className={accent ? "border-orange-200 bg-orange-50/50" : ""}>
    <CardContent className="pt-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default PartnerHierarchy;
