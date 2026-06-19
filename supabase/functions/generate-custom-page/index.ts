// Generates a beautiful AI custom page (sections JSON) for a merchant's storefront.
// Charges credits via consume_credits RPC. Uses Lovable AI Gateway (Gemini).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED_SECTION_TYPES = [
  "hero",
  "richtext",
  "stats",
  "feature_grid",
  "team",
  "timeline",
  "gallery",
  "quote",
  "faq",
  "cta",
  "split_image",
] as const;

const SYSTEM_PROMPT = `You are a senior brand designer creating a single beautifully-crafted page for a merchant's online store.

You will receive: page title, merchant brief, store name, brand palette and fonts, and a list of merchant-uploaded image URLs.

Return ONLY a JSON object matching this schema (no markdown, no commentary):
{
  "sections": [
    { "type": "hero", "eyebrow"?: string, "heading": string, "subheading"?: string, "image_url"?: string, "cta"?: { "label": string, "href": string } },
    { "type": "richtext", "heading"?: string, "body": string },
    { "type": "stats", "heading"?: string, "items": [{ "value": string, "label": string }] },
    { "type": "feature_grid", "heading"?: string, "items": [{ "title": string, "body": string, "icon"?: "sparkle"|"shield"|"heart"|"leaf"|"bolt"|"star" }] },
    { "type": "team", "heading"?: string, "members": [{ "name": string, "role"?: string, "bio"?: string, "image_url"?: string }] },
    { "type": "timeline", "heading"?: string, "items": [{ "year"?: string, "title": string, "body"?: string }] },
    { "type": "gallery", "heading"?: string, "images": [{ "url": string, "caption"?: string }] },
    { "type": "quote", "quote": string, "author"?: string, "role"?: string },
    { "type": "faq", "heading"?: string, "items": [{ "q": string, "a": string }] },
    { "type": "cta", "heading": string, "body"?: string, "button": { "label": string, "href": string } },
    { "type": "split_image", "image_url": string, "heading": string, "body": string, "image_side"?: "left"|"right" }
  ],
  "seo": { "meta_title": string, "meta_description": string }
}

Rules:
- Pick the 4–7 sections that best tell the story for the brief. Always start with a hero.
- Distribute uploaded images across sections (hero, split_image, gallery, team). Do not invent image URLs — only use URLs from the provided list. If you have no image for a section that needs one, omit that section.
- Copy must match the merchant's brand voice and the store's vertical. Keep paragraphs tight (max ~60 words).
- Headings should be punchy and human; avoid generic corporate filler.
- href fields should use relative paths starting with /store/{slug}/... when linking inside the store, or "#" if unclear.
- Output JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI gateway not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { page_id, regenerate } = body as { page_id: string; regenerate?: boolean };
    if (!page_id) return json({ error: "page_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Load the draft page
    const { data: page, error: pErr } = await admin
      .from("store_custom_pages")
      .select("*")
      .eq("id", page_id)
      .maybeSingle();
    if (pErr) return json({ error: `Page lookup failed: ${pErr.message}` }, 500);
    if (!page) return json({ error: "Page not found" }, 404);

    const { data: store, error: sErr } = await admin
      .from("stores")
      .select("id, user_id, name, slug, theme, settings")
      .eq("id", (page as any).store_id)
      .maybeSingle();
    if (sErr || !store) return json({ error: "Store not found" }, 404);
    if ((store as any).user_id !== userId) return json({ error: "Forbidden" }, 403);


    // Charge credits (atomic; returns -1 if insufficient)
    const actionKey = regenerate ? "regenerate_custom_page_section" : "generate_custom_page";
    const { data: balance, error: chargeErr } = await admin.rpc("consume_credits", {
      _store_id: store.id,
      _action_key: actionKey,
      _cache_hit: false,
    });
    if (chargeErr) return json({ error: chargeErr.message }, 500);
    if (typeof balance === "number" && balance < 0) {
      return json({ error: "Not enough AI credits. Top up your wallet to continue.", code: "insufficient_credits" }, 402);
    }

    // Theme snapshot for prompt
    const themeData: any = store.theme || {};
    const colors = themeData.colors || {};
    const fonts = themeData.fonts || {};
    const themeSnapshot = {
      colors,
      fonts,
      borderRadius: themeData.borderRadius ?? 8,
      style_hint: page.style_hint || "match_theme",
    };

    const uploadedImages: string[] = Array.isArray(page.uploaded_images) ? page.uploaded_images : [];

    const userPrompt = `Store: ${store.name} (slug: ${store.slug})
Page title: ${page.title}
Page slug: ${page.slug}
Short description: ${page.description || "(none)"}
Merchant brief:
${page.brief || page.description || "(none)"}

Brand palette: ${JSON.stringify(colors)}
Brand fonts: ${JSON.stringify(fonts)}
Style hint: ${page.style_hint || "match_theme"}

Uploaded images available (use only these URLs, distribute across sections):
${uploadedImages.length ? uploadedImages.map((u, i) => `${i + 1}. ${u}`).join("\n") : "(none — design a text-rich layout)"}`;

    // Call Lovable AI gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "AI rate limit. Try again in a moment." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted on platform. Contact support." }, 402);
      return json({ error: `AI generation failed: ${errText.slice(0, 300)}` }, 500);
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    let sections: any[] = Array.isArray(parsed.sections) ? parsed.sections : [];
    // Whitelist filter
    sections = sections.filter((s) => s && typeof s === "object" && ALLOWED_SECTION_TYPES.includes(s.type));
    if (sections.length === 0) {
      return json({ error: "AI returned no usable sections. Try again with a clearer brief." }, 500);
    }
    const seo = parsed.seo && typeof parsed.seo === "object" ? parsed.seo : {};

    // Push existing into history (keep last 3)
    const history = Array.isArray(page.history) ? page.history : [];
    if (page.version > 0 && Array.isArray(page.sections) && page.sections.length > 0) {
      history.unshift({ version: page.version, sections: page.sections, seo: page.seo, at: new Date().toISOString() });
    }
    const trimmedHistory = history.slice(0, 3);

    const { error: updErr } = await admin
      .from("store_custom_pages")
      .update({
        sections,
        seo: {
          meta_title: seo.meta_title || `${page.title} — ${store.name}`,
          meta_description: seo.meta_description || page.description || "",
        },
        theme_snapshot: themeSnapshot,
        credits_spent: (page.credits_spent || 0) + (regenerate ? 8 : 25),
        ai_model: "google/gemini-2.5-pro",
        version: (page.version || 1) + 1,
        history: trimmedHistory,
      })
      .eq("id", page_id);
    if (updErr) return json({ error: updErr.message }, 500);

    return json({ ok: true, sections, seo, balance });
  } catch (e: any) {
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
