import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { token } = await req.json();
    if (!token) throw new Error("token required");
    const tokenHash = await sha256Hex(token);

    const { data: handover } = await admin
      .from("store_handovers")
      .select("id, store_id, plan, client_email, accepted_at, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!handover) throw new Error("Invalid invite");
    if (handover.accepted_at) throw new Error("Invite already used");
    if (new Date(handover.expires_at).getTime() < Date.now()) throw new Error("Invite expired");

    const { data: planRow } = await admin
      .from("plan_configs")
      .select("annual_price_inr, display_name")
      .eq("plan", handover.plan)
      .maybeSingle();

    const amountInr = Number(planRow?.annual_price_inr || 0);
    if (amountInr <= 0) throw new Error("Plan price not configured");

    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: Math.round(amountInr * 100),
        currency: "INR",
        receipt: `handover_${handover.id.slice(0, 20)}`,
        notes: { handover_id: handover.id, store_id: handover.store_id, plan: handover.plan },
      }),
    });
    if (!rpRes.ok) {
      console.error("Razorpay error", await rpRes.text());
      throw new Error("Failed to create payment order");
    }
    const order = await rpRes.json();

    await admin
      .from("store_handovers")
      .update({ razorpay_order_id: order.id })
      .eq("id", handover.id);

    return new Response(JSON.stringify({
      success: true,
      razorpay_order_id: order.id,
      razorpay_key_id: keyId,
      amount: order.amount,
      currency: order.currency,
      plan_name: planRow?.display_name || handover.plan,
      amount_inr: amountInr,
      email: handover.client_email,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("handover-create-payment error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
