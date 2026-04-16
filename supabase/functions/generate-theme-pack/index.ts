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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { category, styleHints } = await req.json();
    if (!category) throw new Error("Category is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const structurePrompt = `You are a world-class e-commerce web designer who creates themes that rival Shopify's premium Dawn and Sense themes.

Generate a COMPLETE, premium, ready-to-deploy e-commerce theme for the "${category}" category.
${styleHints ? `\nAdmin's design brief: ${styleHints}` : ""}

CRITICAL REQUIREMENTS:
1. The home page MUST have 8-12 sections minimum (not just 4-5)
2. Every section MUST have a non-"none" animation
3. Product sections MUST specify cardEffect
4. Include an announcement_bar as the first section
5. Include trust_badges section
6. The theme must look like a ₹2999 premium theme — not a basic template

COLOR PALETTE: Create a harmonious 6-color palette that feels cohesive and premium.
FONTS: Choose distinctive Google Fonts pairing — NOT Inter/Roboto/Open Sans.

Section types: hero, featured_products, category_grid, text_block, newsletter, banner_carousel, testimonials, countdown_timer, trust_badges, brand_marquee, image_with_text, video_hero, instagram_feed, collection_showcase, announcement_bar

Animation options: fade-in, slide-up, slide-in-left, slide-in-right, scale-in, parallax, ken-burns, stagger-children, blur-in, flip-up, bounce-in

Card effects: hover-glare, hover-tilt, hover-lift, hover-border-glow, hover-zoom-image

Make it absolutely stunning. This theme should make store owners say "wow, which one should I choose?"`;

    const structureRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: structurePrompt }],
        tools: [{
          type: "function",
          function: {
            name: "create_theme_pack",
            description: "Create a complete premium multi-page theme pack with 8-12 sections, animations, and card effects",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Theme name like 'Luxe Fashion' or 'Organic Bites'" },
                description: { type: "string", description: "Marketing copy for the theme (2-3 sentences)" },
                theme_config: {
                  type: "object",
                  properties: {
                    colors: {
                      type: "object",
                      properties: {
                        primary: { type: "string" },
                        secondary: { type: "string" },
                        accent: { type: "string" },
                        background: { type: "string" },
                        text: { type: "string" },
                        card: { type: "string" },
                      },
                      required: ["primary", "secondary", "accent", "background", "text", "card"],
                    },
                    fonts: {
                      type: "object",
                      properties: {
                        heading: { type: "string", description: "Google Fonts name for headings — choose distinctive fonts like Playfair Display, Cormorant Garamond, Space Grotesk, DM Serif Display, Outfit" },
                        body: { type: "string", description: "Google Fonts name for body text" },
                      },
                      required: ["heading", "body"],
                    },
                    borderRadius: { type: "number" },
                    gradientBackground: { type: "string", description: "Optional CSS gradient for hero backgrounds" },
                  },
                  required: ["colors", "fonts", "borderRadius"],
                },
                pages: {
                  type: "object",
                  properties: {
                    home: {
                      type: "array",
                      description: "Must have 8-12 sections. First should be announcement_bar.",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["hero", "featured_products", "category_grid", "text_block", "newsletter", "banner_carousel", "testimonials", "countdown_timer", "trust_badges", "brand_marquee", "image_with_text", "collection_showcase", "instagram_feed", "announcement_bar"] },
                          layout: { type: "string", enum: ["full-width", "split-50-50", "grid-2", "grid-3", "grid-4"] },
                          animation: { type: "string", enum: ["fade-in", "slide-up", "slide-in-left", "slide-in-right", "scale-in", "parallax", "ken-burns", "stagger-children", "blur-in", "flip-up", "bounce-in"] },
                          title: { type: "string" },
                          subtitle: { type: "string" },
                          height: { type: "string", enum: ["small", "medium", "large"] },
                          cardEffect: { type: "string", enum: ["hover-glare", "hover-tilt", "hover-lift", "hover-border-glow", "hover-zoom-image"], description: "Card hover effect for product/collection sections" },
                          cardStyle: { type: "string" },
                          announcementText: { type: "string", description: "Text for announcement_bar sections" },
                          countdownDate: { type: "string", description: "ISO date string for countdown_timer sections" },
                          trustBadges: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                icon: { type: "string", description: "Emoji icon" },
                                label: { type: "string" },
                              },
                            },
                            description: "Array of trust badges for trust_badges sections"
                          },
                          testimonials: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                rating: { type: "number" },
                                quote: { type: "string" },
                                avatar: { type: "string", description: "Emoji or initial" },
                              },
                            },
                            description: "Array of testimonials for testimonials sections"
                          },
                          brands: {
                            type: "array",
                            items: { type: "string" },
                            description: "Brand names for marquee"
                          },
                          margins: {
                            type: "object",
                            properties: { top: { type: "number" }, bottom: { type: "number" } },
                          },
                          padding: {
                            type: "object",
                            properties: { x: { type: "number" }, y: { type: "number" } },
                          },
                        },
                        required: ["type", "layout", "animation", "title"],
                      },
                    },
                  },
                  required: ["home"],
                },
                image_prompts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      section: { type: "string" },
                      prompt: { type: "string" },
                    },
                    required: ["section", "prompt"],
                  },
                  description: "4-6 image prompts for AI image generation",
                },
              },
              required: ["name", "description", "theme_config", "pages", "image_prompts"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_theme_pack" } },
      }),
    });

    if (!structureRes.ok) {
      const errText = await structureRes.text();
      console.error("AI structure error:", structureRes.status, errText);
      if (structureRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (structureRes.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const structureData = await structureRes.json();
    const toolCall = structureData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const themeData = JSON.parse(toolCall.function.arguments);
    const structureTokens = structureData.usage?.total_tokens || 3000;

    // Generate images
    const imagePrompts = themeData.image_prompts || [];
    const generatedImages: Record<string, string> = {};
    let imageTokens = 0;

    for (const imgReq of imagePrompts.slice(0, 5)) {
      try {
        const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
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
            const imageBytes = Uint8Array.from(atob(base64.split(",")[1] || base64), c => c.charCodeAt(0));
            const path = `themes/${crypto.randomUUID()}.png`;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const adminClient = createClient(supabaseUrl, serviceKey);
            const { error: uploadErr } = await adminClient.storage.from("product-images").upload(path, imageBytes, { contentType: "image/png" });
            if (!uploadErr) {
              const { data: { publicUrl } } = adminClient.storage.from("product-images").getPublicUrl(path);
              generatedImages[imgReq.section] = publicUrl;
            }
          }
          imageTokens += imgData.usage?.total_tokens || 1000;
        }
      } catch (e) {
        console.error("Image gen error:", e);
      }
    }

    // Assign images to sections
    const pages = themeData.pages;
    if (pages.home) {
      for (const section of pages.home) {
        const key = `home_${section.type}`;
        if (generatedImages[key]) {
          section.image = generatedImages[key];
        }
      }
    }

    const textCost = (structureTokens / 1000) * 0.05;
    const imageCost = Object.keys(generatedImages).length * 3.5;
    const totalCostInr = Math.round((textCost + imageCost) * 100) / 100;

    const thumbnail = generatedImages["home_hero"] || Object.values(generatedImages)[0] || null;

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: pack, error: insertErr } = await adminClient.from("theme_packs").insert({
      name: themeData.name,
      category,
      description: themeData.description,
      thumbnail,
      pages,
      theme_config: themeData.theme_config,
      price: 499,
      ai_generation_cost: totalCostInr,
      is_published: false,
      created_by: user.id,
    }).select().single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      success: true,
      theme_pack: pack,
      images_generated: Object.keys(generatedImages).length,
      cost: totalCostInr,
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
