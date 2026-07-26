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
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const NVIDIA_API_KEY = Deno.env.get("NVIDIA_API_KEY");
    if (!NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { themePackId } = await req.json();
    if (!themePackId) throw new Error("themePackId is required");

    // Fetch original theme
    const { data: original, error: fetchErr } = await adminClient
      .from("theme_packs")
      .select("*")
      .eq("id", themePackId)
      .single();

    if (fetchErr || !original) throw new Error("Theme not found");

    // Lightweight AI call — new name, colors, fonts as plain JSON
    const remixPrompt = `You are a brand designer. Create a FRESH color palette and font pairing for a "${original.category}" e-commerce store. Make it distinctly different from: ${JSON.stringify(original.theme_config?.colors)}.

Return ONLY valid JSON, no markdown fences:
{
  "name": "string — new theme name",
  "description": "string — 1-2 sentence marketing copy",
  "colors": {
    "primary": "#hex", "secondary": "#hex", "accent": "#hex",
    "background": "#hex", "text": "#hex", "card": "#hex"
  },
  "fonts": { "heading": "font name", "body": "font name" }
}`;

    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-omni-30b-v3b-reasoning",
        messages: [{ role: "user", content: remixPrompt }],
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI remix failed");
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let remix: any;
    try { remix = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); remix = m ? JSON.parse(m[0]) : null; }
    if (!remix?.colors) throw new Error("AI did not return valid remix data");

    const tokens = data.usage?.total_tokens || 300;
    const cost = Math.round((tokens / 1000) * 0.02 * 100) / 100;

    // Clone pages, keep images, apply new theme_config
    const newThemeConfig = {
      ...original.theme_config,
      colors: remix.colors,
      fonts: remix.fonts,
    };

    const { data: pack, error: insertErr } = await adminClient.from("theme_packs").insert({
      name: remix.name,
      category: original.category,
      description: remix.description,
      thumbnail: original.thumbnail,
      pages: original.pages,
      theme_config: newThemeConfig,
      price: 499,
      ai_generation_cost: cost,
      is_published: false,
      created_by: user.id,
    }).select().single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      success: true,
      theme_pack: pack,
      cost,
      remixed_from: original.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remix-theme error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
