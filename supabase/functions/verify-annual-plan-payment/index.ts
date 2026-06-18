import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const { store_id, plan, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!store_id || !plan || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing required fields");
    }

    const expected = createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expected !== razorpay_signature) throw new Error("Invalid payment signature");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: store } = await admin
      .from("stores").select("id, user_id").eq("id", store_id).maybeSingle();
    if (!store || store.user_id !== userId) throw new Error("Forbidden");

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const { error: upErr } = await admin.from("subscriptions").upsert({
      store_id,
      plan,
      status: "active",
      billing_cycle: "annual",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      is_blocked: false,
      cancelled_at: null,
      pending_plan: null,
      pending_plan_effective_at: null,
      expiry_notified_at: null,
      blocked_notified_at: null,
      last_renewal_reminder_at: null,
      razorpay_subscription_id: null,
      updated_at: now.toISOString(),
    }, { onConflict: "store_id" });
    if (upErr) throw upErr;

    await admin.from("payment_events").insert({
      store_id,
      event_type: "annual_plan_payment",
      payload: { plan, razorpay_order_id, razorpay_payment_id, billing_cycle: "annual" },
    } as any).then(() => {}, () => {});

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("verify-annual-plan-payment error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
