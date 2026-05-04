import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(orderId: string, paymentId: string, signature: string, keySecret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${orderId}|${paymentId}`));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, store_id } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !store_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: store } = await admin.from("stores").select("user_id").eq("id", store_id).maybeSingle();
    if (!store || store.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const key_secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const key_id = Deno.env.get("RAZORPAY_KEY_ID")!;

    if (!await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, key_secret)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Idempotency: skip if already credited
    const { data: existing } = await admin.from("ai_credit_transactions")
      .select("id").eq("razorpay_payment_id", razorpay_payment_id).maybeSingle();
    if (existing) {
      const { data: w } = await admin.from("ai_credit_wallets").select("balance").eq("store_id", store_id).maybeSingle();
      return new Response(JSON.stringify({ success: true, alreadyCredited: true, balance: w?.balance ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch authoritative order from Razorpay (notes hold credit info we set)
    const rzpRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { Authorization: "Basic " + btoa(`${key_id}:${key_secret}`) },
    });
    if (!rzpRes.ok) throw new Error(`Razorpay fetch order failed: ${rzpRes.status}`);
    const rzpOrder = await rzpRes.json();
    if (rzpOrder.notes?.purpose !== "ai_credit_recharge" || rzpOrder.notes?.store_id !== store_id) {
      return new Response(JSON.stringify({ error: "Order/store mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseCredits = parseInt(rzpOrder.notes.base_credits || "0", 10);
    const packBonus = parseInt(rzpOrder.notes.pack_bonus || "0", 10);
    const promoBonus = parseInt(rzpOrder.notes.promo_bonus || "0", 10);
    const totalCredits = parseInt(rzpOrder.notes.total_credits || "0", 10);
    const promoCode = rzpOrder.notes.promo_code || null;
    const promoId = rzpOrder.notes.promo_id || null;
    const inrValue = (rzpOrder.amount || 0) / 100;

    // Credit base + bonus separately for clean ledger
    await admin.rpc("credit_wallet", {
      _store_id: store_id,
      _credits: baseCredits,
      _type: "credit",
      _inr_value: inrValue,
      _razorpay_order_id: razorpay_order_id,
      _razorpay_payment_id: razorpay_payment_id,
      _promo_code: null,
      _granted_by_admin: null,
      _reason: `Recharge — ${rzpOrder.notes.pack_id ? 'pack' : 'custom'}`,
      _metadata: { pack_id: rzpOrder.notes.pack_id || null },
    });

    if (packBonus + promoBonus > 0) {
      await admin.rpc("credit_wallet", {
        _store_id: store_id,
        _credits: packBonus + promoBonus,
        _type: "bonus",
        _inr_value: 0,
        _razorpay_order_id: razorpay_order_id,
        _razorpay_payment_id: razorpay_payment_id,
        _promo_code: promoCode,
        _granted_by_admin: null,
        _reason: `Bonus credits (pack +${packBonus}, promo +${promoBonus})`,
        _metadata: {},
      });
    }

    if (promoId && promoBonus > 0) {
      await admin.from("credit_promos").update({ used_count: 0 }).eq("id", promoId); // placeholder
      await admin.rpc("increment_coupon_usage", { coupon_id: promoId }).then(() => {}).catch(() => {});
      // Use raw SQL increment to avoid race
      await admin.from("credit_promos").select("used_count").eq("id", promoId).maybeSingle()
        .then(async ({ data }) => {
          if (data) await admin.from("credit_promos").update({ used_count: (data.used_count || 0) + 1 }).eq("id", promoId);
        });
      await admin.from("credit_promo_redemptions").insert({ promo_id: promoId, store_id });
    }

    const { data: w } = await admin.from("ai_credit_wallets").select("balance").eq("store_id", store_id).maybeSingle();

    return new Response(JSON.stringify({
      success: true,
      balance: w?.balance ?? 0,
      credited: totalCredits,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("wallet-verify-recharge:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
