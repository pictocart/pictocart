import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { store_id, pack_id, custom_inr, promo_code } = await req.json();
    if (!store_id) {
      return new Response(JSON.stringify({ error: "store_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify ownership
    const { data: store } = await admin.from("stores").select("id, user_id, name").eq("id", store_id).maybeSingle();
    if (!store || store.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin.from("platform_credit_settings").select("*").eq("id", 1).maybeSingle();
    if (!settings) throw new Error("Platform settings missing");

    let amountInr = 0;
    let baseCredits = 0;
    let bonusPct = 0;
    let packName = "Custom Recharge";

    if (pack_id) {
      const { data: pack } = await admin.from("ai_credit_packs")
        .select("*").eq("id", pack_id).eq("is_active", true).maybeSingle();
      if (!pack) {
        return new Response(JSON.stringify({ error: "Pack not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      amountInr = pack.price_inr;
      baseCredits = pack.credits;
      bonusPct = pack.bonus_pct || 0;
      packName = pack.name;
    } else if (custom_inr) {
      const inr = Number(custom_inr);
      if (!Number.isFinite(inr) || inr < settings.custom_min_inr || inr > settings.custom_max_inr) {
        return new Response(JSON.stringify({ error: `Amount must be between ₹${settings.custom_min_inr} and ₹${settings.custom_max_inr}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      amountInr = Math.round(inr);
      baseCredits = Math.floor(inr * Number(settings.custom_recharge_rate));
    } else {
      return new Response(JSON.stringify({ error: "Provide pack_id or custom_inr" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve promo (optional)
    let promo: any = null;
    if (promo_code) {
      const { data: p } = await admin.from("credit_promos")
        .select("*").eq("code", promo_code).eq("is_active", true).maybeSingle();
      if (p && (p.max_uses === null || p.used_count < p.max_uses)
        && (!p.valid_from || new Date(p.valid_from) <= new Date())
        && (!p.valid_until || new Date(p.valid_until) >= new Date())
        && amountInr >= (p.min_recharge_inr || 0)
        && (p.eligible_pack_ids.length === 0 || (pack_id && p.eligible_pack_ids.includes(pack_id)))) {
        promo = p;
      }
    }

    const promoBonusCredits = promo
      ? Math.floor(baseCredits * (promo.bonus_pct || 0) / 100) + (promo.bonus_flat_credits || 0)
      : 0;
    const packBonusCredits = Math.floor(baseCredits * bonusPct / 100);
    const totalCredits = baseCredits + packBonusCredits + promoBonusCredits;

    // Razorpay (platform keys)
    const key_id = Deno.env.get("RAZORPAY_KEY_ID");
    const key_secret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!key_id || !key_secret) {
      return new Response(JSON.stringify({ error: "Platform Razorpay not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const receipt = `wallet_${store_id.slice(0, 8)}_${Date.now()}`.slice(0, 40);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${key_id}:${key_secret}`),
      },
      body: JSON.stringify({
        amount: amountInr * 100,
        currency: "INR",
        receipt,
        notes: {
          purpose: "ai_credit_recharge",
          store_id,
          pack_id: pack_id || "",
          base_credits: String(baseCredits),
          pack_bonus: String(packBonusCredits),
          promo_bonus: String(promoBonusCredits),
          total_credits: String(totalCredits),
          promo_code: promo?.code || "",
          promo_id: promo?.id || "",
        },
      }),
    });

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text();
      console.error("Razorpay error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rzpOrder = await rzpRes.json();

    return new Response(JSON.stringify({
      razorpay_order_id: rzpOrder.id,
      razorpay_key_id: key_id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      pack_name: packName,
      base_credits: baseCredits,
      pack_bonus_credits: packBonusCredits,
      promo_bonus_credits: promoBonusCredits,
      total_credits: totalCredits,
      promo_applied: promo?.code || null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("wallet-create-recharge:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
