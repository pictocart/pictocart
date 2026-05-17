import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { costInr, IMAGE_COST_INR } from "../_shared/theme-pricing.ts";
import { validateManifest } from "../_shared/manifestSchema.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function callAI(model: string, body: any, fnName: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, ...body }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const cost = costInr(model, data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0);
  await supabase.from("ai_call_log").insert({ function_name: fnName, model, prompt_tokens: data.usage?.prompt_tokens ?? 0, completion_tokens: data.usage?.completion_tokens ?? 0, cost_inr: cost });
  return { data, cost };
}

async function genImage(prompt: string, fnName: string): Promise<{ url: string | null; cost: number }> {
  try {
    const { data } = await callAI("google/gemini-3.1-flash-image-preview", {
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }, fnName);
    const dataUrl: string | undefined = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) return { url: null, cost: IMAGE_COST_INR };
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(image\/\w+)/)?.[1] ?? "image/png";
    const ext = mime.split("/")[1];
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `themes/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("store-assets").upload(path, bin, { contentType: mime, upsert: false });
    if (up.error) { console.error("upload", up.error); return { url: null, cost: IMAGE_COST_INR }; }
    const { data: pub } = supabase.storage.from("store-assets").getPublicUrl(path);
    return { url: pub.publicUrl, cost: IMAGE_COST_INR };
  } catch (e) { console.error("genImage", e); return { url: null, cost: 0 }; }
}

const themeTool = {
  type: "function",
  function: {
    name: "build_theme",
    description: "Produce a complete e-commerce theme blueprint with palette, typography, copy, products, categories.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        tagline: { type: "string" },
        vibe: { type: "string" },
        palette: {
          type: "object",
          properties: {
            primary: { type: "string" }, primary_fg: { type: "string" },
            accent: { type: "string" }, bg: { type: "string" }, surface: { type: "string" },
            fg: { type: "string" }, muted: { type: "string" }, border: { type: "string" },
          },
          required: ["primary","primary_fg","accent","bg","surface","fg","muted","border"],
          additionalProperties: false,
        },
        fonts: {
          type: "object",
          properties: { heading: { type: "string" }, body: { type: "string" }, heading_weight: { type: "integer" } },
          required: ["heading","body","heading_weight"],
          additionalProperties: false,
        },
        radius: { type: "string", enum: ["0px","4px","8px","12px","20px","9999px"] },
        hero: {
          type: "object",
          properties: {
            kicker: { type: "string" }, title: { type: "string" }, sub: { type: "string" },
            cta: { type: "string" }, cta_secondary: { type: "string" },
            image_prompt: { type: "string" },
          },
          required: ["kicker","title","sub","cta","cta_secondary","image_prompt"],
          additionalProperties: false,
        },
        usps: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", properties: { icon: { type: "string", enum: ["truck","shield","refresh","headphones","lock","tag","gift","sparkles"] }, title: { type: "string" }, sub: { type: "string" } }, required: ["icon","title","sub"], additionalProperties: false } },
        categories: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", properties: { name: { type: "string" }, image_prompt: { type: "string" } }, required: ["name","image_prompt"], additionalProperties: false } },
        products: { type: "array", minItems: 6, maxItems: 6, items: { type: "object", properties: { name: { type: "string" }, price: { type: "number" }, compare_at: { type: "number" }, badge: { type: "string" } }, required: ["name","price","compare_at","badge"], additionalProperties: false } },
        story: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title","body"], additionalProperties: false },
        testimonials: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", properties: { quote: { type: "string" }, author: { type: "string" }, location: { type: "string" } }, required: ["quote","author","location"], additionalProperties: false } },
        newsletter: { type: "object", properties: { title: { type: "string" }, sub: { type: "string" }, cta: { type: "string" } }, required: ["title","sub","cta"], additionalProperties: false },
        footer: { type: "object", properties: { tagline: { type: "string" }, columns: { type: "array", items: { type: "object", properties: { title: { type: "string" }, links: { type: "array", items: { type: "string" } } }, required: ["title","links"], additionalProperties: false } } }, required: ["tagline","columns"], additionalProperties: false },
        about: { type: "object", properties: { title: { type: "string" }, mission: { type: "string" }, values: { type: "array", items: { type: "string" } } }, required: ["title","mission","values"], additionalProperties: false },
        layout: {
          type: "object",
          properties: {
            hero_style: { type: "string", enum: ["centered","split","magazine","fullscreen_image","minimal_left","editorial_serif","asymmetric"] },
            category_style: { type: "string", enum: ["grid_4","masonry","carousel_strip","big_feature","circles","mosaic_2x2"] },
            product_style: { type: "string", enum: ["grid_clean","grid_minimal","cards_shadow","editorial_list","mosaic"] },
            section_order: { type: "array", items: { type: "string", enum: ["hero","usp_strip","category_grid","trending","story","testimonials","newsletter"] }, minItems: 5, maxItems: 7 },
            header_style: { type: "string", enum: ["classic","centered_logo","minimal_thin","bold_serif","sidebar_hint"] },
            density: { type: "string", enum: ["airy","balanced","dense"] },
          },
          required: ["hero_style","category_style","product_style","section_order","header_style","density"],
          additionalProperties: false,
        },
      },
      required: ["name","tagline","vibe","palette","fonts","radius","hero","usps","categories","products","story","testimonials","newsletter","footer","about","layout"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const t0 = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const themeId: string = body.theme_id ?? `theme-${Date.now()}`;
    const brief = body.brief ?? {};
    const category: string = brief.category ?? "general";
    const briefName = brief.name ?? brief.vibe ?? category;

    const sysPrompt = `You design beautiful, distinctive e-commerce themes for Indian small sellers (Pic To Cart). Each theme MUST feel structurally different from the previous ones — not just a recolor. Vary LAYOUT aggressively: pick a hero_style, category_style, product_style and section_order that suit the vibe and DIFFER from typical centered-hero+4-grid templates. Use real Google Fonts. Palette must be tight and cohesive. All colors valid hex.`;
    const userPrompt = `Brief: ${JSON.stringify({ ...brief, category, name: briefName })}.
