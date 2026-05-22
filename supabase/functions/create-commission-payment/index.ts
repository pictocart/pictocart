// Create a Razorpay order so a merchant can pay a pending commission invoice.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    if (!KEY_ID || !KEY_SECRET) return json({ error: "Razorpay platform keys not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { invoice_id } = await req.json();
    if (!invoice_id) return json({ error: "Missing invoice_id" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: inv } = await admin
      .from("commission_invoices")
      .select("id, store_id, total_commission, status, invoice_number, razorpay_order_id")
      .eq("id", invoice_id)
      .maybeSingle();
    if (!inv) return json({ error: "Invoice not found" }, 404);
    if (inv.status !== "pending" && inv.status !== "overdue") return json({ error: "Invoice not payable" }, 400);

    // Ownership check
    const { data: store } = await admin.from("stores").select("user_id, name").eq("id", inv.store_id).maybeSingle();
    if (!store || store.user_id !== userId) return json({ error: "Forbidden" }, 403);

    // Reuse existing rzp order if present
    let rzpOrderId = inv.razorpay_order_id;
    if (!rzpOrderId) {
      const receipt = `com_${inv.id.slice(0, 8)}_${Date.now()}`;
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`) },
        body: JSON.stringify({
          amount: Math.round(Number(inv.total_commission) * 100),
          currency: "INR",
          receipt,
          notes: {
            purpose: "commission_invoice",
            commission_invoice_id: inv.id,
            store_id: inv.store_id,
            invoice_number: inv.invoice_number,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("rzp error", err);
        return json({ error: "Razorpay order failed" }, 502);
      }
      const rzp = await res.json();
      rzpOrderId = rzp.id;
      await admin.from("commission_invoices").update({ razorpay_order_id: rzpOrderId }).eq("id", inv.id);
    }

    return json({
      key_id: KEY_ID,
      amount: Math.round(Number(inv.total_commission) * 100),
      currency: "INR",
      order_id: rzpOrderId,
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      store_name: store.name,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
