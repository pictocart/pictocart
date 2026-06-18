import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

declare global {
  interface Window { Razorpay: any }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

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

  const finalize = async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
    const { data, error } = await supabase.functions.invoke("handover-verify-payment", {
      body: { token, password, ...payment },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Verification failed");
    await supabase.auth.signInWithPassword({ email: info!.email, password });
    setDone(true);
    setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
  };

  const handleSubmit = async () => {
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setSubmitting(true);
    try {
      const { data: order, error: orderErr } = await supabase.functions.invoke("handover-create-payment", {
        body: { token },
      });
      if (orderErr) throw orderErr;
      if (!order?.success) throw new Error(order?.error || "Could not start payment");

      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay");

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.razorpay_key_id,
          order_id: order.razorpay_order_id,
          amount: order.amount,
          currency: order.currency,
          name: "Pic To Cart",
          description: `${order.plan_name} plan — annual`,
          prefill: { email: order.email },
          theme: { color: "#F97316" },
          handler: async (resp: any) => {
            try {
              await finalize({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              });
              resolve();
            } catch (e: any) {
              toast.error(e.message || "Verification failed");
              reject(e);
            }
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              reject(new Error("dismissed"));
            },
          },
        });
        rzp.open();
      }).catch(() => {});
    } catch (e: any) {
      if (e?.message !== "dismissed") toast.error(e.message || "Failed");
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

  const PLAN_PRICES: Record<string, number> = { starter: 5500, growth: 16500, scale: 55000 };
  const price = info?.plan ? PLAN_PRICES[info.plan] : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 to-amber-50/40 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="text-xs font-bold text-orange-600 tracking-widest mb-1">PIC TO CART</div>
          <CardTitle>Take ownership of {info?.store_name}</CardTitle>
          <CardDescription>
            Your store has been built for you by your partner. Set a password, then pay the annual{" "}
            <strong className="capitalize">{info?.plan}</strong> plan
            {price ? <> at <strong>₹{price.toLocaleString("en-IN")}/year</strong></> : null}
            {" "}to go live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={info?.email || ""} disabled />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ₹${price?.toLocaleString("en-IN") || ""} & activate my store`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Secure payment by Razorpay. Your store activates immediately for 365 days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreInviteAccept;