Design a theme called "${briefName}" with vibe "${brief.vibe ?? category}". Fill EVERY field. Products must have realistic Indian INR prices. Image prompts must be detailed photographic descriptions for e-commerce, no text overlay.`;
    const dnaRes = await callAI("google/gemini-2.5-flash", {
      messages: [{ role: "system", content: sysPrompt }, { role: "user", content: userPrompt }],
      tools: [themeTool],
      tool_choice: { type: "function", function: { name: "build_theme" } },
    }, "generate-and-ship-theme");
    const toolCall = dnaRes.data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return theme blueprint");
    const dna = JSON.parse(toolCall.function.arguments);

    const imgPrompts: { key: string; prompt: string }[] = [
      { key: "hero", prompt: `${dna.hero.image_prompt}. Cinematic, ${dna.vibe} aesthetic, 16:9, high-end product photography, no text.` },
      ...dna.categories.map((c: any, i: number) => ({ key: `cat_${i}`, prompt: `${c.image_prompt}. ${dna.vibe} aesthetic, square crop, clean studio background, no text.` })),
    ];
    const imgResults = await Promise.all(imgPrompts.map((p) => genImage(p.prompt, "generate-and-ship-theme")));
    const imageCostTotal = imgResults.reduce((s, r) => s + r.cost, 0);
    const imageCount = imgResults.filter((r) => r.url).length;
    const heroUrl = imgResults[0].url;
    dna.categories.forEach((c: any, i: number) => { c.image = imgResults[i + 1].url; });

    const layout = dna.layout ?? {};
    const sectionMap: Record<string, any> = {
      hero: { type: "hero", props: { ...dna.hero, image: heroUrl, style: layout.hero_style } },
      usp_strip: { type: "usp_strip", props: { items: dna.usps } },
      category_grid: { type: "category_grid", props: { title: "Shop by category", items: dna.categories, style: layout.category_style } },
      trending: { type: "product_grid", props: { title: "Trending now", items: dna.products, style: layout.product_style } },
      story: { type: "story", props: { ...dna.story, image: heroUrl } },
      testimonials: { type: "testimonials", props: { items: dna.testimonials } },
      newsletter: { type: "newsletter", props: dna.newsletter },
    };
    const order = (layout.section_order && layout.section_order.length >= 5)
      ? layout.section_order
      : ["hero","usp_strip","category_grid","trending","story","testimonials","newsletter"];
    const homeSections = order.map((k: string) => sectionMap[k]).filter(Boolean);

    // Inject required marketplace sections so the manifest passes validation.
    const homeWithJournal = [
      ...homeSections,
      { type: "journal_strip", props: { title: "From the journal", limit: 3 } },
    ];

    const manifest = {
      version: 2,
      dna,
      layout,
      hero_image: heroUrl,
      pages: {
        auth: { sections: [
          { type: "signup",           props: { title: `Create your ${dna.name} account`, cta: "Sign up" } },
          { type: "signin",           props: { title: `Welcome back to ${dna.name}`, cta: "Sign in" } },
          { type: "forgot_password",  props: { title: "Reset your password", cta: "Send reset link" } },
          { type: "reset_password",   props: { title: "Choose a new password", cta: "Update password" } },
        ] },
        home: { sections: homeWithJournal },
        shop: { sections: [
          { type: "page_title",  props: { title: "Shop all" } },
          { type: "product_grid", props: { items: dna.products, style: layout.product_style } },
        ] },
        product: { sections: [
          { type: "product_detail", props: { product: dna.products[0], image: heroUrl } },
          { type: "trending",       props: { title: "You may also like", items: dna.products.slice(1, 5) } },
        ] },
        cart: { sections: [
          { type: "line_items",   props: {} },
          { type: "cart_summary", props: { cta: "Checkout" } },
        ] },
        checkout: { sections: [
          { type: "checkout_stepper", props: { steps: ["address", "shipping", "payment", "review"] } },
        ] },
        journal: { sections: [
          { type: "page_title",   props: { title: "Journal" } },
          { type: "journal_list", props: { limit: 12 } },
        ] },
        about: { sections: [
          { type: "page_title", props: { title: dna.about.title } },
          { type: "story",      props: { title: dna.about.title, body: dna.about.mission, image: heroUrl } },
          { type: "values",     props: { items: dna.about.values } },
        ] },
        contact: { sections: [
          { type: "page_title",   props: { title: "Contact us" } },
          { type: "contact_form", props: { email: "hello@store.in", phone: "+91 98xxx xxxxx" } },
        ] },
        account: { sections: [
          { type: "account_panel", props: { tabs: ["orders", "addresses", "wishlist", "profile"] } },
        ] },
      },
      navigation: [
        { label: "Shop",    to: "/shop" },
        { label: "Journal", to: "/journal" },
        { label: "About",   to: "/about" },
        { label: "Contact", to: "/contact" },
      ],
      footer: dna.footer,
      header_style: layout.header_style ?? "classic",
      density: layout.density ?? "balanced",
    };

    const validation = validateManifest(manifest);
    if (!validation.ok) {
      console.error("manifest validation failed", validation.missing);
      return json({ ok: false, error: "Manifest incomplete", missing: validation.missing }, 422);
    }

    const { count } = await supabase.from("theme_master_versions").select("id", { count: "exact", head: true }).eq("theme_id", themeId);
    await supabase.from("theme_master_versions").insert({ theme_id: themeId, version: (count ?? 0) + 1, files_manifest: manifest });

    // Auto-publish to merchant marketplace as a theme_master_projects entry.
    // The renderer (/admin/themes/preview/:themeId) acts as the live preview URL.
    const lovableUrl = `${Deno.env.get("PUBLIC_SITE_URL") ?? ""}/admin/themes/preview/${themeId}`;
    await supabase.from("theme_master_projects").upsert({
      theme_id: themeId,
      name: dna.name || themeId,
      description: dna.tagline || "",
      category,
      preview_image: heroUrl,
      lovable_project_url: lovableUrl || null,
      client_patch_prompt: `Apply theme ${dna.name} (${dna.vibe}). Palette: ${JSON.stringify(dna.palette)}. Fonts: ${JSON.stringify(dna.fonts)}. Layout: ${JSON.stringify(layout)}.`,
      is_active: true,
    }, { onConflict: "theme_id" });

    const totalCost = Number(((dnaRes.cost ?? 0) + imageCostTotal).toFixed(4));
    await supabase.from("theme_master_metrics").upsert({
      theme_id: themeId, total_cost_inr: totalCost, image_count: imageCount,
      reuse_hits: 0, shipped_to_pictocart: true,
      pictocart_response: { status: 200, body: "auto-published in-project" },
      updated_at: new Date().toISOString(),
    }, { onConflict: "theme_id" });

    if (body.calendar_id) {
      await supabase.from("theme_release_calendar").update({ status: "shipped" }).eq("id", body.calendar_id);
    }
    await supabase.from("theme_settings").update({ last_generation_at: new Date().toISOString() }).eq("id", 1);

    return json({ ok: true, theme_id: themeId, shipped: true, total_cost_inr: totalCost, manifest });
  } catch (e) {
    console.error("generate-and-ship-theme", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
