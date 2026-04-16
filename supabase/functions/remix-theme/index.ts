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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    // Lightweight AI call — only new name, colors, fonts (~300 tokens)
    const remixPrompt = `You are a brand designer. Create a FRESH color palette and font pairing for a "${original.category}" e-commerce store. Make it distinctly different from: ${JSON.stringify(original.theme_config?.colors)}. Return only the design identity.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: remixPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "remix_identity",
            description: "New name, colors, fonts for a remixed theme",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "New theme name" },
                description: { type: "string", description: "1-2 sentence marketing copy" },
                colors: {
                  type: "object",
                  properties: {
                    primary: { type: "string" }, secondary: { type: "string" }, accent: { type: "string" },
                    background: { type: "string" }, text: { type: "string" }, card: { type: "string" },
                  },
                  required: ["primary", "secondary", "accent", "background", "text", "card"],
                },
                fonts: {
                  type: "object",
                  properties: { heading: { type: "string" }, body: { type: "string" } },
                  required: ["heading", "body"],
                },
              },
              required: ["name", "description", "colors", "fonts"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "remix_identity" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI remix failed");
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return data");

    const remix = JSON.parse(toolCall.function.arguments);
    const tokens = data.usage?.total_tokens || 300;
    const cost = Math.round((tokens / 1000) * 0.02 * 100) / 100; // Flash Lite is very cheap

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
