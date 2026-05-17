import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(orderId: string, paymentId: string, signature: string, keySecret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${orderId}|${paymentId}`));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, store_id } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !store_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: store } = await admin.from("stores").select("user_id").eq("id", store_id).maybeSingle();
    if (!store || store.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const ok = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret);
    if (!ok) return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders });

    await admin.from("store_google_reviews_connections").update({
      is_paid: true,
      is_active: true,
      paid_at: new Date().toISOString(),
      payment_id: razorpay_payment_id,
    }).eq("store_id", store_id);

    // Trigger initial sync
    try {
      await fetch(`${supabaseUrl}/functions/v1/sync-google-reviews`, {
        method: "POST",
        headers: { "Authorization": authHeader, "Content-Type": "application/json", "apikey": anonKey },
        body: JSON.stringify({ store_id }),
      });
    } catch (e) { console.error("Initial sync failed:", e); }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
});
