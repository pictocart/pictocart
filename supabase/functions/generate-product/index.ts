import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTION_KEY = "generate-product";
const CACHE_TTL_HOURS = 24;

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { imageUrl, category, storeName, productType, productHint, store_id } = await req.json();
    if (!imageUrl) return json({ error: "imageUrl is required" }, 400);
    if (!store_id) return json({ error: "store_id is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cache key: deterministic over inputs that influence the answer
    const cacheKey = await sha256Hex(JSON.stringify({
      a: ACTION_KEY,
      img: imageUrl,
      cat: category || null,
      sn: storeName || null,
      pt: productType || null,
      ph: productHint || null,
    }));

    // 1. Cache lookup
    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("response, expires_at, hits")
      .eq("key", cacheKey)
      .maybeSingle();

    if (cached && (!cached.expires_at || new Date(cached.expires_at) > new Date())) {
      const newBalance = await supabase.rpc("consume_credits", {
        _store_id: store_id, _action_key: ACTION_KEY, _cache_hit: true,
      });
      if (newBalance.data === -1) return json({ error: "INSUFFICIENT_CREDITS" }, 402);

      await supabase.from("ai_response_cache").update({ hits: (cached.hits || 0) + 1 }).eq("key", cacheKey);

      // Lookup cost row to compute savings shown in UI
      const { data: cost } = await supabase.from("ai_action_costs").select("credits, cache_hit_credits, manual_cost_inr, manual_minutes").eq("action_key", ACTION_KEY).maybeSingle();
      return json({
        product: cached.response,
        _meta: {
          cache_hit: true,
          credits_charged: cost?.cache_hit_credits ?? 1,
          credits_saved: Math.max(((cost?.credits ?? 8) - (cost?.cache_hit_credits ?? 1)), 0),
          minutes_saved: cost?.manual_minutes ?? 0,
          inr_saved: Number(cost?.manual_cost_inr ?? 0),
          new_balance: newBalance.data,
        },
      });
    }

    // 2. Pre-flight balance check via consume_credits (will fail if insufficient)
    // We call AI first only if we know balance is sufficient; cheaper to check via a peek.
    const { data: wallet } = await supabase.from("ai_credit_wallets").select("balance").eq("store_id", store_id).maybeSingle();
    const { data: cost } = await supabase.from("ai_action_costs").select("credits, manual_cost_inr, manual_minutes").eq("action_key", ACTION_KEY).maybeSingle();
    const required = cost?.credits ?? 8;
    if (!wallet || wallet.balance < required) return json({ error: "INSUFFICIENT_CREDITS", required, balance: wallet?.balance ?? 0 }, 402);

    // 3. Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert e-commerce product analyst for an Indian online store${storeName ? ` called "${storeName}"` : ""}.
Analyze this product image and generate COMPREHENSIVE product details. Fill EVERY field — never leave one blank. Make educated, realistic guesses from the image when not certain.
${category ? `The store category is: ${category}` : ""}
${productType ? `Product type: ${productType}` : ""}
${productHint ? `Hint from seller: ${productHint}` : ""}

Return a single JSON object with these fields:
- title: Catchy product title (2-6 words)
- description: Detailed description (60-120 words), features + benefits
- shortDescription: One-line summary (under 20 words)
- tags: Array of 5-8 search tags
- category: Best-fit product category
- suggestedPrice: Suggested INR price (number, realistic for Indian market)
- seoTitle: SEO title (under 60 chars)
- seoDescription: SEO meta description (under 160 chars)
- highlights: Array of 4-6 short bullet selling points (each under 12 words)
- product_type: ONE of: physical, digital, food, fashion, electronics, beauty, handmade, service
- metadata: Object with type-specific fields. Fill ALL applicable keys for the chosen product_type. Use these exact keys:
   • food: ingredients, nutritional_info, shelf_life, allergens
   • fashion: material, care_instructions, fit_type (Slim Fit | Regular Fit | Loose Fit | Oversized), gender (Men | Women | Unisex | Kids | Boys | Girls)
   • electronics: warranty_period, model_number, power_rating, connectivity
   • beauty: ingredients, skin_type (All Skin Types | Oily | Dry | Combination | Sensitive | Normal), usage_instructions, expiry_date
   • handmade: making_time, material, customization_available (boolean)
   • digital: file_format, license_type (Personal Use | Commercial Use | Extended License | Open Source)
   • service: duration, delivery_method, booking_required (boolean)
   • physical: (no extra metadata required, return {})

Rules:
- Do NOT fabricate regulatory identifiers (FSSAI license number, model number, download_link, expiry_date) — omit those keys entirely if not visually obvious. The seller will fill them.
- Never write "N/A" or empty strings for the descriptive fields above.
- Respond ONLY with the JSON object, no markdown fences, no commentary.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }] }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again." }, 429);
      if (response.status === 402) return json({ error: "Platform AI credits exhausted." }, 402);
      const txt = await response.text();
      console.error("AI gateway error:", response.status, txt);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    let product;
    try {
      product = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    // 4. Persist cache
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 3600_000).toISOString();
    await supabase.from("ai_response_cache").upsert({
      key: cacheKey, action_key: ACTION_KEY, response: product, expires_at: expiresAt, hits: 0,
    }, { onConflict: "key" });

    // 5. Charge credits
    const newBalance = await supabase.rpc("consume_credits", {
      _store_id: store_id, _action_key: ACTION_KEY, _cache_hit: false,
    });
    if (newBalance.data === -1) return json({ error: "INSUFFICIENT_CREDITS" }, 402);

    return json({
      product,
      _meta: {
        cache_hit: false,
        credits_charged: required,
        credits_saved: 0,
        minutes_saved: cost?.manual_minutes ?? 0,
        inr_saved: Number(cost?.manual_cost_inr ?? 0),
        new_balance: newBalance.data,
      },
    });
  } catch (e) {
    console.error("generate-product error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
