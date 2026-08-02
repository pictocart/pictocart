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

    const { mode, sectionType, storeName, category, currentTitle, currentSubtitle, store_id } = await req.json();
    const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
    if (!NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY not configured");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify store ownership and charge credits
    if (!store_id) {
      return new Response(JSON.stringify({ error: "Missing store_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: store } = await admin.from("stores").select("id, user_id").eq("id", store_id).maybeSingle();
    if (!store) {
      return new Response(JSON.stringify({ error: "Store not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let isAllowed = store.user_id === userData.user.id;
    if (!isAllowed) {
      const { data: staff } = await admin.from("store_staff").select("id").eq("store_id", store_id).eq("user_id", userData.user.id).maybeSingle();
      if (staff) isAllowed = true;
    }
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: balance, error: chargeErr } = await admin.rpc("consume_credits", {
      _store_id: store_id, _action_key: "generate-section-content", _cache_hit: false,
    });
    if (chargeErr) {
      return new Response(JSON.stringify({ error: chargeErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (balance === -1) {
      return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS", balance: 0 }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "image") {
      const prompt = `Create a stunning, professional, high-quality marketing banner image for an Indian e-commerce store called "${storeName || "a store"}" in the "${category || "general"}" category. Section: ${sectionType}. ${currentTitle ? `Theme: ${currentTitle}.` : ""} ${currentSubtitle ? `Vibe: ${currentSubtitle}.` : ""} Wide aspect, vibrant, premium, no text overlay. Professional photography style.`;

      const cleanPrompt = encodeURIComponent(prompt);
      const pollinationsUrl = `https://image.pollinations.ai/p/${cleanPrompt}?width=1536&height=640&nologo=true&private=true&model=flux`;
      const imgRes = await fetch(pollinationsUrl);
      if (!imgRes.ok) throw new Error(`Pollinations error: ${imgRes.statusText}`);
      const buf = await imgRes.arrayBuffer();
      const bin = new Uint8Array(buf);
      const admin2 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const imgPath = `${userData.user.id}/sections/${crypto.randomUUID()}.png`;
      const { error: upErr } = await admin2.storage.from("product-images").upload(imgPath, bin, { contentType: "image/png", upsert: false });
      if (upErr) throw upErr;
      const imageUrl = admin2.storage.from("product-images").getPublicUrl(imgPath).data.publicUrl;
      return new Response(JSON.stringify({ imageUrl, _meta: { cache_hit: false, credits_charged: 5, credits_saved: 0, minutes_saved: 0, inr_saved: 0, new_balance: balance } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // mode === 'text'
    const prompt = `You're writing copy for a section on an Indian e-commerce homepage. Store: "${storeName || "a store"}", category: ${category || "general"}, section type: ${sectionType}. Generate a catchy, conversion-focused TITLE (max 6 words) and a complementary SUBTITLE (max 12 words). Tone: ${category === "fashion" ? "aspirational, elegant" : category === "food" ? "warm, fresh, appetizing" : "modern, trustworthy"}. Return strictly JSON: {"title":"...","subtitle":"..."}.`;

    const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error ${r.status}: ${t}`);
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify({ ...parsed, _meta: { cache_hit: false, credits_charged: 5, credits_saved: 0, minutes_saved: 0, inr_saved: 0, new_balance: balance } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-section-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
