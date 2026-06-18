import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const { store_id, plan } = await req.json();
    if (!store_id || !plan) throw new Error("store_id and plan required");
    if (!["starter", "growth", "scale"].includes(plan)) throw new Error("Invalid plan");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: store } = await admin
      .from("stores").select("id, user_id").eq("id", store_id).maybeSingle();
    if (!store || store.user_id !== userId) throw new Error("Forbidden");

    const { data: planRow } = await admin
      .from("plan_configs").select("annual_price_inr, display_name").eq("plan", plan).maybeSingle();
    const amountInr = Number(planRow?.annual_price_inr || 0);
    if (amountInr <= 0) throw new Error("Annual price not configured for this plan");

    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: Math.round(amountInr * 100),
        currency: "INR",
        receipt: `annual_${store_id.slice(0, 18)}_${Date.now().toString().slice(-6)}`,
        notes: { store_id, plan, billing_cycle: "annual", user_id: userId },
      }),
    });
    if (!rpRes.ok) {
      console.error("Razorpay error", await rpRes.text());
      throw new Error("Failed to create payment order");
    }
    const order = await rpRes.json();

    return new Response(JSON.stringify({
      success: true,
      razorpay_order_id: order.id,
      razorpay_key_id: keyId,
      amount: order.amount,
      currency: order.currency,
      plan_name: planRow?.display_name || plan,
      amount_inr: amountInr,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("create-annual-plan-payment error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
