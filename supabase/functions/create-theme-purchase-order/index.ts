// Creates a Razorpay order for a premium theme purchase using PLATFORM keys.
// This is platform revenue, not seller revenue.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const { store_id, theme_kind, theme_ref } = body as { store_id: string; theme_kind: "pack" | "master"; theme_ref: string };
    if (!store_id || !theme_kind || !theme_ref) return json({ error: "Missing fields" }, 400);
    if (!["pack", "master"].includes(theme_kind)) return json({ error: "Invalid theme_kind" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verify ownership
    const { data: store } = await admin
      .from("stores")
      .select("id, user_id, is_published, settings, name")
      .eq("id", store_id).maybeSingle();
    if (!store || store.user_id !== userId) return json({ error: "Forbidden" }, 403);

    // Lookup price
    let basePrice = 0;
    let themeName = theme_ref;
    if (theme_kind === "pack") {
      const { data: pack } = await admin.from("theme_packs")
        .select("id, name, price, is_published").eq("id", theme_ref).maybeSingle();
      if (!pack || !pack.is_published) return json({ error: "Theme not available" }, 404);
      basePrice = Number(pack.price || 0);
      themeName = pack.name;
    } else {
      const { data: master } = await admin.from("theme_master_projects")
        .select("theme_id, name, price, is_premium, is_active").eq("theme_id", theme_ref).maybeSingle();
      if (!master || !master.is_active) return json({ error: "Theme not available" }, 404);
      basePrice = Number(master.price || 0);
      themeName = master.name;
    }

    if (basePrice <= 0) return json({ error: "This theme is free" }, 400);

    // Already purchased check
    if (theme_kind === "pack") {
      const { data: existing } = await admin.from("theme_purchases")
        .select("id").eq("store_id", store_id).eq("theme_pack_id", theme_ref).maybeSingle();
      if (existing) return json({ error: "Already purchased" }, 409);
    } else {
      const purchased: string[] = ((store.settings as any)?.purchased_themes) || [];
      if (purchased.includes(theme_ref)) return json({ error: "Already purchased" }, 409);
    }

    // Discount comes ONLY from the admin-configured platform plan offer
    // (platform_plan_offers via get_active_plan_offer_pct). No silent
    // launch discounts — what admin sets is what merchant pays.
    let offerPct = 0;
    try {
      const { data: pct } = await admin.rpc("get_active_plan_offer_pct", { _cycle: "annual" });
      offerPct = Math.max(0, Math.min(90, Number(pct || 0)));
    } catch (_) { offerPct = 0; }
    const discountInr = offerPct > 0 ? Math.round(basePrice * (offerPct / 100)) : 0;
    const finalAmount = Math.max(basePrice - discountInr, 1);
    const isLaunch = offerPct > 0;


    // Create Razorpay order
    const receipt = `theme_${store_id.slice(0, 8)}_${Date.now()}`;
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`) },
      body: JSON.stringify({
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt,
        notes: {
          purpose: "theme_purchase",
          store_id,
          user_id: userId,
          theme_kind,
          theme_ref,
          theme_name: themeName,
        },
      }),
    });
    if (!rzpRes.ok) {
      const err = await rzpRes.text();
      console.error("Razorpay error", err);
      return json({ error: "Failed to create Razorpay order" }, 502);
    }
    const rzpOrder = await rzpRes.json();

    // Persist intent
    const { data: intent, error: iErr } = await admin.from("theme_purchase_intents").insert({
      store_id, user_id: userId,
      theme_kind, theme_ref,
      amount_inr: finalAmount,
      discount_inr: discountInr,
      razorpay_order_id: rzpOrder.id,
      status: "pending",
    }).select("id").single();
    if (iErr) {
      console.error(iErr);
      return json({ error: "Failed to persist intent" }, 500);
    }

    return json({
      intent_id: intent.id,
      razorpay_order_id: rzpOrder.id,
      razorpay_key_id: KEY_ID,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      base_price: basePrice,
      discount: discountInr,
      final_amount: finalAmount,
      is_launch_offer: isLaunch,
      theme_name: themeName,
      store_name: store.name,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
