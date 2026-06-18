import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

const StoreInviteAccept = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<{ email: string; store_name?: string; plan?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("Missing invite token"); setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("partner-handover-accept", {
          body: { token, action: "validate" },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Invalid invite");
        setInfo({ email: data.email, store_name: data.store_name, plan: data.plan });
      } catch (e: any) {
        setError(e.message || "Invalid invite");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-handover-accept", {
        body: { token, action: "accept", password },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");

      // Auto sign-in
      await supabase.auth.signInWithPassword({ email: info!.email, password });
      setDone(true);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    } catch (e: any) {
      toast.error(e.message || "Failed to accept");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader><CardTitle>Invite invalid</CardTitle><CardDescription>{error}</CardDescription></CardHeader>
      </Card>
    </div>
  );
  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle>Welcome to Pic To Cart!</CardTitle>
          <CardDescription>Taking you to your store dashboard…</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 to-amber-50/40 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="text-xs font-bold text-orange-600 tracking-widest mb-1">PIC TO CART</div>
          <CardTitle>Take ownership of {info?.store_name}</CardTitle>
          <CardDescription>
            Your store has been built for you by your partner. Set a password to log in as <strong>{info?.email}</strong>.
            Your plan: <strong className="capitalize">{info?.plan}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set password & open my store"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreInviteAccept;
