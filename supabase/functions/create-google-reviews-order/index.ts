import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Creates a Razorpay order for the Google Reviews premium unlock (₹1499)
// Uses the PLATFORM Razorpay credentials (not the seller's).
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
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) throw new Error("Platform Razorpay not configured");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { store_id, place_id, business_name, business_address, business_url } = await req.json();
    if (!store_id || !place_id) {
      return new Response(JSON.stringify({ error: "store_id and place_id required" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: store } = await admin.from("stores").select("user_id, name").eq("id", store_id).maybeSingle();
    if (!store || store.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const amountInr = 1499;
    const receipt = `gr_${store_id.slice(0, 8)}_${Date.now()}`;

    const rzRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInr * 100,
        currency: "INR",
        receipt,
        notes: { store_id, place_id, purpose: "google_reviews_unlock" },
      }),
    });
    const rz = await rzRes.json();
    if (!rzRes.ok) throw new Error(`Razorpay error: ${JSON.stringify(rz)}`);

    // Upsert pending connection
    await admin.from("store_google_reviews_connections").upsert({
      store_id,
      place_id,
      business_name,
      business_address,
      business_url,
      is_active: false,
      is_paid: false,
      amount_inr: amountInr,
    }, { onConflict: "store_id" });

    return new Response(JSON.stringify({
      order_id: rz.id,
      amount: rz.amount,
      currency: rz.currency,
      key_id: keyId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
});
