// sourcing-import: import a sourced product into the merchant's store (1 credit)
// Uses Lovable AI Gateway (Gemini) to rewrite the title/description for the merchant's storefront.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function aiRewrite(title: string, description: string | null): Promise<{ title: string; description: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { title, description: description ?? "" };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You rewrite wholesale product copy into compelling, India-friendly D2C storefront copy. Output STRICT JSON: {\"title\": string (<60 chars), \"description\": string (60-120 words, benefits-led, no emojis)}" },
          { role: "user", content: `Title: ${title}\n\nOriginal description: ${description ?? "(none)"}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { title, description: description ?? "" };
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    return { title: parsed.title ?? title, description: parsed.description ?? (description ?? "") };
  } catch {
    return { title, description: description ?? "" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const storeId = String(body.store_id ?? "");
    const productId = String(body.product_id ?? "");
    const marginPct = Number(body.margin_pct ?? 60);
    if (!storeId || !productId) {
      return new Response(JSON.stringify({ error: "Missing store_id or product_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: store } = await supabaseAdmin
      .from("stores").select("id, user_id").eq("id", storeId).maybeSingle();
    if (!store || store.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: src } = await supabaseAdmin
      .from("sourcing_products")
      .select("id, title, description, category, hero_image, images, price_min, price_max, moq, tags")
      .eq("id", productId).maybeSingle();
    if (!src) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Debit credits
    const { data: balance, error: chargeErr } = await supabaseAdmin
      .rpc("consume_credits", { _store_id: storeId, _action_key: "sourcing_import", _cache_hit: false });
    if (chargeErr) {
      return new Response(JSON.stringify({ error: chargeErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (balance === -1) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rewritten = await aiRewrite(src.title, src.description);

    const cost = src.price_min ?? src.price_max ?? 0;
    const retail = Math.round(cost * (1 + marginPct / 100));

    const images = (src.images && src.images.length > 0) ? src.images : (src.hero_image ? [src.hero_image] : []);

    const { data: newProduct, error: insErr } = await supabaseAdmin
      .from("products").insert({
        store_id: storeId,
        title: rewritten.title,
        description: rewritten.description,
        images,
        price: retail,
        cost_price: cost,
        category: src.category,
        tags: src.tags ?? [],
        inventory_count: 0,
        is_active: true,
        ai_generated_data: { sourced_from: src.id, source_kind: "sourcing" },
      }).select("id").single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true, balance, product_id: newProduct.id, retail_price: retail,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
