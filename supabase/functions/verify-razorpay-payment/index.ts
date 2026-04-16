import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${orderId}|${paymentId}`);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const expectedSignature = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time comparison
  if (expectedSignature.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    diff |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,
      store_id,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id || !store_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // CRITICAL: confirm the order belongs to the supplied store (prevents cross-store fraud)
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, store_id, payment_status")
      .eq("id", order_id)
      .eq("store_id", store_id)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found for this store" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.payment_status === "paid") {
      return new Response(
        JSON.stringify({ success: true, payment_id: razorpay_payment_id, alreadyPaid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: secrets } = await admin
      .from("store_secrets")
      .select("razorpay_key_secret")
      .eq("store_id", store_id)
      .maybeSingle();

    if (!secrets?.razorpay_key_secret) {
      return new Response(
        JSON.stringify({ error: "Razorpay not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secrets.razorpay_key_secret
    );

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Payment verification failed — invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await admin
      .from("orders")
      .update({
        payment_status: "paid",
        payment_method: "razorpay",
        tracking_number: razorpay_payment_id,
        status: "confirmed",
      })
      .eq("id", order_id)
      .eq("store_id", store_id);

    if (updateError) {
      console.error("Order update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, payment_id: razorpay_payment_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
