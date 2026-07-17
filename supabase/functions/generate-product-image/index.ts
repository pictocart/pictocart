// generate-product-image: AI-generate a product photo (mainly for F&B merchants
// where stock images look identical). Charges 10 AI credits per call.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { store_id, prompt: userPrompt, productName, category, storeName } = body;
    if (!store_id || !userPrompt) {
      return new Response(JSON.stringify({ error: "Missing store_id or prompt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!LOVABLE_API_KEY && !UNSPLASH_ACCESS_KEY) {
      throw new Error("Neither LOVABLE_API_KEY nor UNSPLASH_ACCESS_KEY is configured");
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: store } = await admin.from("stores").select("id, user_id").eq("id", store_id).maybeSingle();
    if (!store || store.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: balance, error: chargeErr } = await admin.rpc("consume_credits", {
      _store_id: store_id, _action_key: "generate-product-image", _cache_hit: false,
    });
    if (chargeErr) {
      return new Response(JSON.stringify({ error: chargeErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (balance === -1) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS", balance: 0 }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let imageUrl = "";

    if (LOVABLE_API_KEY) {
      const fullPrompt = `Professional studio photograph of ${userPrompt}. ${productName ? `Product: "${productName}".` : ""} ${category ? `Category: ${category}.` : ""} Square 1:1 aspect, soft natural lighting, shallow depth-of-field, appetizing, premium plating/styling, photorealistic, hyper-detailed, no text, no watermark, white or rustic neutral background. Suitable as a hero product photo for an Indian e-commerce store${storeName ? ` "${storeName}"` : ""}.`;

      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: fullPrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!r.ok) {
        const t = await r.text();
        if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted on the platform side." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error ${r.status}: ${t}`);
      }
      const data = await r.json();
      imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || data.choices?.[0]?.message?.content;
    } else {
      // Fallback to Unsplash random squarish query
      const cleanPrompt = userPrompt.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2).slice(0, 3).join(" ");
      const r = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(cleanPrompt || "product")}&orientation=squarish&content_filter=high&client_id=${UNSPLASH_ACCESS_KEY}`);
      if (!r.ok) {
        throw new Error(`Unsplash API search error: ${r.statusText}`);
      }
      const data = await r.json();
      imageUrl = data?.urls?.regular || data?.urls?.small || "";
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image generated or found" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Persist to product-images bucket under the user's folder (RLS-compatible).
    let publicUrl: string | null = null;
    if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        const contentType = match[1] || "image/png";
        const bin = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        const path = `${userData.user.id}/ai-product/${crypto.randomUUID()}.png`;
        const { error: upErr } = await admin.storage.from("product-images").upload(path, bin, { contentType, upsert: false });
        if (!upErr) {
          publicUrl = admin.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        }
      }
    } else if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
      publicUrl = imageUrl;
    }

    return new Response(JSON.stringify({
      imageUrl: publicUrl || imageUrl,
      _meta: { cache_hit: false, credits_charged: 10, credits_saved: 0, minutes_saved: 8, inr_saved: 200, new_balance: balance },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-product-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
