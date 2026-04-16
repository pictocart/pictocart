import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Blueprint defaults for deterministic assembly when no DB blueprints exist ──
const FALLBACK_BLUEPRINTS: Record<string, any> = {
  announcement_bar: { type: "announcement_bar", layout: "full-width", height: "small", animation: "fade-in", announcementText: "🎉 Free shipping on orders over ₹999 — Limited time offer!", margins: { top: 0, bottom: 0 }, padding: { x: 16, y: 8 } },
  testimonials: { type: "testimonials", layout: "grid-3", animation: "stagger-children", title: "What Our Customers Say", testimonials: [
    { name: "Priya S.", rating: 5, quote: "Absolutely love the quality! Will order again.", avatar: "🌸" },
    { name: "Rahul M.", rating: 5, quote: "Fast delivery and amazing packaging. 10/10!", avatar: "⭐" },
    { name: "Ananya K.", rating: 4, quote: "Great product, exactly as described. Very happy.", avatar: "💎" },
    { name: "Vikram P.", rating: 5, quote: "Best purchase I've made this year. Highly recommend!", avatar: "🔥" },
  ], margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  trust_badges: { type: "trust_badges", layout: "grid-4", animation: "fade-in", title: "Why Shop With Us", trustBadges: [
    { icon: "🚚", label: "Free Shipping" }, { icon: "🔒", label: "Secure Payment" },
    { icon: "↩️", label: "Easy Returns" }, { icon: "💬", label: "24/7 Support" },
    { icon: "✅", label: "Quality Assured" }, { icon: "📦", label: "Fast Dispatch" },
  ], margins: { top: 16, bottom: 16 }, padding: { x: 16, y: 16 } },
  brand_marquee: { type: "brand_marquee", layout: "full-width", animation: "fade-in", title: "Trusted By Leading Brands", brands: ["Nike", "Adidas", "Puma", "Reebok", "Under Armour", "New Balance", "Fila", "Skechers"], margins: { top: 16, bottom: 16 }, padding: { x: 0, y: 12 } },
  countdown_timer: { type: "countdown_timer", layout: "full-width", animation: "scale-in", title: "Flash Sale Ends In", subtitle: "Don't miss out on exclusive deals!", countdownDate: new Date(Date.now() + 7 * 86400000).toISOString(), margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  image_with_text: { type: "image_with_text", layout: "split-50-50", animation: "slide-in-left", title: "Crafted With Care", subtitle: "Every product is handpicked and quality-tested to ensure you get the very best.", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  instagram_feed: { type: "instagram_feed", layout: "grid-4", animation: "stagger-children", title: "Follow Us @storename", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 16 } },
  collection_showcase: { type: "collection_showcase", layout: "grid-3", animation: "slide-up", title: "Shop By Collection", subtitle: "Explore our curated collections", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  newsletter: { type: "newsletter", layout: "full-width", animation: "fade-in", title: "Stay In The Loop", subtitle: "Subscribe for exclusive offers, new arrivals, and insider-only discounts.", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  hero: { type: "hero", layout: "full-width", animation: "fade-in", height: "large", title: "Discover Your Style", subtitle: "Premium quality products at prices you'll love.", margins: { top: 0, bottom: 0 }, padding: { x: 16, y: 32 } },
  featured_products: { type: "featured_products", layout: "grid-4", animation: "stagger-children", title: "Best Sellers", subtitle: "Our most loved products", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  category_grid: { type: "category_grid", layout: "grid-3", animation: "slide-up", title: "Shop By Category", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  text_block: { type: "text_block", layout: "full-width", animation: "fade-in", title: "Our Story", subtitle: "We believe in quality, sustainability, and making every customer smile.", margins: { top: 24, bottom: 24 }, padding: { x: 16, y: 24 } },
  banner_carousel: { type: "banner_carousel", layout: "full-width", animation: "fade-in", title: "New Arrivals", height: "medium", margins: { top: 0, bottom: 16 }, padding: { x: 0, y: 0 } },
  video_hero: { type: "video_hero", layout: "full-width", animation: "fade-in", title: "See It In Action", height: "large", margins: { top: 0, bottom: 0 }, padding: { x: 0, y: 0 } },
};

// ── Animation mapping by intensity ──
const ANIMATION_POOLS = {
  subtle: ["fade-in", "slide-up", "blur-in"],
  moderate: ["fade-in", "slide-up", "slide-in-left", "slide-in-right", "scale-in", "blur-in"],
  dramatic: ["parallax", "ken-burns", "stagger-children", "flip-up", "bounce-in", "slide-in-left", "slide-in-right"],
};

const CARD_EFFECT_MAP: Record<string, string> = {
  "Glare": "hover-glare", "Tilt 3D": "hover-tilt", "Lift Shadow": "hover-lift",
  "Border Glow": "hover-border-glow", "Zoom Image": "hover-zoom-image",
};

const HERO_ANIMATION_MAP: Record<string, string> = {
  "Parallax": "parallax", "Ken Burns Zoom": "ken-burns", "Video Background": "fade-in",
  "Split Layout": "slide-in-left", "Full Bleed": "scale-in",
};

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleArray<T>(arr: T[]): T[] { return [...arr].sort(() => 0.5 - Math.random()); }

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

    const { category, styleHints } = await req.json();
    if (!category) throw new Error("Category is required");

    // ── Parse style hints to extract structured preferences ──
    const parsedHints = parseStyleHints(styleHints || "");

    // ── TIER 1: Lightweight AI call for Design DNA only ──
    const designDnaPrompt = `You are a world-class e-commerce brand designer. Generate ONLY the brand identity for a "${category}" store theme.
${styleHints ? `\nDesign brief: ${styleHints}` : ""}

Return ONLY the design DNA — no section content, no testimonials, no badge text.`;

    const dnaRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: designDnaPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "create_design_dna",
            description: "Create brand identity for an e-commerce theme — colors, fonts, name only",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Theme name like 'Luxe Fashion' or 'Organic Bites'" },
                description: { type: "string", description: "Marketing copy (2-3 sentences)" },
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
                  properties: {
                    heading: { type: "string", description: "Distinctive Google Font for headings" },
                    body: { type: "string", description: "Clean Google Font for body" },
                  },
                  required: ["heading", "body"],
                },
                borderRadius: { type: "number" },
                gradientBackground: { type: "string", description: "Optional CSS gradient for hero" },
                section_order: {
                  type: "array",
                  items: { type: "string", enum: ["hero", "featured_products", "category_grid", "text_block", "newsletter", "banner_carousel", "testimonials", "countdown_timer", "trust_badges", "brand_marquee", "image_with_text", "video_hero", "instagram_feed", "collection_showcase", "announcement_bar"] },
                  description: "Ordered list of 8-12 section types for the home page. First should be announcement_bar, second should be hero.",
                },
                image_prompts: {
                  type: "array",
                  items: { type: "object", properties: { section: { type: "string" }, prompt: { type: "string" } }, required: ["section", "prompt"] },
                  description: "4-6 image prompts for hero and key sections",
                },
              },
              required: ["name", "description", "colors", "fonts", "borderRadius", "section_order", "image_prompts"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_design_dna" } },
      }),
    });

    if (!dnaRes.ok) {
      const errText = await dnaRes.text();
      console.error("AI DNA error:", dnaRes.status, errText);
      if (dnaRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (dnaRes.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI generation failed");
    }

    const dnaData = await dnaRes.json();
    const toolCall = dnaData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const designDna = JSON.parse(toolCall.function.arguments);
    const dnaTokens = dnaData.usage?.total_tokens || 1000;

    // ── TIER 2: Deterministic Assembly from blueprints ──

    // Fetch DB blueprints
    const { data: dbBlueprints } = await adminClient
      .from("theme_section_blueprints")
      .select("*")
      .or(`category_tags.cs.{${category}},category_tags.cs.{general}`);

    // Build blueprint lookup: section_type -> array of variants
    const blueprintLookup: Record<string, any[]> = {};
    for (const bp of (dbBlueprints || [])) {
      if (!blueprintLookup[bp.section_type]) blueprintLookup[bp.section_type] = [];
      blueprintLookup[bp.section_type].push(bp.content_json);
    }

    // Determine animation pool from intensity
    const intensity = parsedHints.animationIntensity;
    const animPool = intensity > 70 ? ANIMATION_POOLS.dramatic : intensity > 40 ? ANIMATION_POOLS.moderate : ANIMATION_POOLS.subtle;

    // Determine card effects
    const cardEffects = parsedHints.cardEffects.map((e: string) => CARD_EFFECT_MAP[e]).filter(Boolean);
    const defaultCardEffect = cardEffects.length > 0 ? cardEffects[0] : "hover-lift";

    // Assemble sections
    const sectionOrder = designDna.section_order || ["announcement_bar", "hero", "featured_products", "category_grid", "testimonials", "trust_badges", "newsletter"];
    const homeSections: any[] = [];

    for (const sectionType of sectionOrder) {
      // Pick blueprint: DB first, then fallback
      const variants = blueprintLookup[sectionType];
      let section = variants && variants.length > 0
        ? JSON.parse(JSON.stringify(pickRandom(variants)))
        : JSON.parse(JSON.stringify(FALLBACK_BLUEPRINTS[sectionType] || { type: sectionType, layout: "full-width", title: sectionType.replace(/_/g, " ") }));

      // Override type
      section.type = sectionType;

      // Assign animation
      if (sectionType === "hero") {
        section.animation = HERO_ANIMATION_MAP[parsedHints.heroStyle] || pickRandom(animPool);
      } else {
        section.animation = pickRandom(animPool);
      }

      // Assign card effect for product sections
      if (["featured_products", "category_grid", "collection_showcase"].includes(sectionType)) {
        section.cardEffect = cardEffects.length > 0 ? pickRandom(cardEffects) : defaultCardEffect;
      }

      homeSections.push(section);
    }

    // ── Image Pool lookup + parallel generation ──
    const imagePrompts = designDna.image_prompts || [];
    const generatedImages: Record<string, string> = {};

    // Check pool first
    const { data: poolImages } = await adminClient
      .from("theme_image_pool")
      .select("*")
      .eq("category", category);

    const poolBySection: Record<string, string[]> = {};
    for (const img of (poolImages || [])) {
      if (!poolBySection[img.section_type]) poolBySection[img.section_type] = [];
      poolBySection[img.section_type].push(img.image_url);
    }

    // Determine which prompts need generation vs pool reuse
    const promptsToGenerate: typeof imagePrompts = [];
    for (const imgReq of imagePrompts.slice(0, 5)) {
      const poolForSection = poolBySection[imgReq.section];
      if (poolForSection && poolForSection.length >= 3) {
        // Reuse from pool
        generatedImages[imgReq.section] = pickRandom(poolForSection);
      } else {
        promptsToGenerate.push(imgReq);
      }
    }

    // Parallel image generation (max 3 concurrent)
    let imageTokens = 0;
    const generateImage = async (imgReq: { section: string; prompt: string }) => {
      try {
        const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: imgReq.prompt + ". High quality, professional e-commerce photography style, 16:9 aspect ratio." }],
            modalities: ["image", "text"],
          }),
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const base64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (base64) {
            const raw = base64.includes(",") ? base64.split(",")[1] : base64;
            const imageBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
            const path = `themes/${crypto.randomUUID()}.png`;
            const { error: uploadErr } = await adminClient.storage.from("product-images").upload(path, imageBytes, { contentType: "image/png" });
            if (!uploadErr) {
              const { data: { publicUrl } } = adminClient.storage.from("product-images").getPublicUrl(path);
              generatedImages[imgReq.section] = publicUrl;

              // Save to image pool for future reuse
              await adminClient.from("theme_image_pool").insert({
                category,
                section_type: imgReq.section,
                image_url: publicUrl,
              });
            }
          }
          imageTokens += imgData.usage?.total_tokens || 1000;
        }
      } catch (e) {
        console.error("Image gen error:", e);
      }
    };

    // Run in parallel batches of 3
    for (let i = 0; i < promptsToGenerate.length; i += 3) {
      const batch = promptsToGenerate.slice(i, i + 3);
      await Promise.all(batch.map(generateImage));
    }

    // Assign images to sections
    for (const section of homeSections) {
      const key = `home_${section.type}`;
      if (generatedImages[key]) section.image = generatedImages[key];
    }

    // ── Save blueprints from this generation for future reuse ──
    const blueprintInserts = homeSections
      .filter(s => !blueprintLookup[s.type] || blueprintLookup[s.type].length < 5)
      .map(s => ({
        section_type: s.type,
        layout: s.layout || "full-width",
        variant_name: `${designDna.name} - ${s.type}`,
        content_json: s,
        category_tags: [category, "general"],
      }));

    if (blueprintInserts.length > 0) {
      await adminClient.from("theme_section_blueprints").insert(blueprintInserts);
    }

    // ── Calculate cost ──
    const textCost = (dnaTokens / 1000) * 0.05;
    const newImagesCount = promptsToGenerate.length;
    const imageCost = newImagesCount * 3.5;
    const totalCostInr = Math.round((textCost + imageCost) * 100) / 100;
    const poolReused = imagePrompts.length - newImagesCount;

    const thumbnail = generatedImages["home_hero"] || Object.values(generatedImages)[0] || null;

    const { data: pack, error: insertErr } = await adminClient.from("theme_packs").insert({
      name: designDna.name,
      category,
      description: designDna.description,
      thumbnail,
      pages: { home: homeSections },
      theme_config: {
        colors: designDna.colors,
        fonts: designDna.fonts,
        borderRadius: designDna.borderRadius,
        gradientBackground: designDna.gradientBackground,
      },
      price: 499,
      ai_generation_cost: totalCostInr,
      is_published: false,
      created_by: user.id,
    }).select().single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      success: true,
      theme_pack: pack,
      images_generated: newImagesCount,
      images_reused: poolReused,
      cost: totalCostInr,
      optimization: poolReused > 0 ? `Saved ₹${(poolReused * 3.5).toFixed(2)} by reusing ${poolReused} cached images` : "First generation for this category — images cached for next time",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-theme-pack error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Parse styleHints string into structured preferences ──
function parseStyleHints(hints: string) {
  const result = {
    mood: "Bold",
    animationIntensity: 65,
    cardEffects: [] as string[],
    heroStyle: "Full Bleed",
    colorMood: "Vibrant",
    typoFeel: "Modern Sans",
    sections: [] as string[],
  };

  if (!hints) return result;

  const match = (key: string) => {
    const regex = new RegExp(`${key}:\\s*([^.]+)`, "i");
    const m = hints.match(regex);
    return m ? m[1].trim() : null;
  };

  result.mood = match("Mood") || result.mood;
  const intensityStr = match("Animation Intensity");
  if (intensityStr) result.animationIntensity = parseInt(intensityStr) || 65;
  const cardsStr = match("Card Effects");
  if (cardsStr) result.cardEffects = cardsStr.split(",").map(s => s.trim()).filter(Boolean);
  result.heroStyle = match("Hero Style") || result.heroStyle;
  result.colorMood = match("Color Mood") || result.colorMood;
  result.typoFeel = match("Typography") || result.typoFeel;
  const sectionsStr = match("Include Sections");
  if (sectionsStr) result.sections = sectionsStr.split(",").map(s => s.trim()).filter(Boolean);

  return result;
}
