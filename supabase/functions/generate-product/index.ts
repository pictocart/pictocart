// @ts-nocheck
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

async function getBase64ImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl.startsWith("http")) return imageUrl;
  try {
    const imgRes = await fetch(imageUrl);
    if (imgRes.ok) {
      const arrayBuffer = await imgRes.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      const len = uint8.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      return `data:${contentType};base64,${base64}`;
    }
  } catch (err) {
    console.error("Failed to convert image to base64:", err);
  }
  return imageUrl;
}

function parseMarkdownToProduct(content: string) {
  const product: any = {
    title: "",
    description: "",
    shortDescription: "",
    tags: [],
    category: "",
    suggestedPrice: 0,
    seoTitle: "",
    seoDescription: "",
    highlights: [],
    product_type: "physical",
    metadata: {}
  };

  // Extract Title
  const titleMatch = content.match(/\*\*Title\*\*:\s*([^\n]+)/i) || content.match(/\*\*Title:\*\*:\s*([^\n]+)/i) || content.match(/\*\*Title:\*\*\s*([^\n]+)/i) || content.match(/\* \*\*Title\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Title:\*\*:\s*([^\n]+)/i);
  if (titleMatch) product.title = titleMatch[1].replace(/^[ \t*#"-]+|[ \t*#"-]+$/g, "").trim();

  // Extract Description
  const descMatch = content.match(/\*\*Description\*\*:\s*([^\n]+)/i) || content.match(/\*\*Description:\*\*:\s*([^\n]+)/i) || content.match(/\*\*Description:\*\*\s*([^\n]+)/i) || content.match(/\* \*\*Description\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Description:\*\*:\s*([^\n]+)/i);
  if (descMatch) product.description = descMatch[1].replace(/^[ \t*#"-]+|[ \t*#"-]+$/g, "").trim();

  // Extract Short Description
  const shortDescMatch = content.match(/\*\*Short Description\*\*:\s*([^\n]+)/i) || content.match(/\*\*Short Description:\*\*:\s*([^\n]+)/i) || content.match(/\*\*Short Description:\*\*\s*([^\n]+)/i) || content.match(/\* \*\*Short Description\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Short Description:\*\*:\s*([^\n]+)/i);
  if (shortDescMatch) product.shortDescription = shortDescMatch[1].replace(/^[ \t*#"-]+|[ \t*#"-]+$/g, "").trim();

  // Extract Tags
  const tagsMatch = content.match(/\*\*Tags\*\*:\s*([^\n]+)/i) || content.match(/\*\*Tags:\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Tags\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Tags:\*\*:\s*([^\n]+)/i);
  if (tagsMatch) {
    product.tags = tagsMatch[1]
      .split(",")
      .map(t => t.replace(/^[ \t*#"-]+|[ \t*#"-]+$/g, "").trim())
      .filter(t => t.length > 0);
  }

  // Extract Category
  const catMatch = content.match(/\*\*Category\*\*:\s*([^\n]+)/i) || content.match(/\*\*Category:\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Category\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Category:\*\*:\s*([^\n]+)/i);
  if (catMatch) product.category = catMatch[1].replace(/^[ \t*#"-]+|[ \t*#"-]+$/g, "").trim();

  // Extract Price
  const priceMatch = content.match(/\*\*Suggested Price\*\*:\s*([^\n]+)/i) || content.match(/\*\*Suggested Price:\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Suggested Price\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Suggested Price:\*\*:\s*([^\n]+)/i);
  if (priceMatch) {
    const digits = priceMatch[1].match(/\d+/);
    if (digits) product.suggestedPrice = parseInt(digits[0], 10);
  }

  // Extract SEO Title
  const seoTitleMatch = content.match(/\*\*SEO Title\*\*:\s*([^\n]+)/i) || content.match(/\*\*SEO Title:\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*SEO Title\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*SEO Title:\*\*:\s*([^\n]+)/i);
  if (seoTitleMatch) product.seoTitle = seoTitleMatch[1].replace(/^[ \t*#"-]+|[ \t*#"-]+$/g, "").trim();

  // Extract SEO Description
  const seoDescMatch = content.match(/\*\*SEO Description\*\*:\s*([^\n]+)/i) || content.match(/\*\*SEO Meta Description\*\*:\s*([^\n]+)/i) || content.match(/\*\*SEO Description:\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*SEO Description\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*SEO Meta Description\*\*:\s*([^\n]+)/i);
  if (seoDescMatch) product.seoDescription = seoDescMatch[1].replace(/^[ \t*#"-]+|[ \t*#"-]+$/g, "").trim();

  // Extract Product Type
  const typeMatch = content.match(/\*\*Product Type\*\*:\s*([^\n]+)/i) || content.match(/\*\*Product Type:\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Product Type\*\*:\s*([^\n]+)/i) || content.match(/\* \*\*Product Type:\*\*:\s*([^\n]+)/i);
  if (typeMatch) {
    const rawType = typeMatch[1].toLowerCase().replace(/^[ \t*#"-]+|[ \t*#"-]+$/g, "").trim();
    if (["physical", "digital", "food", "fashion", "electronics", "beauty", "handmade", "service"].includes(rawType)) {
      product.product_type = rawType;
    }
  }

  // Extract Highlights
  const highlightsSection = content.match(/\*\*Highlights\*\*:\s*([\s\S]*?)(?=\*\*|$)/i) || content.match(/\* \*\*Highlights\*\*:\s*([\s\S]*?)(?=\*\*|$)/i);
  if (highlightsSection) {
    const lines = highlightsSection[1].split("\n");
    product.highlights = lines
      .map(line => line.replace(/^[ \t*+-]+|[ \t*+-]+$/g, "").trim())
      .filter(line => line.length > 5 && !line.startsWith("**") && !line.includes(":"));
  }

  return product;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    if (body.listModels) {
      const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` }
      });
      const data = await r.json();
      return json(data);
    }

    const { imageUrl, category, storeName, productType, productHint, store_id } = body;
    if (!imageUrl) return json({ error: "imageUrl is required" }, 400);
    if (!store_id) return json({ error: "store_id is required" }, 400);

    // Auth: must be signed in and own the store
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData?.user) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: storeOwn } = await supabase.from('stores').select('user_id').eq('id', store_id).maybeSingle();
    if (!storeOwn) return json({ error: 'Store not found' }, 404);

    let isAllowed = storeOwn.user_id === userData.user.id;
    if (!isAllowed) {
      const { data: staff } = await supabase.from('store_staff').select('id').eq('store_id', store_id).eq('user_id', userData.user.id).maybeSingle();
      if (staff) isAllowed = true;
    }
    if (!isAllowed) return json({ error: 'Forbidden' }, 403);

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
    const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY") || "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";

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

    let content = "";
    let aiData: any = null;
    const errors: string[] = [];

    // --- Try 1: NVIDIA Vision (meta/llama-3.2-11b-vision-instruct) ---
    try {
      console.log("Attempting product generation via NVIDIA integrate API (meta/llama-3.2-11b-vision-instruct)...");
      const base64ImageUrl = await getBase64ImageUrl(imageUrl);
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta/llama-3.2-11b-vision-instruct",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt + "\n\nCRITICAL: Return ONLY a raw valid JSON object. Do not include markdown blocks or backticks." },
                { type: "image_url", image_url: { url: base64ImageUrl } }
              ]
            }
          ]
        }),
      });

      if (response.ok) {
        aiData = await response.json();
        content = aiData.choices?.[0]?.message?.content || "";
      } else {
        const errText = await response.text();
        errors.push(`NVIDIA Vision error (${response.status}): ${errText}`);
      }
    } catch (err) {
      errors.push(`NVIDIA Vision fetch error: ${err.message}`);
    }

    // --- Try 2: NVIDIA Vision Alternative (meta/llama-3.2-90b-vision-instruct) ---
    if (!content) {
      try {
        console.log("Attempting product generation via NVIDIA integrate API (meta/llama-3.2-90b-vision-instruct) alternative...");
        const base64ImageUrl = await getBase64ImageUrl(imageUrl);
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "meta/llama-3.2-90b-vision-instruct",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt + "\n\nCRITICAL: Return ONLY a raw valid JSON object. Do not include markdown blocks or backticks." },
                  { type: "image_url", image_url: { url: base64ImageUrl } }
                ]
              }
            ]
          }),
        });

        if (response.ok) {
          aiData = await response.json();
          content = aiData.choices?.[0]?.message?.content || "";
        } else {
          const errText = await response.text();
          errors.push(`NVIDIA Meta Vision error (${response.status}): ${errText}`);
        }
      } catch (err) {
        errors.push(`NVIDIA Meta Vision fetch error: ${err.message}`);
      }
    }

    if (!content) {
      throw new Error(`All NVIDIA vision attempts failed. Errors: ${errors.join(" | ")}`);
    }
    let product;
    try {
      const firstCurly = content.indexOf('{');
      const lastCurly = content.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        const jsonBlock = content.substring(firstCurly, lastCurly + 1);
        product = JSON.parse(jsonBlock);
      } else {
        product = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      }
    } catch (parseErr) {
      console.log("JSON parsing failed, attempting markdown parsing fallback...");
      try {
        product = parseMarkdownToProduct(content);
        if (!product.title) {
          throw new Error("Fallback parser could not extract title");
        }
      } catch (fallbackErr) {
        console.error("Failed to parse AI response:", content);
        throw new Error("Failed to parse AI response");
      }
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
