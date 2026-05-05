import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { costInr } from "../_shared/theme-pricing.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const themeId: string = body.theme_id;
    const feedback: string = body.feedback ?? "";
    if (!themeId || !feedback) return json({ ok: false, error: "theme_id and feedback required" }, 400);

    const { data: latest } = await supabase.from("theme_versions").select("version, files_manifest").eq("theme_id", themeId).order("version", { ascending: false }).limit(1).maybeSingle();
    if (!latest) return json({ ok: false, error: "theme not found" }, 404);

    const manifest = latest.files_manifest as any;
    const dna = manifest?.dna ?? {};
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are refining an existing e-commerce theme based on user feedback. Apply the feedback faithfully but keep the overall structure and image URLs intact. Return ONLY a JSON object matching the SAME shape as the input dna, with all fields filled.

CURRENT DNA:
${JSON.stringify(dna)}

USER FEEDBACK:
${feedback}

Return JSON only, no prose, no markdown fences.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cost = costInr("google/gemini-2.5-flash", data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0);
    await supabase.from("ai_call_log").insert({ function_name: "refine-theme", model: "google/gemini-2.5-flash", prompt_tokens: data.usage?.prompt_tokens ?? 0, completion_tokens: data.usage?.completion_tokens ?? 0, cost_inr: cost });

    let newDna: any;
    try { newDna = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); newDna = m ? JSON.parse(m[0]) : null; }
    if (!newDna) throw new Error("AI returned invalid JSON");

    if (Array.isArray(dna.categories) && Array.isArray(newDna.categories)) {
      newDna.categories = newDna.categories.map((c: any, i: number) => ({ ...c, image: c.image ?? dna.categories[i]?.image }));
    }

    const heroUrl = manifest.hero_image;
    const newManifest = {
      ...manifest,
      dna: newDna,
      hero_image: heroUrl,
      pages: {
        home: { sections: [
          { type: "hero", props: { ...newDna.hero, image: heroUrl } },
          { type: "usp_strip", props: { items: newDna.usps } },
          { type: "category_grid", props: { title: "Shop by category", items: newDna.categories } },
          { type: "trending", props: { title: "Trending now", items: newDna.products } },
          { type: "story", props: { ...newDna.story, image: heroUrl } },
          { type: "testimonials", props: { items: newDna.testimonials } },
          { type: "newsletter", props: newDna.newsletter },
        ] },
        shop: { sections: [{ type: "page_title", props: { title: "Shop all" } }, { type: "product_grid", props: { items: newDna.products } }] },
        product: { sections: [{ type: "product_detail", props: { product: newDna.products[0], image: heroUrl } }, { type: "trending", props: { title: "You may also like", items: newDna.products.slice(1, 5) } }] },
        about: { sections: [{ type: "page_title", props: { title: newDna.about.title } }, { type: "story", props: { title: newDna.about.title, body: newDna.about.mission, image: heroUrl } }, { type: "values", props: { items: newDna.about.values } }] },
        contact: { sections: [{ type: "page_title", props: { title: "Contact us" } }, { type: "contact_form", props: { email: "hello@store.in", phone: "+91 98xxx xxxxx" } }] },
      },
      footer: newDna.footer,
    };
    const nextVersion = (latest.version ?? 0) + 1;
    await supabase.from("theme_versions").insert({ theme_id: themeId, version: nextVersion, files_manifest: newManifest, notes: feedback.slice(0, 500) });
    return json({ ok: true, theme_id: themeId, version: nextVersion, cost_inr: cost });
  } catch (e) {
    console.error("refine-theme", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
